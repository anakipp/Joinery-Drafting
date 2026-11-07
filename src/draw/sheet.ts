import type { Bi, Lang, PaperSize, Project, ViewId } from '../model/types';
import { resolve } from '../model/layout';
import { Pen, boxOf, translate, textWidth, type BBox, type Entity, type P } from './entities';
import type { Ctx, ViewBlock } from './context';
import { elevationView } from './elevation';
import { sectionView } from './section';
import { planView } from './plan';
import { cabinetDetails } from './details';
import { wallPanelDetails, wallPanelElevation, wallPanelPlan, wallPanelSection } from './wallpanel';
import { L, Llines, TYPE_NAMES, ROLE_NAMES } from '../i18n/terms';
import { generalNotes } from '../guide/rules';
import { usedMaterials } from '../model/usage';

export const PAPER: Record<PaperSize, [number, number]> = {
  A3: [420, 297],
  A2: [594, 420],
  A1: [841, 594],
};

export const SCALES = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
export const DETAIL_SCALES = [2, 5, 10];

const MARGIN = 10;
const MARGIN_LEFT = 15;
const STRIP = 92;

export interface PlacedView {
  id: ViewId;
  title: Bi;
  /** Model position of the view's local origin. */
  origin: P;
  s: number;
  scale: number;
  box: BBox;
}

export interface Sheet {
  ents: Entity[];
  width: number;
  height: number;
  scale: number;
  paper: PaperSize;
  views: PlacedView[];
  lang: Lang;
  index: number;
  title: Bi;
}

function mainViews(ctx: Ctx): ViewBlock[] {
  if (ctx.p.type === 'wall_panel') return [wallPanelElevation(ctx), wallPanelPlan(ctx), wallPanelSection(ctx)];
  return [elevationView(ctx), planView(ctx), sectionView(ctx)];
}

function detailViews(ctx: Ctx): ViewBlock[] {
  return ctx.p.type === 'wall_panel' ? wallPanelDetails(ctx) : cabinetDetails(ctx);
}

/** Add the title (bubble, name, scale) under a view. */
function withTitle(v: ViewBlock, ctx: Ctx): { ents: Entity[]; box: BBox } {
  const b = boxOf(v.ents);
  const pen = new Pen(ctx.ps);
  const x = b.x0;
  const y = b.y0 - ctx.ps * 7;
  pen.bubble(x + ctx.ps * 4, y, v.bubble, 4);
  const lines = Llines(v.title, ctx.lang);
  const tx = x + ctx.ps * 10;
  pen.text(tx, y + ctx.ps * 0.6, lines.join('  '), { size: 3.2, bold: true, layer: 'TITLE' });
  const w = textWidth(lines.join('  '), 3.2 * ctx.ps);
  pen.line(tx, y - ctx.ps * 0.4, tx + w, y - ctx.ps * 0.4, 'TITLE');
  pen.text(tx, y - ctx.ps * 4.0, `${ctx.lang === 'th' ? 'มาตราส่วน' : 'SCALE'} 1:${v.scale}`, { size: 2.2, layer: 'TITLE' });
  const ents = [...v.ents, ...pen.ents];
  return { ents, box: boxOf(ents) };
}

interface Arranged {
  ents: Entity[];
  views: PlacedView[];
  box: BBox;
}

type Titled = { b: ViewBlock; ents: Entity[]; box: BBox };
type Placed = { t: Titled; dx: number; dy: number };

function collect(placed: Placed[]): Arranged {
  const ents: Entity[] = [];
  const views: PlacedView[] = [];
  for (const pl of placed) {
    ents.push(...translate(pl.t.ents, pl.dx, pl.dy));
    views.push({
      id: pl.t.b.id,
      title: pl.t.b.title,
      origin: [pl.dx, pl.dy],
      s: pl.t.b.s,
      scale: pl.t.b.scale,
      box: { x0: pl.t.box.x0 + pl.dx, y0: pl.t.box.y0 + pl.dy, x1: pl.t.box.x1 + pl.dx, y1: pl.t.box.y1 + pl.dy },
    });
  }
  return { ents, views, box: boxOf(ents) };
}

/** Plan above elevation (aligned on x), section to the right (aligned on floor). */
function arrangeMain(blocks: ViewBlock[], ctx: Ctx): Arranged {
  const gap = ctx.ps * 12;
  const titled = blocks.map((b) => ({ b, ...withTitle(b, ctx) }));
  const byId = (id: ViewId) => titled.find((t) => t.b.id === id)!;
  const E = byId('elevation');
  const Pl = byId('plan');
  const S = byId('section');
  const pDy = E.box.y1 + gap - Pl.box.y0;
  const sDx = Math.max(E.box.x1, Pl.box.x1) + gap - S.box.x0;
  return collect([
    { t: E, dx: 0, dy: 0 },
    { t: Pl, dx: 0, dy: pDy },
    { t: S, dx: sDx, dy: 0 },
  ]);
}

