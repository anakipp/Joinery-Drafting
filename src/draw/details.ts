import { Pen } from './entities';
import type { Ctx, ViewBlock } from './context';
import { matLines, matOf } from './context';
import { placeLeaders, type LeaderItem } from './section';
import { ROLE_NAMES, Llines } from '../i18n/terms';
import type { Bi, HatchPattern, Material, ViewId } from '../model/types';

/** Details are drawn at true size on their own sheet; ctx.ps is the detail scale. */
function newDetailPen(ctx: Ctx) {
  return { pen: new Pen(ctx.ps, 1), den: ctx.ps };
}

function pat(m: Material | undefined): HatchPattern {
  return m?.hatch ?? 'board';
}

/** Vertical break symbol. */
export function brkV(pen: Pen, x: number, y0: number, y1: number) {
  const ym = (y0 + y1) / 2;
  const a = pen.pr(1.2);
  pen.poly(
    [
      [x, y0 - pen.pr(1.5)],
      [x, ym - a],
      [x - a, ym - a * 0.3],
      [x + a, ym + a * 0.3],
      [x, ym + a],
      [x, y1 + pen.pr(1.5)],
    ],
    false,
    'THIN',
  );
}

/** Horizontal break symbol. */
export function brkH(pen: Pen, y: number, x0: number, x1: number) {
  const xm = (x0 + x1) / 2;
  const a = pen.pr(1.2);
  pen.poly(
    [
      [x0 - pen.pr(1.5), y],
      [xm - a, y],
      [xm - a * 0.3, y + a],
      [xm + a * 0.3, y - a],
      [xm + a, y],
      [x1 + pen.pr(1.5), y],
    ],
    false,
    'THIN',
  );
}

function note(ctx: Ctx, b: Bi): string[] {
  return Llines(b, ctx.lang);
}

/** Laminate skin lines on a board face (vertical board). */
function skinsV(pen: Pen, x0: number, x1: number, y0: number, y1: number) {
  pen.line(x0 + 0.8, y0, x0 + 0.8, y1, 'THIN');
  pen.line(x1 - 0.8, y0, x1 - 0.8, y1, 'THIN');
}
function skinsH(pen: Pen, x0: number, x1: number, y0: number, y1: number) {
  pen.line(x0, y0 + 0.8, x1, y0 + 0.8, 'THIN');
  pen.line(x0, y1 - 0.8, x1, y1 - 0.8, 'THIN');
}

function block(id: ViewId, title: Bi, bubble: string, den: number, pen: Pen): ViewBlock {
  return { id, title, scale: den, s: pen.s, ents: pen.ents, bubble };
}

const EDGE_COLOR = '#5b4a36';

