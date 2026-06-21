import { useRef, useState } from 'react';
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
const DOUBLE_TAP_ZOOM = 2.2;

// Re-frame the photo so that the source point currently shown under the focal
// point (fx, fy — fractions of the frame) stays put while the zoom changes.
// This is what makes pinch / wheel / double-tap zoom feel like "real" map and
// photo apps: you zoom *into the spot you're touching*, not the centre.
function focalZoom(crop: Crop, fx: number, fy: number, nextZoom: number): Crop {
  const z1 = clamp(nextZoom, 1, MAX_ZOOM);
  if (z1 <= 1.001) return { zoom: 1, x: 50, y: 50 };
  const z0 = crop.zoom;
  const ox = crop.x / 100;
  const oy = crop.y / 100;
  // Source fraction sitting under the focal point at the current zoom…
  const px = ox + (fx - ox) / z0;
  const py = oy + (fy - oy) / z0;
  // …and the transform-origin that keeps it there at the new zoom.
  const nx = (px * z1 - fx) / (z1 - 1);
  const ny = (py * z1 - fy) / (z1 - 1);
  return { zoom: z1, x: clamp(nx * 100, 0, 100), y: clamp(ny * 100, 0, 100) };
}

export function PostcardCard({ card, flippable = true, onCardClick, editable = false, onCropChange }: Props) {
  const [flipped, setFlipped] = useState(false);
  const template = templateById(card.templateId);
  const stamp = resolveStamp(card.stampId, card.customStamp);
  const orientation = card.orientation ?? 'landscape';
  const crop = card.crop ?? { zoom: 1, x: 50, y: 50 };

  const wrapRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  // Active pointers (id -> position) so we can tell a one-finger pan from a
  // two-finger pinch.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  const date = new Date(card.createdAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handleBody() {
    if (onCardClick) onCardClick();
    else if (flippable) setFlipped((f) => !f);
  }

  function onWrapDown(e: React.PointerEvent) {
    if (!editable) return;
    e.stopPropagation();
    wrapRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = { x: e.clientX, y: e.clientY };
    pinchStart.current = null;
  }
  function onWrapMove(e: React.PointerEvent) {
    if (!editable || !wrapRef.current || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = wrapRef.current.getBoundingClientRect();

    // Two fingers → pinch to zoom around the point between the fingers, and let
    // a two-finger drag slide the photo at the same time (just like Photos).
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (!pinchStart.current) {
        pinchStart.current = { dist, zoom: crop.zoom };
        last.current = mid;
        return;
      }
      const nextZoom = (pinchStart.current.zoom * dist) / pinchStart.current.dist;
      let next = focalZoom(crop, (mid.x - r.left) / r.width, (mid.y - r.top) / r.height, nextZoom);
      // Follow the fingers' midpoint 1:1 (see the one-finger pan note below).
      if (last.current && next.zoom > 1.001) {
        const gain = 1 / (next.zoom - 1);
        const dx = ((mid.x - last.current.x) / r.width) * 100 * gain;
        const dy = ((mid.y - last.current.y) / r.height) * 100 * gain;
        next = { ...next, x: clamp(next.x - dx, 0, 100), y: clamp(next.y - dy, 0, 100) };
      }
      last.current = mid;
      onCropChange?.(next);
      return;
    }

    // One finger → pan. The photo is scaled around `transform-origin`, so a
    // fixed pixel moves by (1 - z) on screen per unit of origin shift. Gain
    // 1/(z-1) therefore makes the photo track the finger exactly 1:1 — the
    // earlier z/(z-1) over-panned by a factor of z, which felt jumpy.
    if (!last.current || crop.zoom <= 1.001) {
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const gain = 1 / (crop.zoom - 1);
    const dx = ((e.clientX - last.current.x) / r.width) * 100 * gain;
    const dy = ((e.clientY - last.current.y) / r.height) * 100 * gain;
    last.current = { x: e.clientX, y: e.clientY };
    onCropChange?.({ ...crop, x: clamp(crop.x - dx, 0, 100), y: clamp(crop.y - dy, 0, 100) });
  }
  function onWrapUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchStart.current = null;
    last.current = pointers.current.size
      ? [...pointers.current.values()][0]
      : null;
  }

  // Desktop: wheel / trackpad zooms toward the cursor.
  function onWrapWheel(e: React.WheelEvent) {
    if (!editable || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    onCropChange?.(focalZoom(crop, fx, fy, crop.zoom - e.deltaY * 0.0015 * crop.zoom));
  }

  // Double-tap / double-click toggles between fit and a zoom on that spot.
  function onWrapDoubleClick(e: React.MouseEvent) {
    if (!editable || !wrapRef.current) return;
    e.stopPropagation();
    if (crop.zoom > 1.001) {
      onCropChange?.({ zoom: 1, x: 50, y: 50 });
      return;
    }
    const r = wrapRef.current.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    onCropChange?.(focalZoom(crop, fx, fy, DOUBLE_TAP_ZOOM));
  }

  function resetZoom(e: React.PointerEvent | React.MouseEvent) {
    e.stopPropagation();
    onCropChange?.({ zoom: 1, x: 50, y: 50 });
  }

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
      title={onCardClick ? undefined : flippable ? 'Klicken zum Umdrehen' : undefined}
    >
      <div className="postcard-inner">
        {/* Front: the photo */}
        <div className="postcard-face postcard-front" style={{ background: template.frame }}>
          <div
            className={`photo-wrap ${editable ? 'editable' : ''} ${editable && crop.zoom > 1.001 ? 'zoomed' : ''}`}
            ref={wrapRef}
            onPointerDown={onWrapDown}
            onPointerMove={onWrapMove}
            onPointerUp={onWrapUp}
            onPointerCancel={onWrapUp}
            onWheel={onWrapWheel}
            onDoubleClick={onWrapDoubleClick}
            onClick={(e) => editable && e.stopPropagation()}
          >
            <img src={card.image} alt="Postkarten-Motiv" draggable={false} style={imgStyle} />
            {editable && crop.zoom > 1.001 && (
              <button
                type="button"
                className="zoom-reset"
                onPointerDown={resetZoom}
                onClick={resetZoom}
                title="Zoom zurücksetzen"
                aria-label="Zoom zurücksetzen"
              >
                ↺
              </button>
            )}
            {editable && (
              <span className="photo-grip">
                {crop.zoom > 1.001 ? 'Ziehen zum Verschieben · Doppeltippen für Reset' : 'Doppeltippen oder 2 Finger zum Zoomen'}
              </span>
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
              {card.message || 'Liebe Grüße!'}
            </div>
            <div className="back-side">
              <div className="stamp" style={{ background: stamp.bg, borderColor: template.accent }}>
                <span>{stamp.emoji}</span>
              </div>
              <div className="address" style={{ borderColor: template.accent }}>
                <span className="addr-label" style={{ color: template.accent }}>An</span>
                <strong>{card.to}</strong>
                <span className="addr-label" style={{ color: template.accent }}>Von</span>
                <em>{card.from}</em>
                {card.location?.label && (
                  <span className="addr-loc" title={card.location.source === 'exif' ? 'Aus den Foto-Daten' : 'Hinzugefügter Ort'}>
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
          title={flipped ? 'Zur Vorderseite' : 'Karte umdrehen'}
          aria-label="Karte umdrehen"
        >
          ⟳
        </button>
      )}
    </div>
  );
}
