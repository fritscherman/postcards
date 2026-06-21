import { useState, type ReactNode } from 'react';
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

// A friendly, picture-by-picture install guide aimed at less tech-savvy
// visitors. There is no single "install" gesture that works in every browser,
// so we detect the device and spell out the exact taps/clicks — and let people
// switch device by hand in case our guess is wrong.

type Step = { icon: ReactNode; text: ReactNode };

const GUIDES: Record<InstallPlatform, { device: string; intro?: ReactNode; steps: Step[]; note?: ReactNode }> = {
  ios: {
    device: 'iPhone / iPad · Safari',
    intro: <>Das geht im Browser <strong>Safari</strong>. Falls du eine andere App offen hast, öffne diese Seite kurz in Safari.</>,
    steps: [
      { icon: <Share size={22} />, text: <>Tippe <strong>unten in der Leiste</strong> auf das <strong>Teilen-Symbol</strong> – das Quadrat mit dem Pfeil nach oben.</> },
      { icon: <SquarePlus size={22} />, text: <>Wische im Menü etwas nach unten und tippe auf <strong>„Zum Home-Bildschirm"</strong>.</> },
      { icon: <Check size={22} />, text: <>Tippe oben rechts auf <strong>„Hinzufügen"</strong>. Fertig – das Wanderpost-Symbol liegt jetzt auf deinem Startbildschirm.</> },
    ],
  },
  'ios-chrome': {
    device: 'iPhone / iPad · Chrome',
    intro: <>In Chrome auf dem iPhone sitzt das Teilen-Symbol <strong>oben</strong>, nicht unten.</>,
    steps: [
      { icon: <Share size={22} />, text: <>Tippe <strong>oben rechts</strong> auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben). Siehst du es nicht, öffne zuerst das Menü mit den drei Punkten <strong>⋯</strong>.</> },
      { icon: <SquarePlus size={22} />, text: <>Wähle im Menü <strong>„Zum Home-Bildschirm"</strong>.</> },
      { icon: <Check size={22} />, text: <>Tippe auf <strong>„Hinzufügen"</strong>. Fertig – das Wanderpost-Symbol liegt jetzt auf deinem Startbildschirm.</> },
    ],
    note: <>Tipp: In <strong>Safari</strong> geht es genauso – dort findest du das Teilen-Symbol unten in der Leiste.</>,
  },
  android: {
    device: 'Android-Handy',
    steps: [
      { icon: <MoreVertical size={22} />, text: <>Tippe oben rechts auf das <strong>Menü</strong> – die drei Punkte übereinander.</> },
      { icon: <SquarePlus size={22} />, text: <>Wähle <strong>„App installieren"</strong> bzw. <strong>„Zum Startbildschirm hinzufügen"</strong>.</> },
      { icon: <Check size={22} />, text: <>Bestätige mit <strong>„Installieren"</strong>. Fertig – Wanderpost erscheint bei deinen Apps.</> },
    ],
  },
  'desktop-chromium': {
    device: 'Computer (Chrome / Edge)',
    steps: [
      { icon: <Monitor size={22} />, text: <>Schau ganz oben in die <strong>Adresszeile</strong>. Rechts erscheint ein kleines Symbol – ein Bildschirm mit einem Pfeil nach unten.</> },
      { icon: <Download size={22} />, text: <>Klicke darauf und dann auf <strong>„Installieren"</strong>.</> },
      { icon: <Check size={22} />, text: <>Wanderpost öffnet sich als eigenes Fenster und liegt danach im Startmenü bzw. im Dock.</> },
    ],
    note: <>Kein Symbol zu sehen? Klicke oben rechts auf das <strong>Menü</strong> (drei Punkte) und dann auf <strong>„App installieren"</strong>.</>,
  },
  'desktop-safari': {
    device: 'Mac (Safari)',
    steps: [
      { icon: <Share size={22} />, text: <>Klicke oben rechts in Safari auf das <strong>Teilen-Symbol</strong> – das Quadrat mit dem Pfeil nach oben.</> },
      { icon: <SquarePlus size={22} />, text: <>Wähle <strong>„Zum Dock hinzufügen"</strong>.</> },
      { icon: <Check size={22} />, text: <>Bestätige mit <strong>„Hinzufügen"</strong>. Wanderpost liegt nun in deinem Dock.</> },
    ],
    note: <>Findest du „Zum Dock hinzufügen" nicht? Dann ist dein macOS etwas älter – installiere Wanderpost am einfachsten mit Chrome oder Microsoft Edge.</>,
  },
  'desktop-firefox': {
    device: 'Firefox',
    intro: <>Firefox kann Web-Apps am Computer leider nicht als eigene App speichern.</>,
    steps: [
      { icon: <Download size={22} />, text: <>Am einfachsten: Öffne diese Seite einmal in <strong>Google Chrome</strong> oder <strong>Microsoft Edge</strong> – dort lässt sich Wanderpost mit einem Klick installieren.</> },
      { icon: <Menu size={22} />, text: <>Du möchtest bei Firefox bleiben? Setze die Seite mit <strong>Strg + D</strong> als Lesezeichen, dann ist sie immer schnell griffbereit.</> },
    ],
  },
  other: {
    device: 'dein Gerät',
    steps: [
      { icon: <Menu size={22} />, text: <>Öffne das <strong>Menü</strong> deines Browsers (oft drei Punkte oder drei Striche oben rechts).</> },
      { icon: <SquarePlus size={22} />, text: <>Suche nach <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm hinzufügen"</strong> und tippe darauf.</> },
      { icon: <Check size={22} />, text: <>Bestätige – danach öffnest du Wanderpost direkt über das App-Symbol.</> },
    ],
  },
};

// Offered as manual override buttons, in case our detection is wrong.
const DEVICE_CHOICES: { key: InstallPlatform; label: string; icon: ReactNode }[] = [
  { key: 'ios', label: 'iPhone · Safari', icon: <Smartphone size={16} /> },
  { key: 'ios-chrome', label: 'iPhone · Chrome', icon: <Smartphone size={16} /> },
  { key: 'android', label: 'Android', icon: <Smartphone size={16} /> },
  { key: 'desktop-chromium', label: 'Chrome / Edge', icon: <Monitor size={16} /> },
  { key: 'desktop-safari', label: 'Mac · Safari', icon: <Monitor size={16} /> },
  { key: 'desktop-firefox', label: 'Firefox', icon: <Monitor size={16} /> },
];

export function InstallGuide({ onClose }: { onClose: () => void }) {
  const { canPrompt, platform, promptInstall } = useInstall();
  // Let people pick another device if our guess looks wrong on their screen.
  const [chosen, setChosen] = useState<InstallPlatform | null>(null);
  const [installing, setInstalling] = useState(false);

  const active: InstallPlatform = chosen ?? platform;
  const guide = GUIDES[active];

  async function oneClickInstall() {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === 'accepted') onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal install-guide" onClick={(e) => e.stopPropagation()}>
        <button className="install-guide-close" onClick={onClose} aria-label="Schließen">
          <X size={20} />
        </button>

        <div className="install-guide-head">
          <Logo size={48} />
          <div>
            <h3>Wanderpost installieren</h3>
            <p>So hast du deine Postkarten immer mit einem Tipp parat.</p>
          </div>
        </div>

        <ul className="install-benefits">
          <li>Öffnen direkt vom Startbildschirm – ohne lange suchen</li>
          <li>Im Vollbild, ganz ohne Adresszeile</li>
          <li>Eine Erinnerung, sobald neue Post für dich ankommt</li>
        </ul>

        {/* One tap if the browser gives us a real install prompt. */}
        {canPrompt && !chosen && (
          <button className="btn primary big" onClick={oneClickInstall} disabled={installing}>
            <Download size={18} /> {installing ? 'Wird installiert…' : 'Jetzt mit einem Klick installieren'}
          </button>
        )}

        <div className="install-steps-head">
          <span>So geht's auf <strong>{guide.device}</strong>{!chosen && ' (erkannt)'}:</span>
        </div>

        {guide.intro && <p className="install-guide-intro">{guide.intro}</p>}

        <ol className="install-steps">
          {guide.steps.map((step, i) => (
            <li key={i}>
              <span className="install-step-num">{i + 1}</span>
              <span className="install-step-icon">{step.icon}</span>
              <span className="install-step-text">{step.text}</span>
            </li>
          ))}
        </ol>

        {guide.note && <p className="install-guide-note">💡 {guide.note}</p>}

        <details className="install-device-switch">
          <summary>Anderes Gerät? Anleitung wechseln</summary>
          <div className="install-device-choices">
            {DEVICE_CHOICES.map((d) => (
              <button
                key={d.key}
                className={`btn small ${active === d.key ? 'primary' : 'ghost'}`}
                onClick={() => setChosen(d.key)}
              >
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </details>

        <button className="btn link install-guide-done" onClick={onClose}>
          Alles klar
        </button>
      </div>
    </div>
  );
}
