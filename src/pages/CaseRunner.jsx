import { useEffect, useRef, useState } from 'react';
import Anatomy3D from '../components/Anatomy3D.jsx';
import XrayView from '../components/XrayView.jsx';
import RealRadiograph from '../components/RealRadiograph.jsx';
import Icon from '../components/Icon.jsx';
import { REGIONS } from '../data/anatomy.js';
import { ABCS, CASES, LEVELS, getCase } from '../data/cases.js';
import { useStudy } from '../hooks/useStudy.js';
import { store } from '../lib/store.js';

const STEPS = ['Caso', 'Lectura y localización', 'Clasificación', 'Exploración 3D', 'Resumen'];
const CONF = [
  { k: 'alta', label: 'Seguro' },
  { k: 'media', label: 'Probable' },
  { k: 'baja', label: 'Adivinando' },
];
const LOC_POINTS = 40;
const Q_POINTS = 20;
const HINT_COST = 10;

function Confidence({ value, onChange }) {
  return (
    <div className="conf">
      <span className="small muted">¿Qué tan seguro estás?</span>
      <div className="seg seg--sm" role="radiogroup" aria-label="Seguridad">
        {CONF.map((c) => (
          <button key={c.k} role="radio" aria-checked={value === c.k} className={value === c.k ? 'on' : ''} onClick={() => onChange(c.k)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }) {
  return (
    <button className={`hud-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="ht-box" aria-hidden="true">
        {on && <Icon name="check" size={11} stroke={3} />}
      </span>
      {children}
    </button>
  );
}

const listText = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`);

export default function CaseRunner({ id }) {
  const c = getCase(id);
  const { study, error } = useStudy(c ? c.study : null, id);
  const region = c ? REGIONS[c.study.region] : null;
  const presets = c ? c.views.map((v) => region.presets.find((p) => p.id === v)).filter(Boolean) : [];

  const [step, setStep] = useState(0);
  const [shown, setShown] = useState('both'); // 'both' o id de proyección
  const [win, setWin] = useState({ gain: region?.gain || 0.55, level: 0.5, width: 1, invert: false });
  const [soft, setSoft] = useState(true);
  const [checked, setChecked] = useState({});
  const [mark, setMark] = useState(null);
  const [locConf, setLocConf] = useState(null);
  const [loc, setLoc] = useState(null); // { correct, none }
  const [hint, setHint] = useState(false);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState({ choice: null, conf: null });
  const [v3, setV3] = useState({ reduction: 0, highlight: true, labels: false, see: false, skeleton: true, right: 'sim', view: presets[0]?.id });
  const saved = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  if (!c) {
    return (
      <div className="page">
        <h1>Caso no encontrado</h1>
        <a href="#/casos">Volver a los casos</a>
      </div>
    );
  }

  const hasFracture = !!c.study.fracture;
  const allChecked = ABCS.every((a) => checked[a.key]);
  const picking = step === 1 && allChecked && !loc;
  const showAnswer = study?.fracturePoint && ((step === 1 && loc) || step === 2);

  function confirmLoc(none) {
    const correct = none ? !hasFracture : hasFracture && !!mark && mark.dist <= study.tolerance;
    setLoc({ correct, none });
  }

  function computeScore() {
    const items = [];
    const max = LOC_POINTS + Q_POINTS * c.questions.length;
    let score = loc?.correct ? LOC_POINTS - (hint ? HINT_COST : 0) : 0;
    items.push({ skill: 'Localización', correct: !!loc?.correct, conf: locConf, region: c.region, level: c.level, label: 'Localización de la fractura' });
    c.questions.forEach((q) => {
      const a = answers[q.id];
      const ok = a && a.choice === q.answer;
      if (ok) score += Q_POINTS;
      items.push({ skill: q.skill, correct: !!ok, conf: a?.conf, region: c.region, level: c.level, label: q.prompt });
    });
    score = Math.max(score, 0);
    return { score, max, pct: score / max, items };
  }

  function goSummary() {
    if (!saved.current) {
      const r = computeScore();
      store.addAttempt({ caseId: c.id, score: r.score, pct: r.pct, items: r.items, hint });
      saved.current = true;
    }
    setStep(4);
  }

  const q = c.questions[qi];
  const qAnswered = q && answers[q.id];
  const nextCase = CASES[CASES.findIndex((x) => x.id === c.id) + 1];
  const viewNames = presets.map((p) => p.label.toLowerCase());

  const marks = mark && step === 1 ? [{ pos: mark.point, rot: mark.rot, ang: mark.ang, color: loc ? (loc.correct ? '#34d399' : '#f87171') : '#ffb547' }] : [];
  const answer = showAnswer ? { pos: study.fracturePoint, radius: study.tolerance } : null;
  const panes = shown === 'both' ? presets.slice(0, 2) : presets.filter((p) => p.id === shown);

  const xray = (p) => (
    <XrayView
      key={p.id}
      study={study}
      rot={p.rot}
      ang={p.ang}
      windowing={win}
      soft={soft}
      marks={marks}
      answer={answer}
      onPick={picking ? (r) => setMark({ point: r.point.clone(), dist: r.dist, rot: r.rot, ang: r.ang }) : undefined}
    />
  );
  const p3 = presets.find((p) => p.id === v3.view) || presets[0];

  return (
    <div className="page runner">
      <div className="runner-head">
        <a href="#/casos" className="back">
          <Icon name="arrowL" size={15} /> Casos
        </a>
        <div className="row gap-sm wrap">
          <h1>{c.title}</h1>
          <span className="pill" style={{ '--pc': LEVELS[c.level].color }}>
            {LEVELS[c.level].label}
          </span>
        </div>
        <ol className="stepper">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'cur' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span>{i < step ? <Icon name="check" size={13} stroke={2.6} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {error && <div className="alert">No se pudieron cargar los modelos óseos. Recarga la página.</div>}

      {step === 0 && (
        <div className="case-intro card">
          <div className="patient">
            <div className="avatar">
              <Icon name="user" size={26} />
            </div>
            <div>
              <b>
                {c.patient.sex === 'F' ? 'Mujer' : 'Hombre'}, {c.patient.age} años
              </b>
              <div className="small muted">{c.region} · paciente simulado</div>
            </div>
          </div>
          <h3>Historia clínica</h3>
          <p className="vignette">{c.vignette}</p>
          <div className="objective">
            <b>Objetivo de aprendizaje:</b> {c.objective}
          </div>
          <p className="small muted">
            Tienes {presets.length} proyecciones ({listText(viewNames)}) reconstruidas sobre huesos humanos reales. Primero haz la lectura sistemática;
            después marca dónde está la fractura, si la hay.
          </p>
          <button className="btn btn--primary" onClick={() => setStep(1)}>
            Ver el estudio <Icon name="arrowR" size={16} />
          </button>
        </div>
      )}

      {step >= 1 && step <= 3 && (
        <div className="workspace">
          <section className="panel ws-viewer" aria-label="Visor">
            {step < 3 ? (
              <>
                <div className="toolbar">
                  <div className="seg seg--hud" role="tablist" aria-label="Proyección">
                    {presets.length > 1 && (
                      <button role="tab" aria-selected={shown === 'both'} className={shown === 'both' ? 'on' : ''} onClick={() => setShown('both')}>
                        {presets.length > 2 ? `${presets[0].short} + ${presets[1].short}` : 'Ambas'}
                      </button>
                    )}
                    {presets.map((p) => (
                      <button key={p.id} role="tab" aria-selected={shown === p.id} className={shown === p.id ? 'on' : ''} onClick={() => setShown(p.id)}>
                        {p.short || p.label}
                      </button>
                    ))}
                  </div>
                  <label className="mini-range">
                    <span>Exposición</span>
                    <input type="range" min="0.2" max="1.4" step="0.01" value={win.gain} onChange={(e) => setWin({ ...win, gain: +e.target.value })} />
                  </label>
                  <label className="mini-range">
                    <span>Contraste</span>
                    <input type="range" min="0.3" max="1.4" step="0.01" value={2 - win.width} onChange={(e) => setWin({ ...win, width: 2 - +e.target.value })} />
                  </label>
                  <Toggle on={soft} onClick={() => setSoft(!soft)}>
                    Partes blandas
                  </Toggle>
                  <Toggle on={win.invert} onClick={() => setWin({ ...win, invert: !win.invert })}>
                    Invertir
                  </Toggle>
                </div>
                <div className={`ws-split ${panes.length < 2 ? 'ws-split--single' : ''}`}>{panes.map(xray)}</div>
                <p className="panel-foot">
                  Rueda = zoom · arrastrar = mover
                  {picking && ' · haz clic sobre la fractura para marcarla (en cualquier proyección)'}
                </p>
              </>
            ) : (
              <>
                <div className="toolbar">
                  <Toggle on={v3.skeleton} onClick={() => setV3({ ...v3, skeleton: !v3.skeleton })}>
                    Esqueleto
                  </Toggle>
                  <Toggle on={v3.see} onClick={() => setV3({ ...v3, see: !v3.see })}>
                    Transparencia
                  </Toggle>
                  <Toggle on={v3.labels} onClick={() => setV3({ ...v3, labels: !v3.labels })}>
                    Etiquetas
                  </Toggle>
                  {hasFracture && (
                    <Toggle on={v3.highlight} onClick={() => setV3({ ...v3, highlight: !v3.highlight })}>
                      Resaltar trazo
                    </Toggle>
                  )}
                  {hasFracture && (
                    <label className="mini-range">
                      <span>Desplazada</span>
                      <input type="range" min="0" max="1" step="0.01" value={v3.reduction} aria-label="Reducción" onChange={(e) => setV3({ ...v3, reduction: +e.target.value })} />
                      <span>Reducida</span>
                    </label>
                  )}
                  <div className="seg seg--hud" role="tablist" aria-label="Panel derecho">
                    {presets.map((p) => (
                      <button key={p.id} className={v3.right === 'sim' && v3.view === p.id ? 'on' : ''} onClick={() => setV3({ ...v3, right: 'sim', view: p.id })}>
                        {p.short}
                      </button>
                    ))}
                    {c.radiographs?.length > 0 && (
                      <button className={v3.right === 'real' ? 'on' : ''} onClick={() => setV3({ ...v3, right: 'real' })}>
                        Real
                      </button>
                    )}
                  </div>
                </div>
                <div className="ws-split">
                  <Anatomy3D
                    study={study}
                    rot={p3.rot}
                    ang={p3.ang}
                    skeleton={v3.skeleton}
                    seeThrough={v3.see}
                    labels={v3.labels}
                    highlight={hasFracture && v3.highlight}
                    reduction={v3.reduction}
                    showBeam
                  />
                  {v3.right === 'real' ? (
                    <RealRadiograph ids={c.radiographs} />
                  ) : (
                    <XrayView study={study} rot={p3.rot} ang={p3.ang} windowing={win} soft={soft} />
                  )}
                </div>
                <p className="panel-foot">
                  3D: arrastra para rotar · clic derecho para desplazar · la radiografía refleja la reducción en tiempo real
                </p>
              </>
            )}
          </section>

          <aside className="ws-panel">
            {step === 1 && (
              <>
                <div className="panel-block">
                  <h3>1. Lectura sistemática (ABCS)</h3>
                  <p className="small muted">Revisa cada punto en todas las proyecciones y márcalo cuando lo hayas hecho.</p>
                  <ul className="checklist">
                    {ABCS.map((a) => (
                      <li key={a.key}>
                        <label className={checked[a.key] ? 'on' : ''}>
                          <input type="checkbox" checked={!!checked[a.key]} disabled={!!loc} onChange={() => setChecked({ ...checked, [a.key]: !checked[a.key] })} />
                          <span className="abc">{a.key}</span>
                          <span>
                            <b>{a.title}</b>
                            <small>{a.hint}</small>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`panel-block ${allChecked ? '' : 'locked'}`}>
                  <h3>2. Localiza la fractura</h3>
                  {!allChecked && <p className="small muted">Completa la lectura sistemática para continuar.</p>}
                  {allChecked && !loc && (
                    <>
                      <p className="small">{mark ? 'Marca colocada. Puedes moverla haciendo clic en otro punto.' : 'Haz clic en la imagen donde crees que está la fractura.'}</p>
                      {!hint ? (
                        <button className="link-btn" onClick={() => setHint(true)}>
                          <Icon name="bulb" size={15} /> Ver pista (−{HINT_COST} puntos)
                        </button>
                      ) : (
                        <div className="hint">
                          <Icon name="bulb" size={16} />
                          <span>{c.hint}</span>
                        </div>
                      )}
                      <Confidence value={locConf} onChange={setLocConf} />
                      <div className="col gap-sm">
                        <button className="btn btn--primary" disabled={!mark || !locConf || !study} onClick={() => confirmLoc(false)}>
                          Confirmar ubicación
                        </button>
                        <button className="btn btn--ghost" disabled={!locConf} onClick={() => confirmLoc(true)}>
                          No identifico fractura
                        </button>
                      </div>
                    </>
                  )}
                  {loc && (
                    <div className={`feedback ${loc.correct ? 'ok' : 'bad'}`}>
                      <b>{loc.correct ? '¡Correcto!' : 'No del todo'}</b>
                      <p>
                        {hasFracture
                          ? loc.correct
                            ? 'Ubicaste bien la fractura. El círculo verde muestra la zona del hallazgo.'
                            : loc.none
                              ? 'Sí hay una fractura. El círculo verde muestra dónde está. Vuelve a mirar esa zona en todas las proyecciones.'
                              : 'Tu marca quedó fuera de la zona de la fractura. El círculo verde muestra la ubicación correcta.'
                          : loc.correct
                            ? 'Este estudio no muestra fractura. Hacer la lectura completa y declararlo con seguridad es la conducta correcta.'
                            : 'Este estudio no tiene fractura visible. Marcar un hallazgo que no existe también es un error que hay que entrenar.'}
                      </p>
                      <button className="btn btn--primary" onClick={() => setStep(2)}>
                        Continuar a la clasificación <Icon name="arrowR" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 2 && q && (
              <div className="panel-block">
                <div className="row between">
                  <h3>
                    Pregunta {qi + 1} de {c.questions.length}
                  </h3>
                  <span className="pill pill--soft">{q.skill}</span>
                </div>
                <p className="q-prompt">{q.prompt}</p>
                <div className="options">
                  {q.options.map((o, i) => {
                    let cls = '';
                    if (qAnswered) {
                      if (i === q.answer) cls = 'ok';
                      else if (i === qAnswered.choice) cls = 'bad';
                    } else if (draft.choice === i) cls = 'sel';
                    return (
                      <button key={o} className={`option ${cls}`} disabled={!!qAnswered} onClick={() => setDraft({ ...draft, choice: i })}>
                        <span className="opt-l">{String.fromCharCode(65 + i)}</span>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {!qAnswered ? (
                  <>
                    <Confidence value={draft.conf} onChange={(v) => setDraft({ ...draft, conf: v })} />
                    <button
                      className="btn btn--primary"
                      disabled={draft.choice == null || !draft.conf}
                      onClick={() => {
                        setAnswers({ ...answers, [q.id]: draft });
                        setDraft({ choice: null, conf: null });
                      }}
                    >
                      Responder
                    </button>
                  </>
                ) : (
                  <div className={`feedback ${qAnswered.choice === q.answer ? 'ok' : 'bad'}`}>
                    <b>{qAnswered.choice === q.answer ? '¡Correcto!' : 'Incorrecto'}</b>
                    <p>{q.explanation}</p>
                    {qi < c.questions.length - 1 ? (
                      <button className="btn btn--primary" onClick={() => setQi(qi + 1)}>
                        Siguiente pregunta <Icon name="arrowR" size={16} />
                      </button>
                    ) : (
                      <button className="btn btn--primary" onClick={() => setStep(3)}>
                        Confirmar en 3D <Icon name="arrowR" size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <>
                <div className="panel-block">
                  <h3>
                    <Icon name="cube" size={17} /> Confirma en 3D
                  </h3>
                  <p className="small">
                    <b>Diagnóstico del caso:</b> {c.diagnosis}
                  </p>
                  {hasFracture ? (
                    <ul className="tasks small">
                      <li>Rota el modelo y ubica el trazo (resaltado en ámbar).</li>
                      <li>
                        Mueve el control <i>Desplazada → Reducida</i> y observa cómo cambia la radiografía.
                      </li>
                      <li>Cambia de proyección: ¿en cuál se aprecia mejor el desplazamiento?</li>
                      {c.radiographs?.length > 0 && <li>Compara con la radiografía real (botón «Real»).</li>}
                    </ul>
                  ) : (
                    <p className="small">Explora la anatomía normal con etiquetas. Reconocer lo normal es la base para detectar lo anormal.</p>
                  )}
                </div>
                <div className="panel-block">
                  <h4>Perlas</h4>
                  <ul className="small">
                    {c.teaching.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <h4>Errores frecuentes</h4>
                  <ul className="small">
                    {c.pitfalls.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <button className="btn btn--primary" onClick={goSummary}>
                  Ver resumen <Icon name="arrowR" size={16} />
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {step === 4 && <Summary c={c} r={computeScore()} hint={hint} nextCase={nextCase} />}
    </div>
  );
}

function Summary({ c, r, hint, nextCase }) {
  const pct = Math.round(r.pct * 100);
  const sure = r.items.filter((i) => i.conf === 'alta');
  const sureOk = sure.filter((i) => i.correct).length;
  const guess = r.items.filter((i) => i.conf === 'baja');
  const guessOk = guess.filter((i) => i.correct).length;
  return (
    <div className="summary">
      <div className="card summary-score">
        <div className="ring" style={{ '--p': pct, '--rc': pct >= 70 ? 'var(--ok)' : pct >= 40 ? 'var(--warn)' : 'var(--bad)' }}>
          <span>{pct}%</span>
        </div>
        <div>
          <h2>{pct >= 70 ? 'Caso aprobado' : 'Sigue practicando'}</h2>
          <p className="muted">
            +{r.score} XP {hint && '· usaste una pista'}
          </p>
          <p>
            <b>Diagnóstico:</b> {c.diagnosis}
          </p>
        </div>
      </div>
      <div className="grid grid--2">
        <div className="card">
          <h3>Detalle</h3>
          <ul className="result-list">
            {r.items.map((i) => (
              <li key={i.label} className={i.correct ? 'ok' : 'bad'}>
                <span>
                  <Icon name={i.correct ? 'check' : 'x'} size={14} stroke={2.6} />
                </span>
                <div>
                  <div>{i.label}</div>
                  <small className="muted">
                    {i.skill}
                    {i.conf && ` · seguridad: ${CONF.find((x) => x.k === i.conf).label.toLowerCase()}`}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Calibración de tu seguridad</h3>
          <p className="small">
            Marcaste <b>«Seguro»</b> en {sure.length} respuesta(s) y acertaste {sureOk}.
            {guess.length > 0 && (
              <>
                {' '}
                Marcaste <b>«Adivinando»</b> en {guess.length} y acertaste {guessOk}.
              </>
            )}
          </p>
          <p className="small muted">
            {sure.length && sureOk < sure.length
              ? 'Ojo: tuviste errores con alta seguridad. Son los más importantes de repasar, porque en la práctica no te harían dudar.'
              : 'Tu seguridad coincide con tus aciertos. Sigue así.'}
          </p>
          <h4>Para repasar</h4>
          <ul className="small">
            {c.teaching.concat(c.pitfalls).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      {c.radiographs?.length > 0 && (
        <div className="card">
          <h3>
            <Icon name="image" size={17} /> Así se ve en pacientes reales
          </h3>
          <p className="small muted">Radiografías publicadas con licencia abierta. Compáralas con la simulación que acabas de leer.</p>
          <div className="compare-real">
            {c.radiographs.map((rid) => (
              <RealRadiograph key={rid} ids={[rid]} />
            ))}
          </div>
        </div>
      )}
      <div className="row gap wrap">
        <button className="btn btn--ghost" onClick={() => window.location.reload()}>
          <Icon name="refresh" size={16} /> Repetir caso
        </button>
        <a className="btn btn--ghost" href={`#/lab/${c.id}`}>
          <Icon name="cube" size={16} /> Abrir en el laboratorio
        </a>
        {nextCase && (
          <a className="btn btn--primary" href={`#/caso/${nextCase.id}`}>
            Siguiente: {nextCase.title} <Icon name="arrowR" size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
