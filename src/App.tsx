import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { CreatePage } from './pages/CreatePage';
import { MailboxPage } from './pages/MailboxPage';
import { WorldPage } from './pages/WorldPage';
import { PinboardPage } from './pages/PinboardPage';
import { PWAPrompt } from './components/PWAPrompt';
import { Welcome } from './components/Welcome';
import { AuthPage } from './pages/AuthPage';
import { InviteFriends } from './components/InviteFriends';
import { usePostcards } from './store/PostcardStore';
import { useAuth } from './auth/AuthContext';
import { isOnline } from './api/client';

function InviteAuth() {
  const { token } = useParams();
  return <AuthPage inviteToken={token} />;
}

export default function App() {
  const { userName, setUserName, resetDemo } = usePostcards();
  const { user, ready, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userName);
  const [inviting, setInviting] = useState(false);

  // Online mode requires a signed-in user before showing the app.
  if (isOnline && !ready) {
    return (
      <div className="app">
        <div className="auth-shell"><p className="auth-sub">Lädt…</p></div>
      </div>
    );
  }
  if (isOnline && !user) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<InviteAuth />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <header className="app-bar">
        <span className="logo">✉️ Postkarten</span>
        <div className="app-bar-actions">
          {isOnline && (
            <button className="btn link" onClick={() => setInviting(true)} title="Freunde einladen">
              💌 Einladen
            </button>
          )}
          <button
            className="who"
            title={isOnline ? 'Abmelden' : 'Namen ändern'}
            onClick={() => {
              if (isOnline) {
                if (confirm('Abmelden?')) logout();
              } else {
                setDraft(userName);
                setEditing(true);
              }
            }}
          >
            👤 {userName}
          </button>
          {!isOnline && (
            <button className="btn link" onClick={resetDemo} title="Demo-Daten zurücksetzen">⟲</button>
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
            <h3>Wie heißt du?</h3>
            <p>Dein Name erscheint als Absender auf den Karten.</p>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <button
              className="btn primary"
              onClick={() => {
                setUserName(draft);
                setEditing(false);
              }}
            >
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
