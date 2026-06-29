import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';
import { PostcardCard } from './PostcardCard';

/** The single, on-device pinboard used in demo / guest mode. */
export function LocalPinboard() {
  const { pinnedCards, movePin, togglePin } = usePostcards();
  const boardRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  // Remember where a drag started and whether it actually moved, so a genuine
  // tap can flip the card while a drag does not.
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  function onPointerDown(e: React.PointerEvent, id: string) {
    dragId.current = id;
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
    movePin(dragId.current, { x, y });
  }

  function onPointerUp() {
    dragId.current = null;
    dragStart.current = null;
  }

  // After a real drag, swallow the trailing click so the card doesn't flip.
  function onClickCapture(e: React.MouseEvent) {
    if (dragged.current) {
      e.stopPropagation();
      dragged.current = false;
    }
  }

  if (pinnedCards.length === 0) {
    return (
      <div className="board-empty-state">
        <Pin size={40} strokeWidth={1.5} />
        <h2>Deine Pinwand ist noch leer</h2>
        <p>
          Öffne im <Link to="/mailbox">Briefkasten</Link> eine Karte und tippe auf
          „Anpinnen“ — sie erscheint dann hier zum Aufhängen und Verschieben.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="corkboard"
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {pinnedCards.map((card) => (
          <div
            key={card.id}
            className="pinned"
            style={{
              left: `${card.pin.x * 100}%`,
              top: `${card.pin.y * 100}%`,
              transform: `translate(-50%, -10%) rotate(${card.pin.rotation}deg)`,
            }}
            onPointerDown={(e) => onPointerDown(e, card.id)}
            onClickCapture={onClickCapture}
          >
            <span className="thumbtack" />
            <button
              type="button"
              className="unpin-btn"
              title="Von der Pinwand nehmen"
              aria-label="Von der Pinwand nehmen"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => togglePin(card.id)}
            >
              <PinOff size={16} />
            </button>
            <div className="pinned-inner">
              <PostcardCard card={card} />
            </div>
          </div>
        ))}
      </div>
      <p className="board-tip">
        Tipp: Karten lassen sich frei verschieben — ziehe sie einfach übers Brett. Tippe auf eine
        Karte oder das ⟳-Symbol, um die Rückseite zu sehen.
      </p>
    </>
  );
}
