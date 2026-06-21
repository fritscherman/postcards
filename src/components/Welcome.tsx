import { useState } from 'react';
import { useDialog } from '../hooks/useDialog';

const SEEN_KEY = 'postcards.welcomed.v1';

const STEPS = [
  { icon: '✏️', title: 'Postkarte erstellen', text: 'Foto wählen oder aufnehmen, verzieren, Text & Briefmarke ergänzen und abschicken.' },
  { icon: '📬', title: 'Briefkasten', text: 'Hier landen Karten von Freunden – und deine versendeten im Ausgang.' },
  { icon: '🌍', title: 'Weltansicht', text: 'Jede Karte steckt auf der Karte genau dort, wo ihr Foto entstanden ist.' },
  { icon: '📌', title: 'Pinwand', text: 'Häng deine Lieblingskarten ans Korkbrett und zieh sie zurecht.' },
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
        aria-label="Willkommen bei Wanderpost"
        tabIndex={-1}
      >
        <span className="welcome-icon">{s.icon}</span>
        <h2>{step === 0 ? 'Willkommen bei Wanderpost!' : s.title}</h2>
        <p>{step === 0 ? 'Sende deinen Freunden virtuelle Grüße aus aller Welt. So funktioniert’s:' : s.text}</p>
        {step === 0 && <p className="welcome-sub">{s.title}: {s.text}</p>}

        <div className="welcome-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'on' : ''}`} />
          ))}
        </div>

        <div className="welcome-actions">
          <button className="btn link" onClick={onClose}>Überspringen</button>
          <button
            className="btn primary"
            onClick={() => (last ? onClose() : setStep((x) => x + 1))}
          >
            {last ? 'Los geht’s! 🎉' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );
}
