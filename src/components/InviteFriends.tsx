import { useState } from 'react';
import { apiCreateInvite } from '../api/client';

export function InviteFriends({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    setError('');
    try {
      const r = await apiCreateInvite({ email: email.trim() || undefined });
      setResult({ link: r.link, emailed: r.emailed });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
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
        {!result ? (
          <>
            <p>Schick einen Einladungslink — optional direkt per E-Mail (wenn der Versand konfiguriert ist).</p>
            <input
              type="email"
              placeholder="freund@example.com (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="btn primary" onClick={create} disabled={busy}>
              {busy ? '…' : 'Einladung erstellen'}
            </button>
          </>
        ) : (
          <>
            <p>
              {result.emailed
                ? 'Einladung per E-Mail verschickt ✅ — du kannst den Link zusätzlich teilen:'
                : 'Teile diesen Link (z. B. per WhatsApp):'}
            </p>
            <input readOnly value={result.link} onFocus={(e) => e.target.select()} />
            <button className="btn primary" onClick={copy}>
              {copied ? 'Kopiert ✓' : 'Link kopieren'}
            </button>
          </>
        )}
        <button className="btn link" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}
