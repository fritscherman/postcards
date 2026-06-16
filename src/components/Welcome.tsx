import { useState } from 'react';

const SEEN_KEY = 'postcards.welcomed.v1';

const STEPS = [
  { icon: '✏️', title: 'Postkarte erstellen', text: 'Foto wählen oder aufnehmen, verzieren, Text & Briefmarke ergänzen und abschicken.' },
  { icon: '📬', title: 'Briefkasten', text: 'Hier landen Karten von Freunden – und deine versendeten im Ausgang.' },
  { icon: '🌍', title: 'Weltansicht', text: 'Jede Karte steckt auf der Karte genau dort, wo ihr Foto entstanden ist.' },
  { icon: '📌', title: 'Pinwand', text: 'Häng deine Lieblingskarten ans Korkbrett und zieh sie zurecht.' },
];

export function Welcome() {
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY));
  const [step, setStep] = useState(0);

  if (!open) return null;

  const last = step === STEPS.length - 1;
  function close() {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  }

  const s = STEPS[step];
  return (
    <div className="modal-backdrop">
      <div className="welcome">
        <span className="welcome-icon">{s.icon}</span>
        <h2>{step === 0 ? 'Willkommen bei Postkarten!' : s.title}</h2>
        <p>{step === 0 ? 'Sende deinen Freunden virtuelle Grüße aus aller Welt. So funktioniert’s:' : s.text}</p>
        {step === 0 && <p className="welcome-sub">{s.title}: {s.text}</p>}

        <div className="welcome-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'on' : ''}`} />
          ))}
        </div>

        <div className="welcome-actions">
          <button className="btn link" onClick={close}>Überspringen</button>
          <button
            className="btn primary"
            onClick={() => (last ? close() : setStep((x) => x + 1))}
          >
            {last ? 'Los geht’s! 🎉' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );
}
