# Joinery Drafting · เขียนแบบงานบิวท์อิน

A browser app for interior designers. It drafts built-in joinery and guides the construction details. You enter the brief (images, sketches, dimensions, materials, functions) and the app produces a two-sheet shop drawing set: plan, elevation, section and construction details. You can review, edit and comment on the drawings, then export them to CAD (DXF).

แอปสำหรับนักออกแบบภายใน ใช้เขียนแบบงานเฟอร์นิเจอร์บิวท์อินพร้อมคู่มือรายละเอียดการก่อสร้าง ใส่ข้อมูลโจทย์ (รูปภาพ สเก็ตช์ ขนาด วัสดุ การใช้งาน) แล้วแอปจะสร้างชุดแบบ 2 แผ่น ได้แก่ แปลน รูปด้าน รูปตัด และแบบขยาย ตรวจทาน แก้ไข และแสดงความเห็นได้ แล้วส่งออกเป็นไฟล์ CAD (DXF)

**Live app / ใช้งานออนไลน์:** https://anakipp.github.io/Joinery-Drafting/

## Workflow

1. **Brief & input / ข้อมูลและโจทย์**
   - Pick a joinery type: low cabinet, wall cabinet, tall cabinet, wardrobe, TV console, vanity, kitchen counter, shelving or wall panelling.
   - Enter the dimensions, mounting (plinth / legs / wall-hung / floor), handle, countertop and front gap.
   - Tick the **functions** (dry storage, wet area, under sink, heavy load, hanging, wall cladding, uneven wall, TV/AV, cooking, LED…). Functions drive the material guide.
   - Upload reference images or draw a sketch on the built-in sketch pad, then write the brief.
   - Optional **AI assist**: Claude reads the references and brief and pre-fills the type, sizes, bays and spec notes. Each user supplies their own Anthropic API key, which is kept only in their browser.
   - Lay out bays (columns) and compartments (bottom → top) with fronts: doors, pairs, drawers, flaps, glass or open. Add shelves and hanging rails.
2. **Draft & review / แบบร่างและตรวจทาน**
   - Live drawing sheets with pan and zoom. Click any door, compartment or part to edit it in the Inspector.
   - **Comment tool**: click on any view to pin a comment. Comments can be resolved, and printed on the sheet if you choose.
   - **Guide** tab: design checks with one-click fixes, construction recipes by function, and standard dimensions.
   - **Materials** tab: assign a material to each part and edit the library (code, EN/TH name, finish, thickness, hatch, colour). A front can override its material.
   - **Specs** tab: your own bilingual spec notes, plus auto-generated general notes.
   - Sheet settings: paper size, scale (auto or fixed), drawing language (EN / ไทย / both), and which bay section A-A cuts through.
3. **Export / ส่งออก**
   - **DXF (R12)**: both sheets in one file. Units are mm and the main views are at 1:1 in model space. Named layers (`JD-CUT`, `JD-DIM`, `JD-HIDDEN`…), linetypes, and Thai text using `\U+` escapes with a Tahoma text style.
   - SVG per sheet, Print / PDF at true paper size, project JSON, and a cut list as CSV with a hardware count.

## Drafting guide examples (built in)

| Function | Construction recipe |
|---|---|
| Dry storage | Carcass **HMR 20 mm.** laminated, back **HMR 10 mm.** in 8 mm. groove, fronts HMR 20 mm. laminated both faces |
| Wall cladding / uneven wall | **Wood structure 1"×2"** rubberwood @ 400 c/c, covered with **HMR 10 mm.** laminate, 3–5 mm. shadow gaps |
| Wet area | PVC foam board 18 mm. carcass, PVC 2 mm. edges all round, no wood touching the floor |
| Under sink | Marine plywood 20 mm. / PVC base, aluminium tray, service cut-outs |
| Heavy load | HMR 25 mm. shelves, span ≤ 800 mm. |

The checks cover shelf span vs. thickness, single doors wider than 600 mm., door and carcass height vs. the 2440 mm. board length, hinge count per door height, drawer width and height, hanging depth and rail span, counter, vanity and wall-cabinet heights, wall-hung fixing, push-to-open vs. soft-close, anti-tip fixing, and frame spacing for cladding.

## Development

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` outputs a static site in `dist/` that can be hosted anywhere (GitHub Pages, Netlify, an internal server). Projects autosave to the browser's local storage. Use **Save / Open** to keep `.joinery.json` files.

### GitHub Pages

`.github/workflows/deploy-pages.yml` tests, builds and deploys the app on every push to `main`. It can also be run by hand from the Actions tab ("Run workflow").

One-time setup in the repository:
1. Under **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. Under **Settings → General → Default branch**, choose `main`. The `github-pages` environment only accepts deployments from the default branch.

The site is served at `https://<owner>.github.io/<repo>/`. Asset paths are relative (`base: './'`), so it works under that subpath without further configuration.

### Code map

- `src/model`: project types, presets, material library, layout resolution (bays and compartments to geometry).
- `src/draw`: drawing engine. One entity list feeds both the SVG preview and the DXF writer (`elevation`, `plan`, `section`, `details`, `wallpanel`, `sheet`).
- `src/guide`: construction recipes, standard dimensions and design-check rules.
- `src/export`: DXF R12 writer, SVG, cut list.
- `src/ai`: optional Claude extraction from references, using structured JSON output.
- `src/components`: React UI.
