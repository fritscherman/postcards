import { useRef } from 'react';
import { usePostcards } from '../store/PostcardStore';
import { PostcardCard } from '../components/PostcardCard';

export function PinboardPage() {
  const { postcards, movePin } = usePostcards();
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
        <p>Häng deine Lieblingskarten auf und zieh sie zurecht. 📌</p>
      </header>

      <div
        className="corkboard"
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {postcards.length === 0 && <div className="board-empty">Noch nichts angepinnt 🪧</div>}
        {postcards.map((card) => (
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
            <div className="pinned-inner">
              <PostcardCard card={card} flippable={false} />
            </div>
          </div>
        ))}
      </div>
      <p className="board-tip">Tipp: Karten lassen sich frei verschieben — ziehe sie einfach übers Brett.</p>
    </div>
  );
}