/** Details in a grid with `cols` columns. */
function arrangeGrid(blocks: ViewBlock[], ctx: Ctx, cols: number): Arranged {
  const gap = ctx.ps * 12;
  const titled = blocks.map((b) => ({ b, ...withTitle(b, ctx) }));
  const colW = Math.max(...titled.map((d) => d.box.x1 - d.box.x0));
  const placed: Placed[] = [];
  let y = 0;
  for (let i = 0; i < titled.length; i += cols) {
    const row = titled.slice(i, i + cols);
    const rowH = Math.max(...row.map((d) => d.box.y1 - d.box.y0));
    row.forEach((d, k) => placed.push({ t: d, dx: k * (colW + gap) - d.box.x0, dy: y - d.box.y1 }));
    y -= rowH + gap;
  }
  return collect(placed);
}

/** Wrap text to a width (model units) – breaks at spaces, or anywhere for Thai. */
export function wrap(text: string, width: number, h: number): string[] {
  const out: string[] = [];
  let line = '';
  const tokens = text.split(/(\s+)/);
  const pushToken = (tok: string) => {
    if (textWidth(line + tok, h) <= width) {
      line += tok;
      return;
    }
    if (line.trim()) out.push(line.trimEnd());
    line = '';
    if (textWidth(tok, h) <= width) {
      line = tok.trimStart();
      return;
    }
    // hard break long token (Thai has no spaces)
    for (const ch of tok) {
      if (textWidth(line + ch, h) > width && line) {
        out.push(line);
        line = '';
      }
      line += ch;
    }
  };
  tokens.forEach(pushToken);
  if (line.trim()) out.push(line.trimEnd());
  return out;
}

