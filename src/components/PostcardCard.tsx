import { useRef, useState } from 'react';
import type { Crop, Postcard } from '../types';
import { stampById, templateById } from '../data/templates';

interface Props {
  card: Postcard;
  /** when true the card shows a flip icon and can be turned over */
  flippable?: boolean;
  /** overrides the body tap (the flip icon still turns the card) */
  onCardClick?: () => void;
  /** when true the photo can be dragged to reposition the crop */
  editable?: boolean;
  onCropChange?: (crop: Crop) => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function PostcardCard({ card, flippable = true, onCardClick, editable = false, onCropChange }: Props) {
  const [flipped, setFlipped] = useState(false);
  const template = templateById(card.templateId);
  const stamp = stampById(card.stampId);
  const orientation = card.orientation ?? 'landscape';
  const crop = card.crop ?? { zoom: 1, x: 50, y: 50 };

  const wrapRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  // Active pointers (id -> position) so we can tell a one-finger pan from a
  // two-finger pinch.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  const date = new Date(card.createdAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handleBody() {
    if (onCardClick) onCardClick();
    else if (flippable) setFlipped((f) => !f);
  }

  function onWrapDown(e: React.PointerEvent) {
    if (!editable) return;
    e.stopPropagation();
    wrapRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = { x: e.clientX, y: e.clientY };
    pinchStart.current = null;
  }
  function onWrapMove(e: React.PointerEvent) {
    if (!editable || !wrapRef.current || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = wrapRef.current.getBoundingClientRect();

    // Two fingers → pinch to zoom (and follow the gesture's midpoint).
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchStart.current) {
        pinchStart.current = { dist, zoom: crop.zoom };
        last.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      } else {
        const zoom = clamp((pinchStart.current.zoom * dist) / pinchStart.current.dist, 1, 4);
        onCropChange?.({ ...crop, zoom });
      }
      return;
    }

    // One finger → pan. Gain z/(z-1) makes the photo track the finger 1:1
    // instead of crawling at a fraction of the drag distance.
    if (!last.current || crop.zoom <= 1.001) {
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const gain = crop.zoom / (crop.zoom - 1);
    const dx = ((e.clientX - last.current.x) / r.width) * 100 * gain;
    const dy = ((e.clientY - last.current.y) / r.height) * 100 * gain;
    last.current = { x: e.clientX, y: e.clientY };
    onCropChange?.({ ...crop, x: clamp(crop.x - dx, 0, 100), y: clamp(crop.y - dy, 0, 100) });
  }
  function onWrapUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchStart.current = null;
    last.current = pointers.current.size
      ? [...pointers.current.values()][0]
      : null;
  }

  const imgStyle = {
    filter: card.filter || 'none',
    transform: `scale(${crop.zoom})`,
    transformOrigin: `${crop.x}% ${crop.y}%`,
  };

  return (
    <div
      className={`postcard ${orientation} ${flipped ? 'flipped' : ''}`}
      onClick={handleBody}
      role={onCardClick || flippable ? 'button' : undefined}
      title={onCardClick ? undefined : flippable ? 'Klicken zum Umdrehen' : undefined}
    >
      <div className="postcard-inner">
        {/* Front: the photo */}
        <div className="postcard-face postcard-front" style={{ background: template.frame }}>
          <div
            className={`photo-wrap ${editable ? 'editable' : ''}`}
            ref={wrapRef}
            onPointerDown={onWrapDown}
            onPointerMove={onWrapMove}
            onPointerUp={onWrapUp}
            onPointerCancel={onWrapUp}
            onClick={(e) => editable && e.stopPropagation()}
          >
            <img src={card.image} alt="Postkarten-Motiv" draggable={false} style={imgStyle} />
            {editable && <span className="photo-grip">✥ ziehen · mit zwei Fingern zoomen</span>}
          </div>
        </div>

        {/* Back: stamp, message and address */}
        <div
          className="postcard-face postcard-back"
          style={{ background: template.frame, fontFamily: template.font }}
        >
          <div className="back-grid">
            <div className="back-message" style={{ color: template.id === 'night' ? '#f1f5f9' : '#1f2937' }}>
              {card.message || 'Liebe Grüße!'}
            </div>
            <div className="back-side">
              <div className="stamp" style={{ background: stamp.bg, borderColor: template.accent }}>
                <span>{stamp.emoji}</span>
              </div>
              <div className="address" style={{ borderColor: template.accent }}>
                <span className="addr-label" style={{ color: template.accent }}>An</span>
                <strong>{card.to}</strong>
                <span className="addr-label" style={{ color: template.accent }}>Von</span>
                <em>{card.from}</em>
                {card.location?.label && (
                  <span className="addr-loc" title={card.location.source === 'exif' ? 'Aus den Foto-Daten' : 'Hinzugefügter Ort'}>
                    📍 {card.location.label}
                  </span>
                )}
                <span className="addr-date">{date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flippable && (
        <button
          type="button"
          className="flip-btn"
          onClick={(e) => {
            e.stopPropagation();
            setFlipped((f) => !f);
          }}
          title={flipped ? 'Zur Vorderseite' : 'Karte umdrehen'}
          aria-label="Karte umdrehen"
        >
          ⟳
        </button>
      )}
    </div>
  );
}
