import { describe, expect, it } from 'vitest';
import { applyExtraction, EXTRACT_SCHEMA, type Extraction } from '../src/ai/extract';
import { newProject } from '../src/model/presets';
import { resolve } from '../src/model/layout';

describe('AI extraction mapping', () => {
  it('applies an extraction and clamps values', () => {
    const p = newProject('base_cabinet');
    const x: Extraction = {
      type: 'vanity',
      title: 'Master bath vanity',
      width: 1200,
      height: 500,
      depth: 550,
      mount: 'wall_hung',
      mountHeight: 350,
      plinthHeight: 0,
      handle: 'groove',
      hasCountertop: true,
      functions: ['wet_area', 'sink', 'bogus' as never],
      bays: [
        { width: null, cells: [{ height: null, front: 'door_pair', shelves: 99, drawers: 0, rail: false }] },
        { width: 400, cells: [{ height: null, front: 'drawers', shelves: 0, drawers: 2, rail: false }] },
      ],
      specs: [{ en: 'Top: quartz white 20 mm.', th: 'ท็อปหินควอทซ์ขาว 20 มม.' }],
      assumptions: 'Depth assumed.',
    };
    const q = applyExtraction(p, x);
    expect(q.type).toBe('vanity');
    expect(q.info.name).toBe('Master bath vanity');
    expect(q.functions).toEqual(['wet_area', 'sink']);
    expect(q.bays).toHaveLength(2);
    expect(q.bays[0].cells[0].shelves).toBe(12);
    expect(q.specs[q.specs.length - 1]?.text.th).toContain('ควอทซ์');
    const r = resolve(q);
    expect(r.topY).toBe(850);
  });

  it('has a strict JSON schema (all properties required)', () => {
    expect(EXTRACT_SCHEMA.additionalProperties).toBe(false);
    expect([...EXTRACT_SCHEMA.required].sort()).toEqual(Object.keys(EXTRACT_SCHEMA.properties).sort());
  });
});
