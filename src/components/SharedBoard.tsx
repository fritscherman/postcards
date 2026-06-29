import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, PinOff, Plus, Trash2, UserPlus, LogOut } from 'lucide-react';
import {
  apiAddBoardMember,
  apiDeleteBoard,
  apiGetBoard,
  apiListFriends,
  apiMoveBoardCard,
  apiPinBoardCard,
  apiRemoveBoardMember,
  apiRenameBoard,
  apiUnpinBoardCard,
  type AuthUser,
  type BoardCard,
  type BoardDetail,
  type BoardSummary,
} from '../api/client';
import { usePostcards } from '../store/PostcardStore';
import { useAuth } from '../auth/AuthContext';
import { useFeedback } from './Feedback';
import { useDialog } from '../hooks/useDialog';
import { initials } from '../utils/initials';
import { PostcardCard } from './PostcardCard';
import type { Postcard } from '../types';

interface Props {
  board: BoardSummary;
  /** Called after a change that affects the board list (rename, delete, leave). */
  onChanged: () => void;
  /** Called after the board is deleted or left, so the parent can deselect it. */
  onGone: () => void;
}

/** Turn a board placement into the Postcard shape PostcardCard expects. */
function toPostcard(c: BoardCard): Postcard {
  return {
    id: c.postcardId,
    image: c.image,
    templateId: c.templateId,
    stampId: c.stampId,
    customStamp: c.customStamp,
    filter: c.filter,
    orientation: c.orientation,
    crop: c.crop,
    message: c.message,
    to: c.to,
    from: c.from,
    createdAt: c.createdAt,
    box: 'inbox',
    read: true,
    pin: { x: c.x, y: c.y, rotation: c.rotation },
  };
}

