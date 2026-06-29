import { isOnline } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LocalPinboard } from '../components/LocalPinboard';
import { BoardsPinboard } from '../components/BoardsPinboard';

export function PinboardPage() {
  const { user, guest } = useAuth();
  // Real accounts get shareable, multi-board pinwände from the server.
  // Demo / guest mode keeps the single on-device board.
  const online = isOnline && !!user && !guest;

  return (
    <div className="page pinboard-page">
      <header className="page-head">
        <h1>Pinwand</h1>
        <p>
          {online
            ? 'Erstelle mehrere Pinwände und teile sie mit Freund:innen zum gemeinsamen Pinnen.'
            : 'Häng deine Lieblingskarten auf und zieh sie zurecht.'}
        </p>
      </header>

      {online ? <BoardsPinboard /> : <LocalPinboard />}
    </div>
  );
}
