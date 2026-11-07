import { useMemo, useState } from 'react';
import type { FunctionKey, HandleType, JoineryType, MountType, Project } from '../model/types';
import type { Updater } from '../state/store';
import { safeGet, safeSet } from '../state/store';
import { useT } from '../i18n/ui';
import { FUNCTION_NAMES, HANDLE_NAMES, MOUNT_NAMES, TYPE_NAMES } from '../i18n/terms';
import { applyPreset, TYPE_ORDER } from '../model/presets';
import { Card, Field, Num, Text } from './ui';
import { References } from './References';
import { BaysEditor } from './BaysEditor';
import { Inspector } from './Inspector';
import { GuidePanel } from './GuidePanel';
import { DrawingCanvas } from './DrawingCanvas';
import { generateSheets } from '../draw/sheet';
import { applyExtraction, extractFromReferences } from '../ai/extract';

const ICONS: Record<JoineryType, JSX.Element> = {
  base_cabinet: (
    <>
      <rect x="6" y="20" width="36" height="20" />
      <line x1="24" y1="20" x2="24" y2="40" />
      <line x1="6" y1="42" x2="42" y2="42" />
    </>
  ),
  wall_cabinet: (
    <>
      <rect x="6" y="8" width="36" height="16" />
      <line x1="24" y1="8" x2="24" y2="24" />
      <line x1="6" y1="42" x2="42" y2="42" strokeDasharray="2 2" />
    </>
  ),
  tall_cabinet: (
    <>
      <rect x="14" y="4" width="20" height="38" />
      <line x1="24" y1="4" x2="24" y2="42" />
      <line x1="14" y1="12" x2="34" y2="12" />
    </>
  ),
  wardrobe: (
    <>
      <rect x="4" y="4" width="40" height="38" />
      <line x1="17" y1="4" x2="17" y2="42" />
      <line x1="31" y1="4" x2="31" y2="42" />
      <line x1="4" y1="11" x2="44" y2="11" />
    </>
  ),
  tv_console: (
    <>
      <rect x="12" y="6" width="24" height="15" />
      <rect x="4" y="30" width="40" height="9" />
      <line x1="17" y1="30" x2="17" y2="39" />
      <line x1="31" y1="30" x2="31" y2="39" />
    </>
  ),
  vanity: (
    <>
      <rect x="10" y="22" width="28" height="4" />
      <rect x="12" y="26" width="24" height="12" />
      <path d="M18 22 v-6 h8" />
    </>
  ),
  kitchen_counter: (
    <>
      <rect x="4" y="20" width="40" height="3" />
      <rect x="4" y="23" width="40" height="17" />
      <line x1="18" y1="23" x2="18" y2="40" />
      <line x1="30" y1="23" x2="30" y2="40" />
      <line x1="30" y1="29" x2="44" y2="29" />
      <line x1="30" y1="35" x2="44" y2="35" />
    </>
  ),
  shelving: (
    <>
      <rect x="8" y="4" width="32" height="38" />
      <line x1="8" y1="13" x2="40" y2="13" />
      <line x1="8" y1="22" x2="40" y2="22" />
      <line x1="8" y1="31" x2="40" y2="31" />
      <line x1="24" y1="4" x2="24" y2="42" />
    </>
  ),
  wall_panel: (
    <>
      <rect x="4" y="4" width="40" height="38" />
      <line x1="14" y1="4" x2="14" y2="42" />
      <line x1="24" y1="4" x2="24" y2="42" />
      <line x1="34" y1="4" x2="34" y2="42" />
      <line x1="4" y1="24" x2="44" y2="24" strokeDasharray="2 2" />
    </>
  ),
};

const FUNCS = Object.keys(FUNCTION_NAMES) as FunctionKey[];
const MOUNTS = Object.keys(MOUNT_NAMES) as MountType[];
const HANDLES = Object.keys(HANDLE_NAMES) as HandleType[];

