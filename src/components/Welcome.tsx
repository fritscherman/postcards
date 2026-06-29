import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../hooks/useDialog';

const SEEN_KEY = 'postcards.welcomed.v1';

const STEPS = [
  { icon: '✏️', titleKey: 'welcome.step1Title', textKey: 'welcome.step1Text' },
  { icon: '📬', titleKey: 'welcome.step2Title', textKey: 'welcome.step2Text' },
  { icon: '🌍', titleKey: 'welcome.step3Title', textKey: 'welcome.step3Text' },
  { icon: '📌', titleKey: 'welcome.step4Title', textKey: 'welcome.step4Text' },
];

export function Welcome() {
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY));
  if (!open) return null;

  function close() {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  }

  return <WelcomeTour onClose={close} />;
}

function WelcomeTour({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div className="modal-backdrop">
      <div
        className="welcome"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('welcome.aria')}
        tabIndex={-1}
      >
        <span className="welcome-icon">{s.icon}</span>
        <h2>{step === 0 ? t('welcome.title') : t(s.titleKey)}</h2>
        <p>{step === 0 ? t('welcome.intro') : t(s.textKey)}</p>
        {step === 0 && <p className="welcome-sub">{t(s.titleKey)}: {t(s.textKey)}</p>}

        <div className="welcome-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'on' : ''}`} />
          ))}
        </div>

        <div className="welcome-actions">
          <button className="btn link" onClick={onClose}>{t('welcome.skip')}</button>
          <button
            className="btn primary"
            onClick={() => (last ? onClose() : setStep((x) => x + 1))}
          >
            {last ? t('welcome.start') : t('welcome.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
