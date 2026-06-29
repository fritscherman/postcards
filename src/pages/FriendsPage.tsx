import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, UserPlus } from 'lucide-react';
import { apiIntroduceFriends, apiListFriends, isOnline, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FRIENDS } from '../data/seed';
import { GuestBanner } from '../components/GuestBanner';
import { useDialog } from '../hooks/useDialog';
import { initials } from '../utils/initials';

export function FriendsPage({ onInvite }: { onInvite: () => void }) {
  const { t } = useTranslation();
  const { guest, user } = useAuth();
  const isAccount = isOnline && !guest && !!user;

  const [friends, setFriends] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(isAccount);

  // The friend we're introducing to others (null = dialog closed).
  const [introducing, setIntroducing] = useState<AuthUser | null>(null);

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

  // Everyone except the person being introduced — these are the possible matches.
  const others = introducing ? list.filter((f) => f.id !== introducing.id) : [];

  return (
    <div className="page friends-page">
      <header className="page-head">
        <h1>{t('friends.title')}</h1>
        <p>
          {isAccount
            ? t('friends.connectedCount', { count: friends.length })
            : t('friends.subtitleDemo')}
        </p>
      </header>

      <GuestBanner message={t('friends.guestBanner')} />

      {isAccount && (
        <button className="btn primary" onClick={onInvite}>
          <UserPlus size={17} /> {t('friends.inviteBtn')}
        </button>
      )}

      {loading ? (
        <p className="field-hint">{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">🧑‍🤝‍🧑</span>
          <p>{t('friends.empty')}</p>
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
                  onClick={() => setIntroducing(f)}
                  title={t('friends.introduceTitle', { name: f.name })}
                >
                  <Handshake size={16} /> {t('friends.introduce')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {introducing && (
        <IntroduceModal
          friend={introducing}
          others={others}
          onClose={() => setIntroducing(null)}
        />
      )}
    </div>
  );
}

function IntroduceModal({
  friend,
  others,
  onClose,
}: {
  friend: AuthUser;
  others: AuthUser[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmIntroduce() {
    if (selected.size === 0) return;
    setBusy(true);
    setNote('');
    try {
      await Promise.all([...selected].map((id) => apiIntroduceFriends(friend.id, id)));
      const names = others
        .filter((f) => selected.has(f.id))
        .map((f) => f.name)
        .join(', ');
      setNote(t('friends.introduced', { name: friend.name, names }));
      setSelected(new Set());
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('friends.introduceModalAria', { name: friend.name })}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('friends.introduceHeading', { name: friend.name })}</h3>
        <p>{t('friends.introduceBody', { name: friend.name })}</p>

        {others.length === 0 ? (
          <p className="field-hint">{t('friends.needMore')}</p>
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
          {busy ? t('friends.connecting') : t('friends.connect')}
        </button>
        <button className="btn link" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
