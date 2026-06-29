import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';

/**
 * The reusable "share a link" block: a scannable QR code, the raw link, and
 * native-share / WhatsApp / copy actions. Used both to invite friends and to
 * share a single designed postcard.
 */
export function ShareLinkBox({ link, shareText }: { link: string; shareText: string }) {
  const { t } = useTranslation();
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  // Render a scannable QR code of the link — handy when showing your phone to
  // someone in person.
  useEffect(() => {
    if (!link) return;
    let active = true;
    QRCode.toDataURL(link, { width: 220, margin: 1, color: { dark: '#0b5563', light: '#ffffff' } })
      .then((url) => active && setQr(url))
      .catch(() => active && setQr(''));
    return () => {
      active = false;
    };
  }, [link]);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${link}`)}`;

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ title: 'Wanderpost', text: shareText, url: link });
    } catch {
      /* user cancelled or sharing unavailable */
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <>
      {qr && (
        <div className="invite-qr">
          <img src={qr} alt={t('invite.qrAlt')} width={180} height={180} />
          <span className="invite-qr-hint">{t('invite.qrHint')}</span>
        </div>
      )}
      <input readOnly value={link} onFocus={(e) => e.target.select()} />

      <div className="invite-actions">
        {canShare && (
          <button className="btn primary" onClick={share}>
            <Share2 size={16} /> {t('invite.share')}
          </button>
        )}
        <a className="btn ghost" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} /> WhatsApp
        </a>
        <button className="btn ghost" onClick={copy}>
          {copied ? (
            <>
              <Check size={16} /> {t('invite.copied')}
            </>
          ) : (
            <>
              <Link2 size={16} /> {t('invite.copyLink')}
            </>
          )}
        </button>
      </div>
    </>
  );
}