/** D1: top front corner (vertical section). */
function detailTopCorner(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const { pen, den } = newDetailPen(ctx);
  const Dc = r.Dc;
  const tc = r.tc;
  const tf = r.tf;
  const g = p.dims.gap;
  const top = r.carcassTop;
  const mC = matOf(ctx, 'carcass');
  const mF = matOf(ctx, 'front');
  const mE = matOf(ctx, 'edge');
  const mT = matOf(ctx, 'countertop');
  const eb = Math.min(2, mE?.thickness ?? 2);
  const x0 = Dc - 140;
  const yb = top - 140;
  const items: LeaderItem[] = [];
  const overhang = p.hasCountertop ? p.dims.countertopOverhang : 0;
  const xr = Math.max(Dc + tf, r.D + overhang) + 30;

  // side panel beyond
  pen.line(Dc, yb, Dc, top - tc, 'THIN');
  pen.line(x0, top - tc - 0.01, x0, yb, 'THIN');
  // top panel + front edge banding
  pen.cut(x0, top - tc, Dc - eb, top, pat(mC), 'role:carcass');
  pen.cut(Dc - eb, top - tc, Dc, top, 'solid', 'role:edge', EDGE_COLOR);
  brkV(pen, x0, top - tc, top);
  items.push({ px: Dc - 60, py: top - tc / 2, lines: matLines(ctx, mC, ROLE_NAMES.carcass) });
  items.push({ px: Dc - eb / 2, py: top - tc * 0.25, lines: matLines(ctx, mE, ROLE_NAMES.edge) });

  if (r.hasFronts) {
    const dTop = top - g / 2;
    pen.cut(Dc, yb, Dc + tf, dTop - eb, pat(mF), 'role:front');
    pen.cut(Dc, dTop - eb, Dc + tf, dTop, 'solid', 'role:edge', EDGE_COLOR);
    skinsV(pen, Dc, Dc + tf, yb, dTop - eb);
    brkH(pen, yb, Dc, Dc + tf);
    items.push({ px: Dc + tf / 2, py: yb + 50, lines: matLines(ctx, mF, ROLE_NAMES.front) });
    pen.hdim(Dc, Dc + tf, yb, -6);
    pen.vdim(dTop, top, Dc + tf, 4, `${g / 2}`);
  }
  if (p.hasCountertop && r.tct > 0) {
    const xe = r.D + overhang;
    pen.cut(x0, top, xe, r.topY, pat(mT), 'role:countertop');
    brkV(pen, x0, top, r.topY);
    items.push({ px: xe - 40, py: (top + r.topY) / 2, lines: matLines(ctx, mT, ROLE_NAMES.countertop) });
    pen.vdim(top, r.topY, x0, -5);
    if (overhang > 0) pen.hdim(Dc + tf, xe, r.topY, 5);
  }
  pen.vdim(top - tc, top, x0, -5);
  placeLeaders(pen, items, xr + pen.pr(6));
  return block('d1', { en: 'TOP CORNER JOINT', th: 'รอยต่อมุมบนตู้' }, 'D1', den, pen);
}

/** D2: base / plinth (vertical section). */
function detailBase(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const { pen, den } = newDetailPen(ctx);
  const Dc = r.Dc;
  const tc = r.tc;
  const tf = r.tf;
  const g = p.dims.gap;
  const by = r.baseY;
  const mC = matOf(ctx, 'carcass');
  const mF = matOf(ctx, 'front');
  const mE = matOf(ctx, 'edge');
  const mP = matOf(ctx, 'plinth');
  const eb = Math.min(2, mE?.thickness ?? 2);
  const x0 = Dc - 200;
  const yt = by + tc + 110;
  const items: LeaderItem[] = [];
  const recess = p.dims.plinthRecess;
  const tp = Math.max(2, r.tp);

  // floor
  pen.line(x0 - 20, 0, Dc + tf + 40, 0, 'WALL');
  pen.hatch(x0 - 20, -25, Dc + tf + 40, 0, 'ground');
  // bottom panel
  pen.line(Dc, by + tc, Dc, yt, 'THIN');
  pen.cut(x0, by, Dc - eb, by + tc, pat(mC), 'role:carcass');
  pen.cut(Dc - eb, by, Dc, by + tc, 'solid', 'role:edge', EDGE_COLOR);
  brkV(pen, x0, by, by + tc);
  items.push({ px: Dc - 80, py: by + tc / 2, lines: matLines(ctx, mC, ROLE_NAMES.carcass) });
  if (r.hasFronts) {
    const dB = by + g / 2;
    pen.cut(Dc, dB + eb, Dc + tf, yt, pat(mF), 'role:front');
    pen.cut(Dc, dB, Dc + tf, dB + eb, 'solid', 'role:edge', EDGE_COLOR);
    skinsV(pen, Dc, Dc + tf, dB + eb, yt);
    brkH(pen, yt, Dc, Dc + tf);
    items.push({ px: Dc + tf / 2, py: yt - 40, lines: matLines(ctx, mF, ROLE_NAMES.front) });
  }
  if (by > 0) {
    const kx1 = Dc - recess;
    const kx0 = kx1 - tp;
    pen.cut(kx0, p.functions.includes('wet_area') ? 5 : 0, kx1, by, pat(mP), 'role:plinth');
    items.push({ px: kx1 - tp / 2, py: by * 0.45, lines: matLines(ctx, mP, ROLE_NAMES.plinth) });
    if (p.mount === 'legs' || mP?.category === 'metal') {
      const lx = kx0 - 70;
      pen.rect(lx, 0, lx + 40, 12, 'OUTLINE');
      pen.rect(lx + 12, 12, lx + 28, by - 15, 'OUTLINE');
      pen.rect(lx - 5, by - 15, lx + 45, by, 'OUTLINE');
      items.push({
        px: lx + 20,
        py: by * 0.6,
        lines: note(ctx, { en: 'Adjustable leg, plastic H.100-150', th: 'ขาปรับระดับพลาสติก สูง 100-150 มม.' }),
      });
    } else {
      pen.cut(x0 + 20, 0, x0 + 20 + tp, by, pat(mP), 'role:plinth');
      pen.line(kx0, by - 25, x0 + 20 + tp, by - 25, 'HIDDEN');
    }
    if (p.functions.includes('wet_area')) {
      items.push({ px: kx1, py: 3, lines: note(ctx, { en: 'Silicone seal 5 mm. gap', th: 'ยาแนวซิลิโคน ช่องว่าง 5 มม.' }) });
    }
    pen.vdim(0, by, x0, -5);
    pen.hdim(kx1, Dc, 0, -6);
  }
  pen.vdim(by, by + tc, x0, -5);
  placeLeaders(pen, items, Dc + tf + pen.pr(10));
  return block('d2', { en: 'BASE / PLINTH', th: 'รายละเอียดฐานตู้' }, 'D2', den, pen);
}

