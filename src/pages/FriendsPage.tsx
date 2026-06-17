import { useEffect, useState } from 'react';
import { isOnline, apiListFriends, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FRIENDS } from '../data/seed';
import { GuestBanner } from '../components/GuestBanner';
import { initials } from '../utils/initials';

export function FriendsPage({ onInvite }: { onInvite: () => void }) {
  const { guest, user } = useAuth();
  const isAccount = isOnline && !guest && !!user;

  const [friends, setFriends] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(isAccount);

  useEffect(() => {
    if (!isAccount) return;
    apiListFriends()
      .then((r) => setFriends(r.friends))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [isAccount]);

  // Demo build / guests have no real connections — show the demo contacts.
  const demoFriends: AuthUser[] = FRIENDS.map((name, i) => ({ id: String(i), name, email: '' }));
  const list = isAccount ? friends : demoFriends;

  return (
    <div className="page friends-page">
      <header className="page-head">
        <h1>Meine Freunde</h1>
        <p>
          {isAccount
            ? `${friends.length} ${friends.length === 1 ? 'Person' : 'Personen'} verbunden.`
            : 'Mit wem du Postkarten austauschst.'}
        </p>
      </header>

      <GuestBanner message="Verbinde dich mit echten Freund:innen, indem du ein kostenloses Konto erstellst und deinen Einladungslink teilst." />

      {isAccount && (
        <button className="btn primary" onClick={onInvite}>
          💌 Freund:in einladen
        </button>
      )}

      {loading ? (
        <p className="field-hint">Lädt…</p>
      ) : list.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">🧑‍🤝‍🧑</span>
          <p>Noch keine Freund:innen. Teile deinen Einladungslink, um loszulegen!</p>
        </div>
      ) : (
        <ul className="friend-list">
          {list.map((f) => (
            <li key={f.id} className="friend-row">
              <span className="friend-avatar">{initials(f.name)}</span>
              <span className="friend-info">
                <strong>{f.name}</strong>
                {f.email && <span className="friend-email">{f.email}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
