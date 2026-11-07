import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '../model/types';
import { newProject } from '../model/presets';
import { cloneMaterials, DEFAULT_ASSIGN } from '../model/materials';

const KEY = 'joinery-drafting:project';

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Validate and fill defaults for a loaded project. */
export function normalizeProject(raw: unknown): Project {
  const base = newProject();
  if (!raw || typeof raw !== 'object') throw new Error('invalid');
  const p = raw as Partial<Project>;
  if (!Array.isArray(p.bays) || !p.dims || !p.type) throw new Error('invalid');
  return {
    ...base,
    ...p,
    version: 1,
    info: { ...base.info, ...(p.info ?? {}) },
    dims: { ...base.dims, ...p.dims },
    materials: Array.isArray(p.materials) && p.materials.length ? p.materials : cloneMaterials(),
    assign: { ...DEFAULT_ASSIGN, ...(p.assign ?? {}) },
    specs: p.specs ?? [],
    comments: p.comments ?? [],
    refs: p.refs ?? [],
    functions: p.functions ?? [],
    sheet: { ...base.sheet, ...(p.sheet ?? {}) },
  } as Project;
}

function load(): Project {
  const s = safeGet(KEY);
  if (s) {
    try {
      return normalizeProject(JSON.parse(s));
    } catch {
      /* ignore */
    }
  }
  return newProject('base_cabinet');
}

export type Updater = (fn: (p: Project) => Project, opts?: { merge?: string }) => void;

/** Project state with undo/redo and local autosave. */
export function useProject() {
  const [state, setState] = useState(() => ({ past: [] as Project[], present: load(), future: [] as Project[] }));
  const lastMerge = useRef<{ key: string; t: number } | null>(null);

  const update: Updater = useCallback((fn, opts) => {
    setState((s) => {
      const next = fn(s.present);
      if (next === s.present) return s;
      const now = Date.now();
      // merge rapid edits of the same field into one undo step
      const merge = opts?.merge && lastMerge.current && lastMerge.current.key === opts.merge && now - lastMerge.current.t < 1200;
      lastMerge.current = opts?.merge ? { key: opts.merge, t: now } : null;
      return {
        past: merge ? s.past : [...s.past.slice(-60), s.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);
  const redo = useCallback(() => {
    setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);
  const replace = useCallback((p: Project) => setState({ past: [], present: p, future: [] }), []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!safeSet(KEY, JSON.stringify(state.present))) {
        // quota exceeded (large images) – save without references
        safeSet(KEY, JSON.stringify({ ...state.present, refs: [] }));
      }
    }, 400);
    return () => clearTimeout(id);
  }, [state.present]);

  return { project: state.present, update, undo, redo, replace, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
