import { useEffect, useRef, useState } from 'react';
import type { Project, RefImage } from '../model/types';
import type { Updater } from '../state/store';
import { useT } from '../i18n/ui';
import { uid } from '../model/util';

/** Downscale an image file to keep project files and storage small. */
async function fileToDataUrl(file: File, max = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('image'));
      img.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SketchPad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'pen' | 'eraser'>('pen');
  const drawing = useRef(false);
  const dirty = useRef(false);

  const clear = () => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    // light grid
    ctx.strokeStyle = '#e8eef5';
    ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, c.height);
      ctx.stroke();
    }
    for (let y = 0; y < c.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(c.width, y + 0.5);
      ctx.stroke();
    }
    dirty.current = false;
  };
  useEffect(clear, []);

  const pos = (e: React.PointerEvent) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height] as const;
  };

  return (
    <div className="sketch">
      <canvas
        ref={ref}
        width={800}
        height={500}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = ref.current!.getContext('2d')!;
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current!.getContext('2d')!;
          const [x, y] = pos(e);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = mode === 'pen' ? '#1d2733' : '#ffffff';
          ctx.lineWidth = mode === 'pen' ? 2.2 : 18;
          ctx.lineTo(x, y);
          ctx.stroke();
          dirty.current = true;
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="row gap">
        <button type="button" className={`btn small ${mode === 'pen' ? 'on' : ''}`} onClick={() => setMode('pen')}>
          ✎ {t('pen')}
        </button>
        <button type="button" className={`btn small ${mode === 'eraser' ? 'on' : ''}`} onClick={() => setMode('eraser')}>
          ⌫ {t('eraser')}
        </button>
        <button type="button" className="btn small" onClick={clear}>
          {t('clear')}
        </button>
        <span className="spacer" />
        <button
          type="button"
          className="btn small primary"
          onClick={() => {
            if (!dirty.current) return;
            onSave(ref.current!.toDataURL('image/png'));
            clear();
          }}
        >
          {t('addSketch')}
        </button>
      </div>
    </div>
  );
}

export function References({ p, update }: { p: Project; update: Updater }) {
  const { t } = useT();
  const [tab, setTab] = useState<'list' | 'sketch'>('list');
  const [zoom, setZoom] = useState<RefImage | null>(null);
  const add = (r: RefImage) => update((q) => ({ ...q, refs: [...q.refs, r] }));

  return (
    <div className="refs">
      <div className="row gap">
        <label className="btn small primary">
          ⇪ {t('upload')}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              for (const f of files) {
                try {
                  add({ id: uid('r'), name: f.name, dataUrl: await fileToDataUrl(f), kind: 'upload' });
                } catch {
                  /* skip unreadable */
                }
              }
            }}
          />
        </label>
        <button type="button" className={`btn small ${tab === 'sketch' ? 'on' : ''}`} onClick={() => setTab(tab === 'sketch' ? 'list' : 'sketch')}>
          ✎ {t('sketch')}
        </button>
      </div>
      {tab === 'sketch' && (
        <SketchPad
          onSave={(dataUrl) => {
            add({ id: uid('r'), name: `sketch-${p.refs.filter((r) => r.kind === 'sketch').length + 1}.png`, dataUrl, kind: 'sketch' });
            setTab('list');
          }}
        />
      )}
      {p.refs.length === 0 && tab === 'list' && <p className="muted small">{t('noRefs')}</p>}
      <div className="thumbs">
        {p.refs.map((r) => (
          <figure key={r.id} className="thumb">
            <img src={r.dataUrl} alt={r.name} onClick={() => setZoom(r)} />
            <figcaption>
              <span title={r.name}>{r.kind === 'sketch' ? '✎ ' : ''}{r.name}</span>
              <button type="button" aria-label={t('delete')} onClick={() => update((q) => ({ ...q, refs: q.refs.filter((x) => x.id !== r.id) }))}>
                ×
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          <img src={zoom.dataUrl} alt={zoom.name} />
        </div>
      )}
    </div>
  );
}
