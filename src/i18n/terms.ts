import type { Bi, FrontType, FunctionKey, HandleType, JoineryType, Lang, MountType, PaperSize, Role, MaterialCategory } from '../model/types';

export const TYPE_NAMES: Record<JoineryType, Bi> = {
  base_cabinet: { en: 'Low cabinet', th: 'ตู้ต่ำ' },
  wall_cabinet: { en: 'Wall cabinet', th: 'ตู้แขวนผนัง' },
  tall_cabinet: { en: 'Tall cabinet', th: 'ตู้สูง' },
  wardrobe: { en: 'Wardrobe', th: 'ตู้เสื้อผ้า' },
  tv_console: { en: 'TV console', th: 'ตู้วางทีวี' },
  vanity: { en: 'Vanity cabinet', th: 'ตู้ใต้อ่างล้างหน้า' },
  kitchen_counter: { en: 'Kitchen counter', th: 'เคาน์เตอร์ครัว' },
  shelving: { en: 'Open shelving / bookcase', th: 'ชั้นวางของ / ชั้นหนังสือ' },
  wall_panel: { en: 'Wall panelling', th: 'ผนังบุไม้ตกแต่ง' },
};

export const FRONT_NAMES: Record<FrontType, Bi> = {
  open: { en: 'Open', th: 'ช่องเปิดโล่ง' },
  door_left: { en: 'Door, hinged left', th: 'บานเปิด บานพับซ้าย' },
  door_right: { en: 'Door, hinged right', th: 'บานเปิด บานพับขวา' },
  door_pair: { en: 'Pair of doors', th: 'บานเปิดคู่' },
  drawers: { en: 'Drawers', th: 'ลิ้นชัก' },
  flap_up: { en: 'Lift-up flap', th: 'บานยกขึ้น' },
  flap_down: { en: 'Drop-down flap', th: 'บานพับลง' },
  glass_door: { en: 'Glass door', th: 'บานกระจก' },
};

export const FUNCTION_NAMES: Record<FunctionKey, Bi> = {
  storage: { en: 'General storage', th: 'เก็บของทั่วไป' },
  hanging: { en: 'Clothes hanging', th: 'แขวนเสื้อผ้า' },
  display: { en: 'Display / open shelf', th: 'โชว์ของ / ชั้นเปิด' },
  heavy_load: { en: 'Heavy load (books, appliances)', th: 'รับน้ำหนักมาก (หนังสือ, เครื่องใช้)' },
  wet_area: { en: 'Wet area (bathroom)', th: 'พื้นที่เปียก (ห้องน้ำ)' },
  sink: { en: 'Under sink', th: 'ใต้ซิงก์ / อ่างล้าง' },
  cooking: { en: 'Cooking zone (heat)', th: 'โซนทำอาหาร (ความร้อน)' },
  tv_media: { en: 'TV / AV equipment', th: 'ทีวี / เครื่องเสียง' },
  wall_cladding: { en: 'Decorative wall cladding', th: 'บุผนังตกแต่ง' },
  uneven_wall: { en: 'Uneven / poor wall', th: 'ผนังไม่ได้ระดับ / ผนังเบา' },
  concealed: { en: 'Handleless / concealed', th: 'ไร้มือจับ / ซ่อนบาน' },
  lighting: { en: 'Integrated LED lighting', th: 'ไฟ LED ในตู้' },
  kids_safety: { en: 'Child safety', th: 'ความปลอดภัยสำหรับเด็ก' },
};

export const ROLE_NAMES: Record<Role, Bi> = {
  carcass: { en: 'Carcass', th: 'โครงตู้' },
  back: { en: 'Back panel', th: 'แผ่นหลัง' },
  shelf: { en: 'Shelf', th: 'แผ่นชั้น' },
  front: { en: 'Door / drawer front', th: 'หน้าบาน / หน้าลิ้นชัก' },
  drawerBox: { en: 'Drawer box', th: 'กล่องลิ้นชัก' },
  countertop: { en: 'Countertop', th: 'ท็อปเคาน์เตอร์' },
  plinth: { en: 'Plinth / kick board', th: 'ฐานตู้ / บัวเชิงตู้' },
  frame: { en: 'Wood structure', th: 'โครงคร่าวไม้' },
  cladding: { en: 'Cladding panel', th: 'แผ่นบุผนัง' },
  edge: { en: 'Edge banding', th: 'ปิดขอบ' },
  rail: { en: 'Hanging rail', th: 'ราวแขวน' },
  hinge: { en: 'Hinge', th: 'บานพับ' },
  slide: { en: 'Drawer slide', th: 'รางลิ้นชัก' },
  handle: { en: 'Handle', th: 'มือจับ' },
};

export const MOUNT_NAMES: Record<MountType, Bi> = {
  plinth: { en: 'On plinth (kick board)', th: 'ตั้งบนฐาน (บัวเชิงตู้)' },
  legs: { en: 'Adjustable legs', th: 'ขาปรับระดับ' },
  wall_hung: { en: 'Wall-hung (floating)', th: 'แขวนผนัง (ลอย)' },
  floor: { en: 'Directly on floor', th: 'วางบนพื้นโดยตรง' },
};

export const HANDLE_NAMES: Record<HandleType, Bi> = {
  bar: { en: 'Bar handle', th: 'มือจับแบบก้าน' },
  knob: { en: 'Knob', th: 'ปุ่มจับ' },
  groove: { en: 'J-groove (handleless)', th: 'เซาะร่องมือจับ' },
  push: { en: 'Push-to-open', th: 'กดเปิด (Push open)' },
  recessed: { en: 'Recessed pull', th: 'มือจับฝัง' },
};

export const CATEGORY_NAMES: Record<MaterialCategory, Bi> = {
  board: { en: 'Board', th: 'แผ่นไม้' },
  timber: { en: 'Timber', th: 'ไม้จริง' },
  finish: { en: 'Finish', th: 'วัสดุปิดผิว' },
  stone: { en: 'Stone', th: 'หิน' },
  glass: { en: 'Glass', th: 'กระจก' },
  metal: { en: 'Metal', th: 'โลหะ' },
  hardware: { en: 'Hardware', th: 'อุปกรณ์' },
  other: { en: 'Other', th: 'อื่น ๆ' },
};

export const PAPER_NAMES: Record<PaperSize, string> = { A3: 'A3', A2: 'A2', A1: 'A1' };

/** Pick text for a language. 'both' joins with a separator. */
export function L(b: Bi, lang: Lang, sep = ' / '): string {
  if (lang === 'en') return b.en;
  if (lang === 'th') return b.th || b.en;
  if (!b.th || b.th === b.en) return b.en;
  if (!b.en) return b.th;
  return `${b.en}${sep}${b.th}`;
}

/** Text as separate lines (both => two lines). */
export function Llines(b: Bi, lang: Lang): string[] {
  if (lang === 'en') return [b.en];
  if (lang === 'th') return [b.th || b.en];
  const out = [b.en];
  if (b.th && b.th !== b.en) out.push(b.th);
  return out;
}

export const VIEW_TITLES: Record<string, Bi> = {
  plan: { en: 'PLAN', th: 'แปลน' },
  elevation: { en: 'FRONT ELEVATION', th: 'รูปด้านหน้า' },
  section: { en: 'SECTION A-A', th: 'รูปตัด A-A' },
  d1: { en: 'DETAIL', th: 'แบบขยาย' },
};

export const MM: Bi = { en: 'mm.', th: 'มม.' };
