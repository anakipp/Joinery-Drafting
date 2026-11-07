import { Pen } from './entities';
import type { Ctx, ViewBlock } from './context';
import { matLines, matOf } from './context';
import { leaves, slideLength } from '../model/layout';
import { findMaterial } from '../model/materials';
import { cellTag, shelfPositions } from './elevation';
import { ROLE_NAMES } from '../i18n/terms';
import type { Bi } from '../model/types';

export interface LeaderItem {
  px: number;
  py: number;
  lines: string[];
}

/** Stack leader texts in a column to the right without overlaps. */
export function placeLeaders(pen: Pen, items: LeaderItem[], tx: number, size = 2.0) {
  const lh = pen.pr(size * 1.45);
  const pad = pen.pr(1.6);
  const sorted = [...items].sort((a, b) => b.py - a.py);
  let prevBottom = Infinity;
  const placed = sorted.map((it) => {
    const h = it.lines.length * lh;
    let ty = it.py;
    if (ty + h / 2 > prevBottom - pad) ty = prevBottom - pad - h / 2;
    prevBottom = ty - h / 2;
    return { ...it, ty };
  });
  placed.forEach((it) => pen.leader(it.px, it.py, tx, it.ty, it.lines, 'l', size));
}

/** Dashed callout circle + detail bubble. */
export function callout(pen: Pen, x: number, y: number, label: string, dx: number, dy: number) {
  pen.ents.push({ t: 'circle', c: pen.pt(x, y), r: 5 * pen.ps, layer: 'SYMBOL' });
  const bx = x + pen.pr(dx);
  const by = y + pen.pr(dy);
  const ang = Math.atan2(by - y, bx - x);
  pen.line(x + Math.cos(ang) * pen.pr(5), y + Math.sin(ang) * pen.pr(5), bx - Math.cos(ang) * pen.pr(3.2), by - Math.sin(ang) * pen.pr(3.2), 'TITLE');
  pen.bubble(bx, by, label, 3.2, 'TITLE');
}

const HANG: Bi = { en: 'Hanging rail HMR 20x80 + wall plugs', th: 'รางแขวน HMR 20x80 ยึดพุกเข้าผนัง' };

