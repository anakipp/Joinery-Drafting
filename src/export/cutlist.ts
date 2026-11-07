import type { Bi, Lang, Project, Role } from '../model/types';
import { leaves, resolve, slideLength } from '../model/layout';
import { findMaterial } from '../model/materials';
import { wallPanelGeometry } from '../draw/wallpanel';
import { L } from '../i18n/terms';
import { usedRoles } from '../model/usage';

export interface CutRow {
  part: Bi;
  role: Role;
  materialId: string;
  qty: number;
  /** Length (grain / long side), width, thickness in mm. */
  length: number;
  width: number;
  thickness: number;
}

const R = (v: number) => Math.round(v);

export function cutList(p: Project): CutRow[] {
  const r = resolve(p);
  const rows: CutRow[] = [];
  const add = (part: Bi, role: Role, qty: number, a: number, b: number, materialId?: string) => {
    const mid = materialId ?? p.assign[role];
    const m = findMaterial(p.materials, mid);
    if (qty <= 0 || a <= 0 || b <= 0) return;
    const length = R(Math.max(a, b));
    const width = R(Math.min(a, b));
    const thickness = m?.thickness ?? 0;
    const same = rows.find((x) => x.part.en === part.en && x.materialId === mid && x.length === length && x.width === width);
    if (same) same.qty += qty;
    else rows.push({ part, role, materialId: mid, qty, length, width, thickness });
  };

  if (p.type === 'wall_panel') {
    const { studs, rails, skirt } = wallPanelGeometry({ p, r, lang: 'en', ps: 20 });
    r.bays.forEach((rb) =>
      rb.cells.forEach((rc) => {
        const g = p.dims.gap;
        const w = rb.x1 - rb.x0 - (rb.index === 0 ? g / 2 : g) + (rb.index === 0 && r.bays.length === 1 ? g / 2 : 0);
        const h = rc.y1 - Math.max(skirt, rc.y0) - (rc.index === 0 ? 0 : g / 2) - (rc.index === rb.cells.length - 1 ? 0 : g / 2);
        add({ en: 'Cladding panel', th: 'แผ่นบุผนัง' }, 'cladding', 1, w, h);
      }),
    );
    add({ en: 'End return cover', th: 'แผ่นปิดข้าง' }, 'cladding', 2, r.H, r.D);
    add({ en: 'Vertical stud', th: 'โครงคร่าวตั้ง' }, 'frame', studs.length, r.H - skirt, r.frameWidth);
    add({ en: 'Horizontal rail', th: 'โครงคร่าวนอน' }, 'frame', rails.length, r.W, r.frameWidth);
    if (skirt > 0) add({ en: 'Skirting', th: 'บัวเชิงผนัง' }, 'plinth', 1, r.W, skirt);
    return rows;
  }

  const tc = r.tc;
  const gd = 8;
  const depthIn = r.Dc - r.tb;
  add({ en: 'Side panel', th: 'แผ่นข้างตู้' }, 'carcass', 2, r.carcassH, r.Dc);
  add({ en: 'Top / bottom', th: 'แผ่นบน / ล่าง' }, 'carcass', 2, r.W - 2 * tc, depthIn);
  add({ en: 'Vertical divider', th: 'แผ่นกั้นตั้ง' }, 'carcass', r.bays.length - 1, r.carcassH - 2 * tc, depthIn);
  for (const rb of r.bays) {
    const iw = rb.ix1 - rb.ix0;
    rb.cells.forEach((rc, j) => {
      if (j < rb.cells.length - 1) add({ en: 'Fixed shelf / division', th: 'แผ่นกั้นนอน' }, 'carcass', 1, iw, depthIn);
      const c = rc.cell;
      if (c.shelves > 0) add({ en: 'Adjustable shelf', th: 'ชั้นปรับระดับ' }, 'shelf', c.shelves, iw - 2, depthIn - (c.front === 'open' ? 2 : 22));
      const fm = c.frontMaterialId ?? undefined;
      for (const lf of leaves(rb, rc, p.dims.gap)) {
        const label: Bi = lf.kind === 'drawer' ? { en: 'Drawer front', th: 'หน้าลิ้นชัก' } : lf.kind.startsWith('flap') ? { en: 'Flap door', th: 'บานยก/บานพับลง' } : { en: 'Door', th: 'บานเปิด' };
        add(label, 'front', 1, lf.y1 - lf.y0, lf.x1 - lf.x0, fm);
        if (lf.kind === 'drawer') {
          const L0 = slideLength(depthIn);
          const tdb = findMaterial(p.materials, p.assign.drawerBox)?.thickness ?? 16;
          const hb = Math.max(60, lf.y1 - lf.y0 - 60);
          const bw = iw - 26;
          add({ en: 'Drawer side', th: 'ข้างลิ้นชัก' }, 'drawerBox', 2, L0, hb);
          add({ en: 'Drawer front/back', th: 'หน้า/หลังกล่องลิ้นชัก' }, 'drawerBox', 2, bw - 2 * tdb, hb);
          add({ en: 'Drawer bottom', th: 'พื้นลิ้นชัก' }, 'back', 1, bw - 2 * tdb + 2 * gd, L0 - tdb);
        }
      }
    });
  }
  add({ en: 'Back panel', th: 'แผ่นหลัง' }, 'back', 1, r.W - 2 * tc + 2 * gd, r.carcassH);
  if (p.hasCountertop) add({ en: 'Countertop', th: 'ท็อปเคาน์เตอร์' }, 'countertop', 1, r.W, r.D + p.dims.countertopOverhang);
  if (p.mount === 'plinth' && r.baseY > 0) {
    add({ en: 'Kick board', th: 'แผ่นปิดฐาน' }, 'plinth', 2, r.W, r.baseY);
    add({ en: 'Plinth cross rail', th: 'คานฐานขวาง' }, 'plinth', r.bays.length + 1, r.Dc - p.dims.plinthRecess - 50, r.baseY);
  }
  if (p.mount === 'legs') add({ en: 'Clip-on kick board', th: 'แผ่นปิดฐานแบบหนีบ' }, 'plinth', 1, r.W, r.baseY);
  if (p.mount === 'wall_hung') add({ en: 'Hanging rail', th: 'รางแขวน' }, 'carcass', 1, r.W - 2 * tc, 80);
  return rows;
}

