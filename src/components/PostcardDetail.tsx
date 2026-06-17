import type { Postcard } from '../types';
import { stampById, templateById } from '../data/templates';

interface Props {
  card: Postcard;
  onClose: () => void;
}

export function PostcardDetail({ card, onClose }: Props) {
  const template = templateById(card.templateId);
  const stamp = stampById(card.stampId);
  const date = new Date(card.createdAt).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const crop = card.crop ?? { zoom: 1, x: 50, y: 50 };
  const imgStyle = {
    filter: card.filter || 'none',
    transform: `scale(${crop.zoom})`,
    transformOrigin: `${crop.x}% ${crop.y}%`,
    aspectRatio: card.orientation === 'portrait' ? '2 / 3' : '3 / 2',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-photo">
          <img src={card.image} alt="Postkarten-Motiv" style={imgStyle} />
          <span className="detail-stamp" style={{ background: stamp.bg }}>{stamp.emoji}</span>
        </div>
        <div className="detail-body">
          <p className="detail-message" style={{ fontFamily: template.font }}>
            {card.message || 'Liebe Grüße!'}
          </p>
          <dl className="detail-meta">
            <div><dt>Von</dt><dd>{card.from}</dd></div>
            <div><dt>An</dt><dd>{card.to}</dd></div>
            {card.location?.label && <div><dt>Ort</dt><dd>📍 {card.location.label}</dd></div>}
            <div><dt>Datum</dt><dd>{date}</dd></div>
            <div><dt>Vorlage</dt><dd>{template.name}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
