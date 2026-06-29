import { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useDialog } from '../hooks/useDialog';
import type { Postcard } from '../types';

interface Props {
  card: Postcard;
  onClose: () => void;
}

// Image-only viewer opened from the magnifier. Zoom / pan / pinch are handled by
// react-zoom-pan-pinch, which owns the touch + wheel gestures so the browser
// never mistakes a pinch or drag for a page scroll.
export function PostcardDetail({ card, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialog<HTMLDivElement>(onClose);

  // Freeze the page behind the viewer so a gesture that reaches the backdrop
  // can't scroll the underlying page.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="detail detail-viewer"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('detail.aria')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>

        <TransformWrapper
          minScale={1}
          maxScale={5}
          centerOnInit
          doubleClick={{ mode: 'toggle', step: 1.6 }}
          wheel={{ step: 0.12 }}
          pinch={{ step: 6 }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperClass="detail-photo zoomable"
                contentClass="zoom-content"
              >
                <img
                  src={card.image}
                  alt={t('card.alt')}
                  draggable={false}
                  style={{ filter: card.filter || 'none' }}
                />
              </TransformComponent>

              <div className="zoom-controls" role="group" aria-label={t('detail.zoomGroup')}>
                <button type="button" onClick={() => zoomOut()} aria-label={t('detail.zoomOut')}><ZoomOut size={18} /></button>
                <button type="button" onClick={() => resetTransform()} aria-label={t('detail.reset')}><Maximize size={18} /></button>
                <button type="button" onClick={() => zoomIn()} aria-label={t('detail.zoomIn')}><ZoomIn size={18} /></button>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
