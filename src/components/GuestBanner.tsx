import { useAuth } from '../auth/AuthContext';

/**
 * Gentle prompt shown to guests, nudging them to create a free account.
 * Renders nothing for the demo build or signed-in users.
 */
export function GuestBanner({ message }: { message: string }) {
  const { guest, logout } = useAuth();
  if (!guest) return null;
  return (
    <div className="guest-note">
      <span>✨ {message}</span>
      <button type="button" className="btn primary small" onClick={logout}>
        Konto erstellen
      </button>
    </div>
  );
}
