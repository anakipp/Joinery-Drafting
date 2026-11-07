import { Pen } from './entities';
import type { Ctx, ViewBlock } from './context';
import { matOf } from './context';
import { leaves, type Leaf, type ResolvedBay, type ResolvedCell } from '../model/layout';
import { findMaterial } from '../model/materials';

export function cellTag(rb: ResolvedBay, rc: ResolvedCell) {
  return `cell:${rb.bay.id}:${rc.cell.id}`;
}

/** Positions (bottom, top) of evenly spaced adjustable shelves in a cell. */
export function shelfPositions(iy0: number, iy1: number, n: number, ts: number): [number, number][] {
  if (n <= 0) return [];
  const sp = (iy1 - iy0 - n * ts) / (n + 1);
  if (sp <= 0) return [];
  const out: [number, number][] = [];
  for (let k = 1; k <= n; k++) {
    const b = iy0 + k * sp + (k - 1) * ts;
    out.push([b, b + ts]);
  }
  return out;
}

export function sinkBayIndex(ctx: Ctx): number {
  let best = 0;
  let bw = -1;
  ctx.r.bays.forEach((b, i) => {
    const doors = b.cells.some((c) => c.cell.front !== 'drawers');
    const w = b.x1 - b.x0;
    if (doors && w > bw) {
      bw = w;
      best = i;
    }
  });
  return best;
}

export function cookingBayIndex(ctx: Ctx): number {
  const i = ctx.r.bays.findIndex((b) => b.cells.some((c) => c.cell.front === 'drawers'));
  if (i >= 0) return i;
  return ctx.r.bays.length - 1;
}

function drawHandle(pen: Pen, ctx: Ctx, lf: Leaf) {
  const h = ctx.p.handle;
  if (h === 'push') return;
  const r = ctx.r;
  const w = lf.x1 - lf.x0;
  const ht = lf.y1 - lf.y0;
  const isDoor = lf.kind === 'door_left' || lf.kind === 'door_right' || lf.kind === 'glass_left' || lf.kind === 'glass_right';
  const highUnit = r.baseY >= 1100;
  const len = Math.min(160, (isDoor ? ht : w) * 0.6);
  const tag = 'role:handle';

  if (h === 'groove') {
    const inset = 15;
    if (isDoor) {
      const y = highUnit ? lf.y0 + inset : lf.y1 - inset;
      pen.line(lf.x0, y, lf.x1, y, 'THIN', tag);
    } else if (lf.kind === 'flap_up') {
      pen.line(lf.x0, lf.y0 + inset, lf.x1, lf.y0 + inset, 'THIN', tag);
    } else {
      pen.line(lf.x0, lf.y1 - inset, lf.x1, lf.y1 - inset, 'THIN', tag);
    }
    return;
  }

  let cx: number;
  let cy: number;
  let vertical: boolean;
  if (isDoor) {
    const hingeLeft = lf.kind === 'door_left' || lf.kind === 'glass_left';
    cx = hingeLeft ? lf.x1 - 40 : lf.x0 + 40;
    vertical = true;
    if (ht > 1200) {
      cy = Math.min(lf.y1 - len / 2 - 50, Math.max(lf.y0 + len / 2 + 50, 1050));
    } else if (highUnit) {
      cy = lf.y0 + 50 + len / 2;
    } else {
      cy = lf.y1 - 50 - len / 2;
    }
  } else if (lf.kind === 'flap_up') {
    cx = (lf.x0 + lf.x1) / 2;
    cy = lf.y0 + 40;
    vertical = false;
  } else if (lf.kind === 'flap_down') {
    cx = (lf.x0 + lf.x1) / 2;
    cy = lf.y1 - 40;
    vertical = false;
  } else {
    cx = (lf.x0 + lf.x1) / 2;
    cy = ht < 260 ? (lf.y0 + lf.y1) / 2 : lf.y1 - 60;
    vertical = false;
  }
  if (h === 'knob') {
    pen.circle(cx, cy, 14, 'OUTLINE', tag);
  } else if (h === 'recessed') {
    const a = vertical ? 12 : 60;
    const b = vertical ? 60 : 12;
    pen.rect(cx - a, cy - b, cx + a, cy + b, 'OUTLINE', tag);
    pen.rect(cx - a + 4, cy - b + 4, cx + a - 4, cy + b - 4, 'THIN', tag);
  } else {
    const a = vertical ? 6 : len / 2;
    const b = vertical ? len / 2 : 6;
    pen.rect(cx - a, cy - b, cx + a, cy + b, 'OUTLINE', tag);
  }
}

