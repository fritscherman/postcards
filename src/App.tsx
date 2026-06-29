import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { RotateCcw, Sparkles, UserPlus } from 'lucide-react';
import { NavBar } from './components/NavBar';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { CreatePage } from './pages/CreatePage';
import { MailboxPage } from './pages/MailboxPage';
import { WorldPage } from './pages/WorldPage';
import { PinboardPage } from './pages/PinboardPage';
import { PWAPrompt } from './components/PWAPrompt';
import { InstallButton } from './components/InstallButton';
import { Welcome } from './components/Welcome';
import { AuthPage } from './pages/AuthPage';
import { InviteFriends } from './components/InviteFriends';
import { Logo } from './components/Logo';
import { NotificationToggle } from './components/NotificationToggle';
import { FriendsPage } from './pages/FriendsPage';
import { Datenschutz, Impressum } from './pages/Legal';
import { initials } from './utils/initials';
import { usePostcards } from './store/PostcardStore';
import { useAuth } from './auth/AuthContext';
import { useFeedback } from './components/Feedback';
import { useDialog } from './hooks/useDialog';
import { isOnline } from './api/client';

function InviteAuth({ onGuest }: { onGuest: () => void }) {
  const { token } = useParams();
  return <AuthPage inviteToken={token} onGuest={onGuest} />;
}

export default function App() {
  const { t } = useTranslation();
  const { userName, setUserName, resetDemo } = usePostcards();
  const { user, guest, ready, updateName, logout, enterGuest } = useAuth();
  const localMode = !isOnline || guest;
  const isAccount = isOnline && !!user;
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Online mode requires a signed-in user before showing the app.
  if (isOnline && !ready) {
    return (
      <div className="app">
        <div className="auth-shell"><p className="auth-sub">{t('common.loading')}</p></div>
      </div>
    );
  }
  if (isOnline && !user && !guest) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<InviteAuth onGuest={enterGuest} />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        <Route path="*" element={<AuthPage onGuest={enterGuest} />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <header className="app-bar">
        <span className="logo"><Logo size={36} /> Wanderpost</span>
        <div className="app-bar-actions">
          <LanguageSwitcher />
          <InstallButton />
          {isOnline && user && <NotificationToggle />}
          {isOnline && user && (
            <button className="btn link" onClick={() => setInviting(true)} title={t('app.inviteTitle')}>
              <UserPlus size={16} /> {t('app.invite')}
            </button>
          )}
          {guest && (
            <button className="btn primary small" onClick={logout} title={t('app.createAccountTitle')}>
              <Sparkles size={16} /> {t('common.createAccount')}
            </button>
          )}
          <button
            className="who who-initials"
            title={t('app.profileTitle', { name: userName })}
            onClick={() => setEditing(true)}
          >
            {initials(userName)}
          </button>
          {localMode && (
            <button className="btn link" onClick={resetDemo} title={t('app.resetData')}>
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/mailbox" element={<MailboxPage />} />
          <Route path="/world" element={<WorldPage />} />
          <Route path="/pinboard" element={<PinboardPage />} />
          <Route path="/friends" element={<FriendsPage onInvite={() => setInviting(true)} />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/invite/:token" element={<Navigate to="/create" replace />} />
          <Route path="*" element={<Navigate to="/create" replace />} />
        </Routes>
      </main>

      <NavBar />
      <PWAPrompt />
      <Welcome />

      {inviting && <InviteFriends onClose={() => setInviting(false)} />}

      {editing && (
        <ProfileModal
          isAccount={isAccount}
          email={user?.email}
          initialName={userName}
          onSaveAccount={updateName}
          onSaveLocal={setUserName}
          onLogout={logout}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

interface ProfileModalProps {
  isAccount: boolean;
  email?: string;
  initialName: string;
  onSaveAccount: (name: string) => Promise<void>;
  onSaveLocal: (name: string) => void;
  onLogout: () => void;
  onClose: () => void;
}

function ProfileModal({
  isAccount,
  email,
  initialName,
  onSaveAccount,
  onSaveLocal,
  onLogout,
  onClose,
}: ProfileModalProps) {
  const { t } = useTranslation();
  const { confirm } = useFeedback();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Save the edited name — to the server for accounts, to localStorage otherwise.
  const saveName = async () => {
    const next = draft.trim();
    if (isAccount) {
      if (next.length < 2) {
        setNameError(t('profile.nameRequired'));
        return;
      }
      setSaving(true);
      setNameError('');
      try {
        await onSaveAccount(next);
        onClose();
      } catch (err) {
        setNameError((err as Error).message);
      } finally {
        setSaving(false);
      }
    } else {
      onSaveLocal(next);
      onClose();
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('profile.logoutConfirmTitle'),
      message: t('profile.logoutConfirmMessage'),
      confirmLabel: t('profile.logout'),
      danger: true,
    });
    if (ok) onLogout();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={isAccount ? t('profile.yourProfile') : t('profile.whatsYourName')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{isAccount ? t('profile.yourProfile') : t('profile.whatsYourName')}</h3>
        <p>{t('profile.nameSubtitle')}</p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveName()}
          aria-label={t('profile.nameAria')}
        />
        {isAccount && email && <p className="field-hint">{email}</p>}
        {nameError && <p className="auth-error">{nameError}</p>}
        <button className="btn primary" onClick={saveName} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
        {isAccount && (
          <button className="btn link" onClick={handleLogout}>
            {t('profile.logout')}
          </button>
        )}
      </div>
    </div>
  );
}
