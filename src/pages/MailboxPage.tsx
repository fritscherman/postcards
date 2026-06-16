import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePostcards } from '../store/PostcardStore';
import { PostcardCard } from '../components/PostcardCard';
import type { Box } from '../types';

export function MailboxPage() {
  const { cardsIn, markRead, removePostcard } = usePostcards();
  const [params, setParams] = useSearchParams();
  const [box, setBox] = useState<Box>('inbox');
  const [toast, setToast] = useState(params.get('sent') === '1');

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

  return (
    <div className="page mailbox-page">
      <header className="page-head">
        <h1>Briefkasten</h1>
        <p>Deine empfangenen und versendeten Postkarten.</p>
      </header>

      {toast && <div className="toast">✅ Postkarte versendet! Sie liegt jetzt im Postausgang.</div>}

      <div className="tabs">
        <button className={`tab ${box === 'inbox' ? 'on' : ''}`} onClick={() => setBox('inbox')}>
          📥 Eingang ({cardsIn('inbox').length})
        </button>
        <button className={`tab ${box === 'outbox' ? 'on' : ''}`} onClick={() => setBox('outbox')}>
          📤 Ausgang ({cardsIn('outbox').length})
        </button>
      </div>

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
                <span>{box === 'inbox' ? `von ${card.from}` : `an ${card.to}`}</span>
                <button className="btn link danger" onClick={() => removePostcard(card.id)}>
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