/** D2 for wall-hung units: hanging rail fixing (vertical section at the back). */
function detailHanging(ctx: Ctx): ViewBlock {
  const { r } = ctx;
  const { pen, den } = newDetailPen(ctx);
  const tc = r.tc;
  const tb = r.tb;
  const top = r.carcassTop;
  const mC = matOf(ctx, 'carcass');
  const mB = matOf(ctx, 'back');
  const yb = top - 170;
  const xr = 170;
  const items: LeaderItem[] = [];

  pen.hatch(-70, yb, 0, r.topY + 30, 'wall');
  pen.line(0, yb, 0, r.topY + 30, 'WALL');
  brkH(pen, yb, -70, 0);
  pen.cut(0, yb, tb, top, pat(mB), 'role:back');
  brkH(pen, yb, 0, tb);
  pen.cut(tb, top - tc, xr, top, pat(mC), 'role:carcass');
  brkV(pen, xr, top - tc, top);
  const ry1 = top - tc;
  pen.cut(tb, ry1 - 80, tb + 20, ry1, pat(mC), 'role:carcass');
  const sy = ry1 - 40;
  pen.rect(-55, sy - 4, 0, sy + 4, 'THIN');
  pen.line(tb + 20, sy, -50, sy, 'OUTLINE');
  pen.line(tb + 20, sy - 6, tb + 20, sy + 6, 'OUTLINE');
  if (ctx.p.hasCountertop && r.tct > 0) {
    pen.cut(0, top, xr, r.topY, pat(matOf(ctx, 'countertop')), 'role:countertop');
    brkV(pen, xr, top, r.topY);
  }
  items.push({ px: -35, py: yb + 30, lines: note(ctx, { en: 'Masonry wall (verify on site)', th: 'ผนังก่ออิฐ (ตรวจสอบหน้างาน)' }) });
  items.push({ px: tb / 2, py: yb + 20, lines: matLines(ctx, mB, ROLE_NAMES.back) });
  items.push({ px: xr - 30, py: top - tc / 2, lines: matLines(ctx, mC, ROLE_NAMES.carcass) });
  items.push({ px: tb + 10, py: ry1 - 70, lines: note(ctx, { en: 'Hanging rail HMR 20x80, glued & screwed', th: 'รางแขวน HMR 20x80 ทากาวและยึดสกรู' }) });
  items.push({ px: -20, py: sy, lines: note(ctx, { en: 'Screw 8x75 + wall plug @ 400 mm.', th: 'สกรู 8x75 + พุก ระยะ 400 มม.' }) });
  pen.vdim(ry1 - 80, ry1, tb + 20, 4);
  pen.hdim(0, tb, top, 4);
  placeLeaders(pen, items, xr + pen.pr(8));
  return block('d2', { en: 'WALL HANGING FIXING', th: 'รายละเอียดการยึดแขวนผนัง' }, 'D2', den, pen);
}

