import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { CreatePage } from './pages/CreatePage';
import { MailboxPage } from './pages/MailboxPage';
import { WorldPage } from './pages/WorldPage';
import { PinboardPage } from './pages/PinboardPage';
import { PWAPrompt } from './components/PWAPrompt';
import { usePostcards } from './store/PostcardStore';

export default function App() {
  const { userName, setUserName, resetDemo } = usePostcards();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userName);

  return (
    <div className="app">
      <header className="app-bar">
        <span className="logo">✉️ Postkarten</span>
        <div className="app-bar-actions">
          <button className="who" onClick={() => { setDraft(userName); setEditing(true); }}>
            👤 {userName}
          </button>
          <button className="btn link" onClick={resetDemo} title="Demo-Daten zurücksetzen">
            ⟲
          </button>
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/mailbox" element={<MailboxPage />} />
          <Route path="/world" element={<WorldPage />} />
          <Route path="/pinboard" element={<PinboardPage />} />
          <Route path="*" element={<Navigate to="/create" replace />} />
        </Routes>
      </main>

      <NavBar />
      <PWAPrompt />

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
