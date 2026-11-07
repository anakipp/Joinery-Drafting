import { Pen } from './entities';
import type { Ctx, ViewBlock } from './context';
import { matLines, matOf } from './context';
import { callout, placeLeaders, type LeaderItem } from './section';
import { brkH, brkV } from './details';
import { ROLE_NAMES, Llines } from '../i18n/terms';
import type { Bi } from '../model/types';

/** Stud / batten centre positions so that no spacing exceeds `max`. */
export function frameStations(start: number, end: number, fixed: number[], max: number): number[] {
  const base = [...new Set([start, end, ...fixed.filter((v) => v > start && v < end)])].sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 0; i < base.length - 1; i++) {
    const a = base[i];
    const b = base[i + 1];
    const n = Math.max(1, Math.ceil((b - a) / Math.max(100, max) - 1e-9));
    for (let k = 0; k < n; k++) out.push(a + ((b - a) * k) / n);
  }
  out.push(base[base.length - 1]);
  return out.map((v) => Math.round(v * 10) / 10);
}

export function wallPanelGeometry(ctx: Ctx) {
  const { r, p } = ctx;
  const fw = r.frameWidth;
  const skirt = Math.max(0, p.dims.plinthHeight);
  const joints = r.bays.slice(0, -1).map((b) => b.x1);
  const studs = frameStations(fw / 2, r.W - fw / 2, joints, p.dims.frameSpacing);
  const first = r.bays[0];
  const hj = first ? first.cells.slice(0, -1).map((c) => c.y1) : [];
  const rails = frameStations(fw / 2, r.H - fw / 2, hj, p.dims.frameSpacing);
  return { fw, skirt, joints, studs, hj, rails };
}

const FIX: Bi = { en: 'Fix with PU glue + brad nails', th: 'ยึดด้วยกาว PU + ตะปูยิงไม้' };
const WALL: Bi = { en: 'Existing wall (verify level on site)', th: 'ผนังเดิม (ตรวจสอบระดับหน้างาน)' };
const PLUG: Bi = { en: 'Frame fixed to wall: screw + plug @ 600', th: 'ยึดโครงเข้าผนัง สกรู + พุก @ 600' };

export function wallPanelElevation(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const pen = new Pen(ctx.ps);
  const W = r.W;
  const H = r.H;
  const g = p.dims.gap;
  const { skirt, studs, rails } = wallPanelGeometry(ctx);
  const mCl = matOf(ctx, 'cladding');

  pen.line(-pen.pr(8), 0, W + pen.pr(8), 0, 'WALL');
  pen.hatch(-pen.pr(8), -pen.pr(1.5), W + pen.pr(8), 0, 'ground');
  pen.text(-pen.pr(8), pen.pr(0.8), 'FFL ±0.00', { size: 1.8 });
  // skirting
  if (skirt > 0) pen.rect(0, 0, W, skirt, 'OUTLINE', 'role:plinth');
  // panels
  for (const rb of r.bays) {
    for (const rc of rb.cells) {
      const x0 = rb.x0 + (rb.index === 0 ? 0 : g / 2);
      const x1 = rb.x1 - (rb.index === r.bays.length - 1 ? 0 : g / 2);
      const y0 = Math.max(skirt, rc.y0 + (rc.index === 0 ? 0 : g / 2));
      const y1 = rc.y1 - (rc.index === rb.cells.length - 1 ? 0 : g / 2);
      if (y1 <= y0) continue;
      const tag = `cell:${rb.bay.id}:${rc.cell.id}`;
      pen.fill(x0, y0, x1, y1, mCl?.color, tag);
      pen.rect(x0, y0, x1, y1, 'OUTLINE', tag);
      if (mCl) pen.text(x0 + pen.pr(1.2), y0 + pen.pr(1.2), mCl.code, { size: 1.6, layer: 'TAG' });
    }
  }
  // wood structure behind (hidden)
  studs.forEach((x) => pen.line(x, Math.max(0, skirt), x, H, 'HIDDEN', 'role:frame'));
  rails.forEach((y) => y > skirt && pen.line(0, y, W, y, 'HIDDEN', 'role:frame'));
  // dims
  const bx = [0, ...r.bays.map((b) => b.x1)];
  if (r.bays.length > 1) pen.hchain(bx, H, 7);
  pen.hdim(0, W, H, r.bays.length > 1 ? 14 : 7);
  const last = r.bays[r.bays.length - 1];
  const ys = new Set<number>([0, H]);
  if (skirt > 0) ys.add(skirt);
  last?.cells.forEach((c) => ys.add(c.y1));
  pen.vchain([...ys], W, 7);
  pen.vdim(0, H, W, 14);
  pen.hchain(studs, 0, -6);
  // section marker
  const sb = r.bays[Math.min(p.sectionBay, r.bays.length - 1)];
  if (sb) {
    const sx = (sb.x0 + sb.x1) / 2;
    for (const [yb, dir] of [
      [H + pen.pr(20), 1],
      [-pen.pr(10), -1],
    ] as const) {
      const y1 = yb + pen.pr(6) * dir;
      pen.line(sx, yb, sx, y1, 'CUT');
      pen.line(sx, y1, sx + pen.pr(5), y1, 'CUT');
      pen.text(sx - pen.pr(1.2), y1, 'A', { size: 3, ha: 'r', va: 'm', bold: true, layer: 'TITLE' });
    }
  }
  return { id: 'elevation', title: { en: 'FRONT ELEVATION', th: 'รูปด้านหน้า' }, scale: ctx.ps, s: 1, ents: pen.ents, bubble: '1' };
}

