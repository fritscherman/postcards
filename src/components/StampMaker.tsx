import { useState } from 'react';
import type { Stamp } from '../types';
import {
  STAMP_COLORS,
  STAMP_EMOJIS,
  makeCustomStamp,
} from '../data/templates';
import { useDialog } from '../hooks/useDialog';

interface Props {
  /** the stamp currently being edited, if the user is tweaking an existing one */
  initial?: Stamp;
  onApply: (stamp: Stamp) => void;
  onClose: () => void;
}

/** Little designer for a self-made stamp: pick an emoji (or type your own)
 *  and a background colour, with a live preview of the finished stamp. */
export function StampMaker({ initial, onApply, onClose }: Props) {
  const ref = useDialog<HTMLDivElement>(onClose);
  const [emoji, setEmoji] = useState(initial?.emoji ?? STAMP_EMOJIS[0]);
  const [bg, setBg] = useState(initial?.bg ?? STAMP_COLORS[2]);

  const preview = makeCustomStamp(emoji, bg);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal stamp-maker"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Eigene Briefmarke gestalten"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Eigene Briefmarke 🏷️</h3>

        <div className="stamp-maker-preview">
          <div className="stamp big" style={{ background: preview.bg }}>
            <span>{preview.emoji}</span>
          </div>
        </div>

        <label className="mini-label">Motiv</label>
        <div className="emoji-grid">
          {STAMP_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`emoji-pick ${emoji === e ? 'sel' : ''}`}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          className="emoji-input"
          value={emoji}
          maxLength={4}
          aria-label="Eigenes Emoji"
          placeholder="oder eigenes Emoji…"
          onChange={(e) => setEmoji(e.target.value)}
        />

        <label className="mini-label">Hintergrund</label>
        <div className="color-grid">
          {STAMP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-pick ${bg === c ? 'sel' : ''}`}
              style={{ background: c }}
              aria-label={`Farbe ${c}`}
              onClick={() => setBg(c)}
            />
          ))}
        </div>

        <div className="invite-actions">
          <button className="btn primary" onClick={() => onApply(preview)}>
            Übernehmen
          </button>
          <button className="btn ghost" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
