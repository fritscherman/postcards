import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { RotateCcw, Sparkles, UserPlus } from 'lucide-react';
import { NavBar } from './components/NavBar';
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
import { isOnline } from './api/client';

function InviteAuth({ onGuest }: { onGuest: () => void }) {
  const { token } = useParams();
  return <AuthPage inviteToken={token} onGuest={onGuest} />;
}

export default function App() {
  const { userName, setUserName, resetDemo } = usePostcards();
  const { user, guest, ready, updateName, logout, enterGuest } = useAuth();
  const localMode = !isOnline || guest;
  const isAccount = isOnline && !!user;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userName);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [inviting, setInviting] = useState(false);

  const openProfile = () => {
    setDraft(userName);
    setNameError('');
    setEditing(true);
  };

  // Save the edited name — to the server for accounts, to localStorage otherwise.
  const saveName = async () => {
    const next = draft.trim();
    if (isAccount) {
      if (next.length < 2) {
        setNameError('Bitte gib einen Namen an.');
        return;
      }
      setSaving(true);
      setNameError('');
      try {
        await updateName(next);
        setEditing(false);
      } catch (err) {
        setNameError((err as Error).message);
      } finally {
        setSaving(false);
      }
    } else {
      setUserName(next);
      setEditing(false);
    }
  };

  // Online mode requires a signed-in user before showing the app.
  if (isOnline && !ready) {
    return (
      <div className="app">
        <div className="auth-shell"><p className="auth-sub">Lädt…</p></div>
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
          <InstallButton />
          {isOnline && user && <NotificationToggle />}
          {isOnline && user && (
            <button className="btn link" onClick={() => setInviting(true)} title="Freunde einladen">
              <UserPlus size={16} /> Einladen
            </button>
          )}
          {guest && (
            <button className="btn primary small" onClick={logout} title="Kostenloses Konto erstellen">
              <Sparkles size={16} /> Konto erstellen
            </button>
          )}
          <button
            className="who who-initials"
            title={`${userName} · Profil`}
            onClick={openProfile}
          >
            {initials(userName)}
          </button>
          {localMode && (
            <button className="btn link" onClick={resetDemo} title="Daten zurücksetzen">
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
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{isAccount ? 'Dein Profil' : 'Wie heißt du?'}</h3>
            <p>Dein Name erscheint als Absender auf den Karten.</p>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              autoFocus
            />
            {isAccount && user?.email && <p className="field-hint">{user.email}</p>}
            {nameError && <p className="auth-error">{nameError}</p>}
            <button className="btn primary" onClick={saveName} disabled={saving}>
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
            {isAccount && (
              <button
                className="btn link"
                onClick={() => {
                  if (confirm('Abmelden?')) logout();
                }}
              >
                Abmelden
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