export function sectionView(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const pen = new Pen(ctx.ps);
  const bi = Math.min(p.sectionBay, r.bays.length - 1);
  const sb = r.bays[Math.max(0, bi)];
  const D = r.D;
  const Dc = r.Dc;
  const tb = r.tb;
  const tc = r.tc;
  const overhang = p.hasCountertop ? p.dims.countertopOverhang : 0;
  const frontX = D + overhang;
  const wallT = 120;
  const items: LeaderItem[] = [];
  const mCarcass = matOf(ctx, 'carcass');
  const mBack = matOf(ctx, 'back');
  const mShelf = matOf(ctx, 'shelf');
  const mFront = matOf(ctx, 'front');
  const mCt = matOf(ctx, 'countertop');
  const mPl = matOf(ctx, 'plinth');
  const mDb = matOf(ctx, 'drawerBox');

  // wall & floor
  const wallTop = r.topY + 150;
  pen.hatch(-wallT, 0, 0, wallTop, 'wall');
  pen.poly(
    [
      [-wallT, wallTop],
      [-wallT, 0],
      [0, 0],
      [0, wallTop],
    ],
    false,
    'WALL',
  );
  pen.line(-wallT - pen.pr(3), 0, frontX + pen.pr(8), 0, 'WALL');
  pen.hatch(-wallT - pen.pr(3), -pen.pr(1.5), frontX + pen.pr(8), 0, 'ground');

  // side panel beyond
  pen.rect(0, r.baseY, Dc, r.carcassTop, 'THIN', 'role:carcass');

  // back
  pen.cut(0, r.baseY, tb, r.carcassTop, 'solid', 'role:back', mBack?.color);
  items.push({ px: tb / 2, py: r.baseY + (r.carcassTop - r.baseY) * 0.62, lines: matLines(ctx, mBack, ROLE_NAMES.back) });

  // top & bottom
  pen.cut(tb, r.baseY, Dc, r.baseY + tc, 'solid', 'role:carcass', mCarcass?.color);
  pen.cut(tb, r.carcassTop - tc, Dc, r.carcassTop, 'solid', 'role:carcass', mCarcass?.color);
  items.push({ px: Dc * 0.55, py: r.carcassTop - tc / 2, lines: matLines(ctx, mCarcass, ROLE_NAMES.carcass) });

  let shelfLabelled = false;
  let drawerLabelled = false;
  let frontLabelled = false;
  if (sb) {
    sb.cells.forEach((rc, j) => {
      const c = rc.cell;
      // fixed division above this cell
      if (j < sb.cells.length - 1) {
        pen.cut(tb, rc.y1 - tc / 2, Dc, rc.y1 + tc / 2, 'solid', 'role:carcass', mCarcass?.color);
      }
      const setback = c.front === 'open' ? 0 : 20;
      shelfPositions(rc.iy0, rc.iy1, c.shelves, r.ts).forEach(([b, t]) => {
        pen.cut(tb + 2, b, Dc - setback, t, 'solid', 'role:shelf', mShelf?.color);
        if (!shelfLabelled) {
          items.push({ px: (tb + Dc) / 2, py: (b + t) / 2, lines: matLines(ctx, mShelf, ROLE_NAMES.shelf) });
          shelfLabelled = true;
        }
      });
      if (c.rail) {
        pen.circle(Dc / 2, rc.iy1 - 60, 13, 'CUT', 'role:rail');
        pen.line(Dc / 2, rc.iy1 - 47, Dc / 2, rc.iy1, 'THIN');
        items.push({ px: Dc / 2 + 13, py: rc.iy1 - 60, lines: matLines(ctx, matOf(ctx, 'rail'), ROLE_NAMES.rail) });
      }
      const lvs = leaves(sb, rc, p.dims.gap);
      const fm = findMaterial(p.materials, c.frontMaterialId) ?? mFront;
      const seen = new Set<string>();
      lvs.forEach((lf) => {
        const key = `${lf.y0.toFixed(1)}-${lf.y1.toFixed(1)}`;
        if (seen.has(key)) return;
        seen.add(key);
        pen.cut(Dc, lf.y0, Dc + r.tf, lf.y1, 'solid', cellTag(sb, rc), fm?.color);
        if (!frontLabelled || (fm && fm !== mFront)) {
          items.push({ px: Dc + r.tf / 2, py: lf.y0 + (lf.y1 - lf.y0) * 0.4, lines: matLines(ctx, fm, ROLE_NAMES.front) });
          frontLabelled = true;
        }
        if (lf.kind === 'drawer') {
          const L = slideLength(Dc - tb);
          const tdb = mDb?.thickness || 16;
          const yb = Math.max(lf.y0, rc.iy0) + 15;
          const hb = Math.max(60, Math.min(lf.y1, rc.iy1) - yb - 25);
          const x0 = Dc - L;
          pen.rect(x0, yb, Dc, yb + hb, 'THIN', 'role:drawerBox');
          pen.cut(x0, yb, x0 + tdb, yb + hb, 'solid', 'role:drawerBox', mDb?.color);
          pen.cut(Dc - tdb, yb, Dc, yb + hb, 'solid', 'role:drawerBox', mDb?.color);
          pen.cut(x0 + tdb, yb, Dc - tdb, yb + 10, 'solid', 'role:drawerBox', mBack?.color);
          pen.line(x0, yb - 6, Dc, yb - 6, 'HIDDEN');
          if (!drawerLabelled) {
            items.push({ px: x0 + tdb / 2, py: yb + hb * 0.6, lines: matLines(ctx, mDb, ROLE_NAMES.drawerBox) });
            drawerLabelled = true;
          }
        }
      });
    });
  }

  // countertop
  if (p.hasCountertop && r.tct > 0) {
    pen.cut(0, r.carcassTop, frontX, r.topY, 'solid', 'role:countertop', mCt?.color);
    items.push({ px: frontX * 0.7, py: (r.carcassTop + r.topY) / 2, lines: matLines(ctx, mCt, ROLE_NAMES.countertop) });
    if (p.functions.includes('sink')) {
      pen.rect(D / 2 - 190, r.carcassTop - 180, D / 2 + 190, r.carcassTop, 'HIDDEN');
    }
  }

  // base
  const recess = p.dims.plinthRecess;
  const tp = Math.max(2, r.tp);
  if (p.mount === 'plinth' && r.baseY > 0) {
    pen.cut(Dc - recess - tp, 0, Dc - recess, r.baseY, 'solid', 'role:plinth', mPl?.color);
    pen.cut(tb + 30, 0, tb + 30 + tp, r.baseY, 'solid', 'role:plinth', mPl?.color);
    items.push({ px: Dc - recess - tp / 2, py: r.baseY * 0.5, lines: matLines(ctx, mPl, ROLE_NAMES.plinth) });
  } else if (p.mount === 'legs' && r.baseY > 0) {
    pen.rect(60, 0, 100, r.baseY, 'THIN', 'role:plinth');
    pen.rect(Dc - 140, 0, Dc - 100, r.baseY, 'THIN', 'role:plinth');
    pen.cut(Dc - recess - tp, 5, Dc - recess, r.baseY, 'solid', 'role:plinth', mPl?.color);
    items.push({ px: Dc - recess - tp / 2, py: r.baseY * 0.5, lines: matLines(ctx, mPl, ROLE_NAMES.plinth) });
  } else if (p.mount === 'wall_hung') {
    const y1 = r.carcassTop - tc;
    pen.cut(tb, y1 - 80, tb + 20, y1, 'solid', 'role:carcass', mCarcass?.color);
    pen.line(tb + 10, y1 - 40, -60, y1 - 40, 'HIDDEN');
    items.push({ px: tb + 10, py: y1 - 60, lines: [ctx.lang === 'th' ? HANG.th : HANG.en, ...(ctx.lang === 'both' ? [HANG.th] : [])] });
  }

  // dimensions
  const hx = [0, Dc, D];
  if (overhang > 0) hx.push(frontX);
  pen.hchain(hx, r.topY, 7);
  pen.hdim(0, frontX, r.topY, 14);
  const ys = new Set<number>([0, r.baseY, r.carcassTop, r.topY]);
  sb?.cells.forEach((c) => {
    ys.add(c.y0);
    ys.add(c.y1);
  });
  const stops = [...ys].map((v) => Math.round(v * 10) / 10).filter((v, i, a) => a.indexOf(v) === i);
  pen.vchain(stops, frontX, 7);
  pen.vdim(p.mount === 'wall_hung' ? r.baseY : 0, r.topY, frontX, 14);

  // detail callouts
  callout(pen, Dc, r.carcassTop, 'D1', -12, -9);
  if (p.mount === 'wall_hung') callout(pen, 0, r.carcassTop - tc, 'D2', 10, -12);
  else callout(pen, Dc, r.baseY, 'D2', -12, 8);

  placeLeaders(pen, items, frontX + pen.pr(22));

  return { id: 'section', title: { en: 'SECTION A-A', th: 'รูปตัด A-A' }, scale: ctx.ps, s: 1, ents: pen.ents, bubble: 'A' };
}
