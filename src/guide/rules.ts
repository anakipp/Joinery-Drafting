import type { Bi, Project } from '../model/types';
import { hingeCount, leaves, resolve, thk } from '../model/layout';
import { findMaterial } from '../model/materials';
import { RECIPES } from './library';
import { uid } from '../model/util';
import { HANDLE_NAMES } from '../i18n/terms';

export type Level = 'warn' | 'tip' | 'ok';

export interface GuideItem {
  id: string;
  level: Level;
  title: Bi;
  body: Bi;
  fix?: { label: Bi; apply: (p: Project) => Project };
  /** If set, printed in the general notes on the sheet. */
  note?: Bi;
}

const has = (p: Project, f: Project['functions'][number]) => p.functions.includes(f);

function assign(p: Project, role: keyof Project['assign'], id: string): Project {
  return { ...p, assign: { ...p.assign, [role]: id } };
}

function updateCell(p: Project, bayId: string, cellId: string, patch: Partial<Project['bays'][number]['cells'][number]>): Project {
  return {
    ...p,
    bays: p.bays.map((b) => (b.id !== bayId ? b : { ...b, cells: b.cells.map((c) => (c.id === cellId ? { ...c, ...patch } : c)) })),
  };
}

function splitBay(p: Project, bayId: string): Project {
  const out = { ...p, bays: [] as Project['bays'] };
  for (const b of p.bays) {
    if (b.id !== bayId) {
      out.bays.push(b);
      continue;
    }
    const w = b.width == null ? null : b.width / 2;
    out.bays.push({ ...b, width: w });
    out.bays.push({ id: uid('b'), width: w, cells: b.cells.map((c) => ({ ...c, id: uid('c') })) });
  }
  return out;
}

