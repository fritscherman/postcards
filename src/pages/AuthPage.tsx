import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: '✏️', titleKey: 'auth.feature1Title', descKey: 'auth.feature1Desc' },
  { icon: '📬', titleKey: 'auth.feature2Title', descKey: 'auth.feature2Desc' },
  { icon: '🌍', titleKey: 'auth.feature3Title', descKey: 'auth.feature3Desc' },
  { icon: '📌', titleKey: 'auth.feature4Title', descKey: 'auth.feature4Desc' },
];

export function AuthPage({
  inviteToken,
  shareToken,
  onGuest,
  header,
}: {
  inviteToken?: string;
  /** when set, the visitor is registering to keep a postcard shared with them */
  shareToken?: string;
  onGuest?: () => void;
  /** replaces the generic hero/features (used by the shared-card preview page) */
  header?: ReactNode;
}) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>(inviteToken || shareToken ? 'register' : 'login');
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
      const tokens = { inviteToken, shareToken };
      if (mode === 'register') await register(email, name, password, tokens);
      else await login(email, password, tokens);
      // The card was just delivered server-side — land in the mailbox to see it.
      if (shareToken) navigate('/mailbox');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing-shell">
      {header ? (
        // Shared-card preview replaces the generic hero/features.
        header
      ) : (
        <>
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
        </>
      )}

      {/* Auth card */}
      <div className="auth-card landing-auth-card">
        {shareToken ? (
          <p className="auth-invite">
            {mode === 'register' ? t('auth.shareRegister') : t('auth.shareLogin')}
          </p>
        ) : inviteToken ? (
          <p className="auth-invite">
            {mode === 'register' ? t('auth.inviteRegister') : t('auth.inviteLogin')}
          </p>
        ) : null}
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
