/**
 * Drawing primitives shared by the SVG preview and the DXF exporter.
 * Coordinates are model-space millimetres, Y up (CAD convention).
 */
import { fmt } from '../model/util';
import type { HatchPattern } from '../model/types';

export type P = [number, number];

export type Layer =
  | 'CUT'
  | 'OUTLINE'
  | 'THIN'
  | 'HIDDEN'
  | 'CENTER'
  | 'SYMBOL'
  | 'HATCH'
  | 'FILL'
  | 'WALL'
  | 'DIM'
  | 'TEXT'
  | 'TAG'
  | 'TITLE'
  | 'FRAME'
  | 'COMMENT';

export interface LayerStyle {
  /** AutoCAD colour index. */
  aci: number;
  /** Preview colour. */
  color: string;
  /** Line weight in paper mm. */
  lw: number;
  ltype: 'CONTINUOUS' | 'DASHED' | 'CENTER';
  name: string;
}

export const LAYERS: Record<Layer, LayerStyle> = {
  CUT: { aci: 7, color: '#111111', lw: 0.5, ltype: 'CONTINUOUS', name: 'JD-CUT' },
  OUTLINE: { aci: 7, color: '#1a1a1a', lw: 0.3, ltype: 'CONTINUOUS', name: 'JD-OUTLINE' },
  THIN: { aci: 8, color: '#555555', lw: 0.18, ltype: 'CONTINUOUS', name: 'JD-THIN' },
  HIDDEN: { aci: 8, color: '#666666', lw: 0.18, ltype: 'DASHED', name: 'JD-HIDDEN' },
  CENTER: { aci: 1, color: '#b03030', lw: 0.15, ltype: 'CENTER', name: 'JD-CENTER' },
  SYMBOL: { aci: 3, color: '#2f7d4f', lw: 0.15, ltype: 'DASHED', name: 'JD-SYMBOL' },
  HATCH: { aci: 8, color: '#7a7a7a', lw: 0.1, ltype: 'CONTINUOUS', name: 'JD-HATCH' },
  FILL: { aci: 254, color: '#d8d8d8', lw: 0, ltype: 'CONTINUOUS', name: 'JD-FILL' },
  WALL: { aci: 8, color: '#333333', lw: 0.35, ltype: 'CONTINUOUS', name: 'JD-WALL' },
  DIM: { aci: 4, color: '#1f4e8c', lw: 0.15, ltype: 'CONTINUOUS', name: 'JD-DIM' },
  TEXT: { aci: 7, color: '#111111', lw: 0.18, ltype: 'CONTINUOUS', name: 'JD-TEXT' },
  TAG: { aci: 6, color: '#7a2d7a', lw: 0.15, ltype: 'CONTINUOUS', name: 'JD-TAG' },
  TITLE: { aci: 7, color: '#111111', lw: 0.25, ltype: 'CONTINUOUS', name: 'JD-TITLE' },
  FRAME: { aci: 7, color: '#111111', lw: 0.5, ltype: 'CONTINUOUS', name: 'JD-FRAME' },
  COMMENT: { aci: 1, color: '#d22f2f', lw: 0.25, ltype: 'CONTINUOUS', name: 'JD-COMMENT' },
};

export type HAlign = 'l' | 'c' | 'r';
export type VAlign = 'b' | 'm' | 't';

interface Base {
  layer: Layer;
  /** Selection tag, e.g. "cell:<bay>:<cell>" or "role:countertop". */
  tag?: string;
}

