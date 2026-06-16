import { useState } from 'react';
import type { Postcard } from '../types';
import { stampById, templateById } from '../data/templates';

interface Props {
  card: Postcard;
  /** when true the card shows a flip icon and can be turned over */
  flippable?: boolean;
  /** overrides the body tap (the flip icon still turns the card) */
  onCardClick?: () => void;
}

export function PostcardCard({ card, flippable = true, onCardClick }: Props) {
  const [flipped, setFlipped] = useState(false);
  const template = templateById(card.templateId);
  const stamp = stampById(card.stampId);

  const date = new Date(card.createdAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handleBody() {
    if (onCardClick) onCardClick();
    else if (flippable) setFlipped((f) => !f);
  }

  return (
    <div
      className={`postcard ${flipped ? 'flipped' : ''}`}
      onClick={handleBody}
      role={onCardClick || flippable ? 'button' : undefined}
      title={onCardClick ? undefined : flippable ? 'Klicken zum Umdrehen' : undefined}
    >
      <div className="postcard-inner">
        {/* Front: the photo */}
        <div className="postcard-face postcard-front" style={{ background: template.frame }}>
          <div className="photo-wrap">
            <img src={card.image} alt="Postkarten-Motiv" draggable={false} style={{ filter: card.filter || 'none' }} />
            {card.location?.label && <span className="photo-location">📍 {card.location.label}</span>}
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
