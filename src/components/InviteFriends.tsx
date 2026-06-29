import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiCreateInvite } from '../api/client';
import { useDialog } from '../hooks/useDialog';
import { ShareLinkBox } from './ShareLinkBox';

export function InviteFriends({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  // Generate the invite link as soon as the dialog opens.
  useEffect(() => {
    let active = true;
    apiCreateInvite({})
      .then((r) => active && setLink(r.link))
      .catch((err) => active && setError((err as Error).message));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('invite.aria')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('invite.heading')}</h3>
        {error ? (
          <p className="auth-error">{error}</p>
        ) : !link ? (
          <p>{t('invite.creating')}</p>
        ) : (
          <>
            <p>{t('invite.body')}</p>
            <ShareLinkBox link={link} shareText={t('invite.shareText')} />
          </>
        )}
        <button className="btn link" onClick={onClose}>{t('common.close')}</button>
      </div>
    </div>
  );
}
