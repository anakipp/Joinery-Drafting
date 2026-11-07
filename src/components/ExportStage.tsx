import { useMemo } from 'react';
import type { Project } from '../model/types';
import { useT } from '../i18n/ui';
import { generateSheets, PAPER } from '../draw/sheet';
import { sheetsToDxf } from '../export/dxf';
import { sheetToSvg } from '../export/svg';
import { cutList, cutListCsv, hardwareList } from '../export/cutlist';
import { findMaterial } from '../model/materials';
import { Card, download, slug } from './ui';
import { DrawingCanvas } from './DrawingCanvas';

export function printSheets(p: Project) {
  const sheets = generateSheets(p, { comments: p.sheet.showComments });
  const [w, h] = PAPER[p.sheet.paper];
  const pages = sheets.map((s) => `<div class="page">${sheetToSvg(s).replace(/<\?xml[^>]*>/, '')}</div>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${p.info.name} – ${p.info.drawingNo}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#888}.page{width:${w}mm;height:${h}mm;page-break-after:always;background:#fff;margin:0 auto 8mm}.page svg{display:block;width:${w}mm;height:${h}mm}@media print{body{background:#fff}.page{margin:0}}</style>
</head><body>${pages}<script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),300))</script></body></html>`);
  win.document.close();
}

export function ExportStage({ p }: { p: Project }) {
  const { t, L, lang } = useT();
  const sheets = useMemo(() => generateSheets(p, { comments: p.sheet.showComments }), [p]);
  const rows = useMemo(() => cutList(p), [p]);
  const hw = useMemo(() => hardwareList(p), [p]);
  const base = `${slug(p.info.name)}_${slug(p.info.drawingNo)}_rev${slug(p.info.revision)}`;
  const csvLang = lang === 'th' ? 'th' : 'en';

  return (
    <div className="stage export-stage">
      <div className="col wide">
        <Card title={t('exportTitle')}>
          <div className="sheet-thumbs">
            {sheets.map((s) => (
              <figure key={s.index}>
                <div className="mini-canvas">
                  <DrawingCanvas sheet={s} hiddenLayers={new Set()} selected={null} onSelect={() => {}} tool="select" comments={[]} activeComment={null} onComment={() => {}} onPickComment={() => {}} compact />
                </div>
                <figcaption>
                  {s.index + 1}. {L(s.title)} · {s.paper} · 1:{s.scale}
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
        <Card title={t('cutList')}>
          <p className="muted small">{t('cutListHint')}</p>
          <div className="table-wrap">
            <table className="cut">
              <thead>
                <tr>
                  <th>{t('part')}</th>
                  <th>{t('code')}</th>
                  <th>{t('material')}</th>
                  <th className="num">{t('qty')}</th>
                  <th className="num">{t('length')}</th>
                  <th className="num">{t('width')}</th>
                  <th className="num">{t('thickness')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const m = findMaterial(p.materials, r.materialId);
                  return (
                    <tr key={i}>
                      <td>{L(r.part)}</td>
                      <td>
                        <b>{m?.code}</b>
                      </td>
                      <td>{m ? L(m.name) : ''}</td>
                      <td className="num">{r.qty}</td>
                      <td className="num">{r.length}</td>
                      <td className="num">{r.width}</td>
                      <td className="num">{r.thickness}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hw.length > 0 && (
            <>
              <h4>{t('hardware')}</h4>
              <table className="cut">
                <tbody>
                  {hw.map((h) => {
                    const m = findMaterial(p.materials, h.materialId);
                    return (
                      <tr key={h.role}>
                        <td>
                          <b>{m?.code}</b> {m ? L(m.name) : ''}
                        </td>
                        <td className="num">
                          {h.qty} {L(h.unit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </Card>
      </div>
      <div className="col">
        <Card title={t('dxf')}>
          <p className="muted small">{t('dxfHint')}</p>
          <button type="button" className="btn primary big" onClick={() => download(`${base}.dxf`, sheetsToDxf(sheets), 'application/dxf')}>
            ⬇ DXF
          </button>
        </Card>
        <Card title={t('print')}>
          <p className="muted small">{t('printHint')}</p>
          <button type="button" className="btn" onClick={() => printSheets(p)}>
            ⎙ {t('print')}
          </button>
        </Card>
        <Card title={t('svg')}>
          <div className="row gap">
            {sheets.map((s) => (
              <button type="button" key={s.index} className="btn" onClick={() => download(`${base}_sheet${s.index + 1}.svg`, sheetToSvg(s), 'image/svg+xml')}>
                ⬇ SVG {s.index + 1}
              </button>
            ))}
          </div>
        </Card>
        <Card title={t('cutList')}>
          <button type="button" className="btn" onClick={() => download(`${base}_cutlist.csv`, cutListCsv(p, csvLang), 'text/csv;charset=utf-8')}>
            ⬇ CSV
          </button>
        </Card>
        <Card title={t('projectFile')}>
          <p className="muted small">{t('projectFileHint')}</p>
          <button type="button" className="btn" onClick={() => download(`${base}.joinery.json`, JSON.stringify(p, null, 2), 'application/json')}>
            ⬇ JSON
          </button>
        </Card>
      </div>
    </div>
  );
}
