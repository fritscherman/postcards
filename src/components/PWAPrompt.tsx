import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

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
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

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
        <span>📲 Postkarten als App installieren</span>
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

  return null;
}
