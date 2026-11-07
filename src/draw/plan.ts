import { Pen } from './entities';
import type { Ctx, ViewBlock } from './context';
import { matOf } from './context';
import { leaves, slideLength } from '../model/layout';
import { findMaterial } from '../model/materials';
import { cellTag, cookingBayIndex, sinkBayIndex } from './elevation';
import { callout } from './section';

/**
 * Plan (horizontal section) cut at mid-height of the carcass.
 * Coordinates: x = width (aligned with elevation), y = 0 at the front face, wall at y = D.
 */
export function planView(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const pen = new Pen(ctx.ps);
  const W = r.W;
  const D = r.D;
  const tf = r.hasFronts ? r.tf : 0;
  const tc = r.tc;
  const tb = r.tb;
  const wallT = 120;
  const cutY = r.baseY + r.carcassH * 0.55;
  const mCarcass = matOf(ctx, 'carcass');
  const mBack = matOf(ctx, 'back');
  const mFront = matOf(ctx, 'front');

  // wall
  pen.hatch(-pen.pr(6), D, W + pen.pr(6), D + wallT, 'wall');
  pen.line(-pen.pr(6), D, W + pen.pr(6), D, 'WALL');
  pen.line(-pen.pr(6), D + wallT, W + pen.pr(6), D + wallT, 'WALL');

  // sides & dividers (cut)
  pen.cut(0, tf, tc, D, 'solid', 'role:carcass', mCarcass?.color);
  pen.cut(W - tc, tf, W, D, 'solid', 'role:carcass', mCarcass?.color);
  r.bays.slice(0, -1).forEach((b) => pen.cut(b.x1 - tc / 2, tf, b.x1 + tc / 2, D, 'solid', 'role:carcass', mCarcass?.color));
  // back (cut)
  pen.cut(tc, D - tb, W - tc, D, 'solid', 'role:back', mBack?.color);

  // bottom/shelf below cut seen from above (thin)
  r.bays.forEach((b) => pen.line(b.ix0, tf, b.ix1, tf, 'THIN'));

  // fronts at cut height with swings
  for (const rb of r.bays) {
    const rc = rb.cells.find((c) => cutY >= c.y0 && cutY <= c.y1) ?? rb.cells[0];
    if (!rc) continue;
    const fm = findMaterial(p.materials, rc.cell.frontMaterialId) ?? mFront;
    const tag = cellTag(rb, rc);
    const lvs = leaves(rb, rc, p.dims.gap);
    if (lvs.length === 0) {
      pen.line(rb.ix0, tf, rb.ix1, tf, 'OUTLINE', tag);
      continue;
    }
    const seen = new Set<string>();
    for (const lf of lvs) {
      const key = `${lf.x0.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pen.cut(lf.x0, 0, lf.x1, tf, 'solid', tag, fm?.color);
      const w = lf.x1 - lf.x0;
      if (lf.kind === 'door_left' || lf.kind === 'glass_left') {
        pen.arc(lf.x0, 0, w, 270, 360, 'SYMBOL');
        pen.line(lf.x0, 0, lf.x0, -w, 'SYMBOL');
      } else if (lf.kind === 'door_right' || lf.kind === 'glass_right') {
        pen.arc(lf.x1, 0, w, 180, 270, 'SYMBOL');
        pen.line(lf.x1, 0, lf.x1, -w, 'SYMBOL');
      } else if (lf.kind === 'drawer') {
        const L = slideLength(r.Dc - tb) * 0.9;
        pen.rect(lf.x0, -L, lf.x1, 0, 'SYMBOL');
        break;
      }
    }
  }

  // countertop above (hidden), sink & hob
  if (p.hasCountertop && r.tct > 0) {
    const oh = p.dims.countertopOverhang;
    pen.rect(0, -oh, W, D, 'HIDDEN', 'role:countertop');
    if (p.functions.includes('sink')) {
      const sb = r.bays[sinkBayIndex(ctx)];
      const cx = (sb.x0 + sb.x1) / 2;
      const bw = Math.min(500, (sb.x1 - sb.x0) * 0.8);
      const cy = D * 0.45;
      pen.rect(cx - bw / 2, cy - 190, cx + bw / 2, cy + 190, 'HIDDEN');
      pen.circle(cx, cy + 190 + 45, 18, 'HIDDEN');
    }
    if (p.functions.includes('cooking') && p.type === 'kitchen_counter') {
      const cb = r.bays[cookingBayIndex(ctx)];
      const cx = (cb.x0 + cb.x1) / 2;
      const hw = Math.min(700, cb.x1 - cb.x0 - 40);
      const cy = D * 0.48;
      pen.rect(cx - hw / 2, cy - 230, cx + hw / 2, cy + 230, 'HIDDEN');
      [-1, 1].forEach((sx) => [-1, 1].forEach((sy) => pen.circle(cx + (sx * hw) / 4, cy + sy * 110, 80, 'HIDDEN')));
    }
  }

  // dimensions
  pen.vchain([0, tf, D - tb, D].filter((v, i, a) => a.indexOf(v) === i), W, 7);
  pen.vdim(0, D, W, 14);
  pen.hdim(0, W, D + wallT, 6);

  // detail callouts
  callout(pen, tc, D - tb, 'D3', 9, 6);
  if (r.hasFronts) callout(pen, W - tc, tf, 'D4', -10, -10);

  return { id: 'plan', title: { en: 'PLAN', th: 'แปลน' }, scale: ctx.ps, s: 1, ents: pen.ents, bubble: '2' };
}
