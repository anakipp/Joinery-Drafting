import type { FrontType, Project, Role } from '../model/types';
import { addCell, deleteBay, deleteCell, parseTag, updateBay, updateCell } from '../model/ops';
import { resolve, hingeCount, leaves } from '../model/layout';
import type { Updater } from '../state/store';
import { useT } from '../i18n/ui';
import { FRONT_NAMES, ROLE_NAMES } from '../i18n/terms';
import { Field, Num } from './ui';
import { RECIPES } from '../guide/library';

const FRONTS = Object.keys(FRONT_NAMES) as FrontType[];

export function MaterialSelect({ p, value, onChange, allowDefault }: { p: Project; value: string | null | undefined; onChange: (id: string | null) => void; allowDefault?: boolean }) {
  const { t, L } = useT();
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowDefault && <option value="">{t('defaultMat')}</option>}
      {p.materials.map((m) => (
        <option key={m.id} value={m.id}>
          {m.code} · {L(m.name)}
        </option>
      ))}
    </select>
  );
}

export function Inspector({ p, update, selected, onSelect }: { p: Project; update: Updater; selected: string | null; onSelect: (t: string | null) => void }) {
  const { t, L } = useT();
  const sel = parseTag(selected);
  if (!sel) return <p className="muted small">{t('inspectorHint')}</p>;

  if (sel.kind === 'role') {
    const role = sel.role as Role;
    if (!(role in p.assign)) return null;
    const tips = RECIPES.filter((r) => p.functions.includes(r.fn) && r.assign[role]);
    return (
      <div className="inspector">
        <h4>{L(ROLE_NAMES[role])}</h4>
        <Field label={t('material')}>
          <MaterialSelect p={p} value={p.assign[role]} onChange={(id) => id && update((q) => ({ ...q, assign: { ...q.assign, [role]: id } }))} />
        </Field>
        {tips.map((r) => (
          <p key={r.fn} className="tip small">
            💡 {L(r.summary)}
          </p>
        ))}
      </div>
    );
  }

  const r = resolve(p);
  const rb = r.bays.find((b) => b.bay.id === sel.bayId);
  const rc = rb?.cells.find((c) => c.cell.id === sel.cellId);
  if (!rb || !rc) return <p className="muted small">{t('inspectorHint')}</p>;
  const c = rc.cell;
  const b = rb.bay;
  const isPanel = p.type === 'wall_panel';
  const doorH = leaves(rb, rc, p.dims.gap).find((l) => l.kind !== 'drawer');
  const setCell = (patch: Parameters<typeof updateCell>[3], merge?: string) => update((q) => updateCell(q, b.id, c.id, patch), merge ? { merge } : undefined);

  return (
    <div className="inspector">
      <h4>
        {t('bay')} {rb.index + 1}
      </h4>
      <div className="grid2">
        <Field label={t('width')} hint={b.width == null ? `${t('auto')}: ${Math.round(rb.x1 - rb.x0)}` : undefined}>
          <Num value={b.width} allowNull nullLabel={t('auto')} min={100} max={5000} onChange={(v) => update((q) => updateBay(q, b.id, { width: v }))} />
        </Field>
        <div className="field">
          <span className="field-label">&nbsp;</span>
          <button
            type="button"
            className="btn small danger"
            disabled={p.bays.length <= 1}
            onClick={() => {
              update((q) => deleteBay(q, b.id));
              onSelect(null);
            }}
          >
            {t('deleteBay')}
          </button>
        </div>
      </div>
      <h4>
        {t('cell')} {rc.index + 1} <span className="muted small">({Math.round(rb.ix1 - rb.ix0)} × {Math.round(rc.iy1 - rc.iy0)} {isPanel ? '' : 'clear'})</span>
      </h4>
      <div className="grid2">
        <Field label={t('height')} hint={c.height == null ? `${t('auto')}: ${Math.round(rc.y1 - rc.y0)}` : undefined}>
          <Num value={c.height} allowNull nullLabel={t('auto')} min={50} max={3000} onChange={(v) => setCell({ height: v })} />
        </Field>
        {!isPanel && (
          <Field label={t('front')}>
            <select value={c.front} onChange={(e) => setCell({ front: e.target.value as FrontType, drawers: e.target.value === 'drawers' ? Math.max(1, c.drawers || 3) : c.drawers })}>
              {FRONTS.map((f) => (
                <option key={f} value={f}>
                  {L(FRONT_NAMES[f])}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!isPanel && (
          <Field label={t('shelves')}>
            <Num value={c.shelves} min={0} max={12} unit="" onChange={(v) => setCell({ shelves: v ?? 0 })} />
          </Field>
        )}
        {!isPanel && c.front === 'drawers' && (
          <Field label={t('drawers')}>
            <Num value={c.drawers} min={1} max={8} unit="" onChange={(v) => setCell({ drawers: v ?? 1 })} />
          </Field>
        )}
        {!isPanel && (
          <label className="check">
            <input type="checkbox" checked={c.rail} onChange={(e) => setCell({ rail: e.target.checked })} /> {t('rail')}
          </label>
        )}
        {!isPanel && c.front !== 'open' && (
          <Field label={t('frontMaterial')} wide>
            <MaterialSelect p={p} value={c.frontMaterialId} allowDefault onChange={(id) => setCell({ frontMaterialId: id })} />
          </Field>
        )}
      </div>
      {doorH && (
        <p className="muted small">
          {L({ en: 'Hinges per leaf', th: 'บานพับต่อบาน' })}: {hingeCount(doorH.y1 - doorH.y0)} · {Math.round(doorH.x1 - doorH.x0)} × {Math.round(doorH.y1 - doorH.y0)}
        </p>
      )}
      <div className="row gap">
        <button type="button" className="btn small" onClick={() => update((q) => addCell(q, b.id, c.id))}>
          {t('splitCell')} ⬍
        </button>
        <button
          type="button"
          className="btn small danger"
          disabled={b.cells.length <= 1}
          onClick={() => {
            update((q) => deleteCell(q, b.id, c.id));
            onSelect(null);
          }}
        >
          {t('deleteCell')}
        </button>
      </div>
    </div>
  );
}