export function InputStage({ p, update, selected, onSelect, onNext }: { p: Project; update: Updater; selected: string | null; onSelect: (t: string | null) => void; onNext: () => void }) {
  const { t, L } = useT();
  const isPanel = p.type === 'wall_panel';
  const setInfo = (k: keyof Project['info']) => (v: string) => update((q) => ({ ...q, info: { ...q.info, [k]: v } }), { merge: `info-${k}` });
  const setDim = (k: keyof Project['dims']) => (v: number | null) => v != null && update((q) => ({ ...q, dims: { ...q.dims, [k]: v } }));
  const sheets = useMemo(() => generateSheets(p), [p]);

  const [apiKey, setApiKey] = useState(() => safeGet('joinery-drafting:apikey') ?? '');
  const [ai, setAi] = useState<{ state: 'idle' | 'busy' | 'done' | 'error'; msg?: string }>({ state: 'idle' });

  const runAi = async () => {
    if (!apiKey.trim()) {
      setAi({ state: 'error', msg: t('aiNeedKey') });
      return;
    }
    setAi({ state: 'busy' });
    try {
      const x = await extractFromReferences({
        apiKey: apiKey.trim(),
        images: p.refs.slice(0, 8),
        brief: p.description,
        current: { type: p.type, width: p.dims.width, height: p.dims.height, depth: p.dims.depth },
      });
      update((q) => applyExtraction(q, x));
      onSelect(null);
      setAi({ state: 'done', msg: `${t('aiDone')} ${x.assumptions ?? ''}` });
    } catch (e) {
      setAi({ state: 'error', msg: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="stage input-stage">
      <div className="col">
        <Card title={t('joineryType')}>
          <p className="muted small">{t('typeHint')}</p>
          <div className="types">
            {TYPE_ORDER.map((ty) => (
              <button
                type="button"
                key={ty}
                className={`type ${p.type === ty ? 'on' : ''}`}
                onClick={() => {
                  if (ty === p.type) return;
                  if (p.comments.length && !window.confirm(t('confirmType'))) return;
                  update((q) => applyPreset(q, ty));
                  onSelect(null);
                }}
              >
                <svg viewBox="0 0 48 46" aria-hidden>
                  {ICONS[ty]}
                </svg>
                <span>{L(TYPE_NAMES[ty])}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title={t('dimensions')}>
          <div className="grid3">
            <Field label={t('width')}>
              <Num value={p.dims.width} min={200} max={12000} onChange={setDim('width')} />
            </Field>
            <Field label={t('height')}>
              <Num value={p.dims.height} min={100} max={4000} onChange={setDim('height')} />
            </Field>
            {!isPanel && (
              <Field label={t('depth')}>
                <Num value={p.dims.depth} min={150} max={1200} onChange={setDim('depth')} />
              </Field>
            )}
            {isPanel && (
              <Field label={t('frameSpacing')}>
                <Num value={p.dims.frameSpacing} min={200} max={800} step={50} onChange={setDim('frameSpacing')} />
              </Field>
            )}
          </div>
          {!isPanel && (
            <div className="grid3">
              <Field label={t('mount')} wide>
                <select value={p.mount} onChange={(e) => update((q) => ({ ...q, mount: e.target.value as MountType }))}>
                  {MOUNTS.map((m) => (
                    <option key={m} value={m}>
                      {L(MOUNT_NAMES[m])}
                    </option>
                  ))}
                </select>
              </Field>
              {(p.mount === 'plinth' || p.mount === 'legs') && (
                <Field label={t('plinthHeight')}>
                  <Num value={p.dims.plinthHeight} min={0} max={300} onChange={setDim('plinthHeight')} />
                </Field>
              )}
              {p.mount === 'plinth' && (
                <Field label={t('plinthRecess')}>
                  <Num value={p.dims.plinthRecess} min={0} max={150} onChange={setDim('plinthRecess')} />
                </Field>
              )}
              {p.mount === 'wall_hung' && (
                <Field label={t('mountHeight')}>
                  <Num value={p.dims.mountHeight} min={0} max={2500} onChange={setDim('mountHeight')} />
                </Field>
              )}
            </div>
          )}
          <div className="grid3">
            {isPanel ? (
              <Field label={t('skirtingHeight')}>
                <Num value={p.dims.plinthHeight} min={0} max={200} onChange={setDim('plinthHeight')} />
              </Field>
            ) : (
              <Field label={t('handle')}>
                <select value={p.handle} onChange={(e) => update((q) => ({ ...q, handle: e.target.value as HandleType }))}>
                  {HANDLES.map((h) => (
                    <option key={h} value={h}>
                      {L(HANDLE_NAMES[h])}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={t(isPanel ? 'panelGap' : 'gap')}>
              <Num value={p.dims.gap} min={0} max={20} step={0.5} onChange={setDim('gap')} />
            </Field>
            {!isPanel && (
              <Field label={t('countertop')}>
                <span className="row gap">
                  <input type="checkbox" checked={p.hasCountertop} onChange={(e) => update((q) => ({ ...q, hasCountertop: e.target.checked }))} />
                  {p.hasCountertop && <Num value={p.dims.countertopOverhang} min={0} max={100} onChange={setDim('countertopOverhang')} />}
                </span>
              </Field>
            )}
          </div>
        </Card>

        <Card title={t('functions')}>
          <p className="muted small">{t('functionsHint')}</p>
          <div className="chips">
            {FUNCS.map((f) => {
              const on = p.functions.includes(f);
              return (
                <button type="button" key={f} className={`chip ${on ? 'on' : ''}`} onClick={() => update((q) => ({ ...q, functions: on ? q.functions.filter((x) => x !== f) : [...q.functions, f] }))}>
                  {on ? '✓ ' : ''}
                  {L(FUNCTION_NAMES[f])}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title={t('projectInfo')}>
          <div className="grid2">
            <Field label={t('projectName')} wide>
              <Text value={p.info.name} onChange={setInfo('name')} />
            </Field>
            <Field label={t('client')}>
              <Text value={p.info.client} onChange={setInfo('client')} />
            </Field>
            <Field label={t('designer')}>
              <Text value={p.info.designer} onChange={setInfo('designer')} />
            </Field>
            <Field label={t('location')}>
              <Text value={p.info.location} onChange={setInfo('location')} />
            </Field>
            <Field label={t('room')}>
              <Text value={p.info.room} onChange={setInfo('room')} />
            </Field>
            <Field label={t('drawingNo')}>
              <Text value={p.info.drawingNo} onChange={setInfo('drawingNo')} />
            </Field>
            <Field label={t('revision')}>
              <Text value={p.info.revision} onChange={setInfo('revision')} />
            </Field>
            <Field label={t('date')}>
              <input type="date" value={p.info.date} onChange={(e) => setInfo('date')(e.target.value)} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="col">
        <Card title={t('references')}>
          <References p={p} update={update} />
        </Card>
        <Card title={t('brief')}>
          <Text multiline rows={5} value={p.description} placeholder={t('briefPlaceholder')} onChange={(v) => update((q) => ({ ...q, description: v }), { merge: 'brief' })} />
        </Card>
        <Card title={t('aiAssist')}>
          <p className="muted small">{t('aiHint')}</p>
          <Field label={t('apiKey')}>
            <input
              type="password"
              value={apiKey}
              autoComplete="off"
              placeholder="sk-ant-…"
              onChange={(e) => {
                setApiKey(e.target.value);
                safeSet('joinery-drafting:apikey', e.target.value);
              }}
            />
          </Field>
          <div className="row gap">
            <button type="button" className="btn primary" disabled={ai.state === 'busy' || (!p.refs.length && !p.description.trim())} onClick={runAi}>
              {ai.state === 'busy' ? t('aiRunning') : `✦ ${t('aiRun')}`}
            </button>
          </div>
          {ai.msg && <p className={`small ${ai.state === 'error' ? 'err' : 'ok'}`}>{ai.msg}</p>}
        </Card>
      </div>

      <div className="col">
        <Card title={t(isPanel ? 'panelLayout' : 'layout')}>
          <BaysEditor p={p} update={update} selected={selected} onSelect={onSelect} />
          <Inspector p={p} update={update} selected={selected} onSelect={onSelect} />
        </Card>
        <Card title={t('preview')} className="preview-card">
          <div className="mini-canvas" onClick={onNext} role="button" tabIndex={0}>
            <DrawingCanvas sheet={sheets[0]} hiddenLayers={new Set()} selected={selected} onSelect={() => {}} tool="select" comments={[]} activeComment={null} onComment={() => {}} onPickComment={() => {}} compact />
          </div>
        </Card>
        <Card title={t('guide')}>
          <GuidePanel p={p} update={update} compact />
        </Card>
        <button type="button" className="btn primary big" onClick={onNext}>
          {t('generate')} →
        </button>
      </div>
    </div>
  );
}
