import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Logo } from './Logo';
import { useInstall } from './InstallContext';

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

export function PWAPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const { canPrompt, isIos, installed, promptInstall } = useInstall();
  // Re-evaluated on mount; lets us hide after a snooze without a full reload.
  const [snoozed, setSnoozed] = useState(isSnoozed());

  function dismiss() {
    snooze();
    setSnoozed(true);
  }

  async function install() {
    const outcome = await promptInstall();
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
  if (canPrompt) {
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
