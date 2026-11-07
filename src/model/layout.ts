import type { Bay, Cell, Material, Project, Role } from './types';
import { findMaterial } from './materials';

export interface ResolvedCell {
  cell: Cell;
  index: number;
  /** Module bounds (centre of shared panels). */
  y0: number;
  y1: number;
  /** Clear inner bounds. */
  iy0: number;
  iy1: number;
}

export interface ResolvedBay {
  bay: Bay;
  index: number;
  x0: number;
  x1: number;
  ix0: number;
  ix1: number;
  cells: ResolvedCell[];
}

export interface Resolved {
  W: number;
  H: number;
  D: number;
  /** Thicknesses. */
  tc: number;
  tb: number;
  ts: number;
  tf: number;
  tct: number;
  tp: number;
  /** Carcass bottom (above FFL) and height. */
  baseY: number;
  carcassH: number;
  carcassTop: number;
  /** Carcass depth (without fronts). */
  Dc: number;
  /** Overall top of unit above FFL. */
  topY: number;
  hasFronts: boolean;
  bays: ResolvedBay[];
  /** Wall panel parameters. */
  frameDepth: number;
  frameWidth: number;
  claddingT: number;
}

export function mat(p: Project, role: Role): Material | undefined {
  return findMaterial(p.materials, p.assign[role]);
}

export function thk(p: Project, role: Role, fallback: number): number {
  const m = mat(p, role);
  return m && m.thickness > 0 ? m.thickness : fallback;
}

/** Split `total` into module sizes: fixed values are kept, nulls share the remainder. */
export function splitModules(total: number, sizes: (number | null)[]): number[] {
  if (sizes.length === 0) return [];
  const fixed = sizes.reduce<number>((s, v) => s + (v ?? 0), 0);
  const autos = sizes.filter((v) => v == null).length;
  let rest = total - fixed;
  if (autos === 0) {
    // scale fixed modules to fit the total exactly
    const f = fixed > 0 ? total / fixed : 1;
    return sizes.map((v) => (v ?? 0) * f);
  }
  if (rest < autos * 50) {
    // not enough room: scale fixed modules down and give autos a minimum
    const minAuto = Math.min(150, total / sizes.length);
    const scale = fixed > 0 ? Math.max(0, total - minAuto * autos) / fixed : 1;
    rest = minAuto * autos;
    return sizes.map((v) => (v == null ? rest / autos : v * scale));
  }
  return sizes.map((v) => (v == null ? rest / autos : v));
}

export function resolve(p: Project): Resolved {
  const d = p.dims;
  const W = Math.max(100, d.width);
  const H = Math.max(100, d.height);
  const tc = thk(p, 'carcass', 20);
  const tb = thk(p, 'back', 10);
  const ts = thk(p, 'shelf', 20);
  const tf = thk(p, 'front', 20);
  const tct = p.hasCountertop ? thk(p, 'countertop', 20) : 0;
  const tp = thk(p, 'plinth', 20);
  const frame = mat(p, 'frame');
  const frameDepth = frame?.thickness || 25;
  const frameWidth = frame?.width || 50;
  const claddingT = thk(p, 'cladding', 10);

  const isPanel = p.type === 'wall_panel';
  const hasFronts = !isPanel && p.bays.some((b) => b.cells.some((c) => c.front !== 'open'));
  const D = isPanel ? frameDepth + claddingT : Math.max(150, d.depth);

  let baseY = 0;
  let unitBottom = 0;
  if (p.mount === 'wall_hung') {
    unitBottom = d.mountHeight;
    baseY = d.mountHeight;
  } else if (p.mount === 'plinth' || p.mount === 'legs') {
    baseY = d.plinthHeight;
  }
  const topY = unitBottom + H;
  const carcassTop = topY - tct;
  const carcassH = Math.max(50, carcassTop - baseY);
  const Dc = isPanel ? D : D - (hasFronts ? tf : 0);

  const widths = splitModules(W, p.bays.map((b) => b.width));
  const bays: ResolvedBay[] = [];
  let x = 0;
  const nb = p.bays.length;
  p.bays.forEach((b, i) => {
    const w = widths[i];
    const x0 = x;
    const x1 = i === nb - 1 ? W : x + w;
    x = x1;
    const edge = isPanel ? 0 : tc;
    const ix0 = x0 + (i === 0 ? edge : edge / 2);
    const ix1 = x1 - (i === nb - 1 ? edge : edge / 2);
    const heights = splitModules(carcassH, b.cells.map((c) => c.height));
    let y = baseY;
    const nc = b.cells.length;
    const cells: ResolvedCell[] = b.cells.map((c, j) => {
      const y0 = y;
      const y1 = j === nc - 1 ? baseY + carcassH : y + heights[j];
      y = y1;
      return {
        cell: c,
        index: j,
        y0,
        y1,
        iy0: y0 + (j === 0 ? edge : edge / 2),
        iy1: y1 - (j === nc - 1 ? edge : edge / 2),
      };
    });
    bays.push({ bay: b, index: i, x0, x1, ix0, ix1, cells });
  });

  return {
    W,
    H,
    D,
    tc,
    tb,
    ts,
    tf,
    tct,
    tp,
    baseY,
    carcassH,
    carcassTop,
    Dc,
    topY,
    hasFronts,
    bays,
    frameDepth,
    frameWidth,
    claddingT,
  };
}

