/**
 * Minimal, dependency-free DXF R12 (AC1009) writer.
 * Layers, linetypes and a Thai-capable text style are declared; non-ASCII
 * characters are written as \U+XXXX escapes, which AutoCAD, BricsCAD,
 * DraftSight and LibreCAD decode.
 */
import { LAYERS, translate, type Entity, type Layer } from '../draw/entities';
import type { Sheet } from '../draw/sheet';

export function dxfText(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 32) continue;
    if (c > 126) {
      if (c > 0xffff) continue;
      out += `\\U+${c.toString(16).toUpperCase().padStart(4, '0')}`;
    } else out += ch;
  }
  return out;
}

const f = (v: number) => {
  const r = Math.round(v * 1e4) / 1e4;
  return Number.isFinite(r) ? String(r) : '0';
};

class W {
  lines: string[] = [];
  g(code: number, value: string | number) {
    this.lines.push(String(code).padStart(3, ' '), typeof value === 'number' ? f(value) : value);
  }
  toString() {
    return this.lines.join('\r\n') + '\r\n';
  }
}

const LAYER_LIST = Object.keys(LAYERS) as Layer[];

function header(w: W, ext: { width: number; height: number; scale: number }) {
  w.g(0, 'SECTION');
  w.g(2, 'HEADER');
  w.g(9, '$ACADVER');
  w.g(1, 'AC1009');
  w.g(9, '$DWGCODEPAGE');
  w.g(3, 'ANSI_1252');
  w.g(9, '$INSBASE');
  w.g(10, 0);
  w.g(20, 0);
  w.g(30, 0);
  w.g(9, '$EXTMIN');
  w.g(10, 0);
  w.g(20, 0);
  w.g(30, 0);
  w.g(9, '$EXTMAX');
  w.g(10, ext.width);
  w.g(20, ext.height);
  w.g(30, 0);
  w.g(9, '$LIMMIN');
  w.g(10, 0);
  w.g(20, 0);
  w.g(9, '$LIMMAX');
  w.g(10, ext.width);
  w.g(20, ext.height);
  w.g(9, '$LTSCALE');
  w.g(40, ext.scale);
  w.g(9, '$TEXTSTYLE');
  w.g(7, 'JD_TEXT');
  w.g(9, '$CLAYER');
  w.g(8, '0');
  w.g(9, '$MEASUREMENT');
  w.g(70, 1);
  w.g(0, 'ENDSEC');
}

function tables(w: W) {
  w.g(0, 'SECTION');
  w.g(2, 'TABLES');
  // linetypes
  const ltypes: [string, string, number[]][] = [
    ['CONTINUOUS', 'Solid line', []],
    ['DASHED', 'Dashed __ __ __', [1.6, -0.9]],
    ['CENTER', 'Center ____ _ ____', [5, -1, 1, -1]],
  ];
  w.g(0, 'TABLE');
  w.g(2, 'LTYPE');
  w.g(70, ltypes.length);
  for (const [name, desc, pat] of ltypes) {
    w.g(0, 'LTYPE');
    w.g(2, name);
    w.g(70, 0);
    w.g(3, desc);
    w.g(72, 65);
    w.g(73, pat.length);
    w.g(40, pat.reduce((s, v) => s + Math.abs(v), 0));
    pat.forEach((v) => w.g(49, v));
  }
  w.g(0, 'ENDTAB');
  // layers
  w.g(0, 'TABLE');
  w.g(2, 'LAYER');
  w.g(70, LAYER_LIST.length + 1);
  w.g(0, 'LAYER');
  w.g(2, '0');
  w.g(70, 0);
  w.g(62, 7);
  w.g(6, 'CONTINUOUS');
  for (const l of LAYER_LIST) {
    const st = LAYERS[l];
    w.g(0, 'LAYER');
    w.g(2, st.name);
    w.g(70, 0);
    w.g(62, st.aci);
    w.g(6, st.ltype);
  }
  w.g(0, 'ENDTAB');
  // text style
  w.g(0, 'TABLE');
  w.g(2, 'STYLE');
  w.g(70, 2);
  for (const name of ['STANDARD', 'JD_TEXT']) {
    w.g(0, 'STYLE');
    w.g(2, name);
    w.g(70, 0);
    w.g(40, 0);
    w.g(41, 1);
    w.g(50, 0);
    w.g(71, 0);
    w.g(42, 2.5);
    w.g(3, name === 'JD_TEXT' ? 'tahoma.ttf' : 'txt');
    w.g(4, '');
  }
  w.g(0, 'ENDTAB');
  w.g(0, 'ENDSEC');
}

