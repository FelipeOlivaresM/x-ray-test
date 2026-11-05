import { useEffect, useRef, useState } from 'react';
import { RADIOGRAPHS, radiographUrl } from '../data/radiographs.js';

/** Radiografía real con zoom/desplazamiento y su atribución de licencia. */
export function Credit({ id, compact = false }) {
  const r = RADIOGRAPHS[id];
  if (!r) return null;
  return (
    <p className={`credit ${compact ? 'credit--compact' : ''}`}>
      <span className="credit-tag">REAL</span> {r.title}. {r.author} ·{' '}
      {r.licenseUrl ? (
        <a href={r.licenseUrl} target="_blank" rel="noreferrer">
          {r.license}
        </a>
      ) : (
        r.license
      )}{' '}
      ·{' '}
      <a href={r.source} target="_blank" rel="noreferrer">
        fuente
      </a>
    </p>
  );
}

export default function RealRadiograph({ ids = [], className = '' }) {
  const [i, setI] = useState(0);
  const [z, setZ] = useState({ k: 1, x: 0, y: 0 });
  const wrap = useRef(null);
  const drag = useRef(null);
  const id = ids[Math.min(i, ids.length - 1)];

  useEffect(() => setZ({ k: 1, x: 0, y: 0 }), [id]);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      setZ((p) => ({ ...p, k: Math.min(Math.max(p.k * Math.exp(-e.deltaY * 0.0015), 1), 6) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (!ids.length) {
    return (
      <div className={`real-view real-view--empty ${className}`}>
        <p>Este estudio no tiene radiografía real asociada todavía.</p>
      </div>
    );
  }
  const r = RADIOGRAPHS[id];
  return (
    <div className={`real-view ${className}`}>
      <div
        ref={wrap}
        className="real-stage"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, z };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setZ({ ...d.z, x: d.z.x + (e.clientX - d.x) / d.z.k, y: d.z.y + (e.clientY - d.y) / d.z.k });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <img src={radiographUrl(id)} alt={r.title} draggable="false" style={{ transform: `scale(${z.k}) translate(${z.x}px, ${z.y}px)` }} />
        <span className="hc tl">RADIOGRAFÍA REAL</span>
        {ids.length > 1 && (
          <div className="real-pager">
            {ids.map((x, k) => (
              <button key={x} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={RADIOGRAPHS[x].title}>
                {k + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="real-note">{r.note}</p>
      <Credit id={id} />
    </div>
  );
}
