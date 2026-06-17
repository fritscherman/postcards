import { useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import type { Postcard } from '../types';
import { usePostcards } from '../store/PostcardStore';

interface Props {
  card: Postcard;
  onClose: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function PostcardDetail({ card, onClose }: Props) {
  const { toggleLike } = usePostcards();
  const isInbox = card.box === 'inbox';

  // Free zoom/pan state — the saved crop is ignored here so the full photo is
  // visible and the viewer can zoom in wherever they like.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const last = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  function clampPan(p: { x: number; y: number }, z: number) {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return p;
    const maxX = (r.width * (z - 1)) / 2;
    const maxY = (r.height * (z - 1)) / 2;
    return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) };
  }

  function onDown(e: React.PointerEvent) {
    stageRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = { x: e.clientX, y: e.clientY };
    pinchStart.current = null;
  }

  function onMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two fingers → pinch to zoom.
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchStart.current) {
        pinchStart.current = { dist, zoom };
      } else {
        const z = clamp((pinchStart.current.zoom * dist) / pinchStart.current.dist, 1, 4);
        setZoom(z);
        setPan((p) => clampPan(p, z));
      }
      return;
    }

    // One finger → pan (only meaningful when zoomed in).
    if (!last.current || zoom <= 1.001) {
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan((p) => clampPan({ x: p.x + dx, y: p.y + dy }, zoom));
  }

  function onUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchStart.current = null;
    last.current = pointers.current.size ? [...pointers.current.values()][0] : null;
  }

  function onWheel(e: React.WheelEvent) {
    const z = clamp(zoom - e.deltaY * 0.002, 1, 4);
    setZoom(z);
    setPan((p) => clampPan(p, z));
  }

  function toggleZoom() {
    if (zoom > 1.001) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  }

  const imgStyle = {
    filter: card.filter || 'none',
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    cursor: zoom > 1.001 ? 'grab' : 'zoom-in',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail detail-viewer" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        <div
          className="detail-photo zoomable"
          ref={stageRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={onWheel}
          onDoubleClick={toggleZoom}
        >
          <img src={card.image} alt="Postkarten-Motiv" draggable={false} style={imgStyle} />
        </div>

        {isInbox && (
          <div className="detail-like-bar">
            <button
              className={`like-heart-btn ${card.liked ? 'liked' : ''}`}
              onClick={() => toggleLike(card.id)}
              aria-pressed={card.liked}
              aria-label={card.liked ? 'Gefällt dir' : 'Gefällt mir'}
              title={card.liked ? 'Gefällt dir' : 'Gefällt mir'}
            >
              <Heart size={30} fill={card.liked ? 'currentColor' : 'none'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
