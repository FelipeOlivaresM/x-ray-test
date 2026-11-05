import { CASES, LEVELS, getCase } from '../data/cases.js';
import { groupAcc, stats, store, useStore } from '../lib/store.js';

const CONF_LABEL = { alta: 'Seguro', media: 'Probable', baja: 'Adivinando' };

function Bars({ rows, empty }) {
  if (!rows.length) return <p className="small muted">{empty}</p>;
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.key}>
          <span className="bars-k">{r.label || r.key}</span>
          <span className="bars-track">
            <span className="bars-fill" style={{ width: `${r.pct * 100}%`, background: r.pct >= 0.7 ? 'var(--ok)' : r.pct >= 0.4 ? 'var(--warn)' : 'var(--bad)' }} />
          </span>
          <span className="bars-v">
            {Math.round(r.pct * 100)} % <small className="muted">({r.ok}/{r.n})</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const s = useStore();
  const st = stats(s);
  const bySkill = groupAcc(st.items, 'skill');
  const byRegion = groupAcc(st.items, 'region');
  const byConf = groupAcc(
    st.items.filter((i) => i.conf),
    'conf',
  ).map((r) => ({ ...r, label: CONF_LABEL[r.key] }));
  const weak = bySkill.filter((r) => r.pct < 0.7).slice(0, 3);
  const recent = [...s.attempts].reverse().slice(0, 8);
  const cardsSeen = Object.keys(s.cards).length;
  const mastered = Object.values(s.cards).filter((c) => c.box >= 4).length;
  const pending = CASES.filter((c) => !(st.best[c.id] && st.best[c.id].pct >= 0.7));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Panel de seguimiento</span>
          <h1>Mi progreso</h1>
          <p className="muted">Ejercicios completados, resultados y temas por reforzar. El progreso se guarda en este navegador.</p>
        </div>
        {s.attempts.length > 0 && (
          <button className="btn btn--ghost" onClick={() => confirm('¿Borrar todo tu progreso en este navegador?') && store.reset()}>
            Reiniciar progreso
          </button>
        )}
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>XP total</span>
          <b>{st.xp}</b>
        </div>
        <div className="kpi">
          <span>Casos aprobados</span>
          <b>
            {CASES.length - pending.length}/{CASES.length}
          </b>
        </div>
        <div className="kpi">
          <span>Precisión global</span>
          <b>{st.items.length ? `${Math.round(st.acc * 100)} %` : '—'}</b>
        </div>
        <div className="kpi">
          <span>Racha</span>
          <b>
            {st.streak} día{st.streak === 1 ? '' : 's'}
          </b>
        </div>
        <div className="kpi">
          <span>Tarjetas dominadas</span>
          <b>
            {mastered}/{cardsSeen || 0}
          </b>
        </div>
      </div>

      {!s.attempts.length && (
        <div className="card center">
          <h3>Aún no hay datos</h3>
          <p className="muted">Resuelve tu primer caso clínico para ver tu panel de seguimiento.</p>
          <a className="btn btn--primary" href={`#/caso/${CASES[0].id}`}>
            Empezar con el caso 1
          </a>
        </div>
      )}

      {s.attempts.length > 0 && (
        <>
          <div className="grid grid--2">
            <div className="card">
              <h3>Por habilidad</h3>
              <Bars rows={bySkill} empty="Sin datos" />
            </div>
            <div className="card">
              <h3>Por región anatómica</h3>
              <Bars rows={byRegion} empty="Sin datos" />
            </div>
            <div className="card">
              <h3>Calibración: seguridad vs. aciertos</h3>
              <p className="small muted">Lo ideal: alto porcentaje en "Seguro" y bajo en "Adivinando".</p>
              <Bars rows={byConf} empty="Sin datos" />
            </div>
            <div className="card">
              <h3>Temas por reforzar</h3>
              {weak.length ? (
                <ul className="small">
                  {weak.map((w) => (
                    <li key={w.key}>
                      <b>{w.key}</b>: {Math.round(w.pct * 100)} % de aciertos.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small">¡Vas muy bien en todas las habilidades!</p>
              )}
              {pending[0] && (
                <a className="btn btn--primary" href={`#/caso/${pending[0].id}`}>
                  Siguiente recomendado: {pending[0].title}
                </a>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Intentos recientes</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Caso</th>
                  <th>Nivel</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a, k) => {
                  const c = getCase(a.caseId);
                  return (
                    <tr key={k}>
                      <td>{new Date(a.date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        <a href={`#/caso/${a.caseId}`}>{c?.title || a.caseId}</a>
                      </td>
                      <td>{c && LEVELS[c.level].label}</td>
                      <td>
                        <span className={`score ${a.pct >= 0.7 ? 'score--ok' : 'score--low'}`}>{Math.round(a.pct * 100)} %</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
