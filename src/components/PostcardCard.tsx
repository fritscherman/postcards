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
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onWrapMove(e: React.PointerEvent) {
    if (!editable || !last.current || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const dx = ((e.clientX - last.current.x) / r.width) * 100 / crop.zoom;
    const dy = ((e.clientY - last.current.y) / r.height) * 100 / crop.zoom;
    last.current = { x: e.clientX, y: e.clientY };
    onCropChange?.({ ...crop, x: clamp(crop.x - dx, 0, 100), y: clamp(crop.y - dy, 0, 100) });
  }
  function onWrapUp() {
    last.current = null;
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
            {editable && <span className="photo-grip">✥ ziehen zum Positionieren</span>}
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
