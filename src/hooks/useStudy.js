import { useEffect, useState } from 'react';
import { buildStudy } from '../lib/study.js';

/** Construye (async) el estudio 3D/DRR y libera el anterior al cambiar. */
export function useStudy(def, key) {
  const [state, setState] = useState({ study: null, error: null });
  useEffect(() => {
    if (!def) return undefined;
    let alive = true;
    let built = null;
    setState({ study: null, error: null });
    buildStudy(def)
      .then((s) => {
        built = s;
        if (alive) setState({ study: s, error: null });
        else s.dispose();
      })
      .catch((e) => {
        console.error(e);
        if (alive) setState({ study: null, error: e });
      });
    return () => {
      alive = false;
      built?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
