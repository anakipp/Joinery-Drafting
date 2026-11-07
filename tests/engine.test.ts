import { describe, expect, it } from 'vitest';
import { newProject, TYPE_ORDER } from '../src/model/presets';
import { generateSheets } from '../src/draw/sheet';
import { sheetsToDxf } from '../src/export/dxf';
import { sheetToSvg } from '../src/export/svg';
import { evaluate } from '../src/guide/rules';
import { cutList } from '../src/export/cutlist';
import { resolve, splitModules } from '../src/model/layout';
import type { Entity } from '../src/draw/entities';

function finite(e: Entity): boolean {
  const nums: number[] = [];
  if (e.t === 'line') nums.push(...e.a, ...e.b);
  else if (e.t === 'poly' || e.t === 'fill') e.pts.forEach((p) => nums.push(...p));
  else if (e.t === 'circle' || e.t === 'arc') nums.push(...e.c, e.r);
  else if (e.t === 'text') nums.push(...e.p, e.h);
  return nums.every(Number.isFinite);
}

describe('engine', () => {
  for (const type of TYPE_ORDER) {
    for (const lang of ['en', 'th', 'both'] as const) {
      it(`generates a valid sheet for ${type} (${lang})`, () => {
        const p = newProject(type);
        p.sheet.drawingLang = lang;
        const sheets = generateSheets(p, { comments: true });
        expect(sheets).toHaveLength(2);
        const views = sheets.flatMap((s) => s.views.map((v) => v.id)).sort();
        expect(views).toEqual(['d1', 'd2', 'd3', 'd4', 'elevation', 'plan', 'section']);
        for (const sheet of sheets) {
          expect(sheet.ents.length).toBeGreaterThan(50);
          expect(sheet.ents.every(finite)).toBe(true);
          // all views fit inside the drawing frame (left of the title strip)
          for (const v of sheet.views) {
            expect(v.box.x0).toBeGreaterThanOrEqual(0);
            expect(v.box.y0).toBeGreaterThanOrEqual(0);
            expect(v.box.x1).toBeLessThanOrEqual(sheet.width - 102 * sheet.scale);
            expect(v.box.y1).toBeLessThanOrEqual(sheet.height - 10 * sheet.scale);
          }
        }
        const sheet = sheets[0];
        const dxf = sheetsToDxf(sheets);
        expect(dxf.startsWith('  0\r\nSECTION')).toBe(true);
        expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
        // no raw non-ASCII in DXF
        expect(/[^\x00-\x7f]/.test(dxf)).toBe(false);
        expect(sheetToSvg(sheet)).toContain('<svg');
        expect(cutList(p).length).toBeGreaterThan(0);
        evaluate(p);
      });
    }
  }

  it('splits modules so they sum to the total', () => {
    const s = splitModules(2400, [null, 800, null]);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(2400);
    expect(s[1]).toBe(800);
  });

  it('resolves carcass height from overall height, plinth and countertop', () => {
    const p = newProject('kitchen_counter');
    const r = resolve(p);
    expect(r.topY).toBe(870);
    expect(r.carcassH).toBe(870 - 100 - 20);
    expect(r.bays[r.bays.length - 1].x1).toBe(2400);
  });

  it('suggests a pair of doors for wide single doors', () => {
    const p = newProject('base_cabinet');
    p.bays = [{ id: 'b1', width: null, cells: [{ id: 'c1', height: null, front: 'door_left', shelves: 1, drawers: 0, rail: false }] }];
    p.dims.width = 900;
    const g = evaluate(p).find((x) => x.id === 'door-wide-c1');
    expect(g?.fix).toBeTruthy();
    const fixed = g!.fix!.apply(p);
    expect(fixed.bays[0].cells[0].front).toBe('door_pair');
  });

  it('applies the wall cladding recipe (wood structure + HMR 10)', () => {
    const p = newProject('wall_panel');
    p.assign.cladding = 'hmr20-lam';
    const g = evaluate(p).find((x) => x.id === 'recipe-wall_cladding');
    const q = g!.fix!.apply(p);
    expect(q.assign.cladding).toBe('hmr10-lam');
    expect(q.assign.frame).toBe('rubberwood-1x2');
  });
});
