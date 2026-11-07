import { useMemo, useState } from 'react';
import type { Lang, PaperSize, Project } from '../model/types';
import type { Updater } from '../state/store';
import { useT } from '../i18n/ui';
import { generateSheets, sheetOfView, SCALES } from '../draw/sheet';
import { DrawingCanvas, type Tool } from './DrawingCanvas';
import { Inspector } from './Inspector';
import { BaysEditor } from './BaysEditor';
import { GuidePanel } from './GuidePanel';
import { CommentsPanel, MaterialsPanel, SpecsPanel, currentAuthor } from './Panels';
import { Card, Field, Seg } from './ui';
import { uid } from '../model/util';
import { evaluate } from '../guide/rules';
import { LAYERS, type Layer } from '../draw/entities';

type Tab = 'guide' | 'materials' | 'specs' | 'comments';

const LAYER_GROUPS: { key: string; layers: Layer[]; label: { en: string; th: string } }[] = [
  { key: 'dim', layers: ['DIM'], label: { en: 'Dimensions', th: 'เส้นบอกขนาด' } },
  { key: 'tag', layers: ['TAG'], label: { en: 'Material tags', th: 'ป้ายวัสดุ' } },
  { key: 'hatch', layers: ['HATCH', 'FILL'], label: { en: 'Hatch & fill', th: 'ลายตัดและสี' } },
  { key: 'hidden', layers: ['HIDDEN', 'SYMBOL', 'CENTER'], label: { en: 'Hidden & symbols', th: 'เส้นซ่อนและสัญลักษณ์' } },
];

