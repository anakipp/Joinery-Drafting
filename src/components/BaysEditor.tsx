import type { Project } from '../model/types';
import { resolve } from '../model/layout';
import { addBay, parseTag } from '../model/ops';
import type { Updater } from '../state/store';
import { useT } from '../i18n/ui';
import { FRONT_NAMES } from '../i18n/terms';

const FRONT_ICON: Record<string, string> = {
  open: '▭',
  door_left: '◁',
  door_right: '▷',
  door_pair: '◁▷',
  drawers: '☰',
  flap_up: '△',
  flap_down: '▽',
  glass_door: '◇',
};

export function BaysEditor({ p, update, selected, onSelect }: { p: Project; update: Updater; selected: string | null; onSelect: (t: string | null) => void }) {
  const { t, L } = useT();
  const r = resolve(p);
  const sel = parseTag(selected);
  const isPanel = p.type === 'wall_panel';
  return (
    <div className="bays">
      <div className="bays-row" style={{ aspectRatio: `${Math.max(0.6, Math.min(4, r.W / Math.max(1, r.carcassH)))}` }}>
        {r.bays.map((rb) => (
          <div key={rb.bay.id} className="bay-col" style={{ flexGrow: rb.x1 - rb.x0 }}>
            <div className="bay-cells">
              {[...rb.cells].reverse().map((rc) => {
                const tag = `cell:${rb.bay.id}:${rc.cell.id}`;
                const on = sel?.kind === 'cell' && sel.cellId === rc.cell.id;
                const c = rc.cell;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`bay-cell ${on ? 'on' : ''} front-${c.front}`}
                    style={{ flexGrow: rc.y1 - rc.y0 }}
                    onClick={() => onSelect(on ? null : tag)}
                    title={L(FRONT_NAMES[c.front])}
                  >
                    {!isPanel && <span className="ic">{FRONT_ICON[c.front]}</span>}
                    {!isPanel && c.front === 'drawers' && <span className="badge">×{c.drawers}</span>}
                    {!isPanel && c.shelves > 0 && <span className="badge">≡{c.shelves}</span>}
                    {!isPanel && c.rail && <span className="badge">∩</span>}
                    <span className="dim">{Math.round(rc.y1 - rc.y0)}</span>
                  </button>
                );
              })}
            </div>
            <div className="bay-w">{Math.round(rb.x1 - rb.x0)}</div>
          </div>
        ))}
      </div>
      <div className="bays-actions">
        <span className="muted small">{t(isPanel ? 'panelLayout' : 'layoutHint')}</span>
        <button type="button" className="btn small" onClick={() => update((q) => addBay(q, sel?.kind === 'cell' ? sel.bayId : undefined))}>
          {t('addBay')}
        </button>
      </div>
    </div>
  );
}