export function SharedBoard({ board, onChanged, onGone }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const myId = user?.id ?? '';
  const isOwner = board.ownerId === myId;

  const [detail, setDetail] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await apiGetBoard(board.id));
    } catch (err) {
      notify(t('boards.boardLoadError', { error: (err as Error).message }), { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [board.id, notify, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Drag to rearrange (persists on pointer up) ---
  const boardRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  function onPointerDown(e: React.PointerEvent, placementId: string) {
    dragId.current = placementId;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragged.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId.current || !boardRef.current) return;
    if (dragStart.current) {
      const moved = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
      if (moved > 6) dragged.current = true;
    }
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.min(0.92, Math.max(0.02, (e.clientX - rect.left) / rect.width));
    const y = Math.min(0.9, Math.max(0.02, (e.clientY - rect.top) / rect.height));
    setDetail((prev) =>
      prev
        ? { ...prev, cards: prev.cards.map((c) => (c.placementId === dragId.current ? { ...c, x, y } : c)) }
        : prev,
    );
  }

  function onPointerUp() {
    const id = dragId.current;
    dragId.current = null;
    dragStart.current = null;
    if (!id || !dragged.current) return;
    const card = detail?.cards.find((c) => c.placementId === id);
    if (card) {
      apiMoveBoardCard(board.id, id, { x: card.x, y: card.y, rotation: card.rotation }).catch(() => {});
    }
  }

  function onClickCapture(e: React.MouseEvent) {
    if (dragged.current) {
      e.stopPropagation();
      dragged.current = false;
    }
  }

  async function unpin(card: BoardCard) {
    setDetail((prev) =>
      prev ? { ...prev, cards: prev.cards.filter((c) => c.placementId !== card.placementId) } : prev,
    );
    try {
      await apiUnpinBoardCard(board.id, card.placementId);
      onChanged();
    } catch (err) {
      notify(t('boards.unpinError', { error: (err as Error).message }), { type: 'error' });
      void load();
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t('boards.deleteTitle'),
      message: t('boards.deleteMessage', { name: board.name }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiDeleteBoard(board.id);
      onGone();
      onChanged();
    } catch (err) {
      notify(t('boards.deleteError', { error: (err as Error).message }), { type: 'error' });
    }
  }

  async function handleLeave() {
    const ok = await confirm({
      title: t('boards.leaveTitle'),
      message: t('boards.leaveMessage', { name: board.name }),
      confirmLabel: t('boards.leave'),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiRemoveBoardMember(board.id, myId);
      onGone();
      onChanged();
    } catch (err) {
      notify(t('boards.leaveError', { error: (err as Error).message }), { type: 'error' });
    }
  }

  const cards = detail?.cards ?? [];
  const members = detail?.members ?? [];

  return (
    <div className="shared-board">
      <div className="board-toolbar">
        <div className="board-members" title={t('boards.members')}>
          {members.map((m) => (
            <span
              key={m.id}
              className="board-avatar"
              title={m.id === board.ownerId ? t('boards.ownerLabel', { name: m.name }) : m.name}
            >
              {initials(m.name)}
            </span>
          ))}
        </div>
        <div className="board-toolbar-actions">
          <button className="btn ghost small" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> {t('boards.member')}
          </button>
          <button className="btn ghost small" onClick={() => setPicking(true)}>
            <Plus size={15} /> {t('boards.pinCard')}
          </button>
          {isOwner ? (
            <>
              <button className="btn ghost small" onClick={() => setRenaming(true)} title={t('boards.rename')}>
                <Pencil size={15} />
              </button>
              <button className="btn ghost small danger" onClick={handleDelete} title={t('boards.deleteBoard')}>
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <button className="btn ghost small danger" onClick={handleLeave} title={t('boards.leaveBoard')}>
              <LogOut size={15} /> {t('boards.leave')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="field-hint">{t('common.loading')}</p>
      ) : (
        <>
          <div
            className="corkboard"
            ref={boardRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {cards.length === 0 && (
              <div className="board-empty">{t('boards.emptyCards')}</div>
            )}
            {cards.map((card) => {
              const canRemove = card.placedBy === myId || isOwner;
              return (
                <div
                  key={card.placementId}
                  className="pinned"
                  style={{
                    left: `${card.x * 100}%`,
                    top: `${card.y * 100}%`,
                    transform: `translate(-50%, -10%) rotate(${card.rotation}deg)`,
                  }}
                  onPointerDown={(e) => onPointerDown(e, card.placementId)}
                  onClickCapture={onClickCapture}
                >
                  <span className="thumbtack" />
                  {canRemove && (
                    <button
                      type="button"
                      className="unpin-btn"
                      title={t('pinboard.unpinTitle')}
                      aria-label={t('pinboard.unpinTitle')}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => unpin(card)}
                    >
                      <PinOff size={16} />
                    </button>
                  )}
                  <div className="pinned-inner">
                    <PostcardCard card={toPostcard(card)} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="board-tip">{t('boards.sharedTip')}</p>
        </>
      )}

      {picking && detail && (
        <CardPicker
          boardId={board.id}
          existing={new Set(cards.map((c) => c.postcardId))}
          onClose={() => setPicking(false)}
          onPinned={() => {
            setPicking(false);
            onChanged();
            void load();
          }}
        />
      )}

      {adding && detail && (
        <MemberAdder
          boardId={board.id}
          members={members}
          onClose={() => setAdding(false)}
          onAdded={() => {
            onChanged();
            void load();
          }}
        />
      )}

      {renaming && detail && (
        <RenameBoard
          boardId={board.id}
          current={board.name}
          onClose={() => setRenaming(false)}
          onRenamed={() => {
            setRenaming(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/** Pick one of my own postcards and pin it to the board. */
function CardPicker({
  boardId,
  existing,
  onClose,
  onPinned,
}: {
  boardId: string;
  existing: Set<string>;
  onClose: () => void;
  onPinned: () => void;
}) {
  const { t } = useTranslation();
  const { postcards } = usePostcards();
  const { notify } = useFeedback();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [busy, setBusy] = useState(false);
  const available = useMemo(() => postcards.filter((p) => !existing.has(p.id)), [postcards, existing]);

  async function pin(p: Postcard) {
    setBusy(true);
    try {
      await apiPinBoardCard(boardId, {
        postcardId: p.id,
        // Scatter new cards near the middle so they don't stack exactly.
        x: 0.3 + Math.random() * 0.4,
        y: 0.25 + Math.random() * 0.4,
        rotation: Math.round((Math.random() - 0.5) * 14),
      });
      onPinned();
    } catch (err) {
      notify(t('boards.pinError', { error: (err as Error).message }), { type: 'error' });
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal card-picker"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('boards.pinCard')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('boards.pinCardHeading')}</h3>
        {available.length === 0 ? (
          <p className="field-hint">{t('boards.noCardsToPin')}</p>
        ) : (
          <div className="card-picker-grid">
            {available.map((p) => (
              <button
                key={p.id}
                type="button"
                className="card-picker-item"
                disabled={busy}
                onClick={() => pin(p)}
                title={`${p.from} → ${p.to}`}
              >
                <img src={p.image} alt="" />
              </button>
            ))}
          </div>
        )}
        <button className="btn link" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

/** Add one of my friends (who isn't already a member) to the board. */
function MemberAdder({
  boardId,
  members,
  onClose,
  onAdded,
}: {
  boardId: string;
  members: { id: string }[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const { notify } = useFeedback();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [friends, setFriends] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    apiListFriends()
      .then((r) => setFriends(r.friends))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, []);

  const memberIds = new Set(members.map((m) => m.id));
  const candidates = friends.filter((f) => !memberIds.has(f.id));

  async function add(f: AuthUser) {
    setBusy(f.id);
    try {
      await apiAddBoardMember(boardId, f.id);
      notify(t('boards.memberAdded', { name: f.name }));
      onAdded();
      onClose();
    } catch (err) {
      notify(t('boards.addMemberError', { error: (err as Error).message }), { type: 'error' });
      setBusy('');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('boards.addMember')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('boards.addMemberHeading')}</h3>
        <p>{t('boards.addMemberBody')}</p>
        {loading ? (
          <p className="field-hint">{t('common.loading')}</p>
        ) : candidates.length === 0 ? (
          <p className="field-hint">{t('boards.noCandidates')}</p>
        ) : (
          <ul className="friend-list">
            {candidates.map((f) => (
              <li key={f.id} className="friend-row">
                <span className="friend-avatar">{initials(f.name)}</span>
                <span className="friend-info">
                  <strong>{f.name}</strong>
                  {f.email && <span className="friend-email">{f.email}</span>}
                </span>
                <button
                  className="btn ghost small friend-action"
                  disabled={busy === f.id}
                  onClick={() => add(f)}
                >
                  <UserPlus size={15} /> {busy === f.id ? t('boards.adding') : t('boards.add')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn link" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

/** Rename a board (owner only). */
function RenameBoard({
  boardId,
  current,
  onClose,
  onRenamed,
}: {
  boardId: string;
  current: string;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const { t } = useTranslation();
  const { notify } = useFeedback();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);

  async function save() {
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    try {
      await apiRenameBoard(boardId, next);
      onRenamed();
    } catch (err) {
      notify(t('boards.renameError', { error: (err as Error).message }), { type: 'error' });
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
        aria-label={t('boards.renameTitle')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('boards.renameTitle')}</h3>
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          aria-label={t('boards.nameLabel')}
        />
        <button className="btn primary" onClick={save} disabled={busy || !name.trim()}>
          {busy ? t('common.saving') : t('common.save')}
        </button>
        <button className="btn link" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