export function evaluate(p: Project): GuideItem[] {
  const out: GuideItem[] = [];
  const r = resolve(p);
  const isPanel = p.type === 'wall_panel';
  const carcass = findMaterial(p.materials, p.assign.carcass);

  if (p.bays.length === 0) {
    out.push({
      id: 'no-bays',
      level: 'warn',
      title: { en: 'No bays defined', th: 'ยังไม่ได้กำหนดช่องตู้' },
      body: { en: 'Add at least one bay to generate drawings.', th: 'เพิ่มอย่างน้อยหนึ่งช่องเพื่อสร้างแบบ' },
    });
    return out;
  }

  // ---- function recipes (construction guide)
  for (const rec of RECIPES) {
    if (!has(p, rec.fn)) continue;
    const entries = Object.entries(rec.assign) as [keyof Project['assign'], string][];
    const missing = entries.filter(([role, id]) => p.assign[role] !== id && p.materials.some((m) => m.id === id));
    out.push({
      id: `recipe-${rec.fn}`,
      level: missing.length ? 'tip' : 'ok',
      title: rec.summary,
      body: {
        en: rec.points.map((x) => '• ' + x.en).join('\n'),
        th: rec.points.map((x) => '• ' + x.th).join('\n'),
      },
      fix: missing.length
        ? {
            label: { en: 'Apply recipe', th: 'ใช้สเปกนี้' },
            apply: (q) => missing.reduce((acc, [role, id]) => assign(acc, role, id), q),
          }
        : undefined,
      note: rec.points[0],
    });
  }

  if (!isPanel) {
    // ---- carcass thickness
    if (r.tc < 16) {
      out.push({
        id: 'carcass-thin',
        level: 'warn',
        title: { en: `Carcass ${r.tc} mm. is too thin`, th: `โครงตู้หนา ${r.tc} มม. บางเกินไป` },
        body: { en: 'Use HMR 18-20 mm. for carcass panels to hold hinges and cam fittings.', th: 'ใช้ HMR 18-20 มม. สำหรับโครงตู้ เพื่อยึดบานพับและน็อตล็อก' },
        fix: { label: { en: 'Use HMR 20 mm.', th: 'ใช้ HMR 20 มม.' }, apply: (q) => assign(q, 'carcass', 'hmr20-lam') },
      });
    }
    // ---- wet area material check
    if ((has(p, 'wet_area') || has(p, 'sink')) && carcass && carcass.category === 'board' && carcass.hatch === 'board' && !carcass.id.startsWith('pvc')) {
      out.push({
        id: 'wet-carcass',
        level: 'warn',
        title: { en: 'Carcass material in wet zone', th: 'วัสดุโครงตู้ในพื้นที่เปียก' },
        body: {
          en: `${carcass.name.en} swells if edges are not sealed. Prefer PVC foam board 18 mm. or marine plywood with PVC 2 mm. edges all round.`,
          th: `${carcass.name.th} อาจบวมน้ำหากไม่ซีลขอบ แนะนำ PVC โฟมบอร์ด 18 มม. หรือไม้อัดกันน้ำ ปิดขอบ PVC 2 มม. ทุกด้าน`,
        },
        fix: { label: { en: 'Use PVC board 18 mm.', th: 'ใช้ PVC บอร์ด 18 มม.' }, apply: (q) => assign(q, 'carcass', 'pvc18') },
      });
    }
    if (has(p, 'wet_area') && p.mount === 'plinth') {
      const pl = findMaterial(p.materials, p.assign.plinth);
      if (pl && pl.category === 'board' && !pl.id.startsWith('pvc')) {
        out.push({
          id: 'wet-plinth',
          level: 'warn',
          title: { en: 'Wooden plinth on wet floor', th: 'ฐานไม้บนพื้นเปียก' },
          body: { en: 'Use PVC/aluminium plinth or adjustable plastic legs; keep wood off the floor.', th: 'ใช้ฐาน PVC/อะลูมิเนียม หรือขาปรับระดับพลาสติก ห้ามไม้สัมผัสพื้น' },
          fix: { label: { en: 'Use PVC plinth', th: 'ใช้ฐาน PVC' }, apply: (q) => assign(q, 'plinth', 'pvc18') },
        });
      }
    }

    // ---- shelf spans
    const heavy = has(p, 'heavy_load');
    for (const rb of r.bays) {
      const span = rb.ix1 - rb.ix0;
      const hasShelf = rb.cells.some((c) => c.cell.shelves > 0);
      if (!hasShelf) continue;
      const limit = heavy ? 800 : 900;
      if (span > 1100) {
        out.push({
          id: `span-split-${rb.bay.id}`,
          level: 'warn',
          title: { en: `Bay ${rb.index + 1}: shelf span ${Math.round(span)} mm.`, th: `ช่อง ${rb.index + 1}: ช่วงพาดชั้น ${Math.round(span)} มม.` },
          body: { en: 'Shelves over 1100 mm. will sag. Add a vertical divider.', th: 'ชั้นยาวเกิน 1100 มม. จะแอ่นตัว ควรเพิ่มแผ่นกั้นตั้ง' },
          fix: { label: { en: 'Split bay', th: 'แบ่งช่อง' }, apply: (q) => splitBay(q, rb.bay.id) },
        });
      } else if (span > limit && r.ts < 25) {
        out.push({
          id: `span-thick-${rb.bay.id}`,
          level: 'warn',
          title: { en: `Bay ${rb.index + 1}: shelf span ${Math.round(span)} mm.`, th: `ช่อง ${rb.index + 1}: ช่วงพาดชั้น ${Math.round(span)} มม.` },
          body: {
            en: `Span exceeds ${limit} mm. for ${r.ts} mm. shelves. Use HMR 25 mm. or add a stiffener.`,
            th: `ช่วงพาดเกิน ${limit} มม. สำหรับชั้นหนา ${r.ts} มม. ใช้ HMR 25 มม. หรือเสริมคานใต้ชั้น`,
          },
          fix: { label: { en: 'Use HMR 25 mm. shelves', th: 'ใช้ชั้น HMR 25 มม.' }, apply: (q) => assign(q, 'shelf', 'hmr25') },
        });
      }
    }

    // ---- doors & drawers
    let maxDoorH = 0;
    const hingeNotes = new Map<number, number>();
    for (const rb of r.bays) {
      for (const rc of rb.cells) {
        const c = rc.cell;
        const lvs = leaves(rb, rc, p.dims.gap);
        for (const lf of lvs) {
          const w = lf.x1 - lf.x0;
          const h = lf.y1 - lf.y0;
          if (lf.kind.startsWith('door') || lf.kind.startsWith('glass')) {
            maxDoorH = Math.max(maxDoorH, h);
            const n = hingeCount(h);
            hingeNotes.set(Math.round(h), n);
          }
          if ((c.front === 'door_left' || c.front === 'door_right') && w > 620) {
            out.push({
              id: `door-wide-${c.id}`,
              level: 'warn',
              title: { en: `Bay ${rb.index + 1}: single door ${Math.round(w)} mm. wide`, th: `ช่อง ${rb.index + 1}: บานเดี่ยวกว้าง ${Math.round(w)} มม.` },
              body: { en: 'Single doors wider than 600 mm. sag and swing too far. Use a pair of doors.', th: 'บานเดี่ยวกว้างเกิน 600 มม. จะตกและกินพื้นที่เปิด ควรใช้บานคู่' },
              fix: { label: { en: 'Change to pair', th: 'เปลี่ยนเป็นบานคู่' }, apply: (q) => updateCell(q, rb.bay.id, c.id, { front: 'door_pair' }) },
            });
          }
          if (c.front === 'drawers' && w > 920) {
            out.push({
              id: `drawer-wide-${c.id}`,
              level: 'warn',
              title: { en: `Bay ${rb.index + 1}: drawer ${Math.round(w)} mm. wide`, th: `ช่อง ${rb.index + 1}: ลิ้นชักกว้าง ${Math.round(w)} มม.` },
              body: { en: 'Drawers over 900 mm. rack and need heavy-duty slides. Keep ≤ 900 mm.', th: 'ลิ้นชักกว้างเกิน 900 มม. จะบิดและต้องใช้รางรับน้ำหนักสูง ควรไม่เกิน 900 มม.' },
            });
            break;
          }
          if (c.front === 'drawers' && h < 100) {
            out.push({
              id: `drawer-low-${c.id}`,
              level: 'warn',
              title: { en: `Bay ${rb.index + 1}: drawer front ${Math.round(h)} mm. high`, th: `ช่อง ${rb.index + 1}: หน้าลิ้นชักสูง ${Math.round(h)} มม.` },
              body: { en: 'Minimum practical drawer front is ~120 mm. Reduce the number of drawers.', th: 'หน้าลิ้นชักควรสูงอย่างน้อย ~120 มม. ลดจำนวนลิ้นชัก' },
              fix: { label: { en: 'Fewer drawers', th: 'ลดจำนวนลิ้นชัก' }, apply: (q) => updateCell(q, rb.bay.id, c.id, { drawers: Math.max(1, c.drawers - 1) }) },
            });
            break;
          }
        }
      }
    }
    if (maxDoorH > 2400) {
      out.push({
        id: 'door-tall',
        level: 'warn',
        title: { en: `Door height ${Math.round(maxDoorH)} mm.`, th: `บานสูง ${Math.round(maxDoorH)} มม.` },
        body: {
          en: 'Exceeds 2440 board length and will warp. Split into upper/lower doors or use aluminium anti-warp straightener.',
          th: 'เกินความยาวแผ่น 2440 และอาจบิดตัว ควรแบ่งบานบน/ล่าง หรือใช้ตัวดัดบานอะลูมิเนียม',
        },
      });
    } else if (maxDoorH > 1800) {
      out.push({
        id: 'door-warp',
        level: 'tip',
        title: { en: 'Tall doors', th: 'บานสูง' },
        body: { en: 'Laminate both faces equally and consider an anti-warp straightener for doors over 1800 mm.', th: 'ปิดลามิเนตทั้งสองหน้าให้เท่ากัน และพิจารณาตัวดัดบานสำหรับบานสูงเกิน 1800 มม.' },
      });
    }
    if (hingeNotes.size) {
      const list = [...hingeNotes.entries()].sort((a, b) => a[0] - b[0]);
      const en = list.map(([h, n]) => `H.${h} → ${n}`).join(', ');
      out.push({
        id: 'hinges',
        level: 'ok',
        title: { en: 'Hinges per door', th: 'จำนวนบานพับต่อบาน' },
        body: { en: `Door height → hinges: ${en}`, th: `ความสูงบาน → จำนวนบานพับ: ${en}` },
        note: { en: `Hinges per door by height: ${en}.`, th: `จำนวนบานพับต่อบานตามความสูง: ${en}` },
      });
    }

    // ---- carcass board length
    if (r.carcassH > 2440) {
      out.push({
        id: 'board-length',
        level: 'warn',
        title: { en: `Carcass height ${Math.round(r.carcassH)} mm. > board length`, th: `โครงตู้สูง ${Math.round(r.carcassH)} มม. เกินความยาวแผ่น` },
        body: { en: 'Standard boards are 2440 mm. Build as two stacked boxes (lower + top box).', th: 'แผ่นมาตรฐานยาว 2440 มม. ควรแยกเป็นตู้ล่างและตู้บนซ้อนกัน' },
      });
    }
    if (r.W > 2440 && r.bays.length < 2) {
      out.push({
        id: 'board-width',
        level: 'warn',
        title: { en: 'Unit wider than one board', th: 'ตู้กว้างเกินหนึ่งแผ่น' },
        body: { en: 'Split into modules ≤ 1200 mm. for transport and installation.', th: 'แบ่งเป็นโมดูลกว้างไม่เกิน 1200 มม. เพื่อขนส่งและติดตั้ง' },
      });
    }

    // ---- type specific ergonomics
    const top = r.topY;
    if (p.type === 'kitchen_counter' && (top < 850 || top > 920)) {
      out.push({
        id: 'kitchen-height',
        level: 'tip',
        title: { en: `Counter height ${Math.round(top)} mm.`, th: `ความสูงเคาน์เตอร์ ${Math.round(top)} มม.` },
        body: { en: 'Recommended 850-920 mm. to top.', th: 'แนะนำ 850-920 มม. ถึงท็อป' },
        fix: { label: { en: 'Set 870 mm.', th: 'ตั้งค่า 870 มม.' }, apply: (q) => ({ ...q, dims: { ...q.dims, height: 870 } }) },
      });
    }
    if (p.type === 'vanity' && (top < 780 || top > 870)) {
      out.push({
        id: 'vanity-height',
        level: 'tip',
        title: { en: `Vanity top at ${Math.round(top)} mm.`, th: `ท็อปอ่างล้างหน้าสูง ${Math.round(top)} มม.` },
        body: { en: 'Recommended 800-850 mm. above FFL.', th: 'แนะนำ 800-850 มม. จากพื้น' },
        fix: {
          label: { en: 'Set top 850 mm.', th: 'ตั้งท็อปที่ 850 มม.' },
          apply: (q) => (q.mount === 'wall_hung' ? { ...q, dims: { ...q.dims, mountHeight: Math.max(0, 850 - q.dims.height) } } : { ...q, dims: { ...q.dims, height: 850 } }),
        },
      });
    }
    if (p.type === 'wall_cabinet' && p.mount === 'wall_hung' && (r.baseY < 1400 || r.baseY > 1650)) {
      out.push({
        id: 'wall-height',
        level: 'tip',
        title: { en: `Underside at ${Math.round(r.baseY)} mm.`, th: `ใต้ตู้สูง ${Math.round(r.baseY)} มม.` },
        body: { en: 'Typical 1450-1550 mm. above FFL (600-700 mm. above counter).', th: 'โดยทั่วไป 1450-1550 มม. จากพื้น (600-700 มม. เหนือเคาน์เตอร์)' },
        fix: { label: { en: 'Set 1500 mm.', th: 'ตั้งค่า 1500 มม.' }, apply: (q) => ({ ...q, dims: { ...q.dims, mountHeight: 1500 } }) },
      });
    }
    if (has(p, 'hanging') && r.Dc < 540) {
      out.push({
        id: 'hang-depth',
        level: 'warn',
        title: { en: `Clear depth ${Math.round(r.Dc)} mm. for hanging`, th: `ความลึกภายใน ${Math.round(r.Dc)} มม. สำหรับแขวนผ้า` },
        body: { en: 'Hangers need ≥ 540 mm. clear depth. Increase depth to 600 mm.', th: 'ไม้แขวนต้องการความลึกภายใน ≥ 540 มม. เพิ่มความลึกเป็น 600 มม.' },
        fix: { label: { en: 'Depth 600 mm.', th: 'ลึก 600 มม.' }, apply: (q) => ({ ...q, dims: { ...q.dims, depth: 600 } }) },
      });
    }
    for (const rb of r.bays) {
      for (const rc of rb.cells) {
        if (rc.cell.rail && rb.ix1 - rb.ix0 > 1000) {
          out.push({
            id: `rail-span-${rc.cell.id}`,
            level: 'tip',
            title: { en: `Bay ${rb.index + 1}: rail span ${Math.round(rb.ix1 - rb.ix0)} mm.`, th: `ช่อง ${rb.index + 1}: ราวแขวนยาว ${Math.round(rb.ix1 - rb.ix0)} มม.` },
            body: { en: 'Add a centre rail support.', th: 'เพิ่มตัวรับราวตรงกลาง' },
          });
        }
        if (rc.cell.rail && rc.iy1 - rc.iy0 < 950) {
          out.push({
            id: `rail-height-${rc.cell.id}`,
            level: 'warn',
            title: { en: `Bay ${rb.index + 1}: hanging height ${Math.round(rc.iy1 - rc.iy0)} mm.`, th: `ช่อง ${rb.index + 1}: ความสูงแขวน ${Math.round(rc.iy1 - rc.iy0)} มม.` },
            body: { en: 'Short hanging needs ≥ 950 mm. clear; long hanging ≥ 1500 mm.', th: 'แขวนสั้นต้องการ ≥ 950 มม. แขวนยาว ≥ 1500 มม.' },
          });
        }
      }
    }
    if (p.mount === 'wall_hung') {
      out.push({
        id: 'wall-hung',
        level: 'tip',
        title: { en: 'Wall-hung fixing', th: 'การยึดตู้แขวน' },
        body: {
          en: 'Fix to masonry/RC wall with hanging rail and plugs @ 400 mm. On light-weight walls add wood structure / steel backing first.',
          th: 'ยึดเข้าผนังก่ออิฐ/คอนกรีตด้วยรางแขวนและพุก @ 400 มม. ผนังเบาต้องเสริมโครงไม้/เหล็กก่อน',
        },
        note: { en: 'Wall-hung unit: hanging rail HMR 20x80 + screw & plug @ 400 mm.; verify wall type on site.', th: 'ตู้แขวน: รางแขวน HMR 20x80 + สกรูและพุก @ 400 มม. ตรวจสอบชนิดผนังหน้างาน' },
      });
    }
    if (p.handle === 'push' && p.bays.some((b) => b.cells.some((c) => c.front === 'drawers'))) {
      const slide = findMaterial(p.materials, p.assign.slide);
      if (slide && /soft/i.test(slide.name.en)) {
        out.push({
          id: 'push-softclose',
          level: 'tip',
          title: { en: 'Push-to-open with soft-close slides', th: 'กดเปิดกับรางปิดนุ่มนวล' },
          body: { en: 'Soft-close slides cannot push-open. Specify Tip-on / push-open slides for drawers.', th: 'รางปิดนุ่มนวลใช้ระบบกดเปิดไม่ได้ ให้ระบุรางแบบ Tip-on / Push open' },
        });
      }
    }
    if ((p.type === 'tall_cabinet' || p.type === 'wardrobe' || p.type === 'shelving') && r.topY > 1200 && p.mount !== 'wall_hung') {
      out.push({
        id: 'anti-tip',
        level: 'tip',
        title: { en: 'Anti-tip fixing', th: 'ยึดกันตู้ล้ม' },
        body: { en: 'Tall free-standing units must be anchored to the wall at the top.', th: 'ตู้สูงตั้งพื้นต้องยึดเข้าผนังที่ด้านบน' },
        note: { en: 'Anchor top of unit to wall with anti-tip brackets.', th: 'ยึดด้านบนตู้เข้าผนังด้วยอุปกรณ์กันตู้ล้ม' },
      });
    }
    if (p.hasCountertop && p.dims.countertopOverhang < 10) {
      out.push({
        id: 'overhang',
        level: 'tip',
        title: { en: 'Countertop overhang', th: 'ระยะยื่นท็อป' },
        body: { en: 'Overhang 15-25 mm. over fronts protects them from drips.', th: 'ท็อปยื่นเลยหน้าบาน 15-25 มม. ช่วยกันน้ำหยดใส่บาน' },
        fix: { label: { en: 'Set 20 mm.', th: 'ตั้งค่า 20 มม.' }, apply: (q) => ({ ...q, dims: { ...q.dims, countertopOverhang: 20 } }) },
      });
    }
    if (p.dims.gap < 2 && r.hasFronts) {
      out.push({
        id: 'gap',
        level: 'warn',
        title: { en: `Front gap ${p.dims.gap} mm.`, th: `ร่องหน้าบาน ${p.dims.gap} มม.` },
        body: { en: 'Fronts need 2-3 mm. gap to open freely.', th: 'หน้าบานต้องเว้นร่อง 2-3 มม. เพื่อให้เปิดได้' },
        fix: { label: { en: 'Set 3 mm.', th: 'ตั้งค่า 3 มม.' }, apply: (q) => ({ ...q, dims: { ...q.dims, gap: 3 } }) },
      });
    }
    if (has(p, 'uneven_wall')) {
      out.push({
        id: 'cover-sides',
        level: 'tip',
        title: { en: 'Cover panel on wood structure', th: 'แผ่นปิดบนโครงคร่าวไม้' },
        body: {
          en: 'Where the unit meets an uneven wall or leaves an exposed side, build a wood structure 1"x2" and cover with HMR 10 mm. laminated panel.',
          th: 'บริเวณที่ตู้ชนผนังไม่ได้ระดับหรือมีด้านข้างเปิดโล่ง ให้ทำโครงคร่าวไม้ 1"x2" และปิดด้วยแผ่น HMR 10 มม. ปิดลามิเนต',
        },
      });
    }
  } else {
    // ---- wall panelling
    if (p.dims.frameSpacing > 400) {
      out.push({
        id: 'frame-spacing',
        level: 'warn',
        title: { en: `Frame spacing @ ${p.dims.frameSpacing} mm.`, th: `ระยะโครงคร่าว @ ${p.dims.frameSpacing} มม.` },
        body: { en: 'HMR 10 mm. cladding needs support ≤ 400 mm. to stay flat.', th: 'แผ่น HMR 10 มม. ต้องมีโครงรับทุก ≤ 400 มม. เพื่อไม่ให้แอ่น' },
        fix: { label: { en: 'Set @ 400 mm.', th: 'ตั้ง @ 400 มม.' }, apply: (q) => ({ ...q, dims: { ...q.dims, frameSpacing: 400 } }) },
      });
    }
    if (thk(p, 'cladding', 10) < 9) {
      out.push({
        id: 'cladding-thin',
        level: 'warn',
        title: { en: 'Cladding too thin', th: 'แผ่นบุบางเกินไป' },
        body: { en: 'Use HMR 10 mm. minimum on wood structure.', th: 'ใช้ HMR อย่างน้อย 10 มม. บนโครงคร่าวไม้' },
        fix: { label: { en: 'Use HMR 10 mm.', th: 'ใช้ HMR 10 มม.' }, apply: (q) => assign(q, 'cladding', 'hmr10-lam') },
      });
    }
    const maxPanel = Math.max(...r.bays.map((b) => b.x1 - b.x0));
    const maxPanelH = Math.max(...r.bays.flatMap((b) => b.cells.map((c) => c.y1 - c.y0)));
    if (maxPanel > 1220 || maxPanelH > 2440) {
      out.push({
        id: 'panel-size',
        level: 'warn',
        title: { en: 'Panel larger than board 1220x2440', th: 'แผ่นใหญ่กว่าขนาดแผ่นมาตรฐาน 1220x2440' },
        body: { en: 'Add joints so each panel fits a standard board.', th: 'เพิ่มรอยต่อให้แต่ละแผ่นไม่เกินขนาดแผ่นมาตรฐาน' },
      });
    }
  }

  // ---- handle note
  if (!isPanel) out.push({
    id: 'handle',
    level: 'ok',
    title: { en: 'Handle type', th: 'ชนิดมือจับ' },
    body: HANDLE_NAMES[p.handle],
    note: p.handle === 'push' ? { en: 'Fronts: push-to-open latches, no handles.', th: 'หน้าบาน: ระบบกดเปิด ไม่มีมือจับ' } : undefined,
  });

  return out;
}

