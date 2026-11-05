import { useEffect, useState } from 'react';
import { CASES, LEVELS } from '../data/cases.js';
import { snapshot } from '../lib/snapshot.js';
import { stats, useStore } from '../lib/store.js';
import Icon from '../components/Icon.jsx';

function Thumb({ c }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    snapshot(c.id, c.study, { view: c.views[0], w: 400, h: 250 }).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [c]);
  return (
    <div className="thumb">
      {src ? <img src={src} alt="" /> : <div className="thumb-ph" />}
      <span className="thumb-tag">DRR · {c.views.length} PROYECCIONES</span>
    </div>
  );
}

export default function Cases() {
  const s = useStore();
  const st = stats(s);
  const [level, setLevel] = useState('todos');
  const levels = Object.keys(LEVELS);

  // ruta recomendada: primer caso no aprobado (≥70 %) en orden de dificultad
  const next = CASES.find((c) => !(st.best[c.id] && st.best[c.id].pct >= 0.7));
  const list = CASES.filter((c) => level === 'todos' || c.level === level);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Ruta de aprendizaje</span>
          <h1>Casos clínicos simulados</h1>
          <p className="muted">Ruta progresiva: empieza por el nivel básico. Un caso queda aprobado con 70 % o más.</p>
        </div>
        {next && (
          <a className="btn btn--primary" href={`#/caso/${next.id}`}>
            <Icon name="play" size={15} /> Continuar ruta: {next.title}
          </a>
        )}
      </div>

      <div className="path">
        {levels.map((l) => {
          const cs = CASES.filter((c) => c.level === l);
          const done = cs.filter((c) => st.best[c.id] && st.best[c.id].pct >= 0.7).length;
          return (
            <div key={l} className="path-step">
              <div className="path-top">
                <span className="dot" style={{ background: LEVELS[l].color }} />
                <b>{LEVELS[l].label}</b>
                <span className="muted small">
                  {done}/{cs.length}
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${(done / cs.length) * 100}%`, background: LEVELS[l].color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="seg">
        {['todos', ...levels].map((l) => (
          <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>
            {l === 'todos' ? 'Todos' : LEVELS[l].label}
          </button>
        ))}
      </div>

      <div className="grid grid--cases">
        {list.map((c) => {
          const b = st.best[c.id];
          return (
            <a key={c.id} href={`#/caso/${c.id}`} className={`case-card ${next && next.id === c.id ? 'case-card--next' : ''}`}>
              <Thumb c={c} />
              <div className="case-body">
                <div className="row between">
                  <span className="pill" style={{ '--pc': LEVELS[c.level].color }}>
                    {LEVELS[c.level].label}
                  </span>
                  {b && <span className={`score ${b.pct >= 0.7 ? 'score--ok' : 'score--low'}`}>{Math.round(b.pct * 100)} %</span>}
                </div>
                <h3>{c.title}</h3>
                <p className="small muted">
                  {c.patient.sex === 'F' ? 'Mujer' : 'Hombre'}, {c.patient.age} años · {c.region}
                </p>
                <p className="small">{c.objective}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
