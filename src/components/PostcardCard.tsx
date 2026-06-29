import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Crop, Postcard } from '../types';
import { resolveStamp, templateById } from '../data/templates';

interface Props {
  card: Postcard;
  /** when true the card shows a flip icon and can be turned over */
  flippable?: boolean;
  /** overrides the body tap (the flip icon still turns the card) */
  onCardClick?: () => void;
  /** when true the photo can be dragged to reposition the crop */
  editable?: boolean;
  onCropChange?: (crop: Crop) => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const MAX_ZOOM = 3;

// react-zoom-pan-pinch frames the photo as `translate(posX, posY) scale(s)` from
// a top-left origin. Our stored crop instead frames it with
// `transform-origin: x% y%; scale` — the form every *other* view of the card
// renders. Convert the library's live transform into that crop so the rest of
// the app stays untouched. (Solving screen = posX + s·p === s·p + (1−s)·origin
// for origin gives origin = posX / (1 − s).)
function transformToCrop(scale: number, posX: number, posY: number, w: number, h: number): Crop {
  if (scale <= 1.001 || w === 0 || h === 0) return { zoom: 1, x: 50, y: 50 };
  return {
    zoom: clamp(scale, 1, MAX_ZOOM),
    x: clamp((posX / ((1 - scale) * w)) * 100, 0, 100),
    y: clamp((posY / ((1 - scale) * h)) * 100, 0, 100),
  };
}

export function PostcardCard({ card, flippable = true, onCardClick, editable = false, onCropChange }: Props) {
  const { t, i18n } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  // Live zoom of the crop editor, only used to toggle the hint / reset button.
  const [editZoom, setEditZoom] = useState(1);
  const template = templateById(card.templateId);
  const stamp = resolveStamp(card.stampId, card.customStamp);
  const orientation = card.orientation ?? 'landscape';
  const crop = card.crop ?? { zoom: 1, x: 50, y: 50 };

  const date = new Date(card.createdAt).toLocaleDateString(i18n.language || 'en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handleBody() {
    if (onCardClick) onCardClick();
    else if (flippable) setFlipped((f) => !f);
  }

  // Mirror every pan/zoom the library makes into the stored crop. `ref` carries
  // the stage element, whose size matches the photo frame the math needs.
  function reportTransform(
    ref: { instance: { wrapperComponent: HTMLElement | null } },
    state: { scale: number; positionX: number; positionY: number },
  ) {
    const el = ref.instance.wrapperComponent;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    setEditZoom(state.scale);
    onCropChange?.(transformToCrop(state.scale, state.positionX, state.positionY, w, h));
  }

  // Non-editable views frame the photo straight from the stored crop.
  const imgStyle = {
    filter: card.filter || 'none',
    transform: `scale(${crop.zoom})`,
    transformOrigin: `${crop.x}% ${crop.y}%`,
  };

  return (
    <div
      className={`postcard ${orientation} ${flipped ? 'flipped' : ''}`}
      onClick={handleBody}
      role={onCardClick || flippable ? 'button' : undefined}
      title={onCardClick ? undefined : flippable ? t('card.flipTitle') : undefined}
    >
      <div className="postcard-inner">
        {/* Front: the photo */}
        <div className="postcard-face postcard-front" style={{ background: template.frame }}>
          <div
            className={`photo-wrap ${editable ? 'editable' : ''} ${editable && editZoom > 1.001 ? 'zoomed' : ''}`}
            // Keep a tap/drag on the photo from flipping the card behind it.
            onClick={(e) => editable && e.stopPropagation()}
          >
            {editable ? (
              // Same zoom/pan engine as the detail loupe view, so choosing the
              // crop feels identical: it owns wheel + pinch + drag and never
              // lets the gesture turn into a page scroll.
              <TransformWrapper
                // Remount on a new photo so its zoom/pan resets to fit, matching
                // the crop CreatePage resets alongside it.
                key={card.image}
                minScale={1}
                maxScale={MAX_ZOOM}
                centerOnInit
                doubleClick={{ mode: 'toggle', step: 1.2 }}
                wheel={{ step: 0.12 }}
                pinch={{ step: 6 }}
                panning={{ velocityDisabled: true }}
                onTransformed={reportTransform}
              >
                {({ resetTransform }) => (
                  <>
                    <TransformComponent wrapperClass="crop-stage" contentClass="crop-content">
                      <img
                        src={card.image}
                        alt={t('card.alt')}
                        draggable={false}
                        style={{ filter: card.filter || 'none' }}
                      />
                    </TransformComponent>
                    {editZoom > 1.001 && (
                      <button
                        type="button"
                        className="zoom-reset"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetTransform();
                        }}
                        title={t('card.resetZoom')}
                        aria-label={t('card.resetZoom')}
                      >
                        ↺
                      </button>
                    )}
                    <span className="photo-grip">
                      {editZoom > 1.001 ? t('card.panHint') : t('card.zoomHint')}
                    </span>
                  </>
                )}
              </TransformWrapper>
            ) : (
              <img src={card.image} alt={t('card.alt')} draggable={false} style={imgStyle} />
            )}
          </div>
        </div>

        {/* Back: stamp, message and address */}
        <div
          className="postcard-face postcard-back"
          style={{ background: template.frame, fontFamily: template.font }}
        >
          <div className="back-grid">
            <div className="back-message" style={{ color: template.id === 'night' ? '#f1f5f9' : '#1f2937' }}>
              {card.message || t('card.defaultMessage')}
            </div>
            <div className="back-side">
              <div className="stamp" style={{ background: stamp.bg, borderColor: template.accent }}>
                <span>{stamp.emoji}</span>
              </div>
              <div className="address" style={{ borderColor: template.accent }}>
                <span className="addr-label" style={{ color: template.accent }}>{t('card.to')}</span>
                <strong>{card.to}</strong>
                <span className="addr-label" style={{ color: template.accent }}>{t('card.from')}</span>
                <em>{card.from}</em>
                {card.location?.label && (
                  <span className="addr-loc" title={card.location.source === 'exif' ? t('card.locExif') : t('card.locManual')}>
                    📍 {card.location.label}
                  </span>
                )}
                <span className="addr-date">{date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flippable && (
        <button
          type="button"
          className="flip-btn"
          onClick={(e) => {
            e.stopPropagation();
            setFlipped((f) => !f);
          }}
          title={flipped ? t('card.toFront') : t('card.flipTitle')}
          aria-label={flipped ? t('card.toFront') : t('card.flip')}
        >
          <RotateCw size={15} aria-hidden />
          <span>{flipped ? t('card.frontShort') : t('card.flipShort')}</span>
        </button>
      )}
    </div>
  );
}