/** D3: back panel groove (plan). */
function detailBackCorner(ctx: Ctx): ViewBlock {
  const { r } = ctx;
  const { pen, den } = newDetailPen(ctx);
  const tc = r.tc;
  const tb = r.tb;
  const D = r.D;
  const gd = Math.min(8, tc / 2);
  const y0 = D - 150;
  const xr = 170;
  const mC = matOf(ctx, 'carcass');
  const mB = matOf(ctx, 'back');
  const items: LeaderItem[] = [];

  pen.hatch(-40, D, xr, D + 60, 'wall');
  pen.line(-40, D, xr, D, 'WALL');
  brkV(pen, -40, D, D + 60);
  // side panel with groove notch
  pen.fill(0, y0, tc, D - tb, mC?.color);
  pen.hatch(0, y0, tc, D - tb, pat(mC));
  pen.hatch(0, D - tb, tc - gd, D, pat(mC));
  pen.poly(
    [
      [0, y0],
      [tc, y0],
      [tc, D - tb],
      [tc - gd, D - tb],
      [tc - gd, D],
      [0, D],
    ],
    true,
    'CUT',
    'role:carcass',
  );
  brkH(pen, y0, 0, tc);
  pen.cut(tc - gd, D - tb, xr, D, pat(mB), 'role:back');
  brkV(pen, xr, D - tb, D);
  // shelf seen below
  pen.line(tc, y0 + 10, xr, y0 + 10, 'THIN');
  items.push({ px: tc / 2, py: y0 + 40, lines: matLines(ctx, mC, ROLE_NAMES.carcass) });
  items.push({ px: xr - 40, py: D - tb / 2, lines: matLines(ctx, mB, ROLE_NAMES.back) });
  items.push({
    px: tc - gd / 2,
    py: D - tb / 2,
    lines: note(ctx, { en: `Groove ${gd} mm. deep, glued`, th: `เซาะร่องลึก ${gd} มม. ทากาว` }),
  });
  pen.hdim(0, tc, y0, -5);
  pen.vdim(D - tb, D, -40, -4);
  placeLeaders(pen, items, xr + pen.pr(8));
  return block('d3', { en: 'BACK PANEL JOINT (PLAN)', th: 'รอยต่อแผ่นหลัง (แปลน)' }, 'D3', den, pen);
}

