import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Stamp } from '../types';
import {
  STAMP_COLORS,
  STAMP_EMOJIS,
  makeCustomStamp,
} from '../data/templates';
import { useDialog } from '../hooks/useDialog';

interface Props {
  onApply: (stamp: Stamp) => void;
  onClose: () => void;
}

/** Little designer for a self-made stamp: pick an emoji (or type your own)
 *  and a background colour, with a live preview of the finished stamp.
 *  Always opens blank so the emoji field shows its "own emoji" hint
 *  rather than the previously chosen one. */
export function StampMaker({ onApply, onClose }: Props) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [emoji, setEmoji] = useState('');
  const [bg, setBg] = useState(STAMP_COLORS[2]);

  const preview = makeCustomStamp(emoji, bg);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal stamp-maker"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('stamp.aria')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('stamp.heading')}</h3>

        <div className="stamp-maker-preview">
          <div className="stamp big" style={{ background: preview.bg }}>
            <span>{preview.emoji}</span>
          </div>
        </div>

        <label className="mini-label">{t('stamp.motif')}</label>
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
          aria-label={t('stamp.customEmojiAria')}
          placeholder={t('stamp.customEmojiPlaceholder')}
          onChange={(e) => setEmoji(e.target.value)}
        />

        <label className="mini-label">{t('stamp.background')}</label>
        <div className="color-grid">
          {STAMP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-pick ${bg === c ? 'sel' : ''}`}
              style={{ background: c }}
              aria-label={t('stamp.colorAria', { color: c })}
              onClick={() => setBg(c)}
            />
          ))}
        </div>

        <div className="invite-actions">
          <button className="btn primary" onClick={() => onApply(preview)}>
            {t('stamp.apply')}
          </button>
          <button className="btn ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
