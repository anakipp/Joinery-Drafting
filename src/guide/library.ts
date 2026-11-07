import type { Bi, FunctionKey, Role } from '../model/types';

/** A construction recipe: which material goes to which role for a function. */
export interface Recipe {
  fn: FunctionKey;
  assign: Partial<Record<Role, string>>;
  summary: Bi;
  points: Bi[];
}

export const RECIPES: Recipe[] = [
  {
    fn: 'storage',
    assign: { carcass: 'hmr20-lam', back: 'hmr10-mel', shelf: 'hmr20-lam', front: 'hmr20-door' },
    summary: { en: 'Dry-area storage: HMR 20 mm. carcass, HMR 10 mm. back', th: 'ตู้เก็บของพื้นที่แห้ง: โครงตู้ HMR 20 มม. แผ่นหลัง HMR 10 มม.' },
    points: [
      { en: 'Carcass, fixed panels and shelves: HMR 20 mm. laminated both sides.', th: 'โครงตู้ แผ่นกั้น และชั้น: HMR 20 มม. ปิดผิวลามิเนตทั้งสองด้าน' },
      { en: 'Back panel HMR 10 mm. set into 8 mm. groove.', th: 'แผ่นหลัง HMR 10 มม. เข้าร่องลึก 8 มม.' },
      { en: 'Fronts HMR 20 mm., laminate on both faces to prevent warping.', th: 'หน้าบาน HMR 20 มม. ปิดลามิเนตทั้งสองหน้าเพื่อกันบิด' },
    ],
  },
  {
    fn: 'wet_area',
    assign: { carcass: 'pvc18', plinth: 'pvc18', back: 'hmr10-mel' },
    summary: { en: 'Wet area: PVC foam board 18 mm. carcass, no wood touching floor', th: 'พื้นที่เปียก: โครงตู้ PVC โฟมบอร์ด 18 มม. ห้ามไม้สัมผัสพื้น' },
    points: [
      { en: 'Carcass PVC foam board 18 mm. (or HMR 20 mm. with all edges sealed).', th: 'โครงตู้ PVC โฟมบอร์ด 18 มม. (หรือ HMR 20 มม. ซีลขอบทุกด้าน)' },
      { en: 'Edge band PVC 2 mm. on ALL edges, including concealed ones.', th: 'ปิดขอบ PVC 2 มม. ทุกขอบ รวมถึงขอบที่ซ่อนอยู่' },
      { en: 'Keep 5 mm. gap to floor with silicone seal, or wall-hang the unit.', th: 'เว้นระยะจากพื้น 5 มม. ยาแนวซิลิโคน หรือติดตั้งแบบแขวนผนัง' },
      { en: 'Stainless steel hinges and handles.', th: 'บานพับและมือจับสแตนเลส' },
    ],
  },
  {
    fn: 'sink',
    assign: { carcass: 'ply20-marine', plinth: 'pvc18' },
    summary: { en: 'Under sink: marine plywood 20 mm. or PVC board base', th: 'ใต้ซิงก์: ไม้อัดกันน้ำ 20 มม. หรือฐาน PVC' },
    points: [
      { en: 'Bottom and sides marine plywood 20 mm. with sealed edges, or PVC board 18 mm.', th: 'พื้นและข้างตู้ไม้อัดกันน้ำ 20 มม. ซีลขอบ หรือแผ่น PVC 18 มม.' },
      { en: 'Aluminium tray / mat on cabinet bottom.', th: 'ปูถาดหรือแผ่นรองอะลูมิเนียมที่พื้นตู้' },
      { en: 'Back panel cut-outs for water supply & drain, sealed.', th: 'เจาะแผ่นหลังสำหรับท่อน้ำดีและท่อน้ำทิ้ง ซีลขอบรู' },
      { en: 'No fixed shelf in sink bay; open-back for plumbing access.', th: 'ช่องซิงก์ไม่มีชั้นตายตัว เปิดหลังเพื่อซ่อมบำรุงท่อ' },
    ],
  },
  {
    fn: 'wall_cladding',
    assign: { frame: 'rubberwood-1x2', cladding: 'hmr10-lam' },
    summary: { en: 'Wall cladding: wood structure 1"x2" @ 400 + HMR 10 mm. cover', th: 'บุผนัง: โครงคร่าวไม้ 1"x2" @ 400 + แผ่นปิด HMR 10 มม.' },
    points: [
      { en: 'Rubberwood 1"x2" (25x50 mm.) kiln-dried & termite treated, grid @ 400 mm. both ways.', th: 'โครงคร่าวไม้ยางพารา 1"x2" (25x50 มม.) อบแห้งอัดน้ำยา ตาราง @ 400 มม. ทั้งสองทิศทาง' },
      { en: 'Battens at every panel joint; fix to wall with screw + plug @ 600 mm.', th: 'มีโครงคร่าวทุกแนวรอยต่อแผ่น ยึดผนังด้วยสกรู + พุก @ 600 มม.' },
      { en: 'Cover HMR 10 mm. laminated, glued (PU) and brad-nailed to frame.', th: 'ปิดผิวด้วย HMR 10 มม. ปิดลามิเนต ทากาว PU และยิงตะปูเข้าโครง' },
      { en: 'Shadow gap joints 3-5 mm., inside painted black.', th: 'รอยต่อร่องเงา 3-5 มม. ทาสีดำด้านใน' },
    ],
  },
  {
    fn: 'uneven_wall',
    assign: { frame: 'rubberwood-1x2', cladding: 'hmr10-lam' },
    summary: { en: 'Uneven wall: pack out with wood structure + HMR 10 mm. cover', th: 'ผนังไม่ได้ระดับ: ตั้งโครงคร่าวไม้ + ปิดผิว HMR 10 มม.' },
    points: [
      { en: 'Shim battens to a true plane (±2 mm./2 m.) before fixing cabinets or cladding.', th: 'ปรับระดับโครงคร่าวด้วยลิ่มให้ได้ระนาบ (±2 มม./2 ม.) ก่อนติดตั้งตู้หรือแผ่นบุ' },
      { en: 'Scribe fillers 20-50 mm. at wall/ceiling junctions.', th: 'แผ่นปิดช่องว่าง (filler) 20-50 มม. ที่ชนผนัง/ฝ้า' },
      { en: 'Exposed cabinet sides: cover with wood structure + HMR 10 mm. panel.', th: 'ข้างตู้ที่มองเห็น: ทำโครงคร่าวไม้ + ปิดแผ่น HMR 10 มม.' },
    ],
  },
  {
    fn: 'heavy_load',
    assign: { shelf: 'hmr25' },
    summary: { en: 'Heavy load: HMR 25 mm. shelves, span ≤ 800 mm.', th: 'รับน้ำหนักมาก: ชั้น HMR 25 มม. ช่วงพาด ≤ 800 มม.' },
    points: [
      { en: 'Shelves HMR 25 mm. or HMR 20 mm. with solid-wood / aluminium front stiffener.', th: 'ชั้น HMR 25 มม. หรือ HMR 20 มม. เสริมขอบหน้าไม้จริง / อะลูมิเนียม' },
      { en: 'Maximum shelf span 800 mm. (books); otherwise add a vertical divider.', th: 'ช่วงพาดชั้นไม่เกิน 800 มม. (หนังสือ) มิฉะนั้นเพิ่มแผ่นกั้นตั้ง' },
      { en: 'Use fixed shelves (cam-lock) every second level for rigidity.', th: 'ใช้ชั้นตายตัว (ยึดน็อตล็อก) เว้นชั้นเพื่อความแข็งแรง' },
    ],
  },
  {
    fn: 'hanging',
    assign: { rail: 'rail-alu' },
    summary: { en: 'Hanging: clear depth ≥ 550 mm., rail 50-60 mm. below top', th: 'แขวนผ้า: ความลึกภายใน ≥ 550 มม. ราวต่ำจากเพดานตู้ 50-60 มม.' },
    points: [
      { en: 'Long hanging ≥ 1500 mm. clear; short hanging ≥ 950 mm.', th: 'แขวนยาว ≥ 1500 มม. แขวนสั้น ≥ 950 มม.' },
      { en: 'Rail span > 1000 mm. needs a centre support.', th: 'ราวยาวเกิน 1000 มม. ต้องมีตัวรับกลาง' },
    ],
  },
  {
    fn: 'tv_media',
    assign: { back: 'hmr10-mel' },
    summary: { en: 'TV / AV: cable management & ventilation', th: 'ทีวี / เครื่องเสียง: จัดการสายไฟและระบายอากาศ' },
    points: [
      { en: 'Cable grommets Ø60 mm. in back panel and top; trunking behind TV.', th: 'รูร้อยสาย Ø60 มม. ที่แผ่นหลังและท็อป ท่อร้อยสายหลังทีวี' },
      { en: 'Ventilation slots / open back behind AV equipment.', th: 'ช่องระบายอากาศ / เปิดหลังตู้บริเวณเครื่องเสียง' },
      { en: 'Wall-hung console > 1500 mm.: hidden steel brackets @ 600 mm.', th: 'ตู้แขวนยาวเกิน 1500 มม.: ใช้ขาเหล็กซ่อน @ 600 มม.' },
    ],
  },
  {
    fn: 'cooking',
    assign: { countertop: 'quartz20' },
    summary: { en: 'Cooking zone: stone top, heat shielding', th: 'โซนทำอาหาร: ท็อปหิน กันความร้อน' },
    points: [
      { en: 'Quartz/granite top 20 mm. on HMR sub-top; hob cut-out with aluminium heat tape.', th: 'ท็อปหินควอทซ์/แกรนิต 20 มม. บนแผ่นรอง HMR เจาะช่องเตาพร้อมเทปอะลูมิเนียมกันความร้อน' },
      { en: 'Keep 650-750 mm. clear above hob to hood.', th: 'ระยะเหนือเตาถึงเครื่องดูดควัน 650-750 มม.' },
      { en: 'Use heat-resistant HPL near oven and hob.', th: 'ใช้ลามิเนต HPL ทนความร้อนบริเวณเตาอบและเตา' },
    ],
  },
  {
    fn: 'display',
    assign: {},
    summary: { en: 'Display: open shelves, consider glass doors & lighting', th: 'โชว์: ชั้นเปิด พิจารณาบานกระจกและไฟส่องสว่าง' },
    points: [
      { en: 'Shelf spacing 300-350 mm. for books, 250-400 mm. for display.', th: 'ระยะชั้น 300-350 มม. สำหรับหนังสือ 250-400 มม. สำหรับโชว์' },
      { en: 'Exposed shelf edges PVC 2 mm. matching laminate.', th: 'ขอบชั้นที่มองเห็นปิด PVC 2 มม. สีเดียวกับลามิเนต' },
    ],
  },
  {
    fn: 'concealed',
    assign: {},
    summary: { en: 'Handleless: push-latch or J-groove', th: 'ไร้มือจับ: ระบบกดเปิดหรือเซาะร่อง' },
    points: [
      { en: 'Push-to-open: use push-latch hinges or Tip-on slides (not soft-close slides).', th: 'ระบบกดเปิด: ใช้บานพับ push หรือรางลิ้นชัก Tip-on (ไม่ใช่ soft-close)' },
      { en: 'Gap between fronts 3 mm., tolerance ±0.5 mm.', th: 'ร่องระหว่างหน้าบาน 3 มม. ค่าคลาดเคลื่อน ±0.5 มม.' },
    ],
  },
  {
    fn: 'lighting',
    assign: {},
    summary: { en: 'LED lighting: recessed aluminium profile', th: 'ไฟ LED: รางอะลูมิเนียมฝังในชั้น' },
    points: [
      { en: 'Groove 8x12 mm. under shelf front for LED profile, 20 mm. from edge.', th: 'เซาะร่อง 8x12 มม. ใต้ชั้นสำหรับรางไฟ LED ห่างขอบ 20 มม.' },
      { en: 'Driver in accessible compartment; cable route Ø10 mm. through panels.', th: 'ติดตั้งไดรเวอร์ในช่องที่เข้าถึงได้ เจาะรูร้อยสาย Ø10 มม.' },
    ],
  },
  {
    fn: 'kids_safety',
    assign: {},
    summary: { en: 'Child safety: anti-tip, soft-close, radius edges', th: 'ความปลอดภัยเด็ก: กันล้ม ปิดนุ่มนวล ลบมุม' },
    points: [
      { en: 'Anchor tall units to wall (anti-tip bracket).', th: 'ยึดตู้สูงเข้าผนัง (อุปกรณ์กันตู้ล้ม)' },
      { en: 'Soft-close hinges & slides; radius exposed corners R3.', th: 'บานพับและรางแบบปิดนุ่มนวล ลบมุมที่สัมผัส R3' },
    ],
  },
];

