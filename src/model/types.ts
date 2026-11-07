/** Core data model for a joinery drafting project. All lengths are millimetres. */

export type Lang = 'en' | 'th' | 'both';

/** Bilingual text. */
export interface Bi {
  en: string;
  th: string;
}

export type JoineryType =
  | 'base_cabinet'
  | 'wall_cabinet'
  | 'tall_cabinet'
  | 'wardrobe'
  | 'tv_console'
  | 'vanity'
  | 'kitchen_counter'
  | 'shelving'
  | 'wall_panel';

export type FrontType =
  | 'open'
  | 'door_left'
  | 'door_right'
  | 'door_pair'
  | 'drawers'
  | 'flap_up'
  | 'flap_down'
  | 'glass_door';

export type HandleType = 'bar' | 'knob' | 'groove' | 'push' | 'recessed';

/** How the unit meets the floor / wall. */
export type MountType = 'plinth' | 'legs' | 'wall_hung' | 'floor';

export type FunctionKey =
  | 'storage'
  | 'hanging'
  | 'display'
  | 'heavy_load'
  | 'wet_area'
  | 'sink'
  | 'cooking'
  | 'tv_media'
  | 'wall_cladding'
  | 'uneven_wall'
  | 'concealed'
  | 'lighting'
  | 'kids_safety';

export type MaterialCategory = 'board' | 'timber' | 'finish' | 'stone' | 'glass' | 'metal' | 'hardware' | 'other';

/** Section hatch used when the material is cut in a detail. */
export type HatchPattern = 'board' | 'ply' | 'timber' | 'stone' | 'glass' | 'metal' | 'none';

export interface Material {
  id: string;
  /** Short code printed on drawings, e.g. "M01". */
  code: string;
  name: Bi;
  category: MaterialCategory;
  /** Thickness in mm (0 when not applicable). */
  thickness: number;
  /** Second section size for timber battens (e.g. 50 for 25x50). */
  width?: number;
  finish: Bi;
  /** Preview colour (hex). */
  color: string;
  hatch: HatchPattern;
  notes?: Bi;
}

/** Construction roles that receive a material. */
export type Role =
  | 'carcass'
  | 'back'
  | 'shelf'
  | 'front'
  | 'drawerBox'
  | 'countertop'
  | 'plinth'
  | 'frame'
  | 'cladding'
  | 'edge'
  | 'rail'
  | 'hinge'
  | 'slide'
  | 'handle';

export const ROLES: Role[] = [
  'carcass',
  'back',
  'shelf',
  'front',
  'drawerBox',
  'countertop',
  'plinth',
  'frame',
  'cladding',
  'edge',
  'rail',
  'hinge',
  'slide',
  'handle',
];

export interface Cell {
  id: string;
  /** Module height in mm, or null to share the remaining height. */
  height: number | null;
  front: FrontType;
  /** Adjustable shelves inside the cell. */
  shelves: number;
  /** Number of drawers (front = 'drawers'). */
  drawers: number;
  /** Hanging rail inside the cell. */
  rail: boolean;
  /** Optional front material override (material id). */
  frontMaterialId?: string | null;
}

export interface Bay {
  id: string;
  /** Module width in mm, or null to share the remaining width. */
  width: number | null;
  /** Cells stacked from bottom to top. */
  cells: Cell[];
}

export interface Dimensions {
  width: number;
  /** Overall height of the unit (incl. plinth/legs and countertop; excl. wall-hung clearance). */
  height: number;
  /** Overall depth incl. fronts, excl. countertop overhang. */
  depth: number;
  plinthHeight: number;
  plinthRecess: number;
  /** Underside height above finished floor level for wall-hung units. */
  mountHeight: number;
  countertopOverhang: number;
  /** Gap between fronts / shadow gap between panels. */
  gap: number;
  /** Wood structure spacing (wall panels). */
  frameSpacing: number;
}

export interface SpecItem {
  id: string;
  text: Bi;
}

export type ViewId = 'plan' | 'elevation' | 'section' | 'd1' | 'd2' | 'd3' | 'd4';

export interface Comment {
  id: string;
  viewId: ViewId;
  /** Position in the view's local (real, mm) coordinates. */
  x: number;
  y: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

export interface RefImage {
  id: string;
  name: string;
  dataUrl: string;
  kind: 'upload' | 'sketch';
}

export type PaperSize = 'A3' | 'A2' | 'A1';

export interface SheetSettings {
  paper: PaperSize;
  /** Drawing scale denominator (20 => 1:20) or 'auto'. */
  scale: number | 'auto';
  /** Language of text printed on the drawing. */
  drawingLang: Lang;
  showComments: boolean;
  autoNotes: boolean;
}

export interface ProjectInfo {
  name: string;
  client: string;
  location: string;
  room: string;
  designer: string;
  drawingNo: string;
  revision: string;
  date: string;
}

export interface Project {
  version: 1;
  info: ProjectInfo;
  type: JoineryType;
  description: string;
  dims: Dimensions;
  mount: MountType;
  handle: HandleType;
  hasCountertop: boolean;
  functions: FunctionKey[];
  bays: Bay[];
  materials: Material[];
  assign: Record<Role, string>;
  specs: SpecItem[];
  comments: Comment[];
  refs: RefImage[];
  /** Bay used for section A-A. */
  sectionBay: number;
  sheet: SheetSettings;
}