/** Front leaf rectangles for a cell (x0,y0,x1,y1) in elevation coordinates. */
export interface Leaf {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  kind: 'door_left' | 'door_right' | 'drawer' | 'flap_up' | 'flap_down' | 'glass_left' | 'glass_right';
}

export function leaves(rb: ResolvedBay, rc: ResolvedCell, gap: number): Leaf[] {
  const g = gap / 2;
  const x0 = rb.x0 + g;
  const x1 = rb.x1 - g;
  const y0 = rc.y0 + g;
  const y1 = rc.y1 - g;
  const c = rc.cell;
  switch (c.front) {
    case 'open':
      return [];
    case 'door_left':
      return [{ x0, y0, x1, y1, kind: 'door_left' }];
    case 'door_right':
      return [{ x0, y0, x1, y1, kind: 'door_right' }];
    case 'door_pair': {
      const m = (rb.x0 + rb.x1) / 2;
      return [
        { x0, y0, x1: m - g, y1, kind: 'door_left' },
        { x0: m + g, y0, x1, y1, kind: 'door_right' },
      ];
    }
    case 'glass_door': {
      const w = rb.x1 - rb.x0;
      if (w > 600) {
        const m = (rb.x0 + rb.x1) / 2;
        return [
          { x0, y0, x1: m - g, y1, kind: 'glass_left' },
          { x0: m + g, y0, x1, y1, kind: 'glass_right' },
        ];
      }
      return [{ x0, y0, x1, y1, kind: 'glass_left' }];
    }
    case 'flap_up':
      return [{ x0, y0, x1, y1, kind: 'flap_up' }];
    case 'flap_down':
      return [{ x0, y0, x1, y1, kind: 'flap_down' }];
    case 'drawers': {
      const n = Math.max(1, c.drawers);
      const h = (rc.y1 - rc.y0) / n;
      const out: Leaf[] = [];
      for (let i = 0; i < n; i++) {
        out.push({ x0, x1, y0: rc.y0 + i * h + g, y1: rc.y0 + (i + 1) * h - g, kind: 'drawer' });
      }
      return out;
    }
  }
}

/** Recommended hinge count for a door height (common European cup-hinge practice). */
export function hingeCount(h: number): number {
  if (h <= 900) return 2;
  if (h <= 1600) return 3;
  if (h <= 2000) return 4;
  return 5;
}

/** Standard drawer slide length that fits in the clear depth. */
export function slideLength(clearDepth: number): number {
  const l = Math.floor((clearDepth - 10) / 50) * 50;
  return Math.max(250, Math.min(600, l));
}