/** General notes printed on the drawing sheet. */
export function generalNotes(p: Project): Bi[] {
  const notes: Bi[] = [
    { en: 'All dimensions in millimetres. Verify all dimensions on site before fabrication.', th: 'ขนาดทั้งหมดเป็นมิลลิเมตร ตรวจสอบขนาดหน้างานก่อนผลิตทุกครั้ง' },
    { en: 'Do not scale from drawing; figured dimensions govern.', th: 'ห้ามวัดขนาดจากแบบ ให้ยึดตัวเลขที่ระบุ' },
  ];
  const m = (role: keyof Project['assign']) => findMaterial(p.materials, p.assign[role]);
  if (p.type !== 'wall_panel') {
    const c = m('carcass');
    const b = m('back');
    const f = m('front');
    if (c) notes.push({ en: `Carcass: ${c.name.en}, ${c.finish.en}.`, th: `โครงตู้: ${c.name.th} ${c.finish.th}` });
    if (b) notes.push({ en: `Back panel: ${b.name.en} in 8 mm. groove.`, th: `แผ่นหลัง: ${b.name.th} เข้าร่องลึก 8 มม.` });
    if (f) notes.push({ en: `Fronts: ${f.name.en}, ${f.finish.en}.`, th: `หน้าบาน: ${f.name.th} ${f.finish.th}` });
    const e = m('edge');
    if (e) notes.push({ en: `Edges: ${e.name.en} ${e.finish.en}.`, th: `ขอบ: ${e.name.th} ${e.finish.th}` });
    const h = m('hinge');
    const s = m('slide');
    if (h && p.bays.some((bb) => bb.cells.some((cc) => cc.front.includes('door') || cc.front.startsWith('flap')))) notes.push({ en: `Hinges: ${h.name.en}.`, th: `บานพับ: ${h.name.th}` });
    if (s && p.bays.some((bb) => bb.cells.some((cc) => cc.front === 'drawers'))) notes.push({ en: `Drawer slides: ${s.name.en}.`, th: `รางลิ้นชัก: ${s.name.th}` });
  } else {
    const fr = m('frame');
    const cl = m('cladding');
    if (fr) notes.push({ en: `Wood structure: ${fr.name.en} @ ${p.dims.frameSpacing} mm. c/c both ways, ${fr.finish.en}.`, th: `โครงคร่าว: ${fr.name.th} @ ${p.dims.frameSpacing} มม. ทั้งสองทิศทาง ${fr.finish.th}` });
    if (cl) notes.push({ en: `Cover: ${cl.name.en}, ${cl.finish.en}.`, th: `ผิวปิด: ${cl.name.th} ${cl.finish.th}` });
  }
  for (const g of evaluate(p)) if (g.note && !notes.some((n) => n.en === g.note!.en)) notes.push(g.note);
  return notes;
}