function drawFrameAndTitle(pen: Pen, p: Project, ctx: Ctx, paperW: number, paperH: number, info: { index: number; total: number; title: Bi }) {
  const s = ctx.ps;
  const lang = ctx.lang;
  const X = (mm: number) => mm * s;
  const x0 = MARGIN_LEFT;
  const y0 = MARGIN;
  const x1 = paperW - MARGIN;
  const y1 = paperH - MARGIN;
  pen.rect(X(x0), X(y0), X(x1), X(y1), 'FRAME');
  const sx = x1 - STRIP;
  pen.line(X(sx), X(y0), X(sx), X(y1), 'FRAME');
  const pad = 2.5;
  const tw = STRIP - pad * 2;
  const H = (b: Bi) => L(b, lang);

  // ---- title block (bottom of strip)
  const rows: [Bi, string][] = [
    [{ en: 'PROJECT', th: 'โครงการ' }, p.info.name],
    [{ en: 'CLIENT', th: 'เจ้าของ' }, p.info.client],
    [{ en: 'LOCATION', th: 'สถานที่' }, [p.info.location, p.info.room].filter(Boolean).join(' – ')],
    [{ en: 'DRAWING', th: 'ชื่อแบบ' }, `${L(TYPE_NAMES[p.type], lang)} – ${L(info.title, lang)}`],
    [{ en: 'SCALE / SHEET', th: 'มาตราส่วน / แผ่นที่' }, `1:${ctx.ps} · ${p.sheet.paper} · ${info.index + 1}/${info.total}`],
    [{ en: 'DESIGNER', th: 'ผู้ออกแบบ' }, p.info.designer],
    [{ en: 'DATE / REV', th: 'วันที่ / แก้ไข' }, `${p.info.date}  ·  REV ${p.info.revision}`],
  ];
  const rowH = 8.4;
  const tbH = rows.length * rowH + 14 + 12;
  let y = y0 + tbH;
  pen.line(X(sx), X(y), X(x1), X(y), 'FRAME');
  // header
  y -= 7;
  pen.text(X(sx + pad), X(y), lang === 'th' ? 'แบบงานบิวท์อิน' : 'JOINERY SHOP DRAWING', { size: 3.4, bold: true, layer: 'TITLE' });
  if (lang === 'both') pen.text(X(x1 - pad), X(y), 'แบบงานบิวท์อิน', { size: 2.6, ha: 'r', layer: 'TITLE' });
  y -= 7;
  pen.line(X(sx), X(y + 4), X(x1), X(y + 4), 'THIN');
  for (const [label, value] of rows) {
    pen.text(X(sx + pad), X(y + 1.5), H(label), { size: 1.6, layer: 'TITLE' });
    const v = value || '–';
    const size = Math.max(1.4, Math.min(2.4, (2.4 * X(tw) * 0.9) / Math.max(1, textWidth(v, X(2.4)))));
    pen.text(X(sx + pad), X(y - 2.6), v, { size, layer: 'TEXT' });
    y -= rowH;
    pen.line(X(sx), X(y + 4), X(x1), X(y + 4), 'THIN');
  }
  // drawing number box
  pen.text(X(sx + pad), X(y + 1.2), H({ en: 'DWG. NO.', th: 'เลขที่แบบ' }), { size: 1.6, layer: 'TITLE' });
  pen.text(X(x1 - pad), X(y0 + 2.5), `${p.info.drawingNo || 'JD'}-${String(info.index + 1).padStart(2, '0')}`, { size: 5, ha: 'r', bold: true, layer: 'TITLE' });

  // ---- notes and schedule (top of strip, flowing down)
  const limit = y0 + tbH + 2;
  let cy = y1 - 6;
  const heading = (b: Bi) => {
    pen.text(X(sx + pad), X(cy), H(b), { size: 2.6, bold: true, layer: 'TITLE' });
    pen.line(X(sx + pad), X(cy - 1.2), X(x1 - pad), X(cy - 1.2), 'THIN');
    cy -= 5.5;
  };
  const fh = 1.8;
  const lh = fh * 1.55;

  // material schedule first (more important), then notes
  const mats = usedMaterials(p);
  heading({ en: 'MATERIAL SCHEDULE', th: 'ตารางวัสดุ' });
  for (const { m, roles } of mats) {
    if (cy < limit + 20) break;
    const desc = `${L(m.name, lang === 'both' ? 'en' : lang)}`;
    pen.text(X(sx + pad), X(cy), m.code, { size: fh, bold: true, layer: 'TAG' });
    const dl = wrap(desc, X(tw - 11) * 0.92, X(fh));
    const extra: string[] = [];
    if (lang === 'both') extra.push(...wrap(m.name.th, X(tw - 11) * 0.92, X(fh)));
    extra.push(...wrap(L(m.finish, lang === 'both' ? 'th' : lang) + ' · ' + roles.map((r) => L(ROLE_NAMES[r], lang === 'both' ? 'en' : lang)).join(', '), X(tw - 11) * 0.92, X(fh * 0.9)));
    [...dl, ...extra].forEach((ln, i) => {
      pen.text(X(sx + pad + 11), X(cy), ln, { size: i < dl.length ? fh : fh * 0.9, layer: i < dl.length ? 'TEXT' : 'THIN' });
      cy -= i < dl.length ? lh : lh * 0.9;
    });
    cy -= 1;
  }
  cy -= 3;
  heading({ en: 'GENERAL NOTES', th: 'หมายเหตุทั่วไป' });
  const notes: Bi[] = [];
  if (p.sheet.autoNotes) notes.push(...generalNotes(p));
  notes.push(...p.specs.map((s) => s.text));
  let n = 1;
  let truncated = false;
  for (const note of notes) {
    const paras = Llines(note, lang).filter((t) => t.trim());
    const lines = paras.flatMap((t) => wrap(t, X(tw - 6) * 0.92, X(fh)));
    if (cy - lines.length * lh < limit) {
      truncated = true;
      break;
    }
    pen.text(X(sx + pad), X(cy), `${n}.`, { size: fh, layer: 'TEXT' });
    lines.forEach((ln) => {
      pen.text(X(sx + pad + 5), X(cy), ln, { size: fh, layer: 'TEXT' });
      cy -= lh;
    });
    cy -= 0.8;
    n++;
  }
  if (truncated) pen.text(X(sx + pad + 5), X(cy), lang === 'th' ? '… (ดูรายการสเปกเพิ่มเติม)' : '… (see specification list)', { size: fh, layer: 'THIN' });
}

function commentEnts(p: Project, views: PlacedView[], ps: number): Entity[] {
  const pen = new Pen(ps);
  p.comments.forEach((c, i) => {
    const v = views.find((vv) => vv.id === c.viewId);
    if (!v) return;
    const x = v.origin[0] + c.x * v.s;
    const y = v.origin[1] + c.y * v.s;
    pen.ents.push({ t: 'circle', c: [x, y], r: 2.2 * ps, layer: 'COMMENT' });
    pen.text(x, y, `C${i + 1}`, { size: 1.8, ha: 'c', va: 'm', layer: 'COMMENT', bold: true });
    const lines = wrap(`${c.author ? c.author + ': ' : ''}${c.text}${c.resolved ? ' ✓' : ''}`, 45 * ps, 1.8 * ps);
    const tx = x + 4 * ps;
    const ty = y + 4 * ps;
    pen.line(x + 1.6 * ps, y + 1.6 * ps, tx, ty, 'COMMENT');
    lines.forEach((ln, k) => pen.text(tx + ps, ty - k * 2.8 * ps, ln, { size: 1.8, layer: 'COMMENT' }));
  });
  return pen.ents;
}

export interface SheetOptions {
  comments?: boolean;
}

