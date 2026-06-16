import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function AuthPage({ inviteToken }: { inviteToken?: string }) {
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
      else await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-logo">✉️</span>
        <h1>Postkarten</h1>
        {inviteToken && mode === 'register' && (
          <p className="auth-invite">Du wurdest eingeladen! Erstelle ein Konto, um Postkarten zu empfangen.</p>
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

        <button className="btn link auth-switch" onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon dabei? Anmelden'}
        </button>
      </div>
    </div>
  );
}