export type Entity =
  | (Base & { t: 'line'; a: P; b: P })
  | (Base & { t: 'poly'; pts: P[]; closed: boolean })
  | (Base & { t: 'circle'; c: P; r: number })
  | (Base & { t: 'arc'; c: P; r: number; a0: number; a1: number })
  | (Base & { t: 'text'; p: P; h: number; text: string; ha: HAlign; va: VAlign; rot: number; bold?: boolean })
  | (Base & { t: 'fill'; pts: P[]; color?: string });

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function emptyBox(): BBox {
  return { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
}

export function addPt(b: BBox, x: number, y: number) {
  if (x < b.x0) b.x0 = x;
  if (y < b.y0) b.y0 = y;
  if (x > b.x1) b.x1 = x;
  if (y > b.y1) b.y1 = y;
}

/** Approximate text width (Thai glyphs with combining marks are narrower per code point). */
export function textWidth(text: string, h: number): number {
  let w = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0e31 && c <= 0x0e4e && [0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e38, 0x0e39, 0x0e3a, 0x0e47, 0x0e48, 0x0e49, 0x0e4a, 0x0e4b, 0x0e4c, 0x0e4d, 0x0e4e].includes(c)) continue; // combining marks
    if (c >= 0x0e00 && c <= 0x0e7f) w += 0.74;
    else if (ch === ' ') w += 0.36;
    else if ('il.,:;|!\'1()[]/'.includes(ch)) w += 0.36;
    else if (/[MW]/.test(ch)) w += 1.05;
    else if (/[A-Z0-9]/.test(ch)) w += 0.84;
    else w += 0.68;
  }
  return w * h;
}

export function entityBox(e: Entity, b: BBox) {
  switch (e.t) {
    case 'line':
      addPt(b, e.a[0], e.a[1]);
      addPt(b, e.b[0], e.b[1]);
      break;
    case 'poly':
    case 'fill':
      e.pts.forEach((p) => addPt(b, p[0], p[1]));
      break;
    case 'circle':
    case 'arc':
      addPt(b, e.c[0] - e.r, e.c[1] - e.r);
      addPt(b, e.c[0] + e.r, e.c[1] + e.r);
      break;
    case 'text': {
      const w = textWidth(e.text, e.h);
      const x0 = e.ha === 'l' ? 0 : e.ha === 'c' ? -w / 2 : -w;
      const y0 = e.va === 'b' ? -0.25 * e.h : e.va === 'm' ? -e.h / 2 : -e.h;
      const r = (e.rot * Math.PI) / 180;
      const cs = Math.cos(r);
      const sn = Math.sin(r);
      for (const [dx, dy] of [
        [x0, y0],
        [x0 + w, y0],
        [x0, y0 + e.h * 1.25],
        [x0 + w, y0 + e.h * 1.25],
      ]) {
        addPt(b, e.p[0] + dx * cs - dy * sn, e.p[1] + dx * sn + dy * cs);
      }
      break;
    }
  }
}

export function boxOf(ents: Entity[]): BBox {
  const b = emptyBox();
  ents.forEach((e) => entityBox(e, b));
  if (!isFinite(b.x0)) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  return b;
}

export function translate(ents: Entity[], dx: number, dy: number): Entity[] {
  const T = (p: P): P => [p[0] + dx, p[1] + dy];
  return ents.map((e) => {
    switch (e.t) {
      case 'line':
        return { ...e, a: T(e.a), b: T(e.b) };
      case 'poly':
        return { ...e, pts: e.pts.map(T) };
      case 'fill':
        return { ...e, pts: e.pts.map(T) };
      case 'circle':
      case 'arc':
        return { ...e, c: T(e.c) };
      case 'text':
        return { ...e, p: T(e.p) };
    }
  });
}

/** Clip segment p0-p1 to an axis-aligned rect (Liang-Barsky). */
function clipSeg(p0: P, p1: P, x0: number, y0: number, x1: number, y1: number): [P, P] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const checks: [number, number][] = [
    [-dx, p0[0] - x0],
    [dx, x1 - p0[0]],
    [-dy, p0[1] - y0],
    [dy, y1 - p0[1]],
  ];
  for (const [pp, q] of checks) {
    if (pp === 0) {
      if (q < 0) return null;
    } else {
      const r = q / pp;
      if (pp < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [
    [p0[0] + t0 * dx, p0[1] + t0 * dy],
    [p0[0] + t1 * dx, p0[1] + t1 * dy],
  ];
}

/** Parallel hatch lines at `angle` degrees with `spacing`, clipped to a rect (model coords). */
export function hatchLines(x0: number, y0: number, x1: number, y1: number, angle: number, spacing: number, phase = 0): [P, P][] {
  const out: [P, P][] = [];
  if (spacing <= 0 || x1 - x0 <= 0 || y1 - y0 <= 0) return out;
  const a = (angle * Math.PI) / 180;
  const d: P = [Math.cos(a), Math.sin(a)];
  const n: P = [-d[1], d[0]];
  const corners: P[] = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ];
  const proj = corners.map((c) => c[0] * n[0] + c[1] * n[1]);
  const lo = Math.min(...proj);
  const hi = Math.max(...proj);
  const L = Math.hypot(x1 - x0, y1 - y0) + 1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cproj = cx * n[0] + cy * n[1];
  const k0 = Math.ceil((lo - phase) / spacing);
  const k1 = Math.floor((hi - phase) / spacing);
  if (k1 - k0 > 2000) return out;
  for (let k = k0; k <= k1; k++) {
    const off = k * spacing + phase - cproj;
    const px = cx + n[0] * off;
    const py = cy + n[1] * off;
    const seg = clipSeg([px - d[0] * L, py - d[1] * L], [px + d[0] * L, py + d[1] * L], x0, y0, x1, y1);
    if (seg && Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]) > 1e-6) out.push(seg);
  }
  return out;
}

