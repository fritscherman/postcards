import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';
import { PostcardCard } from '../components/PostcardCard';

export function PinboardPage() {
  const { pinnedCards, movePin, togglePin } = usePostcards();
  const boardRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  function onPointerDown(e: React.PointerEvent, id: string) {
    dragId.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.min(0.92, Math.max(0.02, (e.clientX - rect.left) / rect.width));
    const y = Math.min(0.9, Math.max(0.02, (e.clientY - rect.top) / rect.height));
    movePin(dragId.current, { x, y });
  }

  function onPointerUp() {
    dragId.current = null;
  }

  return (
    <div className="page pinboard-page">
      <header className="page-head">
        <h1>Pinwand</h1>
        <p>Häng deine Lieblingskarten auf und zieh sie zurecht.</p>
      </header>

      {pinnedCards.length === 0 ? (
        <div className="board-empty-state">
          <Pin size={40} strokeWidth={1.5} />
          <h2>Deine Pinwand ist noch leer</h2>
          <p>
            Öffne im <Link to="/mailbox">Briefkasten</Link> eine Karte und tippe auf
            „Anpinnen“ — sie erscheint dann hier zum Aufhängen und Verschieben.
          </p>
        </div>
      ) : (
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
                  <PostcardCard card={card} flippable={false} />
                </div>
              </div>
            ))}
          </div>
          <p className="board-tip">Tipp: Karten lassen sich frei verschieben — ziehe sie einfach übers Brett.</p>
        </>
      )}
    </div>
  );
}
