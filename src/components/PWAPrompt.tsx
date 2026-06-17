import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const IOS_HINT_KEY = 'postcards.iosInstallHint.dismissed.v1';

// True on iPhone/iPad Safari, where there's no beforeinstallprompt event —
// the user must add to the home screen manually via the share sheet.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PWAPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS gets a manual hint, unless already installed or previously dismissed.
    if (isIosSafari() && !isStandalone() && localStorage.getItem(IOS_HINT_KEY) !== '1') {
      setShowIosHint(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismissIosHint() {
    localStorage.setItem(IOS_HINT_KEY, '1');
    setShowIosHint(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (needRefresh) {
    return (
      <div className="pwa-banner">
        <span>✨ Neue Version verfügbar</span>
        <div className="pwa-actions">
          <button className="btn primary" onClick={() => updateServiceWorker(true)}>
            Aktualisieren
          </button>
          <button className="btn link" onClick={() => setNeedRefresh(false)}>
            Später
          </button>
        </div>
      </div>
    );
  }

  if (installEvent && !installed) {
    return (
      <div className="pwa-banner">
        <span>📲 Wanderpost als App installieren</span>
        <div className="pwa-actions">
          <button className="btn primary" onClick={install}>
            Installieren
          </button>
          <button className="btn link" onClick={() => setInstallEvent(null)}>
            Nein danke
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="pwa-banner">
        <span>📲 Tipp: Füge Wanderpost zum Home-Bildschirm hinzu — tippe auf „Teilen" <strong>⎙</strong> und dann „Zum Home-Bildschirm".</span>
        <div className="pwa-actions">
          <button className="btn link" onClick={dismissIosHint}>
            Verstanden
          </button>
        </div>
      </div>
    );
  }

  return null;
}