export function ReviewStage({ p, update, selected, onSelect }: { p: Project; update: Updater; selected: string | null; onSelect: (t: string | null) => void }) {
  const { t, L } = useT();
  const sheets = useMemo(() => generateSheets(p), [p]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [tab, setTab] = useState<Tab>('guide');
  const [active, setActive] = useState<string | null>(null);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const hidden = useMemo(() => new Set(LAYER_GROUPS.filter((g) => hiddenGroups.has(g.key)).flatMap((g) => g.layers.map((l) => l as string))), [hiddenGroups]);
  const sheet = sheets[Math.min(sheetIdx, sheets.length - 1)];
  const warnings = useMemo(() => evaluate(p).filter((g) => g.level === 'warn').length, [p]);
  const sheetComments = p.comments.filter((c) => sheet.views.some((v) => v.id === c.viewId));

  return (
    <div className="stage review-stage">
      <aside className="side left">
        <Card title={t('inspector')}>
          <Inspector p={p} update={update} selected={selected} onSelect={onSelect} />
        </Card>
        <Card title={t(p.type === 'wall_panel' ? 'panelLayout' : 'layout')}>
          <BaysEditor p={p} update={update} selected={selected} onSelect={onSelect} />
        </Card>
        <Card title={t('sheetSettings')}>
          <div className="grid2">
            <Field label={t('paper')}>
              <select value={p.sheet.paper} onChange={(e) => update((q) => ({ ...q, sheet: { ...q.sheet, paper: e.target.value as PaperSize } }))}>
                {(['A3', 'A2', 'A1'] as PaperSize[]).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label={t('scale')} hint={p.sheet.scale === 'auto' ? `1:${sheets[0].scale}` : undefined}>
              <select value={String(p.sheet.scale)} onChange={(e) => update((q) => ({ ...q, sheet: { ...q.sheet, scale: e.target.value === 'auto' ? 'auto' : Number(e.target.value) } }))}>
                <option value="auto">{t('auto')}</option>
                {SCALES.map((s) => (
                  <option key={s} value={s}>
                    1:{s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('drawingLang')} wide>
              <Seg<Lang>
                small
                value={p.sheet.drawingLang}
                onChange={(v) => update((q) => ({ ...q, sheet: { ...q.sheet, drawingLang: v } }))}
                options={[
                  { value: 'en', label: 'EN' },
                  { value: 'th', label: 'ไทย' },
                  { value: 'both', label: 'EN + ไทย' },
                ]}
              />
            </Field>
            <Field label={t('sectionBay')}>
              <select value={p.sectionBay} onChange={(e) => update((q) => ({ ...q, sectionBay: Number(e.target.value) }))}>
                {p.bays.map((b, i) => (
                  <option key={b.id} value={i}>
                    {t('bay')} {i + 1}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check small">
              <input type="checkbox" checked={p.sheet.showComments} onChange={(e) => update((q) => ({ ...q, sheet: { ...q.sheet, showComments: e.target.checked } }))} /> {t('showComments')}
            </label>
          </div>
        </Card>
      </aside>

      <main className="center">
        <div className="toolbar">
          <Seg<string>
            value={String(sheetIdx)}
            onChange={(v) => setSheetIdx(Number(v))}
            options={[
              { value: '0', label: t('sheet1') },
              { value: '1', label: t('sheet2') },
            ]}
          />
          <span className="spacer" />
          <Seg<Tool>
            value={tool}
            onChange={setTool}
            options={[
              { value: 'select', label: `⬚ ${t('select')}` },
              { value: 'comment', label: `✎ ${t('comment')}` },
            ]}
          />
          <details className="layers-menu">
            <summary className="btn small">{t('layers')}</summary>
            <div className="menu">
              {LAYER_GROUPS.map((g) => (
                <label key={g.key} className="check small">
                  <input
                    type="checkbox"
                    checked={!hiddenGroups.has(g.key)}
                    onChange={(e) =>
                      setHiddenGroups((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.delete(g.key);
                        else n.add(g.key);
                        return n;
                      })
                    }
                  />
                  <span className="swatch line" style={{ background: LAYERS[g.layers[0]].color }} /> {L(g.label)}
                </label>
              ))}
            </div>
          </details>
        </div>
        <DrawingCanvas
          sheet={sheet}
          hiddenLayers={hidden}
          selected={selected}
          onSelect={(tag) => onSelect(tag)}
          tool={tool}
          comments={sheetComments.map((c) => c)}
          activeComment={active}
          onPickComment={(id) => {
            setActive(id);
            setTab('comments');
          }}
          onComment={(at) => {
            const id = uid('cm');
            update((q) => ({
              ...q,
              comments: [...q.comments, { id, viewId: at.viewId, x: at.x, y: at.y, text: '', author: currentAuthor(), createdAt: new Date().toISOString(), resolved: false }],
            }));
            setActive(id);
            setTab('comments');
          }}
        />
        <div className="statusbar small muted">
          {sheet.paper} · 1:{sheet.scale} · {sheet.views.map((v) => v.id.toUpperCase()).join(' · ')}
          {tool === 'comment' && <b className="hint"> — {L({ en: 'Click on a view to drop a comment', th: 'คลิกบนแบบเพื่อวางความเห็น' })}</b>}
        </div>
      </main>

      <aside className="side right">
        <div className="tabs">
          {(['guide', 'materials', 'specs', 'comments'] as Tab[]).map((k) => (
            <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {t(k)}
              {k === 'guide' && warnings > 0 && <span className="count warn">{warnings}</span>}
              {k === 'comments' && p.comments.length > 0 && <span className="count">{p.comments.filter((c) => !c.resolved).length}</span>}
            </button>
          ))}
        </div>
        <div className="tab-body">
          {tab === 'guide' && <GuidePanel p={p} update={update} />}
          {tab === 'materials' && <MaterialsPanel p={p} update={update} />}
          {tab === 'specs' && <SpecsPanel p={p} update={update} />}
          {tab === 'comments' && (
            <CommentsPanel
              p={p}
              update={update}
              active={active}
              setActive={(id) => {
                setActive(id);
                const c = p.comments.find((x) => x.id === id);
                const sh = c && sheetOfView(sheets, c.viewId);
                if (sh) setSheetIdx(sh.index);
              }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