export interface TextOpts {
  size?: number;
  ha?: HAlign;
  va?: VAlign;
  rot?: number;
  layer?: Layer;
  bold?: boolean;
  tag?: string;
}

/**
 * Pen draws in "real" coordinates which are mapped to model space by a uniform
 * scale `s` (detail magnification) and an origin. Text and annotation sizes are
 * given in paper millimetres and multiplied by `ps` (model units per paper mm).
 */
export class Pen {
  ents: Entity[] = [];
  constructor(
    public ps: number,
    public s = 1,
    public ox = 0,
    public oy = 0,
  ) {}

  X(x: number) {
    return this.ox + x * this.s;
  }
  Y(y: number) {
    return this.oy + y * this.s;
  }
  pt(x: number, y: number): P {
    return [this.X(x), this.Y(y)];
  }
  /** paper mm -> real units of this pen */
  pr(paper: number) {
    return (paper * this.ps) / this.s;
  }

  line(x1: number, y1: number, x2: number, y2: number, layer: Layer = 'OUTLINE', tag?: string) {
    this.ents.push({ t: 'line', a: this.pt(x1, y1), b: this.pt(x2, y2), layer, tag });
  }
  poly(pts: [number, number][], closed: boolean, layer: Layer = 'OUTLINE', tag?: string) {
    this.ents.push({ t: 'poly', pts: pts.map(([x, y]) => this.pt(x, y)), closed, layer, tag });
  }
  rect(x0: number, y0: number, x1: number, y1: number, layer: Layer = 'OUTLINE', tag?: string) {
    if (Math.abs(x1 - x0) < 1e-6 || Math.abs(y1 - y0) < 1e-6) return;
    this.poly(
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
      true,
      layer,
      tag,
    );
  }
  fill(x0: number, y0: number, x1: number, y1: number, color?: string, tag?: string) {
    if (Math.abs(x1 - x0) < 1e-6 || Math.abs(y1 - y0) < 1e-6) return;
    this.ents.push({
      t: 'fill',
      pts: [this.pt(x0, y0), this.pt(x1, y0), this.pt(x1, y1), this.pt(x0, y1)],
      layer: 'FILL',
      color,
      tag,
    });
  }
  circle(x: number, y: number, r: number, layer: Layer = 'OUTLINE', tag?: string) {
    this.ents.push({ t: 'circle', c: this.pt(x, y), r: r * this.s, layer, tag });
  }
  /** Circle with radius in paper mm. */
  circleP(x: number, y: number, rPaper: number, layer: Layer = 'OUTLINE') {
    this.ents.push({ t: 'circle', c: this.pt(x, y), r: rPaper * this.ps, layer });
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, layer: Layer = 'OUTLINE', tag?: string) {
    this.ents.push({ t: 'arc', c: this.pt(x, y), r: r * this.s, a0, a1, layer, tag });
  }
  dot(x: number, y: number, rPaper = 0.5, layer: Layer = 'TAG') {
    const r = rPaper * this.ps;
    const [cx, cy] = this.pt(x, y);
    this.ents.push({
      t: 'fill',
      pts: [
        [cx - r, cy - r],
        [cx + r, cy - r],
        [cx + r, cy + r],
        [cx - r, cy + r],
      ],
      layer,
      color: LAYERS[layer].color,
    });
  }
  text(x: number, y: number, text: string, o: TextOpts = {}) {
    if (!text) return;
    this.ents.push({
      t: 'text',
      p: this.pt(x, y),
      h: (o.size ?? 2.5) * this.ps,
      text,
      ha: o.ha ?? 'l',
      va: o.va ?? 'b',
      rot: o.rot ?? 0,
      layer: o.layer ?? 'TEXT',
      bold: o.bold,
      tag: o.tag,
    });
  }

