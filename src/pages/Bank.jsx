import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import XrayView from '../components/XrayView.jsx';
import RealRadiograph, { Credit } from '../components/RealRadiograph.jsx';
import Icon from '../components/Icon.jsx';
import { LANDMARKS, REGIONS } from '../data/anatomy.js';
import { ATLAS, CASES } from '../data/cases.js';
import { RADIOGRAPH_LIST, radiographUrl } from '../data/radiographs.js';
import { useStudy } from '../hooks/useStudy.js';
import { carmCamera } from '../lib/carm.js';
import { snapshot } from '../lib/snapshot.js';
import { store, useStore } from '../lib/store.js';

const today = () => new Date().toISOString().slice(0, 10);

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Tarjetas de anatomía: cada reparo de la región que cae dentro del detector
// en la primera proyección del atlas.
function allCards() {
  const cam = new THREE.PerspectiveCamera();
  const cards = [];
  ATLAS.forEach((a) => {
    const region = REGIONS[a.region];
    const p = region.presets.find((x) => x.id === a.views[0]) || region.presets[0];
    const geo = carmCamera(cam, { region, iso: new THREE.Vector3(...region.iso), scale: 1 }, p.rot, p.ang, 1);
    const bones = new Set([...region.target, ...region.context]);
    LANDMARKS.forEach((l) => {
      if (!bones.has(l.bone)) return;
      const q = new THREE.Vector3(...l.pos).project(cam);
      if (Math.abs(q.x) > geo.collim[0] * 0.9 || Math.abs(q.y) > geo.collim[1] * 0.9) return;
      cards.push({ id: `${a.id}:${l.name}`, atlas: a, region: a.region, view: p, name: l.name });
    });
  });
  return cards;
}

function Gallery() {
  const items = [
    ...ATLAS.map((a) => ({ id: a.id, title: a.title, sub: 'Anatomía normal', def: { region: a.region }, views: a.views.slice(0, 2), to: `/lab/${a.region}` })),
    ...CASES.map((c) => ({ id: c.id, title: c.title, sub: c.region, def: c.study, views: c.views.slice(0, 2), to: `/lab/${c.id}` })),
  ];
  return (
    <>
      <h2 className="section-title">
        <Icon name="scan" size={20} /> Estudios simulados (DRR)
      </h2>
      <p className="muted small">Proyecciones reconstruidas sobre huesos humanos reales. Abre cualquiera en el laboratorio para girar el arco en C.</p>
      <div className="grid grid--gallery">
        {items.map((it) => (
          <GalleryItem key={it.id} it={it} />
        ))}
      </div>
      <h2 className="section-title">
        <Icon name="image" size={20} /> Radiografías reales con licencia abierta
      </h2>
      <p className="muted small">Imágenes de pacientes publicadas en Wikimedia Commons bajo CC0, dominio público, CC BY o CC BY-SA. Cada una lleva su atribución.</p>
      <RealGallery />
    </>
  );
}

function GalleryItem({ it }) {
  const [src, setSrc] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all(it.views.map((v) => snapshot(it.id, it.def, { view: v, w: 220, h: 260 }))).then((u) => alive && setSrc(u.filter(Boolean)));
    return () => {
      alive = false;
    };
  }, [it]);
  const region = REGIONS[it.def.region];
  const names = it.views.map((v) => region.presets.find((p) => p.id === v)?.short || v).join(' / ');
  return (
    <a className="gallery-item" href={`#${it.to}`}>
      <div className={`gallery-imgs ${it.views.length < 2 ? 'gallery-imgs--one' : ''}`}>
        {src.length ? src.map((s, i) => <img key={i} src={s} alt="" />) : <div className="thumb-ph" />}
      </div>
      <b>{it.title}</b>
      <span className="small muted">
        {it.sub} · {names}
      </span>
    </a>
  );
}

function RealGallery() {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="grid grid--gallery">
        {RADIOGRAPH_LIST.map((r) => (
          <button key={r.id} className="gallery-item gallery-item--real" onClick={() => setOpen(r.id)}>
            <div className="gallery-imgs gallery-imgs--one">
              <img src={radiographUrl(r.id)} alt={r.title} loading="lazy" />
            </div>
            <b>{r.title}</b>
            <Credit id={r.id} compact />
          </button>
        ))}
      </div>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Radiografía real" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal-body panel">
            <div className="panel-bar">
              <span className="panel-tag">RADIOGRAFÍA REAL</span>
              <button className="link-btn" onClick={() => setOpen(null)} aria-label="Cerrar">
                <Icon name="x" size={18} />
              </button>
            </div>
            <RealRadiograph ids={[open]} className="modal-img" />
          </div>
        </div>
      )}
    </>
  );
}

