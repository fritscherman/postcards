import { useEffect, useState } from 'react';
import { Handshake, UserPlus } from 'lucide-react';
import { apiIntroduceFriends, apiListFriends, isOnline, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FRIENDS } from '../data/seed';
import { GuestBanner } from '../components/GuestBanner';
import { initials } from '../utils/initials';

export function FriendsPage({ onInvite }: { onInvite: () => void }) {
  const { guest, user } = useAuth();
  const isAccount = isOnline && !guest && !!user;

  const [friends, setFriends] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(isAccount);

  // The friend we're introducing to others (null = dialog closed).
  const [introducing, setIntroducing] = useState<AuthUser | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

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

  function openIntroduce(friend: AuthUser) {
    setIntroducing(friend);
    setSelected(new Set());
    setNote('');
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmIntroduce() {
    if (!introducing || selected.size === 0) return;
    setBusy(true);
    setNote('');
    try {
      await Promise.all([...selected].map((id) => apiIntroduceFriends(introducing.id, id)));
      const names = list
        .filter((f) => selected.has(f.id))
        .map((f) => f.name)
        .join(', ');
      setNote(`${introducing.name} ist jetzt mit ${names} verbunden 🤝`);
      setSelected(new Set());
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Everyone except the person being introduced — these are the possible matches.
  const others = introducing ? list.filter((f) => f.id !== introducing.id) : [];

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
          <UserPlus size={17} /> Freund:in einladen
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
              {isAccount && friends.length > 1 && (
                <button
                  className="btn ghost small friend-action"
                  onClick={() => openIntroduce(f)}
                  title={`${f.name} mit anderen bekannt machen`}
                >
                  <Handshake size={16} /> Vorstellen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {introducing && (
        <div className="modal-backdrop" onClick={() => setIntroducing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{introducing.name} vorstellen 🤝</h3>
            <p>Wähle aus, wen {introducing.name} kennenlernen soll. Beide werden verbunden und können sich Postkarten schicken.</p>

            {others.length === 0 ? (
              <p className="field-hint">Du brauchst noch mehr Freund:innen, um jemanden vorzustellen.</p>
            ) : (
              <ul className="friend-list pick-list">
                {others.map((f) => (
                  <li key={f.id}>
                    <label className="friend-row pick-row">
                      <input
                        type="checkbox"
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                      />
                      <span className="friend-avatar">{initials(f.name)}</span>
                      <span className="friend-info">
                        <strong>{f.name}</strong>
                        {f.email && <span className="friend-email">{f.email}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {note && <p className="field-hint">{note}</p>}

            <button
              className="btn primary"
              onClick={confirmIntroduce}
              disabled={busy || selected.size === 0}
            >
              {busy ? 'Verbindet…' : 'Verbinden'}
            </button>
            <button className="btn link" onClick={() => setIntroducing(null)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