  /** Section of a cut member: fill + optional hatch + outline. */
  cut(x0: number, y0: number, x1: number, y1: number, pattern: HatchPattern | 'solid', tag?: string, fillColor?: string) {
    const ax0 = Math.min(x0, x1);
    const ax1 = Math.max(x0, x1);
    const ay0 = Math.min(y0, y1);
    const ay1 = Math.max(y0, y1);
    if (pattern === 'solid') {
      this.fill(ax0, ay0, ax1, ay1, fillColor, tag);
    } else {
      if (fillColor) this.fill(ax0, ay0, ax1, ay1, fillColor, tag);
      this.hatch(ax0, ay0, ax1, ay1, pattern);
    }
    this.rect(ax0, ay0, ax1, ay1, 'CUT', tag);
  }

  /** Hatch a rect with a material pattern (spacing defined in paper mm). */
  hatch(x0: number, y0: number, x1: number, y1: number, pattern: HatchPattern | 'wall' | 'ground') {
    const X0 = this.X(x0);
    const Y0 = this.Y(y0);
    const X1 = this.X(x1);
    const Y1 = this.Y(y1);
    const sp = (mm: number) => mm * this.ps;
    const push = (segs: [P, P][]) => segs.forEach(([a, b]) => this.ents.push({ t: 'line', a, b, layer: 'HATCH' }));
    switch (pattern) {
      case 'board':
        push(hatchLines(X0, Y0, X1, Y1, 45, sp(1.0)));
        push(hatchLines(X0, Y0, X1, Y1, 135, sp(2.0)));
        break;
      case 'ply': {
        const horizontal = X1 - X0 >= Y1 - Y0;
        push(hatchLines(X0, Y0, X1, Y1, horizontal ? 0 : 90, sp(0.6), sp(0.3)));
        break;
      }
      case 'timber':
        this.ents.push({ t: 'line', a: [X0, Y0], b: [X1, Y1], layer: 'HATCH' });
        this.ents.push({ t: 'line', a: [X0, Y1], b: [X1, Y0], layer: 'HATCH' });
        break;
      case 'stone':
        push(hatchLines(X0, Y0, X1, Y1, 45, sp(1.6)));
        push(hatchLines(X0, Y0, X1, Y1, 45, sp(1.6), sp(0.35)));
        break;
      case 'glass':
        push(hatchLines(X0, Y0, X1, Y1, 60, sp(2.5)));
        break;
      case 'metal':
        push(hatchLines(X0, Y0, X1, Y1, 45, sp(0.5)));
        break;
      case 'wall':
        push(hatchLines(X0, Y0, X1, Y1, 45, sp(1.5)));
        break;
      case 'ground':
        push(hatchLines(X0, Y0, X1, Y1, 45, sp(1.2)));
        break;
      case 'none':
        break;
    }
  }

  /** Oblique architectural tick at a dimension end. */
  private tick(x: number, y: number) {
    const t = 0.9 * this.ps;
    const [X, Y] = this.pt(x, y);
    this.ents.push({ t: 'line', a: [X - t, Y - t], b: [X + t, Y + t], layer: 'DIM' });
  }

