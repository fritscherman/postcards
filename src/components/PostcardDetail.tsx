import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
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
  const dialogRef = useDialog<HTMLDivElement>(onClose);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="detail detail-viewer"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Postkarte ansehen"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" onClick={onClose} aria-label="Schließen"><X size={18} /></button>

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
                  alt="Postkarten-Motiv"
                  draggable={false}
                  style={{ filter: card.filter || 'none' }}
                />
              </TransformComponent>

              <div className="zoom-controls" role="group" aria-label="Zoom">
                <button type="button" onClick={() => zoomOut()} aria-label="Verkleinern"><ZoomOut size={18} /></button>
                <button type="button" onClick={() => resetTransform()} aria-label="Ansicht zurücksetzen"><Maximize size={18} /></button>
                <button type="button" onClick={() => zoomIn()} aria-label="Vergrößern"><ZoomIn size={18} /></button>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