function Review() {
  const s = useStore();
  const cards = useMemo(allCards, []);
  const due = cards.filter((c) => !s.cards[c.id] || s.cards[c.id].due <= today());
  const [session, setSession] = useState(null);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [okCount, setOk] = useState(0);

  const card = session?.[i];
  const { study } = useStudy(card ? { region: card.region } : null, card ? card.region : null);
  const options = useMemo(() => {
    if (!card) return [];
    const same = cards.filter((c) => c.region === card.region && c.name !== card.name).map((c) => c.name);
    const other = cards.filter((c) => c.region !== card.region).map((c) => c.name);
    const distract = shuffle([...new Set(same)]).slice(0, 3);
    while (distract.length < 3) distract.push(shuffle(other).find((n) => !distract.includes(n) && n !== card.name));
    return shuffle([card.name, ...distract]);
  }, [card, cards]);

  const boxes = [1, 2, 3, 4, 5].map((b) => cards.filter((c) => (s.cards[c.id]?.box || 0) === b).length);
  const unseen = cards.filter((c) => !s.cards[c.id]).length;
  const max = Math.max(unseen, ...boxes, 1);

  if (!session) {
    return (
      <div className="grid grid--2">
        <div className="card">
          <h3>Repaso con repetición espaciada</h3>
          <p className="small">
            Cada tarjeta señala un reparo anatómico en una radiografía simulada. Si aciertas, la tarjeta sube de caja y vuelve más tarde (1, 2, 4, 7 y 14
            días). Si fallas, vuelve a la caja 1.
          </p>
          <p>
            <b className="mono">{due.length}</b> tarjetas pendientes hoy, de {cards.length}.
          </p>
          <button className="btn btn--primary" disabled={!due.length} onClick={() => (setSession(shuffle(due).slice(0, 8)), setI(0), setOk(0), setPick(null))}>
            <Icon name="play" size={15} /> {due.length ? `Repasar ${Math.min(8, due.length)} tarjetas` : 'Nada pendiente por hoy'}
          </button>
        </div>
        <div className="card">
          <h3>Cajas de Leitner</h3>
          <div className="boxes">
            <div className="box">
              <b>{unseen}</b>
              <div className="box-bar" style={{ height: `${(unseen / max) * 100}%` }} />
              <span>Nuevas</span>
            </div>
            {boxes.map((n, k) => (
              <div key={k} className="box">
                <b>{n}</b>
                <div className="box-bar" style={{ height: `${(n / max) * 100}%` }} />
                <span>Caja {k + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="card center">
        <h3>Sesión terminada</h3>
        <p>
          Acertaste <b>{okCount}</b> de {session.length}.
        </p>
        <button className="btn btn--primary" onClick={() => setSession(null)}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="workspace workspace--review">
      <section className="panel ws-viewer" aria-label="Radiografía">
        <XrayView study={study} rot={card.view.rot} ang={card.view.ang} windowing={{ gain: REGIONS[card.region].gain, level: 0.5, width: 1, invert: false }} focus={card.name} labels={!!pick} />
      </section>
      <aside className="ws-panel">
        <div className="panel-block">
          <div className="row between">
            <h3>
              Tarjeta {i + 1} / {session.length}
            </h3>
            <span className="pill pill--soft">{card.atlas.title}</span>
          </div>
          <p className="q-prompt">¿Qué estructura señala el círculo ámbar?</p>
          <div className="options">
            {options.map((o, k) => {
              let cls = '';
              if (pick) cls = o === card.name ? 'ok' : o === pick ? 'bad' : '';
              return (
                <button
                  key={o}
                  className={`option ${cls}`}
                  disabled={!!pick || !study}
                  onClick={() => {
                    setPick(o);
                    const ok = o === card.name;
                    if (ok) setOk(okCount + 1);
                    store.reviewCard(card.id, ok);
                  }}
                >
                  <span className="opt-l">{String.fromCharCode(65 + k)}</span>
                  {o}
                </button>
              );
            })}
          </div>
          {pick && (
            <>
              <p className="small muted">Ahora se muestran todos los reparos de la región para que ubiques los demás.</p>
              <button className="btn btn--primary" onClick={() => (setI(i + 1), setPick(null))}>
                Siguiente <Icon name="arrowR" size={16} />
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function Bank() {
  const [tab, setTab] = useState('repaso');
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Banco educativo</span>
          <h1>Banco de imágenes y repaso</h1>
          <p className="muted">Estudios simulados y radiografías reales con licencia abierta, más tarjetas de recuperación activa.</p>
        </div>
      </div>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'repaso'} className={tab === 'repaso' ? 'on' : ''} onClick={() => setTab('repaso')}>
          Repaso (tarjetas)
        </button>
        <button role="tab" aria-selected={tab === 'galeria'} className={tab === 'galeria' ? 'on' : ''} onClick={() => setTab('galeria')}>
          Galería de estudios
        </button>
      </div>
      {tab === 'repaso' ? <Review /> : <Gallery />}
    </div>
  );
}
