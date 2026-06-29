import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { PostcardCard } from './PostcardCard';
import type { Postcard } from '../types';

/**
 * Full-screen "loupe" view of a single postcard. Renders the card at a large,
 * readable size so the message and address are easy to read; the card stays
 * flippable here too.
 */
export function CardLightbox({ card, onClose }: { card: Postcard; onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card-lightbox"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('pinboard.enlargeTitle')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="card-lightbox-close"
          onClick={onClose}
          title={t('common.close')}
          aria-label={t('common.close')}
        >
          <X size={20} />
        </button>
        <PostcardCard card={card} />
      </div>
    </div>
  );
}
