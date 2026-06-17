import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Pencil, Smile, Undo2, X } from 'lucide-react';

interface Point { x: number; y: number }
interface Stroke { color: string; width: number; pts: Point[] }
interface Sticker { id: string; emoji: string; x: number; y: number; scale: number }

interface Props {
  src: string;
  onApply: (dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = ['#ffffff', '#1f2937', '#f97362', '#f6b73c', '#0e7490', '#16a34a', '#7c3aed'];
const BRUSHES = [0.008, 0.016, 0.028];
const EMOJIS = ['❤️', '⭐', '😎', '🌴', '✈️', '🎈', '🌸', '🍦', '👋', '🔥', '🌈', '📍'];

export function PhotoDecorator({ src, onApply, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const dragId = useRef<string | null>(null);
  // Where a tap started, so a scroll/swipe doesn't get mistaken for a sticker drop.
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  const [mode, setMode] = useState<'draw' | 'sticker'>('sticker');
  const [color, setColor] = useState(COLORS[2]);
  const [brush, setBrush] = useState(BRUSHES[1]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  // Live pixel size of the stage so stickers can be sized to match the baked output.
  const [stageMin, setStageMin] = useState(0);

  // Keep the canvas pixel size in sync with its displayed size and redraw.
  const redraw = () => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    const min = Math.min(w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const all = drawing.current ? [...strokes, drawing.current] : strokes;
    for (const s of all) {
      if (s.pts.length < 1) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * min;
      ctx.beginPath();
      ctx.moveTo(s.pts[0].x * w, s.pts[0].y * h);
      for (const p of s.pts) ctx.lineTo(p.x * w, p.y * h);
      ctx.stroke();
    }
  };

  useLayoutEffect(redraw);
  useEffect(() => {
    const measure = () => {
      redraw();
      const s = stageRef.current;
      if (s) setStageMin(Math.min(s.clientWidth, s.clientHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rel(e: React.PointerEvent): Point {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  // --- Drawing ---
  function onCanvasDown(e: React.PointerEvent) {
    if (mode !== 'draw') return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = { color, width: brush, pts: [rel(e)] };
    redraw();
  }
  function onCanvasMove(e: React.PointerEvent) {
    if (mode !== 'draw' || !drawing.current) return;
    drawing.current.pts.push(rel(e));
    redraw();
  }
  function onCanvasUp() {
    if (drawing.current) {
      setStrokes((prev) => [...prev, drawing.current!]);
      drawing.current = null;
    }
  }

  // --- Stickers ---
  // Remember where the press started; only a near-stationary tap drops a sticker,
  // so scrolling/swiping across the photo no longer spawns hearts.
  function onStageDown(e: React.PointerEvent) {
    if (mode !== 'sticker' || dragId.current) return;
    tapStart.current = { x: e.clientX, y: e.clientY };
  }
  function onStageUp(e: React.PointerEvent) {
    endDrag();
    const start = tapStart.current;
    tapStart.current = null;
    if (mode !== 'sticker' || dragId.current || !start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > 10) return; // it was a scroll/swipe, not a tap
    const p = rel(e);
    setStickers((prev) => [...prev, { id: crypto.randomUUID(), emoji, x: p.x, y: p.y, scale: 0.16 }]);
  }
  function onStickerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    dragId.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onStickerMove(e: React.PointerEvent) {
    if (!dragId.current) return;
    const p = rel(e);
    setStickers((prev) => prev.map((s) => (s.id === dragId.current ? { ...s, x: p.x, y: p.y } : s)));
  }
  function endDrag() {
    dragId.current = null;
  }
  function removeSticker(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setStickers((prev) => prev.filter((s) => s.id !== id));
  }

  function undo() {
    if (mode === 'draw') setStrokes((p) => p.slice(0, -1));
    else setStickers((p) => p.slice(0, -1));
  }
  function clearAll() {
    setStrokes([]);
    setStickers([]);
  }

  // --- Bake everything onto the photo ---
  function apply() {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const min = Math.min(w, h);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of strokes) {
        if (!s.pts.length) continue;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width * min;
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x * w, s.pts[0].y * h);
        for (const p of s.pts) ctx.lineTo(p.x * w, p.y * h);
        ctx.stroke();
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const st of stickers) {
        ctx.font = `${st.scale * min}px serif`;
        ctx.fillText(st.emoji, st.x * w, st.y * h);
      }

      onApply(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = src;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="decorator" onClick={(e) => e.stopPropagation()}>
        <div className="dec-head">
          <h3>Foto verzieren 🎨</h3>
          <button className="btn link icon-btn" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div
          className="dec-stage"
          ref={stageRef}
          onPointerDown={onStageDown}
          onPointerMove={onStickerMove}
          onPointerUp={onStageUp}
          onPointerLeave={endDrag}
        >
          <img src={src} alt="" draggable={false} />
          <canvas
            ref={canvasRef}
            className="dec-canvas"
            style={{ pointerEvents: mode === 'draw' ? 'auto' : 'none' }}
            onPointerDown={onCanvasDown}
            onPointerMove={onCanvasMove}
            onPointerUp={onCanvasUp}
          />
          {stickers.map((s) => (
            <span
              key={s.id}
              className="dec-sticker"
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, fontSize: `${Math.max(12, s.scale * stageMin)}px` }}
              onPointerDown={(e) => onStickerDown(e, s.id)}
              onDoubleClick={(e) => removeSticker(e, s.id)}
            >
              {s.emoji}
            </span>
          ))}
        </div>

        <div className="dec-tools">
          <div className="seg">
            <button className={`seg-btn ${mode === 'sticker' ? 'on' : ''}`} onClick={() => setMode('sticker')}>
              <Smile size={16} /> Sticker
            </button>
            <button className={`seg-btn ${mode === 'draw' ? 'on' : ''}`} onClick={() => setMode('draw')}>
              <Pencil size={16} /> Zeichnen
            </button>
          </div>

          {mode === 'sticker' ? (
            <div className="emoji-palette">
              {EMOJIS.map((e) => (
                <button key={e} className={`emoji-btn ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <div className="draw-tools">
              <div className="swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${color === c ? 'on' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <div className="brushes">
                {BRUSHES.map((b, i) => (
                  <button key={b} className={`brush ${brush === b ? 'on' : ''}`} onClick={() => setBrush(b)}>
                    <span style={{ width: 6 + i * 7, height: 6 + i * 7 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="dec-hint">
            {mode === 'sticker' ? 'Tippen zum Platzieren · ziehen zum Bewegen · Doppeltippen entfernt' : 'Mit dem Finger / der Maus zeichnen'}
          </p>

          <div className="dec-actions">
            <button className="btn link" onClick={undo}><Undo2 size={16} /> Rückgängig</button>
            <button className="btn link danger" onClick={clearAll}>Alles löschen</button>
            <button className="btn primary" onClick={apply}><Check size={16} /> Fertig</button>
          </div>
        </div>
      </div>
    </div>
  );
}