export function wallPanelSection(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const pen = new Pen(ctx.ps);
  const H = r.H;
  const fd = r.frameDepth;
  const tcl = r.claddingT;
  const D = fd + tcl;
  const g = p.dims.gap;
  const { fw, skirt, rails } = wallPanelGeometry(ctx);
  const mF = matOf(ctx, 'frame');
  const mCl = matOf(ctx, 'cladding');
  const mP = matOf(ctx, 'plinth');
  const items: LeaderItem[] = [];
  const wallT = 150;

  pen.hatch(-wallT, 0, 0, H + 200, 'wall');
  pen.line(0, 0, 0, H + 200, 'WALL');
  pen.line(-wallT, 0, -wallT, H + 200, 'WALL');
  pen.line(-wallT - pen.pr(3), 0, D + pen.pr(10), 0, 'WALL');
  pen.hatch(-wallT - pen.pr(3), -pen.pr(1.5), D + pen.pr(10), 0, 'ground');
  // stud beyond
  pen.rect(0, Math.max(0, skirt), fd, H, 'THIN', 'role:frame');
  // rails cut
  rails.forEach((y) => pen.cut(0, y - fw / 2, fd, y + fw / 2, mF?.hatch ?? 'timber', 'role:frame'));
  items.push({ px: fd / 2, py: rails[Math.floor(rails.length / 2)] ?? H / 2, lines: matLines(ctx, mF, ROLE_NAMES.frame) });
  // cladding (cut) between joints
  const sb = r.bays[Math.min(p.sectionBay, r.bays.length - 1)];
  sb?.cells.forEach((rc) => {
    const y0 = Math.max(skirt, rc.y0 + (rc.index === 0 ? 0 : g / 2));
    const y1 = rc.y1 - (rc.index === sb.cells.length - 1 ? 0 : g / 2);
    if (y1 > y0) pen.cut(fd, y0, D, y1, 'solid', `cell:${sb.bay.id}:${rc.cell.id}`, mCl?.color);
  });
  items.push({ px: D - tcl / 2, py: H * 0.75, lines: matLines(ctx, mCl, ROLE_NAMES.cladding) });
  if (skirt > 0) {
    pen.cut(fd, 0, D - 10, skirt, 'solid', 'role:plinth', mP?.color);
    items.push({ px: fd + 5, py: skirt / 2, lines: matLines(ctx, mP, { en: 'Recessed skirting', th: 'บัวเชิงผนังแบบเว้นร่อง' }) });
  }
  items.push({ px: -wallT / 2, py: H * 0.4, lines: Llines(WALL, ctx.lang) });
  items.push({ px: fd, py: H * 0.55, lines: Llines(FIX, ctx.lang) });

  pen.hchain([0, fd, D], H, 7);
  const ys = new Set<number>([0, H]);
  if (skirt > 0) ys.add(skirt);
  sb?.cells.forEach((c) => ys.add(c.y1));
  pen.vchain([...ys], D, 7);
  pen.vdim(0, H, D, 14);
  callout(pen, D, H, 'D3', -10, -10);
  callout(pen, D, Math.max(skirt, 5), 'D2', -10, 10);
  placeLeaders(pen, items, D + pen.pr(22));
  return { id: 'section', title: { en: 'SECTION A-A', th: 'รูปตัด A-A' }, scale: ctx.ps, s: 1, ents: pen.ents, bubble: 'A' };
}

