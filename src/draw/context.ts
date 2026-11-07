import type { Bi, Lang, Material, Project, Role, ViewId } from '../model/types';
import type { Resolved } from '../model/layout';
import { mat } from '../model/layout';
import type { Entity } from './entities';
import { L, Llines } from '../i18n/terms';

export interface Ctx {
  p: Project;
  r: Resolved;
  lang: Lang;
  /** Sheet scale denominator = model units per paper mm. */
  ps: number;
}

export interface ViewBlock {
  id: ViewId;
  title: Bi;
  /** Scale denominator printed under the view. */
  scale: number;
  /** Geometry magnification (details > 1). */
  s: number;
  ents: Entity[];
  /** Label printed in the title bubble. */
  bubble: string;
}

export function matOf(ctx: Ctx, role: Role): Material | undefined {
  return mat(ctx.p, role);
}

/** Leader text lines for a material: "M01 HMR board 20 mm." (+ Thai line in both mode). */
export function matLines(ctx: Ctx, m: Material | undefined, prefix?: Bi): string[] {
  if (!m) return prefix ? Llines(prefix, ctx.lang) : [];
  const pre = prefix ? L(prefix, ctx.lang === 'both' ? 'en' : ctx.lang) + ': ' : '';
  if (ctx.lang === 'both') {
    const out = [`${m.code} ${pre}${m.name.en}`];
    if (m.name.th) out.push(`${prefix ? prefix.th + ': ' : ''}${m.name.th}`);
    return out;
  }
  return [`${m.code} ${pre}${L(m.name, ctx.lang)}`];
}

export function T(ctx: Ctx, b: Bi): string {
  return L(b, ctx.lang);
}