const SHEET_TITLES: Bi[] = [
  { en: 'Plan, elevation & section', th: 'แปลน รูปด้าน และรูปตัด' },
  { en: 'Construction details', th: 'แบบขยายรายละเอียด' },
];

function fits(arr: Arranged, ps: number, availW: number, availH: number) {
  return (arr.box.x1 - arr.box.x0) / ps <= availW && (arr.box.y1 - arr.box.y0) / ps <= availH;
}

function finishSheet(p: Project, ctx: Ctx, arr: Arranged, index: number, total: number, opts: SheetOptions): Sheet {
  const [pw, ph] = PAPER[p.sheet.paper];
  const { availW, availH } = available(p.sheet.paper);
  const ps = ctx.ps;
  const areaX0 = MARGIN_LEFT + 4;
  const areaY0 = MARGIN + 4;
  const cw = (arr.box.x1 - arr.box.x0) / ps;
  const ch = (arr.box.y1 - arr.box.y0) / ps;
  const ox = (areaX0 + Math.max(0, (availW - cw) / 2)) * ps - arr.box.x0;
  const oy = (areaY0 + Math.max(0, (availH - ch) / 2)) * ps - arr.box.y0;
  const ents = translate(arr.ents, ox, oy);
  const views = arr.views.map((v) => ({
    ...v,
    origin: [v.origin[0] + ox, v.origin[1] + oy] as P,
    box: { x0: v.box.x0 + ox, y0: v.box.y0 + oy, x1: v.box.x1 + ox, y1: v.box.y1 + oy },
  }));
  const frame = new Pen(ps);
  drawFrameAndTitle(frame, p, ctx, pw, ph, { index, total, title: SHEET_TITLES[index] ?? SHEET_TITLES[0] });
  ents.push(...frame.ents);
  if (opts.comments) ents.push(...commentEnts(p, views, ps));
  return { ents, width: pw * ps, height: ph * ps, scale: ps, paper: p.sheet.paper, views, lang: ctx.lang, index, title: SHEET_TITLES[index] };
}

function available(paper: PaperSize) {
  const [pw, ph] = PAPER[paper];
  return { availW: pw - MARGIN_LEFT - MARGIN - STRIP - 8, availH: ph - 2 * MARGIN - 8 };
}

/** Generate the drawing set: sheet 1 (plan / elevation / section) and sheet 2 (details). */
export function generateSheets(p: Project, opts: SheetOptions = {}): Sheet[] {
  const lang = p.sheet.drawingLang;
  const { availW, availH } = available(p.sheet.paper);
  const r = resolve(p);

  // sheet 1
  const candidates = p.sheet.scale === 'auto' ? SCALES : [p.sheet.scale];
  let main: { ctx: Ctx; arr: Arranged } | null = null;
  for (const ps of candidates) {
    const ctx: Ctx = { p, r, lang, ps };
    const arr = arrangeMain(mainViews(ctx), ctx);
    main = { ctx, arr };
    if (fits(arr, ps, availW, availH)) break;
  }
  // sheet 2
  let det: { ctx: Ctx; arr: Arranged } | null = null;
  for (const ps of DETAIL_SCALES) {
    const ctx: Ctx = { p, r, lang, ps };
    const blocks = detailViews(ctx);
    let best: Arranged | null = null;
    for (const cols of [2, 4, 3, 1]) {
      const arr = arrangeGrid(blocks, ctx, cols);
      if (fits(arr, ps, availW, availH)) {
        best = arr;
        break;
      }
    }
    det = { ctx, arr: best ?? arrangeGrid(blocks, ctx, 2) };
    if (best) break;
  }
  return [finishSheet(p, main!.ctx, main!.arr, 0, 2, opts), finishSheet(p, det!.ctx, det!.arr, 1, 2, opts)];
}

/** Find the sheet that holds a view. */
export function sheetOfView(sheets: Sheet[], viewId: ViewId): Sheet | undefined {
  return sheets.find((s) => s.views.some((v) => v.id === viewId));
}

/** Convert a sheet (model) point into a view's local real coordinates. */
export function toViewLocal(sheet: Sheet, x: number, y: number): { viewId: ViewId; x: number; y: number } | null {
  for (const v of sheet.views) {
    if (x >= v.box.x0 && x <= v.box.x1 && y >= v.box.y0 && y <= v.box.y1) {
      return { viewId: v.id, x: (x - v.origin[0]) / v.s, y: (y - v.origin[1]) / v.s };
    }
  }
  return null;
}

export function fromViewLocal(sheet: Sheet, viewId: ViewId, x: number, y: number): P | null {
  const v = sheet.views.find((vv) => vv.id === viewId);
  if (!v) return null;
  return [v.origin[0] + x * v.s, v.origin[1] + y * v.s];
}