/** D4: front overlay & hinge (plan). */
function detailHinge(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const { pen, den } = newDetailPen(ctx);
  const tc = r.tc;
  const tf = r.tf;
  const g = p.dims.gap;
  const mC = matOf(ctx, 'carcass');
  const mF = matOf(ctx, 'front');
  const mE = matOf(ctx, 'edge');
  const mH = matOf(ctx, 'hinge');
  const eb = Math.min(2, mE?.thickness ?? 2);
  const xr = 190;
  const yt = 150;
  const items: LeaderItem[] = [];
  // side panel (y grows toward the wall)
  pen.cut(0, tf + eb, tc, yt, pat(mC), 'role:carcass');
  pen.cut(0, tf, tc, tf + eb, 'solid', 'role:edge', EDGE_COLOR);
  brkH(pen, yt, 0, tc);
  // door
  const dx0 = g / 2;
  pen.cut(dx0 + eb, 0, xr, tf, pat(mF), 'role:front');
  pen.cut(dx0, 0, dx0 + eb, tf, 'solid', 'role:edge', EDGE_COLOR);
  skinsH(pen, dx0 + eb, xr, 0, tf);
  brkV(pen, xr, 0, tf);
  // hinge cup + arm + plate
  const cx = dx0 + 22.5;
  const cd = Math.min(13, tf - 4);
  pen.fill(cx - 17.5, tf - cd, cx + 17.5, tf, '#ffffff');
  pen.rect(cx - 17.5, tf - cd, cx + 17.5, tf, 'OUTLINE', 'role:hinge');
  pen.poly(
    [
      [cx, tf - cd + 3],
      [cx, tf + 12],
      [tc + 30, tf + 32],
      [tc + 70, tf + 32],
    ],
    false,
    'OUTLINE',
    'role:hinge',
  );
  pen.rect(tc, tf + 22, tc + 6, tf + 72, 'OUTLINE', 'role:hinge');
  items.push({ px: tc / 2, py: yt - 30, lines: matLines(ctx, mC, ROLE_NAMES.carcass) });
  items.push({ px: xr - 40, py: tf / 2, lines: matLines(ctx, mF, ROLE_NAMES.front) });
  items.push({ px: cx + 10, py: tf + 30, lines: matLines(ctx, mH, ROLE_NAMES.hinge) });
  items.push({ px: dx0 + eb / 2, py: tf * 0.3, lines: matLines(ctx, mE, ROLE_NAMES.edge) });
  pen.hdim(0, dx0, 0, -5, `${g / 2}`);
  pen.hdim(cx - 17.5, cx + 17.5, 0, -10, 'Ø35');
  pen.vdim(0, tf, xr, 4);
  pen.hdim(0, tc, yt, 4);
  placeLeaders(pen, items, xr + pen.pr(8));
  return block('d4', { en: 'DOOR OVERLAY & HINGE (PLAN)', th: 'บานทับขอบและบานพับ (แปลน)' }, 'D4', den, pen);
}

/** D4 alternative for open units: shelf support. */
function detailShelfPin(ctx: Ctx): ViewBlock {
  const { r } = ctx;
  const { pen, den } = newDetailPen(ctx);
  const tc = r.tc;
  const ts = r.ts;
  const mC = matOf(ctx, 'carcass');
  const mS = matOf(ctx, 'shelf');
  const mE = matOf(ctx, 'edge');
  const xr = 180;
  const items: LeaderItem[] = [];
  pen.cut(0, -90, tc, 90, pat(mC), 'role:carcass');
  brkH(pen, -90, 0, tc);
  brkH(pen, 90, 0, tc);
  pen.cut(tc + 1, 0, xr, ts, pat(mS), 'role:shelf');
  brkV(pen, xr, 0, ts);
  pen.fill(tc - 10, -5, tc + 12, 0, '#888888');
  pen.rect(tc - 10, -5, tc + 12, 0, 'OUTLINE');
  [-64, -32, 32, 64].forEach((dy) => pen.rect(tc - 10, dy - 2.5, tc, dy + 2.5, 'HIDDEN'));
  pen.line(tc + 1, ts + 3, xr, ts + 3, 'THIN');
  items.push({ px: tc / 2, py: 60, lines: matLines(ctx, mC, ROLE_NAMES.carcass) });
  items.push({ px: xr - 40, py: ts / 2, lines: matLines(ctx, mS, ROLE_NAMES.shelf) });
  items.push({ px: tc + 6, py: -3, lines: note(ctx, { en: 'Shelf pin Ø5, holes @ 32 mm.', th: 'หมุดรับชั้น Ø5 เจาะรูระยะ 32 มม.' }) });
  items.push({ px: xr - 80, py: ts + 3, lines: matLines(ctx, mE, ROLE_NAMES.edge) });
  pen.vdim(0, ts, xr, 4);
  pen.vdim(0, 32, 0, -5);
  placeLeaders(pen, items, xr + pen.pr(8));
  return block('d4', { en: 'SHELF SUPPORT', th: 'รายละเอียดหมุดรับชั้น' }, 'D4', den, pen);
}

export function cabinetDetails(ctx: Ctx): ViewBlock[] {
  return [
    detailTopCorner(ctx),
    ctx.p.mount === 'wall_hung' ? detailHanging(ctx) : detailBase(ctx),
    detailBackCorner(ctx),
    ctx.r.hasFronts ? detailHinge(ctx) : detailShelfPin(ctx),
  ];
}
