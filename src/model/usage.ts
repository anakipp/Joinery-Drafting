import type { Material, Project, Role } from './types';
import { findMaterial } from './materials';

/** Roles that actually appear in the project. */
export function usedRoles(p: Project): Role[] {
  if (p.type === 'wall_panel') {
    const out: Role[] = ['frame', 'cladding', 'edge'];
    if (p.dims.plinthHeight > 0) out.push('plinth');
    return out;
  }
  const cells = p.bays.flatMap((b) => b.cells);
  const out: Role[] = ['carcass', 'back'];
  if (cells.some((c) => c.shelves > 0)) out.push('shelf');
  if (cells.some((c) => c.front !== 'open')) out.push('front');
  if (cells.some((c) => c.front === 'drawers')) out.push('drawerBox', 'slide');
  if (p.hasCountertop) out.push('countertop');
  if (p.mount === 'plinth' || p.mount === 'legs') out.push('plinth');
  out.push('edge');
  if (cells.some((c) => c.rail)) out.push('rail');
  if (cells.some((c) => c.front.includes('door') || c.front.startsWith('flap'))) out.push('hinge');
  if (['bar', 'knob', 'recessed'].includes(p.handle) && cells.some((c) => c.front !== 'open')) out.push('handle');
  return out;
}

/** Materials used in the project, with the roles they serve, sorted by code. */
export function usedMaterials(p: Project): { m: Material; roles: Role[] }[] {
  const map = new Map<string, { m: Material; roles: Role[] }>();
  for (const role of usedRoles(p)) {
    const m = findMaterial(p.materials, p.assign[role]);
    if (!m) continue;
    const e = map.get(m.id) ?? { m, roles: [] };
    e.roles.push(role);
    map.set(m.id, e);
  }
  if (p.type !== 'wall_panel') {
    for (const b of p.bays)
      for (const c of b.cells) {
        const m = findMaterial(p.materials, c.frontMaterialId);
        if (m && c.front !== 'open') {
          const e = map.get(m.id) ?? { m, roles: [] };
          if (!e.roles.includes('front')) e.roles.push('front');
          map.set(m.id, e);
        }
      }
  }
  return [...map.values()].sort((a, b) => a.m.code.localeCompare(b.m.code));
}