function entity(w: W, e: Entity) {
  const layer = LAYERS[e.layer].name;
  switch (e.t) {
    case 'line':
      w.g(0, 'LINE');
      w.g(8, layer);
      w.g(10, e.a[0]);
      w.g(20, e.a[1]);
      w.g(30, 0);
      w.g(11, e.b[0]);
      w.g(21, e.b[1]);
      w.g(31, 0);
      break;
    case 'poly':
      if (e.pts.length < 2) return;
      w.g(0, 'POLYLINE');
      w.g(8, layer);
      w.g(66, 1);
      w.g(10, 0);
      w.g(20, 0);
      w.g(30, 0);
      w.g(70, e.closed ? 1 : 0);
      for (const p of e.pts) {
        w.g(0, 'VERTEX');
        w.g(8, layer);
        w.g(10, p[0]);
        w.g(20, p[1]);
        w.g(30, 0);
      }
      w.g(0, 'SEQEND');
      w.g(8, layer);
      break;
    case 'circle':
      w.g(0, 'CIRCLE');
      w.g(8, layer);
      w.g(10, e.c[0]);
      w.g(20, e.c[1]);
      w.g(30, 0);
      w.g(40, e.r);
      break;
    case 'arc':
      w.g(0, 'ARC');
      w.g(8, layer);
      w.g(10, e.c[0]);
      w.g(20, e.c[1]);
      w.g(30, 0);
      w.g(40, e.r);
      w.g(50, e.a0);
      w.g(51, e.a1);
      break;
    case 'fill': {
      const pts = e.pts;
      if (pts.length < 3) return;
      // fan triangulation into SOLIDs (quads when possible)
      const solid = (a: number[], b: number[], c: number[], d: number[]) => {
        w.g(0, 'SOLID');
        w.g(8, layer);
        w.g(10, a[0]);
        w.g(20, a[1]);
        w.g(30, 0);
        w.g(11, b[0]);
        w.g(21, b[1]);
        w.g(31, 0);
        w.g(12, c[0]);
        w.g(22, c[1]);
        w.g(32, 0);
        w.g(13, d[0]);
        w.g(23, d[1]);
        w.g(33, 0);
      };
      if (pts.length === 4) solid(pts[0], pts[1], pts[3], pts[2]);
      else for (let i = 1; i < pts.length - 1; i++) solid(pts[0], pts[i], pts[i + 1], pts[i + 1]);
      break;
    }
    case 'text': {
      if (!e.text.trim()) return;
      const ha = e.ha === 'l' ? 0 : e.ha === 'c' ? 1 : 2;
      const va = e.va === 'b' ? 0 : e.va === 'm' ? 2 : 3;
      w.g(0, 'TEXT');
      w.g(8, layer);
      w.g(10, e.p[0]);
      w.g(20, e.p[1]);
      w.g(30, 0);
      w.g(40, e.h);
      w.g(1, dxfText(e.text));
      if (e.rot) w.g(50, e.rot);
      w.g(7, 'JD_TEXT');
      if (ha || va) {
        w.g(72, ha);
        w.g(11, e.p[0]);
        w.g(21, e.p[1]);
        w.g(31, 0);
        w.g(73, va);
      }
      break;
    }
  }
}

/**
 * Write one or more sheets into a single DXF. Sheets are placed side by side in
 * model space; each sheet keeps its own scale (main views are 1:1 in mm).
 */
export function sheetsToDxf(sheets: Sheet[]): string {
  const w = new W();
  let x = 0;
  const placed: Entity[] = [];
  let height = 0;
  for (const sh of sheets) {
    placed.push(...translate(sh.ents, x, 0));
    x += sh.width + sh.width * 0.08;
    height = Math.max(height, sh.height);
  }
  header(w, { width: x, height, scale: sheets[0]?.scale ?? 1 });
  tables(w);
  w.g(0, 'SECTION');
  w.g(2, 'BLOCKS');
  w.g(0, 'ENDSEC');
  w.g(0, 'SECTION');
  w.g(2, 'ENTITIES');
  for (const e of placed) entity(w, e);
  w.g(0, 'ENDSEC');
  w.g(0, 'EOF');
  return w.toString();
}

export function sheetToDxf(sheet: Sheet): string {
  return sheetsToDxf([sheet]);
}
