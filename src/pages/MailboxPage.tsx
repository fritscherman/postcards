import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Inbox, Pin, PinOff, Reply, Search, Send, Trash2 } from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';
import { PostcardCard } from '../components/PostcardCard';
import { PostcardDetail } from '../components/PostcardDetail';
import { GuestBanner } from '../components/GuestBanner';
import { useFeedback } from '../components/Feedback';
import type { Box, Postcard } from '../types';

export function MailboxPage() {
  const { t } = useTranslation();
  const { cardsIn, markRead, removePostcard, restorePostcard, togglePin, isPinned, toggleLike } =
    usePostcards();
  const { notify } = useFeedback();
  const navigate = useNavigate();

  // Delete immediately but offer a one-tap undo, so a mis-tap never loses a card.
  function handleDelete(card: Postcard) {
    const wasPinned = isPinned(card.id);
    removePostcard(card.id);
    notify(t('mailbox.deleted'), {
      type: 'info',
      action: { label: t('common.undo'), onClick: () => restorePostcard(card, wasPinned) },
    });
  }
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
        <h1>{t('mailbox.title')}</h1>
        <p>{t('mailbox.subtitle')}</p>
      </header>

      {toast && <div className="toast">{t('mailbox.sentToast')}</div>}

      {box === 'inbox' && (
        <GuestBanner message={t('mailbox.guestBanner')} />
      )}

      <div className="tabs">
        <button className={`tab ${box === 'inbox' ? 'on' : ''}`} onClick={() => setBox('inbox')}>
          <Inbox size={17} /> {t('mailbox.inboxTab', { count: cardsIn('inbox').length })}
        </button>
        <button className={`tab ${box === 'outbox' ? 'on' : ''}`} onClick={() => setBox('outbox')}>
          <Send size={16} /> {t('mailbox.outboxTab', { count: cardsIn('outbox').length })}
        </button>
      </div>

      {box === 'outbox' && likesReceived > 0 && (
        <p className="likes-total">{t('mailbox.likesReceived', { count: likesReceived })}</p>
      )}

      {cards.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">{box === 'inbox' ? '📭' : '✈️'}</span>
          <p>
            {box === 'inbox'
              ? t('mailbox.emptyInbox')
              : t('mailbox.emptyOutbox')}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <div key={card.id} className="card-cell">
              {box === 'inbox' && !card.read && <span className="new-flag">{t('mailbox.newFlag')}</span>}
              <div onMouseEnter={() => !card.read && markRead(card.id)}>
                <PostcardCard card={card} />
              </div>
              {box === 'inbox' && (
                <div className="card-like-bar">
                  <button
                    className={`like-heart-btn sm ${card.liked ? 'liked' : ''}`}
                    onClick={() => toggleLike(card.id)}
                    aria-pressed={card.liked}
                    aria-label={card.liked ? t('mailbox.liked') : t('mailbox.like')}
                    title={card.liked ? t('mailbox.liked') : t('mailbox.like')}
                  >
                    <Heart size={22} fill={card.liked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="btn ghost sm reply-btn"
                    onClick={() => navigate(`/create?to=${encodeURIComponent(card.fromEmail ?? card.from)}`)}
                    title={t('mailbox.replyTitle', { name: card.from })}
                  >
                    <Reply size={16} /> {t('mailbox.reply')}
                  </button>
                </div>
              )}
              <div className="card-meta">
                <span>
                  {box === 'inbox' ? t('mailbox.fromLabel', { name: card.from }) : t('mailbox.toLabel', { name: card.to })}
                  {box === 'outbox' && card.liked && (
                    <Heart size={14} className="liked-heart" fill="currentColor" aria-label={t('mailbox.recipientLiked')} />
                  )}
                </span>
                <span className="card-meta-actions">
                  <button
                    className={`btn link icon-btn ${isPinned(card.id) ? 'pinned-on' : ''}`}
                    onClick={() => togglePin(card.id)}
                    title={isPinned(card.id) ? t('mailbox.unpinTitle') : t('mailbox.pinTitle')}
                    aria-pressed={isPinned(card.id)}
                  >
                    {isPinned(card.id) ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                  <button className="btn link icon-btn" onClick={() => setDetail(card)} title={t('common.details')}>
                    <Search size={16} />
                  </button>
                  <button className="btn link danger icon-btn" onClick={() => handleDelete(card)} title={t('common.delete')}>
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
