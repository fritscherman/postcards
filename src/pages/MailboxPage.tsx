import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, Inbox, Pin, PinOff, Search, Send, Trash2 } from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';
import { PostcardCard } from '../components/PostcardCard';
import { PostcardDetail } from '../components/PostcardDetail';
import { GuestBanner } from '../components/GuestBanner';
import type { Box, Postcard } from '../types';

export function MailboxPage() {
  const { cardsIn, markRead, removePostcard, togglePin, isPinned } = usePostcards();
  const [params, setParams] = useSearchParams();
  const [box, setBox] = useState<Box>('inbox');
  const [toast, setToast] = useState(params.get('sent') === '1');
  const [detail, setDetail] = useState<Postcard | null>(null);

  useEffect(() => {
    if (params.get('sent') === '1') {
      setBox('outbox');
      params.delete('sent');
      setParams(params, { replace: true });
      const t = setTimeout(() => setToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, [params, setParams]);

  const cards = cardsIn(box);
  const likesReceived = cardsIn('outbox').filter((c) => c.liked).length;

  return (
    <div className="page mailbox-page">
      <header className="page-head">
        <h1>Briefkasten</h1>
        <p>Deine empfangenen und versendeten Postkarten.</p>
      </header>

      {toast && <div className="toast">✅ Postkarte versendet! Sie liegt jetzt im Postausgang.</div>}

      {box === 'inbox' && (
        <GuestBanner message="Um echte Postkarten von Freund:innen zu empfangen, brauchst du ein kostenloses Konto." />
      )}

      <div className="tabs">
        <button className={`tab ${box === 'inbox' ? 'on' : ''}`} onClick={() => setBox('inbox')}>
          <Inbox size={17} /> Eingang ({cardsIn('inbox').length})
        </button>
        <button className={`tab ${box === 'outbox' ? 'on' : ''}`} onClick={() => setBox('outbox')}>
          <Send size={16} /> Ausgang ({cardsIn('outbox').length})
        </button>
      </div>

      {box === 'outbox' && likesReceived > 0 && (
        <p className="likes-total">❤️ {likesReceived} {likesReceived === 1 ? 'Like' : 'Likes'} erhalten</p>
      )}

      {cards.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">{box === 'inbox' ? '📭' : '✈️'}</span>
          <p>
            {box === 'inbox'
              ? 'Noch keine Postkarten erhalten.'
              : 'Du hast noch nichts versendet. Erstelle deine erste Karte!'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <div key={card.id} className="card-cell">
              {box === 'inbox' && !card.read && <span className="new-flag">NEU</span>}
              <div onMouseEnter={() => !card.read && markRead(card.id)}>
                <PostcardCard card={card} />
              </div>
              <div className="card-meta">
                <span>
                  {box === 'inbox' ? `von ${card.from}` : `an ${card.to}`}
                  {card.liked && (
                    <Heart size={14} className="liked-heart" fill="currentColor" aria-label="Gefällt der Empfänger:in" />
                  )}
                </span>
                <span className="card-meta-actions">
                  <button
                    className={`btn link icon-btn ${isPinned(card.id) ? 'pinned-on' : ''}`}
                    onClick={() => togglePin(card.id)}
                    title={isPinned(card.id) ? 'Von der Pinwand nehmen' : 'An die Pinwand'}
                    aria-pressed={isPinned(card.id)}
                  >
                    {isPinned(card.id) ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                  <button className="btn link icon-btn" onClick={() => setDetail(card)} title="Details">
                    <Search size={16} />
                  </button>
                  <button className="btn link danger icon-btn" onClick={() => removePostcard(card.id)} title="Löschen">
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && <PostcardDetail card={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
