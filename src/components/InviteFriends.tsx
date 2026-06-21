import { useEffect, useState } from 'react';
import { BookUser, Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { apiCreateInvite } from '../api/client';
import { contactsSupported, pickContact } from '../utils/contacts';

const SHARE_TEXT = 'Ich schicke dir Postkarten über Wanderpost! Tritt mit diesem Link bei:';

export function InviteFriends({ onClose }: { onClose: () => void }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [contactNote, setContactNote] = useState('');
  const canPickContacts = contactsSupported();

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

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${link}`)}`;

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ title: 'Wanderpost', text: SHARE_TEXT, url: link });
    } catch {
      /* user cancelled or sharing unavailable */
    }
  }

  // Pick someone from the device's address book and email them the invite link.
  async function fromContacts() {
    setContactNote('');
    const contact = await pickContact();
    if (!contact) return;
    if (!contact.email) {
      setContactNote('Dieser Kontakt hat keine E-Mail-Adresse hinterlegt.');
      return;
    }
    try {
      const r = await apiCreateInvite({ email: contact.email });
      const who = contact.name || contact.email;
      setContactNote(
        r.emailed
          ? `Einladung an ${who} verschickt ✓`
          : `Teile den Link mit ${who} – die Adresse ist gleich übernommen.`,
      );
    } catch (err) {
      setContactNote((err as Error).message);
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Freunde einladen 💌</h3>
        {error ? (
          <p className="auth-error">{error}</p>
        ) : !link ? (
          <p>Link wird erstellt…</p>
        ) : (
          <>
            <p>Teile diesen Link, damit Freund:innen beitreten und deine Postkarten empfangen können.</p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} />

            <div className="invite-actions">
              {canShare && (
                <button className="btn primary" onClick={share}>
                  <Share2 size={16} /> Teilen
                </button>
              )}
              <a className="btn ghost" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> WhatsApp
              </a>
              <button className="btn ghost" onClick={copy}>
                {copied ? <><Check size={16} /> Kopiert</> : <><Link2 size={16} /> Link kopieren</>}
              </button>
              {canPickContacts && (
                <button className="btn ghost" onClick={fromContacts}>
                  <BookUser size={16} /> Aus Kontakten
                </button>
              )}
            </div>
            {contactNote && <p className="field-hint">{contactNote}</p>}
          </>
        )}
        <button className="btn link" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}
