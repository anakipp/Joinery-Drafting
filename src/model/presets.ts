import type { Bay, Cell, Dimensions, FrontType, FunctionKey, HandleType, JoineryType, MountType, Project, Role } from './types';
import { DEFAULT_ASSIGN, cloneMaterials } from './materials';
import { uid } from './util';

export function cell(front: FrontType, opts: Partial<Omit<Cell, 'id' | 'front'>> = {}): Cell {
  return {
    id: uid('c'),
    height: opts.height ?? null,
    front,
    shelves: opts.shelves ?? 0,
    drawers: opts.drawers ?? (front === 'drawers' ? 3 : 0),
    rail: opts.rail ?? false,
    frontMaterialId: opts.frontMaterialId ?? null,
  };
}

export function bay(cells: Cell[], width: number | null = null): Bay {
  return { id: uid('b'), width, cells };
}

interface Preset {
  dims: Partial<Dimensions> & Pick<Dimensions, 'width' | 'height' | 'depth'>;
  mount: MountType;
  handle: HandleType;
  hasCountertop: boolean;
  functions: FunctionKey[];
  bays: () => Bay[];
  assign?: Partial<Record<Role, string>>;
}

const BASE_DIMS: Omit<Dimensions, 'width' | 'height' | 'depth'> = {
  plinthHeight: 100,
  plinthRecess: 50,
  mountHeight: 1500,
  countertopOverhang: 20,
  gap: 3,
  frameSpacing: 400,
};

export const PRESETS: Record<JoineryType, Preset> = {
  base_cabinet: {
    dims: { width: 1600, height: 800, depth: 450 },
    mount: 'plinth',
    handle: 'bar',
    hasCountertop: false,
    functions: ['storage'],
    bays: () => [bay([cell('door_pair', { shelves: 1 })]), bay([cell('drawers', { drawers: 3 })], 600)],
  },
  wall_cabinet: {
    dims: { width: 1200, height: 700, depth: 350, mountHeight: 1500 },
    mount: 'wall_hung',
    handle: 'groove',
    hasCountertop: false,
    functions: ['storage'],
    bays: () => [bay([cell('door_left', { shelves: 1 })]), bay([cell('door_right', { shelves: 1 })])],
  },
  tall_cabinet: {
    dims: { width: 900, height: 2400, depth: 600 },
    mount: 'plinth',
    handle: 'bar',
    hasCountertop: false,
    functions: ['storage', 'kids_safety'],
    bays: () => [bay([cell('door_pair', { shelves: 3 }), cell('door_pair', { height: 500 })])],
  },
  wardrobe: {
    dims: { width: 2400, height: 2600, depth: 600 },
    mount: 'plinth',
    handle: 'bar',
    hasCountertop: false,
    functions: ['hanging', 'storage'],
    bays: () => [
      bay([cell('door_pair', { rail: true, shelves: 0 }), cell('door_pair', { height: 500 })]),
      bay([cell('drawers', { height: 700, drawers: 3 }), cell('door_pair', { shelves: 2 }), cell('door_pair', { height: 500 })], 800),
      bay([cell('door_pair', { rail: true, shelves: 0 }), cell('door_pair', { height: 500 })]),
    ],
  },
  tv_console: {
    dims: { width: 2000, height: 420, depth: 450, mountHeight: 300 },
    mount: 'wall_hung',
    handle: 'push',
    hasCountertop: false,
    functions: ['tv_media', 'storage'],
    bays: () => [bay([cell('flap_down')]), bay([cell('open', { shelves: 1 })], 800), bay([cell('flap_down')])],
  },
  vanity: {
    dims: { width: 900, height: 520, depth: 550, mountHeight: 330 },
    mount: 'wall_hung',
    handle: 'groove',
    hasCountertop: true,
    functions: ['wet_area', 'sink'],
    bays: () => [bay([cell('door_pair')])],
    assign: { carcass: 'pvc18', plinth: 'pvc18' },
  },
  kitchen_counter: {
    dims: { width: 2400, height: 870, depth: 600 },
    mount: 'plinth',
    handle: 'bar',
    hasCountertop: true,
    functions: ['cooking', 'sink', 'storage'],
    bays: () => [
      bay([cell('door_pair')], 900),
      bay([cell('drawers', { drawers: 3 })], 600),
      bay([cell('door_pair', { shelves: 1 })]),
    ],
    assign: { plinth: 'plinth-alu' },
  },
  shelving: {
    dims: { width: 1800, height: 2000, depth: 350 },
    mount: 'plinth',
    handle: 'push',
    hasCountertop: false,
    functions: ['display', 'heavy_load'],
    bays: () => [
      bay([cell('open', { shelves: 4 })]),
      bay([cell('open', { shelves: 4 })]),
      bay([cell('open', { shelves: 4 })]),
    ],
  },
  wall_panel: {
    dims: { width: 3000, height: 2700, depth: 35, frameSpacing: 400, gap: 5, plinthHeight: 80 },
    mount: 'floor',
    handle: 'push',
    hasCountertop: false,
    functions: ['wall_cladding', 'uneven_wall'],
    bays: () => [
      bay([cell('open', { height: 1200 }), cell('open')]),
      bay([cell('open', { height: 1200 }), cell('open')]),
      bay([cell('open', { height: 1200 }), cell('open')]),
      bay([cell('open', { height: 1200 }), cell('open')]),
    ],
  },
};

export const TYPE_ORDER: JoineryType[] = [
  'base_cabinet',
  'wall_cabinet',
  'tall_cabinet',
  'wardrobe',
  'tv_console',
  'vanity',
  'kitchen_counter',
  'shelving',
  'wall_panel',
];

export function applyPreset(p: Project, type: JoineryType): Project {
  const pr = PRESETS[type];
  return {
    ...p,
    type,
    dims: { ...BASE_DIMS, ...pr.dims } as Dimensions,
    mount: pr.mount,
    handle: pr.handle,
    hasCountertop: pr.hasCountertop,
    functions: [...pr.functions],
    bays: pr.bays(),
    assign: { ...DEFAULT_ASSIGN, ...(pr.assign ?? {}) },
    sectionBay: 0,
    comments: [],
  };
}

export function newProject(type: JoineryType = 'base_cabinet'): Project {
  const today = new Date().toISOString().slice(0, 10);
  const base: Project = {
    version: 1,
    info: {
      name: 'New project',
      client: '',
      location: '',
      room: '',
      designer: '',
      drawingNo: 'JD-01',
      revision: '0',
      date: today,
    },
    type,
    description: '',
    dims: { ...BASE_DIMS, width: 1200, height: 800, depth: 600 },
    mount: 'plinth',
    handle: 'bar',
    hasCountertop: false,
    functions: [],
    bays: [],
    materials: cloneMaterials(),
    assign: { ...DEFAULT_ASSIGN },
    specs: [],
    comments: [],
    refs: [],
    sectionBay: 0,
    sheet: { paper: 'A3', scale: 'auto', drawingLang: 'both', showComments: true, autoNotes: true },
  };
  return applyPreset(base, type);
}
