import { useEffect, useState } from 'react';
import Anatomy3D from '../components/Anatomy3D.jsx';
import XrayView from '../components/XrayView.jsx';
import Icon from '../components/Icon.jsx';
import { REGIONS } from '../data/anatomy.js';
import { CASES, getCase } from '../data/cases.js';
import { RADIOGRAPH_LIST } from '../data/radiographs.js';
import { useStudy } from '../hooks/useStudy.js';
import { stats, useStore } from '../lib/store.js';

const SERVICES = [
  { icon: 'image', title: 'Banco educativo de imágenes', text: 'Radiografías simuladas sobre huesos reales y radiografías reales con licencia abierta.', to: '/banco' },
  { icon: 'cases', title: 'Casos clínicos simulados', text: 'Escenarios con historia clínica, lectura sistemática y preguntas de clasificación.', to: '/casos' },
  { icon: 'bone', title: 'Reconocimiento de estructuras y fracturas', text: 'Marca la fractura en la radiografía y confírmala en el modelo 3D.', to: '/lab' },
  { icon: 'zap', title: 'Retroalimentación inmediata', text: 'Cada respuesta trae una explicación para entender el error y repasar.', to: '/casos' },
  { icon: 'layers', title: 'Rutas de aprendizaje por niveles', text: 'Módulos básicos, intermedios y avanzados con dificultad progresiva.', to: '/casos' },
  { icon: 'chart', title: 'Panel de seguimiento', text: 'Ejercicios completados, resultados y temas por reforzar.', to: '/progreso' },
  { icon: 'building', title: 'Planes institucionales', text: 'Acceso por grupos para universidades y docentes.', to: '/planes' },
];

const METHODS = [
  { k: 'Aprendizaje basado en casos', v: 'Cada ejercicio parte de una historia clínica: aprendes en contexto, como en la práctica.' },
  { k: 'Lectura sistemática ABCS', v: 'Antes de responder recorres Alineación, Hueso, Cartílago y partes blandas (Soft tissue). El método evita los hallazgos que se pasan por alto.' },
  { k: 'Predice y confirma', v: 'Primero marcas en la radiografía 2D. Después confirmas en el modelo 3D por qué la viste o por qué se te pasó.' },
  { k: 'Seguridad de la respuesta', v: 'Indicas qué tan seguro estás de cada respuesta. El panel compara tu seguridad con tus aciertos.' },
  { k: 'Repetición espaciada', v: 'Las tarjetas de anatomía vuelven justo cuando estás a punto de olvidarlas (sistema Leitner).' },
  { k: 'Técnica radiológica', v: 'En el laboratorio mueves el arco en C y aprendes por qué cada proyección muestra lo que muestra.' },
];

const HERO_CASE = 'colles';

export default function Home() {
  const s = useStore();
  const st = stats(s);
  const c = getCase(HERO_CASE);
  const region = REGIONS[c.study.region];
  const { study } = useStudy(c.study, `hero-${HERO_CASE}`);
  const views = c.views.map((v) => region.presets.find((p) => p.id === v));
  const [vi, setVi] = useState(0);
  const [auto, setAuto] = useState(true);
  const view = views[vi];

  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => setVi((i) => (i + 1) % views.length), 4500);
    return () => clearInterval(t);
  }, [auto, views.length]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Radiología e imágenes diagnósticas</span>
          <h1>
            Estudia fracturas sobre <span className="accent">huesos humanos reales</span>, en 3D y en rayos X.
          </h1>
          <p className="lead">
            RadioSim reconstruye la radiografía a partir del espesor real de cada hueso. Gira el arco en C, compara con radiografías de pacientes y recibe
            retroalimentación inmediata en cada caso.
          </p>
          <div className="row gap wrap">
            <a className="btn btn--primary" href="#/casos">
              <Icon name="play" size={16} /> Empezar un caso
            </a>
            <a className="btn btn--ghost" href="#/lab">
              <Icon name="cube" size={16} /> Abrir laboratorio 3D
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <b>{CASES.length}</b>
              <span>casos clínicos</span>
            </div>
            <div>
              <b>{Object.keys(REGIONS).length}</b>
              <span>regiones anatómicas</span>
            </div>
            <div>
              <b>{RADIOGRAPH_LIST.length}</b>
              <span>radiografías reales</span>
            </div>
            <div>
              <b>{st.completed}</b>
              <span>completados por ti</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <section className="panel">
            <div className="panel-bar">
              <span className="panel-tag">ANATOMÍA 3D</span>
              <span className="panel-meta">{c.title}</span>
            </div>
            <Anatomy3D study={study} rot={view.rot} ang={view.ang} showBeam autoRotate highlight className="lab-canvas" />
          </section>
          <section className="panel">
            <div className="panel-bar">
              <span className="panel-tag">PROYECCIÓN</span>
              <div className="seg seg--hud">
                {views.map((v, i) => (
                  <button
                    key={v.id}
                    className={vi === i ? 'on' : ''}
                    onClick={() => {
                      setAuto(false);
                      setVi(i);
                    }}
                  >
                    {v.short}
                  </button>
                ))}
              </div>
            </div>
            <XrayView study={study} rot={view.rot} ang={view.ang} windowing={{ gain: region.gain, level: 0.5, width: 1, invert: false }} className="lab-canvas" />
          </section>
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">Portafolio</span>
        <h2>Servicios de la plataforma</h2>
        <p className="muted">Los siete servicios de la propuesta RadioSim, cada uno con su espacio en el portal.</p>
        <div className="grid grid--services">
          {SERVICES.map((sv) => (
            <a key={sv.title} className="card card--link" href={`#${sv.to}`}>
              <span className="service-icon">
                <Icon name={sv.icon} size={22} />
              </span>
              <h3>{sv.title}</h3>
              <p>{sv.text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">Metodología</span>
        <h2>Cómo aprendes aquí</h2>
        <div className="grid grid--methods">
          {METHODS.map((m, i) => (
            <div key={m.k} className="method">
              <span className="method-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4>{m.k}</h4>
                <p>{m.v}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">Recorrido</span>
        <h2>Ciclo del estudiante</h2>
        <ol className="steps-inline">
          {['Elige un nivel', 'Lee el caso', 'Lectura ABCS', 'Marca la fractura', 'Clasifica', 'Confirma en 3D', 'Compara con una real', 'Revisa tu progreso'].map((t, i) => (
            <li key={t}>
              <span>{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
