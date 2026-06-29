import { useTranslation } from 'react-i18next';
import { useDialog } from '../hooks/useDialog';
import { ShareLinkBox } from './ShareLinkBox';

/**
 * Shown after the user creates a public link to the postcard they just designed.
 * Lets them send the link so an unregistered friend can preview the card and
 * then register to keep it.
 */
export function ShareCardDialog({ link, onClose }: { link: string; onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('shareCard.aria')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('shareCard.heading')}</h3>
        <p>{t('shareCard.body')}</p>
        <ShareLinkBox link={link} shareText={t('shareCard.shareText')} />
        <button className="btn link" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