function drawLeafSymbol(pen: Pen, lf: Leaf) {
  const { x0, y0, x1, y1 } = lf;
  const xm = (x0 + x1) / 2;
  const ym = (y0 + y1) / 2;
  switch (lf.kind) {
    case 'door_left':
    case 'glass_left':
      pen.poly(
        [
          [x1, y1],
          [x0, ym],
          [x1, y0],
        ],
        false,
        'SYMBOL',
      );
      break;
    case 'door_right':
    case 'glass_right':
      pen.poly(
        [
          [x0, y1],
          [x1, ym],
          [x0, y0],
        ],
        false,
        'SYMBOL',
      );
      break;
    case 'flap_up':
      pen.poly(
        [
          [x0, y0],
          [xm, y1],
          [x1, y0],
        ],
        false,
        'SYMBOL',
      );
      break;
    case 'flap_down':
      pen.poly(
        [
          [x0, y1],
          [xm, y0],
          [x1, y1],
        ],
        false,
        'SYMBOL',
      );
      break;
    case 'drawer':
      break;
  }
}

export function elevationView(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const pen = new Pen(ctx.ps);
  const W = r.W;
  const g = p.dims.gap;
  const front = matOf(ctx, 'front');

  // floor
  pen.line(-pen.pr(8), 0, W + pen.pr(8), 0, 'WALL');
  pen.hatch(-pen.pr(8), -pen.pr(1.5), W + pen.pr(8), 0, 'ground');
  pen.text(-pen.pr(8), pen.pr(0.8), 'FFL ±0.00', { size: 1.8, layer: 'TEXT' });

  // base
  if (p.mount === 'plinth') {
    pen.rect(0, 0, W, r.baseY, 'OUTLINE', 'role:plinth');
  } else if (p.mount === 'legs') {
    const xs = [60, ...r.bays.slice(0, -1).map((b) => b.x1), W - 60];
    xs.forEach((x) => pen.rect(x - 20, 0, x + 20, r.baseY, 'OUTLINE', 'role:plinth'));
  }

  // carcass outline
  pen.rect(0, r.baseY, W, r.carcassTop, 'OUTLINE', 'role:carcass');

  // countertop
  if (p.hasCountertop && r.tct > 0) {
    pen.rect(0, r.carcassTop, W, r.topY, 'OUTLINE', 'role:countertop');
    if (p.functions.includes('sink')) {
      const sb = r.bays[sinkBayIndex(ctx)];
      const cx = (sb.x0 + sb.x1) / 2;
      const bw = Math.min(500, (sb.x1 - sb.x0) * 0.8);
      pen.rect(cx - bw / 2, r.carcassTop - 180, cx + bw / 2, r.carcassTop, 'HIDDEN');
      // faucet
      pen.poly(
        [
          [cx - 25, r.topY],
          [cx - 25, r.topY + 220],
          [cx + 90, r.topY + 220],
          [cx + 90, r.topY + 180],
        ],
        false,
        'THIN',
      );
    }
  }

  for (const rb of r.bays) {
    for (const rc of rb.cells) {
      const c = rc.cell;
      const tag = cellTag(rb, rc);
      const shelves = shelfPositions(rc.iy0, rc.iy1, c.shelves, r.ts);
      if (c.front === 'open') {
        pen.rect(rb.ix0, rc.iy0, rb.ix1, rc.iy1, 'OUTLINE', tag);
        shelves.forEach(([b, t]) => pen.rect(rb.ix0, b, rb.ix1, t, 'OUTLINE', tag));
        if (c.rail) {
          const y = rc.iy1 - 60;
          pen.line(rb.ix0, y, rb.ix1, y, 'OUTLINE', tag);
          pen.rect(rb.ix0, y - 15, rb.ix0 + 15, y + 15, 'THIN');
          pen.rect(rb.ix1 - 15, y - 15, rb.ix1, y + 15, 'THIN');
        }
        if (p.functions.includes('lighting')) {
          const ys = [rc.iy1, ...shelves.map((s) => s[0])];
          ys.forEach((y) => pen.line(rb.ix0 + 20, y - 8, rb.ix1 - 20, y - 8, 'CENTER'));
        }
        continue;
      }
      // hidden contents
      shelves.forEach(([b]) => pen.line(rb.ix0, b, rb.ix1, b, 'HIDDEN'));
      if (c.rail) pen.line(rb.ix0, rc.iy1 - 60, rb.ix1, rc.iy1 - 60, 'HIDDEN');
      const lvs = leaves(rb, rc, g);
      const fm = findMaterial(p.materials, c.frontMaterialId) ?? front;
      for (const lf of lvs) {
        pen.fill(lf.x0, lf.y0, lf.x1, lf.y1, fm?.color, tag);
        pen.rect(lf.x0, lf.y0, lf.x1, lf.y1, 'OUTLINE', tag);
        if (lf.kind === 'glass_left' || lf.kind === 'glass_right') {
          const inset = 22;
          pen.rect(lf.x0 + inset, lf.y0 + inset, lf.x1 - inset, lf.y1 - inset, 'THIN', tag);
          const w = lf.x1 - lf.x0;
          for (const f of [0.3, 0.42]) {
            pen.line(lf.x0 + w * f, lf.y1 - inset - 60, lf.x0 + w * f + 60, lf.y1 - inset - 10, 'HATCH');
          }
        }
        drawLeafSymbol(pen, lf);
        drawHandle(pen, ctx, lf);
        if (fm && lf.y1 - lf.y0 > pen.pr(5) && lf.x1 - lf.x0 > pen.pr(8)) {
          pen.text(lf.x0 + pen.pr(1.2), lf.y0 + pen.pr(1.2), fm.code, { size: 1.6, layer: 'TAG' });
        }
      }
    }
  }

  // ---- dimensions
  const bx = [0, ...r.bays.map((b) => b.x1)];
  if (r.bays.length > 1) {
    pen.hchain(bx, r.topY, 7);
    pen.hdim(0, W, r.topY, 14);
  } else {
    pen.hdim(0, W, r.topY, 7);
  }
  const vertStops = (rb: ResolvedBay) => {
    const ys = new Set<number>();
    ys.add(0);
    ys.add(r.baseY);
    rb.cells.forEach((c) => {
      ys.add(c.y0);
      ys.add(c.y1);
    });
    ys.add(r.carcassTop);
    ys.add(r.topY);
    return [...ys].map((v) => Math.round(v * 10) / 10).filter((v, i, a) => a.indexOf(v) === i);
  };
  const last = r.bays[r.bays.length - 1];
  const first = r.bays[0];
  if (last) {
    const ys = vertStops(last);
    pen.vchain(ys, W, 7);
    const bottom = p.mount === 'wall_hung' ? r.baseY : 0;
    pen.vdim(bottom, r.topY, W, 14);
    if (p.mount === 'wall_hung') pen.vdim(0, r.topY, W, 21);
  }
  if (first && first !== last) {
    const a = vertStops(first).join(',');
    const b = vertStops(last).join(',');
    if (a !== b) pen.vchain(vertStops(first), 0, -7);
  }

  // section marker A-A
  const sb = r.bays[Math.min(ctx.p.sectionBay, r.bays.length - 1)];
  if (sb) {
    const sx = (sb.x0 + sb.x1) / 2 + Math.min(120, (sb.x1 - sb.x0) / 4);
    const marker = (yBase: number, dir: 1 | -1) => {
      const y0 = yBase + pen.pr(2) * dir;
      const y1 = yBase + pen.pr(8) * dir;
      pen.line(sx, y0, sx, y1, 'CUT');
      const ax = sx + pen.pr(5);
      pen.line(sx, y1, ax, y1, 'CUT');
      pen.poly(
        [
          [ax, y1],
          [ax - pen.pr(1.6), y1 + pen.pr(0.7)],
          [ax - pen.pr(1.6), y1 - pen.pr(0.7)],
        ],
        true,
        'CUT',
      );
      pen.text(sx - pen.pr(1.2), y1, 'A', { size: 3, ha: 'r', va: 'm', bold: true, layer: 'TITLE' });
    };
    marker(r.topY + pen.pr(18), 1);
    marker(-pen.pr(2), -1);
  }

  return { id: 'elevation', title: { en: 'FRONT ELEVATION', th: 'รูปด้านหน้า' }, scale: ctx.ps, s: 1, ents: pen.ents, bubble: '1' };
}
