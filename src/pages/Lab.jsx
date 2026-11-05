import { useMemo, useState } from 'react';
import Anatomy3D from '../components/Anatomy3D.jsx';
import XrayView from '../components/XrayView.jsx';
import AnglePlot from '../components/AnglePlot.jsx';
import CArmMini from '../components/CArmMini.jsx';
import RealRadiograph from '../components/RealRadiograph.jsx';
import Icon from '../components/Icon.jsx';
import { REGIONS, REGION_LIST } from '../data/anatomy.js';
import { ATLAS, CASES, getAtlas, getCase } from '../data/cases.js';
import { useStudy } from '../hooks/useStudy.js';
import { angLabel, rotLabel, tubeDir } from '../lib/carm.js';
import { go } from '../lib/router.js';
import { store } from '../lib/store.js';

function resolve(initial) {
  const c = initial && getCase(initial);
  if (c) return { key: c.id, kind: 'case', c, def: c.study, region: c.study.region, views: c.views, radiographs: c.radiographs || [], title: c.title };
  const a = initial && getAtlas(initial);
  const rid = a ? a.region : REGIONS[initial] ? initial : 'hombro';
  const reg = REGIONS[rid];
  return {
    key: rid,
    kind: 'region',
    def: { region: rid },
    region: rid,
    views: reg.presets.map((p) => p.id),
    radiographs: ATLAS.filter((x) => x.region === rid).flatMap((x) => x.radiographs || []),
    title: `${reg.title} · anatomía normal`,
  };
}

