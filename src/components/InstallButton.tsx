import { useState } from 'react';
import { Download } from 'lucide-react';
import { useInstall } from './InstallContext';

// Always-available entry point for installing the app — sits in the app bar and
// disappears automatically once the app is installed (or when the browser
// offers no way to install it, e.g. desktop dev without a service worker).
export function InstallButton() {
  const { canPrompt, isIos, installed, promptInstall } = useInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed) return null;
  if (!canPrompt && !isIos) return null;

  function onClick() {
    if (canPrompt) {
      void promptInstall();
    } else {
      setShowIosHelp(true);
    }
  }

  return (
    <>
      <button className="btn link" onClick={onClick} title="Wanderpost als App installieren">
        <Download size={16} /> Installieren
      </button>

      {showIosHelp && (
        <div className="modal-backdrop" onClick={() => setShowIosHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>App installieren</h3>
            <p>
              Tippe unten in Safari auf „Teilen" <strong>⎙</strong> und dann auf
              „Zum Home-Bildschirm". So öffnest du Wanderpost im Vollbild — schneller und mit
              Benachrichtigungen.
            </p>
            <button className="btn primary" onClick={() => setShowIosHelp(false)}>
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
