import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Logo } from './Logo';

// We no longer dismiss the install hint forever — instead we snooze it, so it
// comes back on a later visit as long as the app still isn't installed.
const SNOOZE_KEY = 'postcards.installHint.snoozedUntil.v1';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function isSnoozed(): boolean {
  return Date.now() < Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
}
function snooze(): void {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
}

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
  const [installed, setInstalled] = useState(isStandalone());
  const [isIos, setIsIos] = useState(false);
  // Re-evaluated on mount; lets us hide after a snooze without a full reload.
  const [snoozed, setSnoozed] = useState(isSnoozed());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      localStorage.removeItem(SNOOZE_KEY);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (isIosSafari() && !isStandalone()) setIsIos(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    snooze();
    setSnoozed(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    // If they declined, snooze so we ask again in a few days.
    if (outcome !== 'accepted') dismiss();
  }

  // The update banner is independent of the install hint and always shown.
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

  // Nothing to offer if it's already installed or currently snoozed.
  if (installed || snoozed) return null;

  // Android / desktop: we have a real install prompt to trigger.
  if (installEvent) {
    return (
      <div className="pwa-banner install-card">
        <span className="install-icon"><Logo size={44} /></span>
        <div className="install-text">
          <strong>Wanderpost als App installieren</strong>
          <small>Direkt vom Home-Bildschirm öffnen — schneller, im Vollbild, mit Benachrichtigungen.</small>
        </div>
        <div className="pwa-actions">
          <button className="btn primary" onClick={install}>
            Installieren
          </button>
          <button className="btn link" onClick={dismiss}>
            Später
          </button>
        </div>
      </div>
    );
  }

  // iOS: no prompt event — show how to add to the home screen manually.
  if (isIos) {
    return (
      <div className="pwa-banner install-card">
        <span className="install-icon"><Logo size={44} /></span>
        <div className="install-text">
          <strong>Wanderpost als App installieren</strong>
          <small>
            Tippe unten auf „Teilen" <strong>⎙</strong> und dann auf „Zum Home-Bildschirm".
          </small>
        </div>
        <div className="pwa-actions">
          <button className="btn link" onClick={dismiss}>
            Verstanden
          </button>
        </div>
      </div>
    );
  }

  return null;
}
