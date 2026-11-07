import type { Bay, Cell, Project } from './types';
import { cell } from './presets';
import { uid } from './util';

export function updateBay(p: Project, bayId: string, patch: Partial<Bay>): Project {
  return { ...p, bays: p.bays.map((b) => (b.id === bayId ? { ...b, ...patch } : b)) };
}

export function updateCell(p: Project, bayId: string, cellId: string, patch: Partial<Cell>): Project {
  return {
    ...p,
    bays: p.bays.map((b) => (b.id !== bayId ? b : { ...b, cells: b.cells.map((c) => (c.id === cellId ? { ...c, ...patch } : c)) })),
  };
}

export function addBay(p: Project, afterId?: string): Project {
  const front = p.type === 'wall_panel' ? 'open' : p.type === 'shelving' ? 'open' : 'door_pair';
  const template = p.bays.find((b) => b.id === afterId) ?? p.bays[p.bays.length - 1];
  const nb: Bay = template
    ? { id: uid('b'), width: null, cells: template.cells.map((c) => ({ ...c, id: uid('c') })) }
    : { id: uid('b'), width: null, cells: [cell(front)] };
  const i = afterId ? p.bays.findIndex((b) => b.id === afterId) : p.bays.length - 1;
  const bays = [...p.bays];
  bays.splice(i + 1, 0, nb);
  return { ...p, bays };
}

export function deleteBay(p: Project, bayId: string): Project {
  if (p.bays.length <= 1) return p;
  return { ...p, bays: p.bays.filter((b) => b.id !== bayId), sectionBay: 0 };
}

/** Add a compartment above `cellId` (or on top). */
export function addCell(p: Project, bayId: string, cellId?: string): Project {
  return {
    ...p,
    bays: p.bays.map((b) => {
      if (b.id !== bayId) return b;
      const i = cellId ? b.cells.findIndex((c) => c.id === cellId) : b.cells.length - 1;
      const src = b.cells[i];
      const nc: Cell = src ? { ...src, id: uid('c'), height: null, rail: false } : cell('open');
      const cells = [...b.cells];
      cells.splice(i + 1, 0, nc);
      // a split cell shares its height with the new one
      if (src && src.height != null) cells[i] = { ...src, height: null };
      return { ...b, cells };
    }),
  };
}

export function deleteCell(p: Project, bayId: string, cellId: string): Project {
  return {
    ...p,
    bays: p.bays.map((b) => (b.id !== bayId || b.cells.length <= 1 ? b : { ...b, cells: b.cells.filter((c) => c.id !== cellId) })),
  };
}

export function parseTag(tag: string | null): { kind: 'cell'; bayId: string; cellId: string } | { kind: 'role'; role: string } | null {
  if (!tag) return null;
  const parts = tag.split(':');
  if (parts[0] === 'cell' && parts.length === 3) return { kind: 'cell', bayId: parts[1], cellId: parts[2] };
  if (parts[0] === 'role') return { kind: 'role', role: parts[1] };
  return null;
}
