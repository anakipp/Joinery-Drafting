import { useMemo, useState } from 'react';
import type { Project } from '../model/types';
import type { Updater } from '../state/store';
import { evaluate } from '../guide/rules';
import { RECIPES, STANDARDS } from '../guide/library';
import { useT } from '../i18n/ui';
import { FUNCTION_NAMES } from '../i18n/terms';

export function GuidePanel({ p, update, compact }: { p: Project; update: Updater; compact?: boolean }) {
  const { t, L } = useT();
  const items = useMemo(() => evaluate(p), [p]);
  const [open, setOpen] = useState<string | null>(null);
  const order = { warn: 0, tip: 1, ok: 2 } as const;
  const sorted = [...items].sort((a, b) => order[a.level] - order[b.level]);
  const lines = (s: string) => s.split('\n').map((l, i) => <div key={i}>{l}</div>);

  return (
    <div className="guide">
      <h4>{t('checks')}</h4>
      {sorted.length === 0 && <p className="muted small">{t('allGood')}</p>}
      <ul className="guide-list">
        {sorted.map((g) => (
          <li key={g.id} className={`gi ${g.level}`}>
            <div className="gi-head" onClick={() => setOpen(open === g.id ? null : g.id)}>
              <span className="gi-dot" aria-hidden>
                {g.level === 'warn' ? '!' : g.level === 'tip' ? 'i' : '✓'}
              </span>
              <span className="gi-title">{L(g.title)}</span>
              {g.fix && (
                <button
                  type="button"
                  className="btn tiny primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    update(g.fix!.apply);
                  }}
                >
                  {L(g.fix.label)}
                </button>
              )}
            </div>
            {(open === g.id || (!compact && g.level === 'warn')) && <div className="gi-body small">{lines(L(g.body))}</div>}
          </li>
        ))}
      </ul>
      {!compact && (
        <>
          <h4>{t('recipes')}</h4>
          <ul className="recipes">
            {RECIPES.map((r) => {
              const active = p.functions.includes(r.fn);
              return (
                <li key={r.fn} className={active ? 'active' : ''}>
                  <details>
                    <summary>
                      <span className="chip">{L(FUNCTION_NAMES[r.fn])}</span> {L(r.summary)}
                    </summary>
                    <ul className="small">
                      {r.points.map((pt, i) => (
                        <li key={i}>{L(pt)}</li>
                      ))}
                    </ul>
                    <div className="row gap">
                      {Object.keys(r.assign).length > 0 && (
                        <button
                          type="button"
                          className="btn tiny"
                          onClick={() =>
                            update((q) => ({
                              ...q,
                              functions: q.functions.includes(r.fn) ? q.functions : [...q.functions, r.fn],
                              assign: { ...q.assign, ...Object.fromEntries(Object.entries(r.assign).filter(([, id]) => q.materials.some((m) => m.id === id))) },
                            }))
                          }
                        >
                          {t('apply')}
                        </button>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          <h4>{t('standards')}</h4>
          <table className="std small">
            <tbody>
              {STANDARDS.map((s, i) => (
                <tr key={i}>
                  <td>{L(s.item)}</td>
                  <td className="num">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
