import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { apiClaimShare, apiGetShare, ApiError, type SharedCard } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PostcardCard } from '../components/PostcardCard';
import { AuthPage } from './AuthPage';
import type { Postcard } from '../types';

/**
 * Public landing for a shared postcard link (`/card/:token`). Anyone can open it
 * to preview the card; signing up or in through it delivers the card to their
 * mailbox and connects them with the sender.
 */
export function SharedCardPage({ onGuest }: { onGuest?: () => void }) {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [share, setShare] = useState<{ from: string; card: SharedCard } | null>(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiGetShare(token)
      .then((r) => active && setShare(r))
      .catch((err) => active && setError((err as Error).message));
    return () => {
      active = false;
    };
  }, [token]);

  if (error) {
    return (
      <div className="landing-shell">
        <div className="share-greeting">
          <span className="share-greeting-emoji">📭</span>
          <h1>{t('shareCard.goneTitle')}</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="landing-shell">
        <p className="auth-sub">{t('common.loading')}</p>
      </div>
    );
  }

  // Assemble a renderable card from the shared payload. `to` is the viewer.
  const previewCard: Postcard = {
    id: 'shared-preview',
    image: share.card.image,
    message: share.card.message,
    templateId: share.card.templateId,
    stampId: share.card.stampId,
    customStamp: share.card.customStamp,
    filter: share.card.filter,
    orientation: share.card.orientation,
    crop: share.card.crop,
    location: share.card.location,
    to: user?.name ?? t('shareCard.youLabel'),
    from: share.from,
    createdAt: Date.now(),
    box: 'inbox',
    read: true,
    pin: { x: 0, y: 0, rotation: 0 },
  };

  const greeting = (
    <div className="share-greeting">
      <span className="share-greeting-emoji">💌</span>
      <h1>{t('shareCard.greeting', { name: share.from })}</h1>
      <p>{t('shareCard.previewFlipHint')}</p>
      <div className="share-card-wrap">
        <PostcardCard card={previewCard} />
      </div>
    </div>
  );

  // Already signed in → deliver the card straight into the mailbox.
  if (user) {
    async function claim() {
      if (!token) return;
      setClaiming(true);
      setError('');
      try {
        const r = await apiClaimShare(token);
        if (r.mine) {
          // The sender opened their own link — nothing to claim.
          navigate('/create');
          return;
        }
        // Full reload so the freshly delivered card is fetched into the mailbox.
        window.location.assign('/mailbox');
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
        else setError((err as Error).message);
        setClaiming(false);
      }
    }

    return (
      <div className="landing-shell">
        {greeting}
        <div className="auth-card landing-auth-card">
          <p className="auth-sub">{t('shareCard.signedInBody', { name: user.name })}</p>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn primary big" onClick={claim} disabled={claiming}>
            <Inbox size={17} /> {claiming ? t('common.loading') : t('shareCard.keepCard')}
          </button>
        </div>
      </div>
    );
  }

  // Not signed in → register / log in to keep the card (header shows the preview).
  return <AuthPage shareToken={token} onGuest={onGuest} header={greeting} />;
}