export interface HardwareRow {
  role: Role;
  materialId: string;
  qty: number;
  unit: Bi;
}

export function hardwareList(p: Project): HardwareRow[] {
  if (p.type === 'wall_panel') return [];
  const r = resolve(p);
  let hinges = 0;
  let slides = 0;
  let handles = 0;
  let railLen = 0;
  for (const rb of r.bays)
    for (const rc of rb.cells) {
      if (rc.cell.rail) railLen += rb.ix1 - rb.ix0;
      for (const lf of leaves(rb, rc, p.dims.gap)) {
        const h = lf.y1 - lf.y0;
        const w = lf.x1 - lf.x0;
        if (lf.kind === 'drawer') slides += 1;
        else if (lf.kind.startsWith('flap')) hinges += w > 900 ? 3 : 2;
        else hinges += h <= 900 ? 2 : h <= 1600 ? 3 : h <= 2000 ? 4 : 5;
        handles += 1;
      }
    }
  const roles = usedRoles(p);
  const out: HardwareRow[] = [];
  if (hinges && roles.includes('hinge')) out.push({ role: 'hinge', materialId: p.assign.hinge, qty: hinges, unit: { en: 'pcs', th: 'ตัว' } });
  if (slides && roles.includes('slide')) out.push({ role: 'slide', materialId: p.assign.slide, qty: slides, unit: { en: 'pairs', th: 'คู่' } });
  if (handles && roles.includes('handle')) out.push({ role: 'handle', materialId: p.assign.handle, qty: handles, unit: { en: 'pcs', th: 'ชิ้น' } });
  if (railLen && roles.includes('rail')) out.push({ role: 'rail', materialId: p.assign.rail, qty: Math.round(railLen), unit: { en: 'mm.', th: 'มม.' } });
  return out;
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function cutListCsv(p: Project, lang: Lang): string {
  const head = lang === 'th' ? ['ชิ้นส่วน', 'รหัสวัสดุ', 'วัสดุ', 'จำนวน', 'ยาว', 'กว้าง', 'หนา'] : ['Part', 'Code', 'Material', 'Qty', 'Length', 'Width', 'Thk'];
  const lines = [head.join(',')];
  for (const row of cutList(p)) {
    const m = findMaterial(p.materials, row.materialId);
    lines.push([L(row.part, lang), m?.code ?? '', m ? L(m.name, lang) : '', row.qty, row.length, row.width, row.thickness].map(csvCell).join(','));
  }
  const hw = hardwareList(p);
  if (hw.length) {
    lines.push('');
    for (const h of hw) {
      const m = findMaterial(p.materials, h.materialId);
      lines.push([m ? L(m.name, lang) : '', m?.code ?? '', '', h.qty, L(h.unit, lang), '', ''].map(csvCell).join(','));
    }
  }
  return '﻿' + lines.join('\n');
}
