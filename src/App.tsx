import { useEffect, useState } from 'react';
import type { Lang } from './model/types';
import { LangContext, UI } from './i18n/ui';
import { L } from './i18n/terms';
import { normalizeProject, safeGet, safeSet, useProject } from './state/store';
import { newProject } from './model/presets';
import { InputStage } from './components/InputStage';
import { ReviewStage } from './components/ReviewStage';
import { ExportStage } from './components/ExportStage';
import { Seg, download, slug } from './components/ui';
import { evaluate } from './guide/rules';

type Stage = 'input' | 'review' | 'export';

export default function App() {
  const { project: p, update, undo, redo, replace, canUndo, canRedo } = useProject();
  const [lang, setLang] = useState<Lang>(() => (safeGet('joinery-drafting:lang') as Lang) || 'both');
  const [stage, setStage] = useState<Stage>(() => (safeGet('joinery-drafting:stage') as Stage) || 'input');
  const [selected, setSelected] = useState<string | null>(null);
  const t = (k: keyof typeof UI) => L(UI[k], lang, ' · ');
  const warn = evaluate(p).filter((g) => g.level === 'warn').length;

  useEffect(() => {
    safeSet('joinery-drafting:lang', lang);
    document.documentElement.lang = lang === 'th' ? 'th' : 'en';
  }, [lang]);
  useEffect(() => {
    safeSet('joinery-drafting:stage', stage);
  }, [stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const steps: { k: Stage; label: string }[] = [
    { k: 'input', label: t('stepInput') },
    { k: 'review', label: t('stepReview') },
    { k: 'export', label: t('stepExport') },
  ];

  return (
    <LangContext.Provider value={lang}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <svg viewBox="0 0 32 32" aria-hidden>
              <rect x="3" y="5" width="26" height="22" rx="2" />
              <line x1="16" y1="5" x2="16" y2="27" />
              <line x1="3" y1="16" x2="16" y2="16" />
              <circle cx="13" cy="22" r="1.2" />
              <circle cx="19" cy="22" r="1.2" />
            </svg>
            <div>
              <b>{L(UI.appName, lang === 'th' ? 'th' : 'en')}</b>
              <span>{lang === 'both' ? UI.appName.th : L(UI.appTag, lang)}</span>
            </div>
          </div>
          <nav className="steps">
            {steps.map((s, i) => (
              <button type="button" key={s.k} className={stage === s.k ? 'on' : ''} onClick={() => setStage(s.k)}>
                <span className="n">{i + 1}</span>
                {s.label}
                {s.k === 'review' && warn > 0 && <span className="count warn">{warn}</span>}
              </button>
            ))}
          </nav>
          <div className="top-actions">
            <button type="button" className="btn icon" title={t('undo')} disabled={!canUndo} onClick={undo}>
              ↶
            </button>
            <button type="button" className="btn icon" title={t('redo')} disabled={!canRedo} onClick={redo}>
              ↷
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                if (window.confirm(t('confirmNew'))) {
                  replace(newProject('base_cabinet'));
                  setSelected(null);
                  setStage('input');
                }
              }}
            >
              {t('newProject')}
            </button>
            <label className="btn small">
              {t('open')}
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    replace(normalizeProject(JSON.parse(await f.text())));
                    setSelected(null);
                  } catch {
                    window.alert(t('invalidFile'));
                  }
                }}
              />
            </label>
            <button type="button" className="btn small" onClick={() => download(`${slug(p.info.name)}.joinery.json`, JSON.stringify(p, null, 2), 'application/json')}>
              {t('save')}
            </button>
            <Seg<Lang>
              small
              value={lang}
              onChange={setLang}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'th', label: 'ไทย' },
                { value: 'both', label: 'EN+TH' },
              ]}
            />
          </div>
        </header>
        {stage === 'input' && <InputStage p={p} update={update} selected={selected} onSelect={setSelected} onNext={() => setStage('review')} />}
        {stage === 'review' && <ReviewStage p={p} update={update} selected={selected} onSelect={setSelected} />}
        {stage === 'export' && <ExportStage p={p} />}
      </div>
    </LangContext.Provider>
  );
}