function Toggle({ on, onClick, children, icon }) {
  return (
    <button className={`hud-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="ht-box" aria-hidden="true">
        {on && <Icon name="check" size={11} stroke={3} />}
      </span>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

const beamAngle = (a, b) => {
  const t1 = tubeDir(a.rot, a.ang);
  const t2 = tubeDir(b.rot, b.ang);
  return (Math.acos(Math.min(Math.max(t1.dot(t2), -1), 1)) * 180) / Math.PI;
};

export default function Lab({ initial }) {
  const src = useMemo(() => resolve(initial), [initial]);
  const region = REGIONS[src.region];
  const { study, error } = useStudy(src.def, src.key);
  const first = region.presets.find((p) => p.id === src.views[0]) || region.presets[0];
  const [rot, setRot] = useState(first.rot);
  const [ang, setAng] = useState(first.ang);
  const [v3d, setV3d] = useState({ detector: false, skeleton: true, see: false, labels: false, planes: false, skin: false, beam: true });
  const [xr, setXr] = useState({ tab: 'sim', soft: true, labels: false, invert: false, gain: region.gain || 0.55, level: 0.5, width: 1 });
  const [reduction, setReduction] = useState(0);
  const [highlight, setHighlight] = useState(true);
  const [challenge, setChallenge] = useState(null);

  const setAngles = (r, a) => {
    setRot(r);
    setAng(a);
  };
  const preset = region.presets.find((p) => Math.abs(p.rot - rot) < 0.5 && Math.abs(p.ang - ang) < 0.5);
  const hasReal = src.radiographs.length > 0;
  const isCase = src.kind === 'case';

  function startChallenge() {
    const pool = region.presets.filter((p) => !(Math.abs(p.rot - rot) < 1 && Math.abs(p.ang - ang) < 1));
    const usePreset = Math.random() < 0.5 && pool.length;
    const target = usePreset
      ? pool[Math.floor(Math.random() * pool.length)]
      : { rot: Math.round((Math.random() * 180 - 90) / 5) * 5, ang: Math.round((Math.random() * 50 - 25) / 5) * 5 };
    setChallenge({ target: { rot: target.rot, ang: target.ang, label: target.label }, result: null, tries: 0 });
    setV3d((v) => ({ ...v, detector: false }));
  }
  function checkChallenge() {
    const err = beamAngle({ rot, ang }, challenge.target);
    const ok = err <= 12;
    const result = { err, ok, grade: err <= 5 ? 'Excelente' : ok ? 'Bien' : 'Lejos' };
    setChallenge({ ...challenge, result, tries: challenge.tries + 1 });
    store.addAttempt({
      caseId: `reto-proyeccion-${src.region}`,
      score: err <= 5 ? 20 : ok ? 12 : 0,
      pct: Math.max(0, 1 - err / 40),
      hint: false,
      items: [{ skill: 'Técnica', correct: ok, conf: null, region: region.group, level: 'intermedio', label: `Reproducir una proyección de ${region.title.toLowerCase()}` }],
    });
  }

  return (
    <div className="lab">
      <header className="lab-head">
        <div className="lab-title">
          <span className="eyebrow">
            <Icon name="cube" size={14} /> Laboratorio de proyecciones
          </span>
          <h1>{src.title}</h1>
        </div>
        <div className="lab-source">
          <div className="chips" role="tablist" aria-label="Región anatómica">
            {REGION_LIST.map((r) => (
              <button key={r.id} role="tab" aria-selected={src.kind === 'region' && src.region === r.id} className={`chip ${src.kind === 'region' && src.region === r.id ? 'on' : ''}`} onClick={() => go(`/lab/${r.id}`)}>
                {r.title}
              </button>
            ))}
          </div>
          <label className="select-hud">
            <span>Caso</span>
            <select value={isCase ? src.key : ''} onChange={(e) => go(`/lab/${e.target.value || src.region}`)}>
              <option value="">— anatomía normal —</option>
              {CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.diagnosis.split(':')[0].split(',')[0].slice(0, 46)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && <div className="alert">No se pudieron cargar los modelos óseos. Recarga la página.</div>}

      <div className="lab-grid">
        {/* ------------------------------------------------ 3D */}
        <section className="panel p-3d" aria-label="Vista 3D">
          <div className="panel-bar">
            <span className="panel-tag">ANATOMÍA 3D</span>
            <div className="toggles">
              <Toggle on={v3d.detector} onClick={() => setV3d({ ...v3d, detector: !v3d.detector })}>
                Vista del tubo
              </Toggle>
              <Toggle on={v3d.skeleton} onClick={() => setV3d({ ...v3d, skeleton: !v3d.skeleton })}>
                Esqueleto
              </Toggle>
              <Toggle on={v3d.see} onClick={() => setV3d({ ...v3d, see: !v3d.see })}>
                Transparencia
              </Toggle>
              <Toggle on={v3d.labels} onClick={() => setV3d({ ...v3d, labels: !v3d.labels })}>
                Etiquetas
              </Toggle>
              <Toggle on={v3d.planes} onClick={() => setV3d({ ...v3d, planes: !v3d.planes })}>
                Planos
              </Toggle>
              <Toggle on={v3d.beam} onClick={() => setV3d({ ...v3d, beam: !v3d.beam })}>
                Haz
              </Toggle>
              <Toggle on={v3d.skin} onClick={() => setV3d({ ...v3d, skin: !v3d.skin })}>
                Piel
              </Toggle>
            </div>
          </div>
          <Anatomy3D
            study={study}
            rot={rot}
            ang={ang}
            detectorView={v3d.detector}
            skeleton={v3d.skeleton}
            seeThrough={v3d.see}
            labels={v3d.labels}
            showPlanes={v3d.planes}
            showBeam={v3d.beam}
            skin={v3d.skin}
            highlight={isCase && highlight}
            reduction={reduction}
            className="lab-canvas"
          />
          <p className="panel-foot">Arrastra para rotar · clic derecho para desplazar · rueda para acercar</p>
        </section>

        {/* ------------------------------------------------ radiografía */}
        <section className="panel p-xr" aria-label="Radiografía">
          <div className="panel-bar">
            <span className="panel-tag">PROYECCIÓN</span>
            <div className="seg seg--hud" role="tablist">
              <button role="tab" aria-selected={xr.tab === 'sim'} className={xr.tab === 'sim' ? 'on' : ''} onClick={() => setXr({ ...xr, tab: 'sim' })}>
                Simulada
              </button>
              <button role="tab" aria-selected={xr.tab === 'real'} className={xr.tab === 'real' ? 'on' : ''} disabled={!hasReal} onClick={() => setXr({ ...xr, tab: 'real' })}>
                Real
              </button>
              <button role="tab" aria-selected={xr.tab === 'split'} className={xr.tab === 'split' ? 'on' : ''} disabled={!hasReal} onClick={() => setXr({ ...xr, tab: 'split' })}>
                Comparar
              </button>
            </div>
          </div>
          <div className={`xr-stage ${xr.tab === 'split' ? 'is-split' : ''}`}>
            {xr.tab !== 'real' && (
              <XrayView
                study={study}
                rot={rot}
                ang={ang}
                soft={xr.soft}
                labels={xr.labels}
                windowing={xr}
                className="lab-canvas"
              />
            )}
            {xr.tab !== 'sim' && <RealRadiograph ids={src.radiographs} className="lab-canvas" />}
          </div>
          <div className="xr-tools">
            <label className="mini-range">
              <span>Exposición</span>
              <input type="range" min="0.2" max="1.4" step="0.01" value={xr.gain} onChange={(e) => setXr({ ...xr, gain: +e.target.value })} />
            </label>
            <label className="mini-range">
              <span>Nivel</span>
              <input type="range" min="0.2" max="0.8" step="0.01" value={xr.level} onChange={(e) => setXr({ ...xr, level: +e.target.value })} />
            </label>
            <label className="mini-range">
              <span>Ventana</span>
              <input type="range" min="0.3" max="1.4" step="0.01" value={xr.width} onChange={(e) => setXr({ ...xr, width: +e.target.value })} />
            </label>
            <Toggle on={xr.soft} onClick={() => setXr({ ...xr, soft: !xr.soft })}>
              Partes blandas
            </Toggle>
            <Toggle on={xr.labels} onClick={() => setXr({ ...xr, labels: !xr.labels })}>
              Reparos
            </Toggle>
            <Toggle on={xr.invert} onClick={() => setXr({ ...xr, invert: !xr.invert })}>
              Invertir
            </Toggle>
          </div>
        </section>

        {/* ------------------------------------------------ controles */}
        <aside className="panel p-ctl" aria-label="Controles del arco en C">
          <div className="panel-bar">
            <span className="panel-tag">ARCO EN C</span>
          </div>
          <div className="ctl-body">
            <div className="readout">
              <div>
                <span className="ro-label">ROTACIÓN</span>
                <span className="ro-value">{rotLabel(rot)}</span>
              </div>
              <input
                type="range"
                className="hud-range"
                min="-180"
                max="180"
                step="1"
                value={rot}
                aria-label="Rotación del tubo"
                onChange={(e) => setRot(+e.target.value)}
              />
              <div className="ro-scale">
                <span>PA</span>
                <span>IZQ</span>
                <span>AP</span>
                <span>DER</span>
                <span>PA</span>
              </div>
            </div>
            <div className="readout">
              <div>
                <span className="ro-label">ANGULACIÓN</span>
                <span className="ro-value">{angLabel(ang)}</span>
              </div>
              <input type="range" className="hud-range" min="-45" max="45" step="1" value={ang} aria-label="Angulación craneocaudal" onChange={(e) => setAng(+e.target.value)} />
              <div className="ro-scale">
                <span>CAU 45</span>
                <span>0</span>
                <span>CEF 45</span>
              </div>
            </div>
            <div className="presets">
              <span className="ro-label">PROYECCIONES</span>
              <div className="preset-grid">
                {region.presets.map((p) => (
                  <button key={p.id} className={`preset ${preset?.id === p.id ? 'on' : ''} ${src.views.includes(p.id) && isCase ? 'is-case' : ''}`} onClick={() => setAngles(p.rot, p.ang)}>
                    <b>{p.short || p.label}</b>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {isCase && study?.fracture && (
              <div className="readout">
                <div>
                  <span className="ro-label">FRAGMENTOS</span>
                  <span className="ro-value">{reduction < 0.02 ? 'Desplazados' : reduction > 0.98 ? 'Reducidos' : `${Math.round(reduction * 100)} %`}</span>
                </div>
                <input type="range" className="hud-range" min="0" max="1" step="0.01" value={reduction} aria-label="Reducción de la fractura" onChange={(e) => setReduction(+e.target.value)} />
                <Toggle on={highlight} onClick={() => setHighlight(!highlight)}>
                  Resaltar trazo en 3D
                </Toggle>
              </div>
            )}
            <div className="challenge">
              {!challenge ? (
                <button className="btn btn--accent btn--block" onClick={startChallenge} disabled={!study}>
                  <Icon name="target" size={16} /> Reto: reproduce una proyección
                </button>
              ) : (
                <div className="challenge-box">
                  <div className="row between">
                    <span className="ro-label">OBJETIVO</span>
                    <button className="link-btn" onClick={() => setChallenge(null)}>
                      Salir
                    </button>
                  </div>
                  <XrayView study={study} rot={challenge.target.rot} ang={challenge.target.ang} soft={xr.soft} windowing={xr} hud={false} className="challenge-img" />
                  {!challenge.result ? (
                    <>
                      <p className="small">Mueve el arco en C hasta que tu proyección coincida con la imagen objetivo.</p>
                      <button className="btn btn--primary btn--block" onClick={checkChallenge}>
                        Comprobar
                      </button>
                    </>
                  ) : (
                    <div className={`feedback ${challenge.result.ok ? 'ok' : 'bad'}`}>
                      <b>
                        {challenge.result.grade}: {challenge.result.err.toFixed(0)}° de diferencia
                      </b>
                      <p className="small">
                        Objetivo: {rotLabel(challenge.target.rot)} · {angLabel(challenge.target.ang)}
                        {challenge.target.label ? ` (${challenge.target.label})` : ''}.
                      </p>
                      <div className="row gap-sm">
                        <button className="btn btn--ghost" onClick={() => setAngles(challenge.target.rot, challenge.target.ang)}>
                          Ver objetivo
                        </button>
                        <button className="btn btn--primary" onClick={startChallenge}>
                          Otro reto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------ info */}
        <section className="panel p-info" aria-label="Qué evaluar">
          <div className="panel-bar">
            <span className="panel-tag">QUÉ EVALUAR</span>
          </div>
          <div className="info-body">
            {preset ? (
              <>
                <h3>{preset.label}</h3>
                <p>{preset.note}</p>
              </>
            ) : (
              <>
                <h3>Proyección libre</h3>
                <p>
                  Estás en {rotLabel(rot)} y {angLabel(ang)}. Observa cómo cambia la superposición de los huesos y el acortamiento aparente al alejarte de las
                  proyecciones estándar.
                </p>
              </>
            )}
            {isCase && (
              <p className="small muted">
                <b>Caso:</b> {getCase(src.key).vignette}{' '}
                <a href={`#/caso/${src.key}`}>Resolver el caso →</a>
              </p>
            )}
            <p className="small muted">
              Rayos X reconstruidos a partir del espesor real de cada hueso (cortical y medular), con partes blandas aproximadas. Distancia fuente-detector de 100
              cm.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ mapa de ángulos */}
        <section className="panel p-plot" aria-label="Mapa de ángulos">
          <div className="panel-bar">
            <span className="panel-tag">ROTACIÓN × ANGULACIÓN</span>
            <span className="panel-meta">arrastra el marcador</span>
          </div>
          <AnglePlot rot={rot} ang={ang} presets={region.presets} target={challenge?.result ? challenge.target : null} onChange={setAngles} />
        </section>

        {/* ------------------------------------------------ arco en C */}
        <section className="panel p-carm" aria-label="Esquema del arco en C">
          <div className="panel-bar">
            <span className="panel-tag">EQUIPO</span>
            <span className="panel-meta">tubo · mesa · detector</span>
          </div>
          <CArmMini rot={rot} ang={ang} regionY={region.iso[1]} />
        </section>
      </div>
      <p className="disclaimer">Simulación con fines educativos. Modelos óseos: BodyParts3D (DBCLS, CC BY-SA 2.1 JP) y donantes anatómicos (CC BY 4.0).</p>
    </div>
  );
}
