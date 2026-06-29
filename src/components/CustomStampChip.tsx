import { useTranslation } from 'react-i18next';
import type { Stamp } from '../types';
import { useLongPress } from '../hooks/useLongPress';

interface Props {
  stamp: Stamp;
  selected: boolean;
  onSelect: () => void;
  /** Triggered by a long press — used to remove the stamp. */
  onRemove: () => void;
}

/** A chip for one self-made stamp: tap to select, long-press to remove. */
export function CustomStampChip({ stamp, selected, onSelect, onRemove }: Props) {
  const { t } = useTranslation();
  const { handlers, didLongPress } = useLongPress(onRemove);

  return (
    <button
      type="button"
      className={`stamp-chip ${selected ? 'sel' : ''}`}
      style={{ background: stamp.bg }}
      // A long press fires onRemove; swallow the click that follows it.
      onClick={() => {
        if (!didLongPress()) onSelect();
      }}
      onContextMenu={(e) => e.preventDefault()}
      title={t('stamp.customChipTitle')}
      {...handlers}
    >
      {stamp.emoji}
    </button>
  );
}
