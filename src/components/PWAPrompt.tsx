import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Logo } from './Logo';
import { useInstall } from './InstallContext';
import { InstallGuide } from './InstallGuide';

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

  const { canPrompt, installed, promptInstall } = useInstall();
  // Re-evaluated on mount; lets us hide after a snooze without a full reload.
  const [snoozed, setSnoozed] = useState(isSnoozed());
  const [showGuide, setShowGuide] = useState(false);

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

  // The full step-by-step guide can be opened from any of the hints below.
  if (showGuide) {
    return <InstallGuide onClose={() => setShowGuide(false)} />;
  }

  // Nothing to offer if it's already installed or currently snoozed.
  if (installed || snoozed) return null;

  // Android / desktop with a real prompt: one-click install, plus a "how does
  // this work?" link into the guide for anyone unsure what the dialog means.
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
          <button className="btn link" onClick={() => setShowGuide(true)}>
            Wie geht das?
          </button>
          <button className="btn link" onClick={dismiss}>
            Später
          </button>
        </div>
      </div>
    );
  }

  // Every other browser (iOS Safari, desktop Safari, Firefox, …): there is no
  // prompt event, so we point people to the illustrated step-by-step guide
  // instead of leaving them without any help.
  return (
    <div className="pwa-banner install-card">
      <span className="install-icon"><Logo size={44} /></span>
      <div className="install-text">
        <strong>Wanderpost als App installieren</strong>
        <small>In wenigen Schritten auf deinem Bildschirm — wir zeigen dir genau, wie.</small>
      </div>
      <div className="pwa-actions">
        <button className="btn primary" onClick={() => setShowGuide(true)}>
          So geht's
        </button>
        <button className="btn link" onClick={dismiss}>
          Später
        </button>
      </div>
    </div>
  );
}
