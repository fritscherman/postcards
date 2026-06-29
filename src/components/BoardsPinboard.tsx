import { useCallback, useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { apiCreateBoard, apiListBoards, type BoardSummary } from '../api/client';
import { useFeedback } from './Feedback';
import { useDialog } from '../hooks/useDialog';
import { SharedBoard } from './SharedBoard';

/** Online mode: manage several shared pinboards and switch between them. */
export function BoardsPinboard() {
  const { notify } = useFeedback();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { boards } = await apiListBoards();
      setBoards(boards);
      // Keep a valid selection: first load picks the newest, deletions fall back.
      setSelectedId((prev) =>
        prev && boards.some((b) => b.id === prev) ? prev : boards[0]?.id ?? null,
      );
    } catch (err) {
      notify('Pinwände konnten nicht geladen werden: ' + (err as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = boards.find((b) => b.id === selectedId) ?? null;

  if (loading) return <p className="field-hint">Lädt…</p>;

  return (
    <>
      <div className="board-tabs">
        {boards.map((b) => (
          <button
            key={b.id}
            className={`board-tab ${b.id === selectedId ? 'sel' : ''}`}
            onClick={() => setSelectedId(b.id)}
            title={`${b.name} · ${b.memberCount} Mitglieder · ${b.cardCount} Karten`}
          >
            {b.name}
            {b.memberCount > 1 && (
              <span className="board-tab-badge">
                <Users size={12} /> {b.memberCount}
              </span>
            )}
          </button>
        ))}
        <button className="board-tab new" onClick={() => setCreating(true)} title="Neue Pinwand">
          <Plus size={15} /> Neue Pinwand
        </button>
      </div>

      {selected ? (
        <SharedBoard
          key={selected.id}
          board={selected}
          onChanged={refresh}
          onGone={() => setSelectedId(null)}
        />
      ) : (
        <div className="board-empty-state">
          <Users size={40} strokeWidth={1.5} />
          <h2>Noch keine Pinwand</h2>
          <p>
            Erstelle eine Pinwand, häng deine Lieblingskarten auf und lade Freund:innen ein, gemeinsam
            zu pinnen.
          </p>
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Pinwand erstellen
          </button>
        </div>
      )}

      {creating && (
        <CreateBoard
          onClose={() => setCreating(false)}
          onCreated={(board) => {
            setCreating(false);
            setBoards((prev) => [board, ...prev]);
            setSelectedId(board.id);
          }}
        />
      )}
    </>
  );
}

function CreateBoard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (board: BoardSummary) => void;
}) {
  const { notify } = useFeedback();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    try {
      const { board } = await apiCreateBoard(next);
      onCreated(board);
    } catch (err) {
      notify('Erstellen fehlgeschlagen: ' + (err as Error).message, { type: 'error' });
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
        aria-label="Neue Pinwand"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Neue Pinwand 📌</h3>
        <p>Gib ihr einen Namen — z. B. „Sommer 2026“ oder „Unsere Reisen“.</p>
        <input
          value={name}
          maxLength={40}
          autoFocus
          placeholder="Name der Pinwand"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          aria-label="Name der Pinwand"
        />
        <button className="btn primary" onClick={create} disabled={busy || !name.trim()}>
          {busy ? 'Erstellt…' : 'Erstellen'}
        </button>
        <button className="btn link" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
