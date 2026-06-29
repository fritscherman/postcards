import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Download,
  Menu,
  Monitor,
  MoreVertical,
  Share,
  Smartphone,
  SquarePlus,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { useInstall, type InstallPlatform } from './InstallContext';
import { useDialog } from '../hooks/useDialog';

// A friendly, picture-by-picture install guide aimed at less tech-savvy
// visitors. There is no single "install" gesture that works in every browser,
// so we detect the device and spell out the exact taps/clicks — and let people
// switch device by hand in case our guess is wrong. The step wording lives in
// the translation files (guide.<platform>.*); here we only own the icons and
// which platforms have an intro / note paragraph.

const GUIDE_STEPS: Record<InstallPlatform, { icon: ReactNode; key: string }[]> = {
  ios: [
    { icon: <Share size={22} />, key: 'guide.ios.step1' },
    { icon: <SquarePlus size={22} />, key: 'guide.ios.step2' },
    { icon: <Check size={22} />, key: 'guide.ios.step3' },
  ],
  'ios-chrome': [
    { icon: <Share size={22} />, key: 'guide.ios-chrome.step1' },
    { icon: <SquarePlus size={22} />, key: 'guide.ios-chrome.step2' },
    { icon: <Check size={22} />, key: 'guide.ios-chrome.step3' },
  ],
  android: [
    { icon: <MoreVertical size={22} />, key: 'guide.android.step1' },
    { icon: <SquarePlus size={22} />, key: 'guide.android.step2' },
    { icon: <Check size={22} />, key: 'guide.android.step3' },
  ],
  'desktop-chromium': [
    { icon: <Monitor size={22} />, key: 'guide.desktop-chromium.step1' },
    { icon: <Download size={22} />, key: 'guide.desktop-chromium.step2' },
    { icon: <Check size={22} />, key: 'guide.desktop-chromium.step3' },
  ],
  'desktop-safari': [
    { icon: <Share size={22} />, key: 'guide.desktop-safari.step1' },
    { icon: <SquarePlus size={22} />, key: 'guide.desktop-safari.step2' },
    { icon: <Check size={22} />, key: 'guide.desktop-safari.step3' },
  ],
  'desktop-firefox': [
    { icon: <Download size={22} />, key: 'guide.desktop-firefox.step1' },
    { icon: <Menu size={22} />, key: 'guide.desktop-firefox.step2' },
  ],
  other: [
    { icon: <Menu size={22} />, key: 'guide.other.step1' },
    { icon: <SquarePlus size={22} />, key: 'guide.other.step2' },
    { icon: <Check size={22} />, key: 'guide.other.step3' },
  ],
};

// Platforms that show an extra intro / note paragraph (keys: guide.<p>.intro / .note).
const HAS_INTRO: InstallPlatform[] = ['ios', 'ios-chrome', 'desktop-firefox'];
const HAS_NOTE: InstallPlatform[] = ['ios-chrome', 'desktop-chromium', 'desktop-safari'];

// Offered as manual override buttons, in case our detection is wrong.
const DEVICE_CHOICES: { key: InstallPlatform; icon: ReactNode }[] = [
  { key: 'ios', icon: <Smartphone size={16} /> },
  { key: 'ios-chrome', icon: <Smartphone size={16} /> },
  { key: 'android', icon: <Smartphone size={16} /> },
  { key: 'desktop-chromium', icon: <Monitor size={16} /> },
  { key: 'desktop-safari', icon: <Monitor size={16} /> },
  { key: 'desktop-firefox', icon: <Monitor size={16} /> },
];

export function InstallGuide({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);
  const { canPrompt, platform, promptInstall } = useInstall();
  // Let people pick another device if our guess looks wrong on their screen.
  const [chosen, setChosen] = useState<InstallPlatform | null>(null);
  const [installing, setInstalling] = useState(false);

  const active: InstallPlatform = chosen ?? platform;
  const steps = GUIDE_STEPS[active];
  const deviceName = t(`guide.devices.${active}`);

  async function oneClickInstall() {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === 'accepted') onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal install-guide"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('guide.aria')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="install-guide-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={20} />
        </button>

        <div className="install-guide-head">
          <Logo size={48} />
          <div>
            <h3>{t('guide.heading')}</h3>
            <p>{t('guide.subtitle')}</p>
          </div>
        </div>

        <ul className="install-benefits">
          <li>{t('guide.benefit1')}</li>
          <li>{t('guide.benefit2')}</li>
          <li>{t('guide.benefit3')}</li>
        </ul>

        {/* One tap if the browser gives us a real install prompt. */}
        {canPrompt && !chosen && (
          <button className="btn primary big" onClick={oneClickInstall} disabled={installing}>
            <Download size={18} /> {installing ? t('guide.installing') : t('guide.oneClick')}
          </button>
        )}

        <div className="install-steps-head">
          <span>
            {t('guide.howToOn', {
              device: deviceName + (!chosen ? t('guide.detectedSuffix') : ''),
            })}
          </span>
        </div>

        {HAS_INTRO.includes(active) && (
          <p className="install-guide-intro">{t(`guide.${active}.intro`)}</p>
        )}

        <ol className="install-steps">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="install-step-num">{i + 1}</span>
              <span className="install-step-icon">{step.icon}</span>
              <span className="install-step-text">{t(step.key)}</span>
            </li>
          ))}
        </ol>

        {HAS_NOTE.includes(active) && (
          <p className="install-guide-note">💡 {t(`guide.${active}.note`)}</p>
        )}

        <details className="install-device-switch">
          <summary>{t('guide.deviceSwitch')}</summary>
          <div className="install-device-choices">
            {DEVICE_CHOICES.map((d) => (
              <button
                key={d.key}
                className={`btn small ${active === d.key ? 'primary' : 'ghost'}`}
                onClick={() => setChosen(d.key)}
              >
                {d.icon} {t(`guide.choices.${d.key}`)}
              </button>
            ))}
          </div>
        </details>

        <button className="btn link install-guide-done" onClick={onClose}>
          {t('guide.done')}
        </button>
      </div>
    </div>
  );
}
