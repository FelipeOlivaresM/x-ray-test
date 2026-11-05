// Enrutador mínimo por hash (#/ruta): compatible con GitHub Pages sin configuración.
import { useEffect, useState } from 'react';

const parse = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

export function useRoute() {
  const [path, setPath] = useState(parse);
  useEffect(() => {
    const f = () => {
      setPath(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return path;
}

export const go = (p) => (window.location.hash = p);