export function wallPanelPlan(ctx: Ctx): ViewBlock {
  const { r, p } = ctx;
  const pen = new Pen(ctx.ps);
  const W = r.W;
  const fd = r.frameDepth;
  const tcl = r.claddingT;
  const D = fd + tcl;
  const g = p.dims.gap;
  const { fw, studs } = wallPanelGeometry(ctx);
  const mF = matOf(ctx, 'frame');
  const mCl = matOf(ctx, 'cladding');
  const wallT = 150;

  pen.hatch(-pen.pr(6), D, W + pen.pr(6), D + wallT, 'wall');
  pen.line(-pen.pr(6), D, W + pen.pr(6), D, 'WALL');
  pen.line(-pen.pr(6), D + wallT, W + pen.pr(6), D + wallT, 'WALL');
  studs.forEach((x) => pen.cut(x - fw / 2, tcl, x + fw / 2, D, mF?.hatch ?? 'timber', 'role:frame'));
  r.bays.forEach((rb) => {
    const x0 = rb.x0 + (rb.index === 0 ? 0 : g / 2);
    const x1 = rb.x1 - (rb.index === r.bays.length - 1 ? 0 : g / 2);
    const rc = rb.cells[rb.cells.length - 1];
    pen.cut(x0, 0, x1, tcl, 'solid', rc ? `cell:${rb.bay.id}:${rc.cell.id}` : 'role:cladding', mCl?.color);
  });
  // end returns
  pen.cut(-tcl, 0, 0, D, 'solid', 'role:cladding', mCl?.color);
  pen.cut(W, 0, W + tcl, D, 'solid', 'role:cladding', mCl?.color);
  pen.hchain(studs, 0, -6);
  pen.hdim(-tcl, W + tcl, D + wallT, 6);
  pen.vchain([0, tcl, D], W + tcl, 7);
  if (r.bays.length > 1) callout(pen, r.bays[0].x1, tcl / 2, 'D1', 8, -10);
  callout(pen, 0, D / 2, 'D4', -8, -10);
  return { id: 'plan', title: { en: 'PLAN', th: 'แปลน' }, scale: ctx.ps, s: 1, ents: pen.ents, bubble: '2' };
}

function detailPen(ctx: Ctx) {
  return { pen: new Pen(ctx.ps, 1), den: ctx.ps };
}

