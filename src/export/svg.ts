import { LAYERS, type Entity } from '../draw/entities';
import type { Sheet } from '../draw/sheet';

const FONT = "'IBM Plex Sans Thai','IBM Plex Sans',Tahoma,'Leelawadee UI',sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();

/** Render one entity as an SVG element string. `H` = sheet height (for Y flip). */
export function entitySvg(e: Entity, H: number, ps: number, hidden: Set<string> = new Set()): string {
  if (hidden.has(e.layer)) return '';
  const st = LAYERS[e.layer];
  const Y = (y: number) => H - y;
  const sw = Math.max(st.lw, 0.08) * ps;
  const dash = st.ltype === 'DASHED' ? ` stroke-dasharray="${n(1.6 * ps)} ${n(0.9 * ps)}"` : st.ltype === 'CENTER' ? ` stroke-dasharray="${n(5 * ps)} ${n(1 * ps)} ${n(1 * ps)} ${n(1 * ps)}"` : '';
  const tag = e.tag ? ` data-tag="${esc(e.tag)}"` : '';
  const cls = ` class="L-${e.layer}"`;
  const stroke = ` stroke="${st.color}" stroke-width="${n(sw)}" fill="none"${dash}`;
  switch (e.t) {
    case 'line':
      return `<line${cls}${tag} x1="${n(e.a[0])}" y1="${n(Y(e.a[1]))}" x2="${n(e.b[0])}" y2="${n(Y(e.b[1]))}"${stroke}/>`;
    case 'poly': {
      const pts = e.pts.map((p) => `${n(p[0])},${n(Y(p[1]))}`).join(' ');
      return e.closed ? `<polygon${cls}${tag} points="${pts}"${stroke}/>` : `<polyline${cls}${tag} points="${pts}"${stroke}/>`;
    }
    case 'circle':
      return `<circle${cls}${tag} cx="${n(e.c[0])}" cy="${n(Y(e.c[1]))}" r="${n(e.r)}"${stroke}/>`;
    case 'arc': {
      const a0 = (e.a0 * Math.PI) / 180;
      const a1 = (e.a1 * Math.PI) / 180;
      const x0 = e.c[0] + e.r * Math.cos(a0);
      const y0 = e.c[1] + e.r * Math.sin(a0);
      const x1 = e.c[0] + e.r * Math.cos(a1);
      const y1 = e.c[1] + e.r * Math.sin(a1);
      let sweep = e.a1 - e.a0;
      while (sweep < 0) sweep += 360;
      const large = sweep > 180 ? 1 : 0;
      return `<path${cls}${tag} d="M${n(x0)} ${n(Y(y0))} A${n(e.r)} ${n(e.r)} 0 ${large} 0 ${n(x1)} ${n(Y(y1))}"${stroke}/>`;
    }
    case 'fill': {
      const pts = e.pts.map((p) => `${n(p[0])},${n(Y(p[1]))}`).join(' ');
      return `<polygon${cls}${tag} points="${pts}" fill="${e.color ?? st.color}" stroke="none"/>`;
    }
    case 'text': {
      const anchor = e.ha === 'l' ? 'start' : e.ha === 'c' ? 'middle' : 'end';
      const base = e.va === 'b' ? 'alphabetic' : e.va === 'm' ? 'central' : 'hanging';
      const x = e.p[0];
      const y = Y(e.p[1]);
      const rot = e.rot ? ` transform="rotate(${n(-e.rot)} ${n(x)} ${n(y)})"` : '';
      const weight = e.bold ? ' font-weight="600"' : '';
      return `<text${cls}${tag} x="${n(x)}" y="${n(y)}" font-size="${n(e.h * 1.38)}" font-family="${FONT}" fill="${st.color}" text-anchor="${anchor}" dominant-baseline="${base}"${weight}${rot}>${esc(e.text)}</text>`;
    }
  }
}

export function sheetSvgBody(sheet: Sheet, hidden?: Set<string>): string {
  return sheet.ents.map((e) => entitySvg(e, sheet.height, sheet.scale, hidden)).join('');
}

/** Standalone SVG document sized in paper millimetres. */
export function sheetToSvg(sheet: Sheet): string {
  const [w, h] = [sheet.width / sheet.scale, sheet.height / sheet.scale];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${n(sheet.width)} ${n(sheet.height)}">
<rect x="0" y="0" width="${n(sheet.width)}" height="${n(sheet.height)}" fill="#ffffff"/>
${sheetSvgBody(sheet)}
</svg>`;
}
