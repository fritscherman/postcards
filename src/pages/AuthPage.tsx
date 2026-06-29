import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: '✏️', titleKey: 'auth.feature1Title', descKey: 'auth.feature1Desc' },
  { icon: '📬', titleKey: 'auth.feature2Title', descKey: 'auth.feature2Desc' },
  { icon: '🌍', titleKey: 'auth.feature3Title', descKey: 'auth.feature3Desc' },
  { icon: '📌', titleKey: 'auth.feature4Title', descKey: 'auth.feature4Desc' },
];

export function AuthPage({ inviteToken, onGuest }: { inviteToken?: string; onGuest?: () => void }) {
  const { t } = useTranslation();
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
        <p className="landing-tagline">{t('auth.tagline')}</p>
        <span className="landing-free-badge">{t('auth.freeBadge')}</span>
      </div>

      {/* Features */}
      <div className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.titleKey} className="landing-feature">
            <span className="landing-feature-icon">{f.icon}</span>
            <div>
              <strong>{t(f.titleKey)}</strong>
              <p>{t(f.descKey)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Auth card */}
      <div className="auth-card landing-auth-card">
        {inviteToken && (
          <p className="auth-invite">
            {mode === 'register'
              ? t('auth.inviteRegister')
              : t('auth.inviteLogin')}
          </p>
        )}
        <p className="auth-sub">{mode === 'login' ? t('auth.welcomeBack') : t('auth.createYourAccount')}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label>
              {t('auth.name')}
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label>
            {t('auth.email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>
            {t('auth.password')}
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
            {busy ? '…' : mode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>

        <button
          className="btn link auth-switch"
          onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}
        >
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
        </button>

        {onGuest && (
          <>
            <div className="auth-divider"><span>{t('auth.or')}</span></div>
            <button type="button" className="btn link auth-guest" onClick={onGuest}>
              {t('auth.tryGuest')}
            </button>
          </>
        )}
      </div>

      <footer className="landing-footer">
        <Link to="/impressum">{t('legal.imprint')}</Link>
        <span aria-hidden="true">·</span>
        <Link to="/datenschutz">{t('legal.privacy')}</Link>
      </footer>
    </div>
  );
}
