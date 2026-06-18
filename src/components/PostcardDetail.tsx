import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Postcard } from '../types';

interface Props {
  card: Postcard;
  onClose: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function PostcardDetail({ card, onClose }: Props) {
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

  // Zoom toward a focal point (client coords) so the content under the fingers /
  // cursor stays put, instead of always zooming around the middle.
  function zoomTo(nextZoom: number, clientX: number, clientY: number) {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    const z1 = clamp(nextZoom, 1, 4);
    // Focal point relative to the stage centre (the scale's transform-origin).
    const fx = clientX - (r.left + r.width / 2);
    const fy = clientY - (r.top + r.height / 2);
    setZoom((z0) => {
      setPan((p) => clampPan({ x: fx - (z1 * (fx - p.x)) / z0, y: fy - (z1 * (fy - p.y)) / z0 }, z1));
      return z1;
    });
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

    // Two fingers → pinch to zoom around the point between the fingers.
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (!pinchStart.current) {
        pinchStart.current = { dist, zoom };
      } else {
        zoomTo((pinchStart.current.zoom * dist) / pinchStart.current.dist, mid.x, mid.y);
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
    zoomTo(zoom - e.deltaY * 0.002 * zoom, e.clientX, e.clientY);
  }

  function toggleZoom(e: React.MouseEvent) {
    if (zoom > 1.001) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      zoomTo(2.5, e.clientX, e.clientY);
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
      </div>
    </div>
  );
}