  /**
   * Horizontal dimension between x1 and x2. `y` is the feature line, `off` the
   * offset (paper mm, sign = direction). Value is the real distance.
   */
  hdim(x1: number, x2: number, y: number, off: number, label?: string, stagger = 0) {
    if (Math.abs(x2 - x1) < 0.01) return;
    const a = Math.min(x1, x2);
    const b = Math.max(x1, x2);
    const dy = this.pr(off);
    const yl = y + dy;
    const gap = this.pr(Math.sign(off) * 1);
    const ext = this.pr(Math.sign(off) * 1.5);
    this.line(a, y + gap, a, yl + ext, 'DIM');
    this.line(b, y + gap, b, yl + ext, 'DIM');
    this.line(a - this.pr(1.5), yl, b + this.pr(1.5), yl, 'DIM');
    this.tick(a, yl);
    this.tick(b, yl);
    const txt = label ?? fmt(b - a);
    const size = 2.0;
    const tw = textWidth(txt, size * this.ps) / this.s;
    let tx = (a + b) / 2;
    let ha: HAlign = 'c';
    if (tw + this.pr(1) > b - a) {
      // not enough room: place beside, alternating
      if (stagger % 2 === 0) {
        tx = b + this.pr(1.2);
        ha = 'l';
      } else {
        tx = a - this.pr(1.2);
        ha = 'r';
      }
    }
    this.text(tx, yl + this.pr(0.6), txt, { size, ha, va: 'b', layer: 'DIM' });
  }

  /** Vertical dimension between y1 and y2 at feature x, offset in paper mm. */
  vdim(y1: number, y2: number, x: number, off: number, label?: string, stagger = 0) {
    if (Math.abs(y2 - y1) < 0.01) return;
    const a = Math.min(y1, y2);
    const b = Math.max(y1, y2);
    const xl = x + this.pr(off);
    const gap = this.pr(Math.sign(off) * 1);
    const ext = this.pr(Math.sign(off) * 1.5);
    this.line(x + gap, a, xl + ext, a, 'DIM');
    this.line(x + gap, b, xl + ext, b, 'DIM');
    this.line(xl, a - this.pr(1.5), xl, b + this.pr(1.5), 'DIM');
    this.tick(xl, a);
    this.tick(xl, b);
    const txt = label ?? fmt(b - a);
    const size = 2.0;
    const tw = textWidth(txt, size * this.ps) / this.s;
    let ty = (a + b) / 2;
    let ha: HAlign = 'c';
    if (tw + this.pr(1) > b - a) {
      if (stagger % 2 === 0) {
        ty = b + this.pr(1.2);
        ha = 'l';
      } else {
        ty = a - this.pr(1.2);
        ha = 'r';
      }
    }
    this.text(xl - this.pr(0.6), ty, txt, { size, ha, va: 'b', rot: 90, layer: 'DIM' });
  }

  hchain(xs: number[], y: number, off: number) {
    const v = [...xs].sort((p, q) => p - q);
    for (let i = 0; i < v.length - 1; i++) this.hdim(v[i], v[i + 1], y, off, undefined, i);
  }
  vchain(ys: number[], x: number, off: number) {
    const v = [...ys].sort((p, q) => p - q);
    for (let i = 0; i < v.length - 1; i++) this.vdim(v[i], v[i + 1], x, off, undefined, i);
  }

  /**
   * Leader from a target point to a text block. (tx,ty) is the text anchor
   * (real units); lines are drawn from the anchor outwards.
   */
  leader(px: number, py: number, tx: number, ty: number, lines: string[], ha: HAlign = 'l', size = 2.0) {
    this.dot(px, py, 0.45, 'TAG');
    const shoulder = this.pr(ha === 'l' ? -2 : 2);
    this.line(px, py, tx + shoulder, ty, 'TAG');
    this.line(tx + shoulder, ty, tx, ty, 'TAG');
    const lh = this.pr(size * 1.45);
    const n = lines.length;
    lines.forEach((ln, i) => {
      const yy = ty + ((n - 1) / 2 - i) * lh;
      this.text(tx + this.pr(ha === 'l' ? 0.8 : -0.8), yy, ln, { size, ha, va: 'm', layer: 'TAG' });
    });
  }

  /** Reference bubble (circle + label). */
  bubble(x: number, y: number, label: string, rPaper = 3.2, layer: Layer = 'TITLE') {
    this.circleP(x, y, rPaper, layer);
    this.text(x, y, label, { size: rPaper * 0.75, ha: 'c', va: 'm', layer, bold: true });
  }
}
