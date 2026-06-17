import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Pin, PinOff, Reply, X } from 'lucide-react';
import type { Postcard } from '../types';
import { stampById, templateById } from '../data/templates';
import { usePostcards } from '../store/PostcardStore';
import { isOnline } from '../api/client';

interface Props {
  card: Postcard;
  onClose: () => void;
}

export function PostcardDetail({ card, onClose }: Props) {
  const navigate = useNavigate();
  const { toggleLike, togglePin, isPinned } = usePostcards();
  const pinned = isPinned(card.id);
  const isInbox = card.box === 'inbox';

  function reply() {
    // Prefill the create page with the original sender as recipient.
    const recipient = isOnline ? card.fromEmail ?? '' : card.from;
    navigate(`/create?to=${encodeURIComponent(recipient)}`);
    onClose();
  }
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
        <button className="detail-close" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
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
            {card.location?.label && (
              <div><dt>Ort</dt><dd className="dd-loc"><MapPin size={14} /> {card.location.label}</dd></div>
            )}
            <div><dt>Datum</dt><dd>{date}</dd></div>
            <div><dt>Vorlage</dt><dd>{template.name}</dd></div>
          </dl>

          <div className="detail-actions">
            <button
              className={`btn ghost ${pinned ? 'pinned-on' : ''}`}
              onClick={() => togglePin(card.id)}
              aria-pressed={pinned}
            >
              {pinned ? <PinOff size={16} /> : <Pin size={16} />}
              {pinned ? 'Angepinnt' : 'Anpinnen'}
            </button>
            {isInbox && (
              <button
                className={`btn ghost like-btn ${card.liked ? 'liked' : ''}`}
                onClick={() => toggleLike(card.id)}
                aria-pressed={card.liked}
              >
                <Heart size={16} fill={card.liked ? 'currentColor' : 'none'} />
                {card.liked ? 'Gefällt dir' : 'Gefällt mir'}
              </button>
            )}
            {isInbox && (
              <button className="btn primary" onClick={reply}>
                <Reply size={16} /> Mit Postkarte antworten
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
