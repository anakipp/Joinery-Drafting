import { useEffect, useMemo, useRef, useState } from 'react';
import type { Sheet } from '../draw/sheet';
import { fromViewLocal, toViewLocal } from '../draw/sheet';
import { sheetSvgBody } from '../export/svg';
import type { Comment, ViewId } from '../model/types';

export type Tool = 'select' | 'comment';

interface Props {
  sheet: Sheet;
  hiddenLayers: Set<string>;
  selected: string | null;
  onSelect: (tag: string | null) => void;
  tool: Tool;
  comments: Comment[];
  activeComment: string | null;
  onComment: (at: { viewId: ViewId; x: number; y: number }) => void;
  onPickComment: (id: string) => void;
  compact?: boolean;
}

interface VB {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cssEscape(s: string) {
  return s.replace(/["\\]/g, '\\$&');
}

export function DrawingCanvas({ sheet, hiddenLayers, selected, onSelect, tool, comments, activeComment, onComment, onPickComment, compact }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const full: VB = useMemo(() => ({ x: 0, y: 0, w: sheet.width, h: sheet.height }), [sheet.width, sheet.height]);
  const [vb, setVb] = useState<VB>(full);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vb: VB; moved: boolean; id: number } | null>(null);

  // reset view when paper size / scale changes
  const key = `${sheet.width}x${sheet.height}`;
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      setVb(full);
    }
  }, [key, full]);

  const body = useMemo(() => sheetSvgBody(sheet, hiddenLayers), [sheet, hiddenLayers]);

  const toModel = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: sheet.height - p.y };
  };

  useEffect(() => {
    const el = wrap.current;
    if (!el || compact) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setVb((v) => {
        const k = Math.exp(e.deltaY * 0.0015);
        const nw = Math.min(full.w * 3, Math.max(full.w / 60, v.w * k));
        const nh = (nw / v.w) * v.h;
        // keep cursor point fixed (account for preserveAspectRatio meet)
        const scale = Math.min(rect.width / v.w, rect.height / v.h);
        const offX = (rect.width - v.w * scale) / 2;
        const offY = (rect.height - v.h * scale) / 2;
        const mx = v.x + (e.clientX - rect.left - offX) / scale;
        const my = v.y + (e.clientY - rect.top - offY) / scale;
        return { x: mx - ((mx - v.x) * nw) / v.w, y: my - ((my - v.y) * nh) / v.h, w: nw, h: nh };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [full, compact]);

  const tagAt = (target: EventTarget | null): string | null => {
    let el = target as Element | null;
    while (el && el !== svgRef.current) {
      const t = el.getAttribute?.('data-tag');
      if (t) return t;
      el = el.parentElement;
    }
    return null;
  };

  const zoomBy = (k: number) =>
    setVb((v) => {
      const nw = v.w * k;
      const nh = v.h * k;
      return { x: v.x + (v.w - nw) / 2, y: v.y + (v.h - nh) / 2, w: nw, h: nh };
    });

  const zoomTo = (viewId: ViewId) => {
    const v = sheet.views.find((x) => x.id === viewId);
    if (!v) return;
    const pad = (v.box.x1 - v.box.x0) * 0.08;
    setVb({ x: v.box.x0 - pad, y: sheet.height - v.box.y1 - pad, w: v.box.x1 - v.box.x0 + 2 * pad, h: v.box.y1 - v.box.y0 + 2 * pad });
  };

  const highlight = [selected, hover].filter(Boolean) as string[];
  const style = highlight
    .map((t, i) => {
      const c = i === 0 && t === selected ? '#e8590c' : '#f59f00';
      return `[data-tag="${cssEscape(t)}"]{stroke:${c} !important;}polygon[data-tag="${cssEscape(t)}"][stroke="none"]{fill-opacity:.55}`;
    })
    .join('');

  const pinR = sheet.scale * 2.6;

  return (
    <div className={`canvas ${tool === 'comment' ? 'tool-comment' : ''} ${compact ? 'compact' : ''}`} ref={wrap}>
      {!compact && (
        <div className="canvas-zoom">
          <button type="button" onClick={() => setVb(full)} title="Fit">
            ⤢
          </button>
          <button type="button" onClick={() => zoomBy(0.8)} title="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} title="Zoom out">
            −
          </button>
          {sheet.views.map((v) => (
            <button type="button" key={v.id} onClick={() => zoomTo(v.id)} className="view-btn">
              {v.id.startsWith('d') ? v.id.toUpperCase() : v.id === 'elevation' ? 'ELEV' : v.id === 'section' ? 'A-A' : 'PLAN'}
            </button>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={(e) => {
          if (compact || (e.button !== 0 && e.button !== 1)) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, vb, moved: false, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) {
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
            if (d.moved) {
              const rect = svgRef.current!.getBoundingClientRect();
              const scale = Math.min(rect.width / d.vb.w, rect.height / d.vb.h);
              setVb({ ...d.vb, x: d.vb.x - dx / scale, y: d.vb.y - dy / scale });
            }
            return;
          }
          if (tool === 'select') setHover(tagAt(e.target));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.moved) return;
          const pin = (e.target as Element).closest?.('[data-comment]');
          if (pin) {
            onPickComment(pin.getAttribute('data-comment')!);
            return;
          }
          if (tool === 'comment') {
            const m = toModel(e.clientX, e.clientY);
            const at = toViewLocal(sheet, m.x, m.y);
            if (at) onComment(at);
            return;
          }
          onSelect(tagAt(e.target));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <style>{style}</style>
        <rect x={0} y={0} width={sheet.width} height={sheet.height} fill="#fff" />
        <g dangerouslySetInnerHTML={{ __html: body }} />
        <g className="pins">
          {comments.map((c, i) => {
            const p = fromViewLocal(sheet, c.viewId, c.x, c.y);
            if (!p) return null;
            const cx = p[0];
            const cy = sheet.height - p[1];
            const active = c.id === activeComment;
            return (
              <g key={c.id} data-comment={c.id} className={`pin ${c.resolved ? 'resolved' : ''} ${active ? 'active' : ''}`}>
                <circle cx={cx} cy={cy} r={pinR} />
                <text x={cx} y={cy} fontSize={pinR * 1.1} textAnchor="middle" dominantBaseline="central">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
