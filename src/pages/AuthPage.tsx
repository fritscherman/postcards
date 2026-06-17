import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: '✏️', title: 'Postkarten schreiben', desc: 'Gestalte persönliche Karten mit Text und wähle den perfekten Absender-Ort.' },
  { icon: '📬', title: 'Briefkasten', desc: 'Empfange Karten von Freunden aus aller Welt direkt in deinem Postfach.' },
  { icon: '🌍', title: 'Weltkarte', desc: 'Sieh auf einer interaktiven Karte, woher deine Postkarten gereist sind.' },
  { icon: '📌', title: 'Pinnwand', desc: 'Hefte deine schönsten Karten an und zeige sie stolz deiner Welt.' },
];

export function AuthPage({ inviteToken, onGuest }: { inviteToken?: string; onGuest?: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(inviteToken ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') await register(email, name, password, inviteToken);
      else await login(email, password, inviteToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing-shell">
      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-logo-row">
          <Logo size={64} title="Wanderpost" />
          <span className="landing-wordmark">Wanderpost</span>
        </div>
        <p className="landing-tagline">Postkarten neu entdeckt — digital, persönlich, weltweit.</p>
        <span className="landing-free-badge">100&nbsp;% kostenlos · keine Werbung</span>
      </div>

      {/* Features */}
      <div className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="landing-feature">
            <span className="landing-feature-icon">{f.icon}</span>
            <div>
              <strong>{f.title}</strong>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Auth card */}
      <div className="auth-card landing-auth-card">
        {inviteToken && (
          <p className="auth-invite">
            {mode === 'register'
              ? 'Du wurdest eingeladen! Erstelle ein Konto, um Postkarten zu empfangen.'
              : 'Du wurdest eingeladen! Melde dich an — ihr werdet automatisch verbunden.'}
          </p>
        )}
        <p className="auth-sub">{mode === 'login' ? 'Willkommen zurück.' : 'Erstelle dein Konto.'}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label>
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn primary big" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <button
          className="btn link auth-switch"
          onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon dabei? Anmelden'}
        </button>

        {onGuest && (
          <>
            <div className="auth-divider"><span>oder</span></div>
            <button type="button" className="btn link auth-guest" onClick={onGuest}>
              Erst mal ohne Konto ausprobieren →
            </button>
          </>
        )}
      </div>

      <footer className="landing-footer">
        <Link to="/impressum">Impressum</Link>
        <span aria-hidden="true">·</span>
        <Link to="/datenschutz">Datenschutz</Link>
      </footer>
    </div>
  );
}
