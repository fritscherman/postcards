import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useInstall } from './InstallContext';
import { InstallGuide } from './InstallGuide';

// Always-available entry point for installing the app — sits in the app bar and
// opens a friendly, step-by-step guide. It stays visible on every browser (so
// even desktop Safari/Firefox users get help) and only disappears once the app
// is actually running as an installed standalone app.
export function InstallButton() {
  const { t } = useTranslation();
  const { installed } = useInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (installed) return null;

  return (
    <>
      <button className="btn link" onClick={() => setShowGuide(true)} title={t('install.buttonTitle')}>
        <Download size={16} /> {t('install.button')}
      </button>

      {showGuide && <InstallGuide onClose={() => setShowGuide(false)} />}
    </>
  );
}