/** Standard ergonomic dimensions used for drafting. */
export const STANDARDS: { item: Bi; value: string }[] = [
  { item: { en: 'Kitchen counter height (FFL to top)', th: 'ความสูงเคาน์เตอร์ครัว (ถึงท็อป)' }, value: '850 – 920' },
  { item: { en: 'Kitchen base depth (excl. top overhang)', th: 'ความลึกตู้ล่างครัว' }, value: '560 – 600' },
  { item: { en: 'Wall cabinet underside above counter', th: 'ระยะใต้ตู้แขวนเหนือเคาน์เตอร์' }, value: '600 – 700' },
  { item: { en: 'Wall cabinet depth', th: 'ความลึกตู้แขวน' }, value: '300 – 350' },
  { item: { en: 'Wardrobe depth', th: 'ความลึกตู้เสื้อผ้า' }, value: '580 – 650' },
  { item: { en: 'Hanging rail – long / short clear height', th: 'ราวแขวน – แขวนยาว / สั้น' }, value: '≥1500 / ≥950' },
  { item: { en: 'Vanity top height', th: 'ความสูงท็อปอ่างล้างหน้า' }, value: '800 – 850' },
  { item: { en: 'TV console height', th: 'ความสูงตู้วางทีวี' }, value: '400 – 550' },
  { item: { en: 'Book shelf spacing', th: 'ระยะชั้นหนังสือ' }, value: '300 – 350' },
  { item: { en: 'Max. shelf span (HMR 20 / 25)', th: 'ช่วงพาดชั้นสูงสุด (HMR 20 / 25)' }, value: '900 / 1100' },
  { item: { en: 'Max. single door width', th: 'ความกว้างบานเปิดเดี่ยวสูงสุด' }, value: '600' },
  { item: { en: 'Plinth height / recess', th: 'ความสูงฐาน / ระยะร่นฐาน' }, value: '100 / 50' },
  { item: { en: 'Gap between fronts', th: 'ร่องระหว่างหน้าบาน' }, value: '2 – 3' },
  { item: { en: 'Wood structure spacing (cladding)', th: 'ระยะโครงคร่าว (บุผนัง)' }, value: '@ 300 – 400' },
  { item: { en: 'Standard board size', th: 'ขนาดแผ่นมาตรฐาน' }, value: '1220 x 2440' },
];
