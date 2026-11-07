import { useMemo, useState } from 'react';
import type { HatchPattern, Material, MaterialCategory, Project, Role } from '../model/types';
import { ROLES } from '../model/types';
import type { Updater } from '../state/store';
import { useT } from '../i18n/ui';
import { CATEGORY_NAMES, ROLE_NAMES, Llines } from '../i18n/terms';
import { MaterialSelect } from './Inspector';
import { Field, Num, Text } from './ui';
import { nextCode } from '../model/materials';
import { uid } from '../model/util';
import { usedRoles } from '../model/usage';
import { generalNotes } from '../guide/rules';
import { safeGet, safeSet } from '../state/store';

const CATS = Object.keys(CATEGORY_NAMES) as MaterialCategory[];
const HATCHES: HatchPattern[] = ['board', 'ply', 'timber', 'stone', 'glass', 'metal', 'none'];

export function MaterialsPanel({ p, update }: { p: Project; update: Updater }) {
  const { t, L } = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const used = usedRoles(p);
  const roles = showAll ? ROLES : ROLES.filter((r) => used.includes(r));
  const inUse = new Set<string>([...Object.values(p.assign), ...p.bays.flatMap((b) => b.cells.map((c) => c.frontMaterialId ?? ''))]);
  const setMat = (id: string, patch: Partial<Material>) => update((q) => ({ ...q, materials: q.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) }), { merge: `mat-${id}` });

  return (
    <div className="mats">
      <h4>{t('assignments')}</h4>
      <table className="assign">
        <tbody>
          {roles.map((role: Role) => (
            <tr key={role}>
              <td>{L(ROLE_NAMES[role])}</td>
              <td>
                <MaterialSelect p={p} value={p.assign[role]} onChange={(id) => id && update((q) => ({ ...q, assign: { ...q.assign, [role]: id } }))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label className="check small">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> {L({ en: 'Show all parts', th: 'แสดงทุกชิ้นส่วน' })}
      </label>

      <div className="row between">
        <h4>{t('library')}</h4>
        <button
          type="button"
          className="btn tiny primary"
          onClick={() => {
            const id = uid('m');
            update((q) => ({
              ...q,
              materials: [
                ...q.materials,
                { id, code: nextCode(q.materials, 'M'), name: { en: 'New material', th: 'วัสดุใหม่' }, category: 'board', thickness: 18, finish: { en: '', th: '' }, color: '#cccccc', hatch: 'board' },
              ],
            }));
            setOpen(id);
          }}
        >
          {t('addMaterial')}
        </button>
      </div>
      <ul className="mat-list">
        {p.materials.map((m) => (
          <li key={m.id} className={open === m.id ? 'open' : ''}>
            <div className="mat-head" onClick={() => setOpen(open === m.id ? null : m.id)}>
              <span className="swatch" style={{ background: m.color }} />
              <b>{m.code}</b>
              <span className="mat-name">{L(m.name)}</span>
              {inUse.has(m.id) && <span className="chip tiny">{t('inUse')}</span>}
            </div>
            {open === m.id && (
              <div className="mat-edit grid2">
                <Field label={t('code')}>
                  <Text value={m.code} onChange={(v) => setMat(m.id, { code: v })} />
                </Field>
                <Field label={t('category')}>
                  <select value={m.category} onChange={(e) => setMat(m.id, { category: e.target.value as MaterialCategory })}>
                    {CATS.map((c) => (
                      <option key={c} value={c}>
                        {L(CATEGORY_NAMES[c])}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('nameEn')} wide>
                  <Text value={m.name.en} onChange={(v) => setMat(m.id, { name: { ...m.name, en: v } })} />
                </Field>
                <Field label={t('nameTh')} wide>
                  <Text value={m.name.th} onChange={(v) => setMat(m.id, { name: { ...m.name, th: v } })} />
                </Field>
                <Field label={t('finishEn')} wide>
                  <Text value={m.finish.en} onChange={(v) => setMat(m.id, { finish: { ...m.finish, en: v } })} />
                </Field>
                <Field label={t('finishTh')} wide>
                  <Text value={m.finish.th} onChange={(v) => setMat(m.id, { finish: { ...m.finish, th: v } })} />
                </Field>
                <Field label={t('thickness')}>
                  <Num value={m.thickness} min={0} max={200} step={0.5} onChange={(v) => setMat(m.id, { thickness: v ?? 0 })} />
                </Field>
                {m.category === 'timber' && (
                  <Field label={t('sectionWidth')}>
                    <Num value={m.width ?? 50} min={10} max={300} onChange={(v) => setMat(m.id, { width: v ?? 50 })} />
                  </Field>
                )}
                <Field label={t('hatch')}>
                  <select value={m.hatch} onChange={(e) => setMat(m.id, { hatch: e.target.value as HatchPattern })}>
                    {HATCHES.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('color')}>
                  <input type="color" value={m.color} onChange={(e) => setMat(m.id, { color: e.target.value })} />
                </Field>
                <div className="field wide">
                  <button
                    type="button"
                    className="btn tiny danger"
                    disabled={inUse.has(m.id)}
                    title={inUse.has(m.id) ? t('inUse') : undefined}
                    onClick={() => update((q) => ({ ...q, materials: q.materials.filter((x) => x.id !== m.id) }))}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpecsPanel({ p, update }: { p: Project; update: Updater }) {
  const { t, lang } = useT();
  const auto = useMemo(() => generalNotes(p), [p]);
  return (
    <div className="specs">
      <div className="row between">
        <h4>{t('specList')}</h4>
        <button type="button" className="btn tiny primary" onClick={() => update((q) => ({ ...q, specs: [...q.specs, { id: uid('s'), text: { en: '', th: '' } }] }))}>
          {t('addSpec')}
        </button>
      </div>
      <ol className="spec-list">
        {p.specs.map((s) => (
          <li key={s.id}>
            <Text multiline rows={2} value={s.text.en} placeholder="English" onChange={(v) => update((q) => ({ ...q, specs: q.specs.map((x) => (x.id === s.id ? { ...x, text: { ...x.text, en: v } } : x)) }), { merge: `spec-en-${s.id}` })} />
            <Text multiline rows={2} value={s.text.th} placeholder="ภาษาไทย" onChange={(v) => update((q) => ({ ...q, specs: q.specs.map((x) => (x.id === s.id ? { ...x, text: { ...x.text, th: v } } : x)) }), { merge: `spec-th-${s.id}` })} />
            <button type="button" className="btn tiny danger" onClick={() => update((q) => ({ ...q, specs: q.specs.filter((x) => x.id !== s.id) }))}>
              {t('delete')}
            </button>
          </li>
        ))}
      </ol>
      <label className="check small">
        <input type="checkbox" checked={p.sheet.autoNotes} onChange={(e) => update((q) => ({ ...q, sheet: { ...q.sheet, autoNotes: e.target.checked } }))} /> {t('autoNotes')}
      </label>
      {p.sheet.autoNotes && (
        <>
          <h4>{t('autoNotesPreview')}</h4>
          <ol className="auto-notes small">
            {auto.map((n, i) => (
              <li key={i}>
                {Llines(n, lang).map((l, k) => (
                  <div key={k} className={k ? 'muted' : ''}>
                    {l}
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

const VIEW_LABEL: Record<string, string> = { plan: 'Plan', elevation: 'Elevation', section: 'Section A-A', d1: 'D1', d2: 'D2', d3: 'D3', d4: 'D4' };

export function CommentsPanel({ p, update, active, setActive }: { p: Project; update: Updater; active: string | null; setActive: (id: string | null) => void }) {
  const { t } = useT();
  const [author, setAuthor] = useState(() => safeGet('joinery-drafting:author') ?? '');
  return (
    <div className="comments">
      <Field label={t('author')}>
        <Text
          value={author}
          onChange={(v) => {
            setAuthor(v);
            safeSet('joinery-drafting:author', v);
            update((q) => ({ ...q, comments: q.comments.map((c) => (c.author ? c : { ...c, author: v })) }), { merge: 'author' });
          }}
        />
      </Field>
      {p.comments.length === 0 && <p className="muted small">{t('noComments')}</p>}
      <ol className="comment-list">
        {p.comments.map((c, i) => (
          <li key={c.id} className={`${c.id === active ? 'active' : ''} ${c.resolved ? 'resolved' : ''}`} onClick={() => setActive(c.id)}>
            <div className="row between small">
              <span>
                <b className="pin-n">{i + 1}</b> {VIEW_LABEL[c.viewId]} · {c.author || '—'}
              </span>
              <span className="row gap">
                <label className="check tiny">
                  <input type="checkbox" checked={c.resolved} onChange={(e) => update((q) => ({ ...q, comments: q.comments.map((x) => (x.id === c.id ? { ...x, resolved: e.target.checked } : x)) }))} /> {t('resolved')}
                </label>
                <button type="button" className="btn tiny danger" onClick={() => update((q) => ({ ...q, comments: q.comments.filter((x) => x.id !== c.id) }))}>
                  ×
                </button>
              </span>
            </div>
            <textarea
              rows={2}
              value={c.text}
              autoFocus={c.id === active && !c.text}
              placeholder={t('commentPlaceholder')}
              onChange={(e) => update((q) => ({ ...q, comments: q.comments.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)) }), { merge: `c-${c.id}` })}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function currentAuthor() {
  return safeGet('joinery-drafting:author') ?? '';
}