export function wallPanelDetails(ctx: Ctx): ViewBlock[] {
  const { r, p } = ctx;
  const fd = r.frameDepth;
  const tcl = r.claddingT;
  const D = fd + tcl;
  const g = p.dims.gap;
  const fw = r.frameWidth;
  const mF = matOf(ctx, 'frame');
  const mCl = matOf(ctx, 'cladding');
  const mP = matOf(ctx, 'plinth');
  const fh = mF?.hatch ?? 'timber';
  const out: ViewBlock[] = [];

  // D1 panel joint (plan)
  {
    const { pen, den } = detailPen(ctx);
    const items: LeaderItem[] = [];
    const a = -150;
    const b = 150;
    pen.hatch(a, D, b, D + 60, 'wall');
    pen.line(a, D, b, D, 'WALL');
    pen.cut(-fw / 2, tcl, fw / 2, D, fh, 'role:frame');
    pen.cut(a, 0, -g / 2, tcl, 'board', 'role:cladding');
    pen.cut(g / 2, 0, b, tcl, 'board', 'role:cladding');
    pen.line(a, 0.8, -g / 2, 0.8, 'THIN');
    pen.line(g / 2, 0.8, b, 0.8, 'THIN');
    pen.fill(-g / 2, tcl, g / 2, tcl + 2, '#222222');
    brkV(pen, a, 0, tcl);
    brkV(pen, b, 0, tcl);
    items.push({ px: 0, py: D - 8, lines: matLines(ctx, mF, ROLE_NAMES.frame) });
    items.push({ px: b - 40, py: tcl / 2, lines: matLines(ctx, mCl, ROLE_NAMES.cladding) });
    items.push({
      px: 0,
      py: tcl / 2,
      lines: Llines({ en: `Shadow gap ${g} mm., back painted black`, th: `ร่องเงา ${g} มม. ทาสีดำด้านใน` }, ctx.lang),
    });
    items.push({ px: -fw / 2, py: D - 2, lines: Llines(PLUG, ctx.lang) });
    pen.hdim(-g / 2, g / 2, 0, -5);
    pen.hdim(-fw / 2, fw / 2, D + 60, 4);
    pen.vchain([0, tcl, D], a, -5);
    placeLeaders(pen, items, b + pen.pr(8));
    out.push({ id: 'd1', title: { en: 'PANEL JOINT (PLAN)', th: 'รอยต่อแผ่น (แปลน)' }, scale: den, s: pen.s, ents: pen.ents, bubble: 'D1' });
  }
  // D2 skirting (section)
  {
    const { pen, den } = detailPen(ctx);
    const items: LeaderItem[] = [];
    const skirt = Math.max(0, p.dims.plinthHeight);
    const yt = skirt + 160;
    pen.hatch(-60, 0, 0, yt, 'wall');
    pen.line(0, 0, 0, yt, 'WALL');
    pen.line(-60, 0, D + 60, 0, 'WALL');
    pen.hatch(-60, -25, D + 60, 0, 'ground');
    pen.cut(0, 0, fd, fw, fh, 'role:frame');
    pen.rect(0, fw, fd, yt, 'THIN');
    const cy0 = skirt > 0 ? skirt : 5;
    pen.cut(fd, cy0, D, yt, 'board', 'role:cladding');
    brkH(pen, yt, fd, D);
    if (skirt > 0) {
      pen.cut(fd, 0, D - 10, skirt - 2, mP?.hatch ?? 'metal', 'role:plinth');
      items.push({ px: fd + 4, py: skirt / 2, lines: matLines(ctx, mP, { en: 'Recessed skirting', th: 'บัวเชิงผนังเว้นร่อง' }) });
      pen.vdim(0, skirt, D, 5);
      pen.hdim(D - 10, D, skirt, 5);
    } else {
      items.push({ px: D - 3, py: 2, lines: Llines({ en: 'Gap 5 mm. + silicone', th: 'เว้นร่อง 5 มม. + ซิลิโคน' }, ctx.lang) });
    }
    items.push({ px: fd / 2, py: fw / 2, lines: matLines(ctx, mF, ROLE_NAMES.frame) });
    items.push({ px: D - tcl / 2, py: yt - 40, lines: matLines(ctx, mCl, ROLE_NAMES.cladding) });
    pen.hchain([0, fd, D], yt, 5);
    placeLeaders(pen, items, D + pen.pr(12));
    out.push({ id: 'd2', title: { en: 'SKIRTING (SECTION)', th: 'บัวเชิงผนัง (รูปตัด)' }, scale: den, s: pen.s, ents: pen.ents, bubble: 'D2' });
  }
  // D3 top edge (section)
  {
    const { pen, den } = detailPen(ctx);
    const items: LeaderItem[] = [];
    const H = r.H;
    const yb = H - 160;
    pen.hatch(-60, yb, 0, H + 60, 'wall');
    pen.line(0, yb, 0, H + 60, 'WALL');
    pen.cut(0, H - fw, fd, H, fh, 'role:frame');
    pen.rect(0, yb, fd, H - fw, 'THIN');
    pen.cut(fd, yb, D, H - 2, 'board', 'role:cladding');
    pen.cut(fd, H - 2, D, H, 'solid', 'role:edge', '#5b4a36');
    pen.line(fd, H, -60, H, 'THIN');
    brkH(pen, yb, fd, D);
    items.push({ px: fd / 2, py: H - fw / 2, lines: matLines(ctx, mF, ROLE_NAMES.frame) });
    items.push({ px: D - tcl / 2, py: yb + 40, lines: matLines(ctx, mCl, ROLE_NAMES.cladding) });
    items.push({ px: D - tcl / 2, py: H - 1, lines: matLines(ctx, matOf(ctx, 'edge'), ROLE_NAMES.edge) });
    items.push({ px: fd, py: H - fw - 30, lines: Llines(FIX, ctx.lang) });
    pen.vdim(H - fw, H, -60, -4);
    pen.hchain([0, fd, D], H, 8);
    placeLeaders(pen, items, D + pen.pr(12));
    out.push({ id: 'd3', title: { en: 'TOP EDGE (SECTION)', th: 'ขอบบน (รูปตัด)' }, scale: den, s: pen.s, ents: pen.ents, bubble: 'D3' });
  }
  // D4 end return (plan) — wood structure covered with cladding
  {
    const { pen, den } = detailPen(ctx);
    const items: LeaderItem[] = [];
    const b = 180;
    pen.hatch(-60, D, b, D + 60, 'wall');
    pen.line(-60, D, b, D, 'WALL');
    pen.cut(0, tcl, fw, D, fh, 'role:frame');
    pen.cut(0, 0, b, tcl, 'board', 'role:cladding');
    pen.cut(-tcl, 0, 0, D, 'board', 'role:cladding');
    pen.line(-tcl + 0.8, 0, -tcl + 0.8, D, 'THIN');
    pen.line(0, 0.8, b, 0.8, 'THIN');
    brkV(pen, b, 0, tcl);
    items.push({ px: fw / 2, py: D - 6, lines: matLines(ctx, mF, ROLE_NAMES.frame) });
    items.push({ px: b - 40, py: tcl / 2, lines: matLines(ctx, mCl, ROLE_NAMES.cladding) });
    items.push({
      px: -tcl / 2,
      py: D / 2,
      lines: Llines({ en: 'End return cover HMR, mitred / butt', th: 'แผ่นปิดข้าง HMR ต่อชนหรือเข้ามุม 45°' }, ctx.lang),
    });
    pen.hdim(-tcl, fw, D + 60, 4);
    pen.vchain([0, tcl, D], -tcl, -5);
    placeLeaders(pen, items, b + pen.pr(8));
    out.push({ id: 'd4', title: { en: 'END RETURN (PLAN)', th: 'ปิดข้างปลายผนัง (แปลน)' }, scale: den, s: pen.s, ents: pen.ents, bubble: 'D4' });
  }
  return out;
}
