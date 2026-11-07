/**
 * Optional AI assist: send the user's reference images / sketches and brief to
 * Claude and get back drafting parameters that pre-fill the project.
 *
 * The API key is provided by the user and kept in their browser only.
 */
import type { Bi, Bay, FrontType, FunctionKey, HandleType, JoineryType, MountType, Project } from '../model/types';
import { applyPreset } from '../model/presets';
import { clamp, uid } from '../model/util';
import { FUNCTION_NAMES, FRONT_NAMES, TYPE_NAMES } from '../i18n/terms';

export const AI_MODEL = 'claude-opus-5-5';

const TYPES = Object.keys(TYPE_NAMES) as JoineryType[];
const FRONTS = Object.keys(FRONT_NAMES) as FrontType[];
const FUNCS = Object.keys(FUNCTION_NAMES) as FunctionKey[];
const MOUNTS: MountType[] = ['plinth', 'legs', 'wall_hung', 'floor'];
const HANDLES: HandleType[] = ['bar', 'knob', 'groove', 'push', 'recessed'];

const nullableInt = { anyOf: [{ type: 'integer' }, { type: 'null' }] };

export const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'width', 'height', 'depth', 'mount', 'mountHeight', 'plinthHeight', 'handle', 'hasCountertop', 'functions', 'bays', 'title', 'specs', 'assumptions'],
  properties: {
    type: { type: 'string', enum: TYPES },
    title: { type: 'string', description: 'Short project / item name' },
    width: { type: 'integer', description: 'Overall width in mm' },
    height: { type: 'integer', description: 'Overall height in mm (incl. plinth and countertop)' },
    depth: { type: 'integer', description: 'Overall depth in mm incl. doors' },
    mount: { type: 'string', enum: MOUNTS },
    mountHeight: { type: 'integer', description: 'Underside above floor for wall-hung units, else 0' },
    plinthHeight: { type: 'integer', description: 'Plinth/leg height in mm (0 if none)' },
    handle: { type: 'string', enum: HANDLES },
    hasCountertop: { type: 'boolean' },
    functions: { type: 'array', items: { type: 'string', enum: FUNCS } },
    bays: {
      type: 'array',
      description: 'Vertical columns from left to right',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['width', 'cells'],
        properties: {
          width: { ...nullableInt, description: 'Module width in mm or null to share remaining width' },
          cells: {
            type: 'array',
            description: 'Stacked compartments from BOTTOM to TOP',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['height', 'front', 'shelves', 'drawers', 'rail'],
              properties: {
                height: { ...nullableInt, description: 'Module height in mm or null to share remaining height' },
                front: { type: 'string', enum: FRONTS },
                shelves: { type: 'integer' },
                drawers: { type: 'integer' },
                rail: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    specs: {
      type: 'array',
      description: 'Material / specification notes read from the reference, bilingual',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['en', 'th'],
        properties: { en: { type: 'string' }, th: { type: 'string' } },
      },
    },
    assumptions: { type: 'string', description: 'What was assumed because it was not visible' },
  },
} as const;

export interface Extraction {
  type: JoineryType;
  title: string;
  width: number;
  height: number;
  depth: number;
  mount: MountType;
  mountHeight: number;
  plinthHeight: number;
  handle: HandleType;
  hasCountertop: boolean;
  functions: FunctionKey[];
  bays: { width: number | null; cells: { height: number | null; front: FrontType; shelves: number; drawers: number; rail: boolean }[] }[];
  specs: Bi[];
  assumptions: string;
}

const SYSTEM = `You are an interior-design joinery draftsperson in Thailand. From the reference images, hand sketches and brief, extract the parameters for a built-in joinery shop drawing.
Rules:
- All dimensions in millimetres. If a dimension is written on the sketch, use it. Otherwise estimate from standard Thai joinery practice (base 600 deep, wall cabinets 350 deep, wardrobes 600 deep, plinth 100, counter 850-900 high).
- Bays are vertical columns left to right; cells inside a bay are listed from the BOTTOM up. Use null width/height to share remaining space equally.
- Doors wider than 600 mm should be 'door_pair'. Use 'open' for open shelving, 'drawers' with a drawer count, 'flap_up'/'flap_down' for lift or drop flaps.
- Choose functions that drive material choice (e.g. wet_area for bathrooms, sink, wall_cladding for wall panelling with wood structure).
- specs: short material/finish notes you can read or infer (e.g. "HMR 20 mm. laminate white" / "ไม้ HMR 20 มม. ปิดลามิเนตสีขาว"). Provide English and Thai.
- assumptions: one or two sentences in English listing what you assumed.`;

export interface ExtractInput {
  apiKey: string;
  images: { dataUrl: string; name: string }[];
  brief: string;
  current?: Partial<Pick<Project, 'type'>> & { width?: number; height?: number; depth?: number };
}

function imageBlock(dataUrl: string) {
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.*)$/.exec(dataUrl);
  if (!m) return null;
  return { type: 'image' as const, source: { type: 'base64' as const, media_type: m[1] as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: m[2] } };
}

export async function extractFromReferences(input: ExtractInput): Promise<Extraction> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // The key belongs to the user and never leaves their browser except to the Anthropic API.
  const client = new Anthropic({ apiKey: input.apiKey, dangerouslyAllowBrowser: true });
  const images = input.images.map((i) => imageBlock(i.dataUrl)).filter((x): x is NonNullable<typeof x> => !!x);
  const text = [
    input.brief ? `Brief from the designer:\n${input.brief}` : 'No written brief.',
    input.current ? `Current draft (may be overridden): ${JSON.stringify(input.current)}` : '',
    images.length ? `${images.length} reference image(s)/sketch(es) attached.` : 'No images attached; work from the brief.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'high', format: { type: 'json_schema', schema: EXTRACT_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: 'user', content: [...images, { type: 'text', text }] }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The request was declined. Try a different image or brief.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The response was cut off. Try fewer images.');
  }
  const out = response.content.find((b) => b.type === 'text');
  if (!out || out.type !== 'text') throw new Error('No result returned.');
  return JSON.parse(out.text) as Extraction;
}

/** Apply an extraction to a project, clamping values to sane ranges. */
export function applyExtraction(p: Project, x: Extraction): Project {
  const type = TYPES.includes(x.type) ? x.type : p.type;
  let q = applyPreset({ ...p }, type);
  const bays: Bay[] = (x.bays ?? [])
    .filter((b) => b.cells?.length)
    .slice(0, 12)
    .map((b) => ({
      id: uid('b'),
      width: b.width == null ? null : clamp(b.width, 100, 5000),
      cells: b.cells.slice(0, 10).map((c) => ({
        id: uid('c'),
        height: c.height == null ? null : clamp(c.height, 50, 3000),
        front: FRONTS.includes(c.front) ? c.front : 'open',
        shelves: clamp(Math.round(c.shelves ?? 0), 0, 12),
        drawers: clamp(Math.round(c.drawers ?? 0), 0, 8),
        rail: !!c.rail,
        frontMaterialId: null,
      })),
    }));
  q = {
    ...q,
    info: { ...q.info, name: x.title || q.info.name },
    dims: {
      ...q.dims,
      width: clamp(x.width || q.dims.width, 200, 12000),
      height: clamp(x.height || q.dims.height, 100, 4000),
      depth: clamp(x.depth || q.dims.depth, 20, 1200),
      mountHeight: clamp(x.mountHeight || q.dims.mountHeight, 0, 2500),
      plinthHeight: clamp(x.plinthHeight ?? q.dims.plinthHeight, 0, 300),
    },
    mount: MOUNTS.includes(x.mount) ? x.mount : q.mount,
    handle: HANDLES.includes(x.handle) ? x.handle : q.handle,
    hasCountertop: !!x.hasCountertop,
    functions: (x.functions ?? []).filter((f) => FUNCS.includes(f)),
    bays: bays.length ? bays : q.bays,
    specs: [...p.specs, ...(x.specs ?? []).filter((s) => s.en || s.th).map((s) => ({ id: uid('s'), text: { en: s.en, th: s.th } }))],
    refs: p.refs,
    description: p.description,
    materials: p.materials,
    sheet: p.sheet,
  };
  return q;
}
