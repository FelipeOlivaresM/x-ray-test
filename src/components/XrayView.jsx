import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LAYER_DRR, makeAttTarget, makeComposite } from '../lib/shaders.js';
import { angLabel, carmCamera, rotLabel } from '../lib/carm.js';
import { t } from '../i18n/index.js';

/**
 * Radiografía reconstruida (DRR) del estudio para un ángulo del arco en C.
 * El render se hace a demanda (solo cuando algo cambia).
 */
export default function XrayView({
  study,
  rot = 0,
  ang = 0,
  windowing = { gain: 1, level: 0.5, width: 1, invert: false },
  soft = true,
  marks = [],
  answer = null, // { pos: Vector3, radius }
  focus = null, // nombre de reparo a señalar
  labels = false,
  onPick,
  hud = true,
  title,
  className = '',
  children,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const st = useRef({ zoom: 1, pan: [0, 0], dirty: true });
  const props = useRef({});
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState({ zoom: 1 });
  props.current = { study, rot, ang, windowing, soft, marks, answer, focus, labels, onPick };

  useEffect(() => {
    const s = st.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: false, alpha: false, preserveDrawingBuffer: true });
    } catch (e) {
      console.warn('WebGL no disponible', e);
      setFailed(true);
      return undefined;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    s.renderer = renderer;
    s.cam = new THREE.PerspectiveCamera(20, 1, 0.5, 20);
    s.comp = makeComposite();
    s.size = [2, 2];
    s.rt = makeAttTarget(renderer, 2, 2);
    s.seed = Math.random() * 100;

    const resize = () => {
      const w = Math.max(wrapRef.current.clientWidth, 2);
      const h = Math.max(wrapRef.current.clientHeight, 2);
      s.size = [w, h];
      renderer.setSize(w, h, false);
      s.rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    resize();

    const loop = () => {
      s.raf = requestAnimationFrame(loop);
      if (!s.dirty) return;
      s.dirty = false;
      draw();
    };
    loop();

    // interacción: rueda = zoom, arrastrar = mover, clic = marcar
    const canvas = canvasRef.current;
    let down = null;
    const onDown = (e) => {
      down = { x: e.clientX, y: e.clientY, pan: [...s.pan], moved: false };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 4) down.moved = true;
      if (down.moved && s.zoom > 1.001) {
        s.pan = [down.pan[0] - dx / s.zoom, down.pan[1] - dy / s.zoom];
        clampPan();
        s.dirty = true;
      }
    };
    const onUp = (e) => {
      if (!down) return;
      const d = down;
      down = null;
      if (d.moved || !props.current.onPick || !props.current.study) return;
      const rect = canvas.getBoundingClientRect();
      let nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      let ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (props.current.study.region.distalUp) {
        nx = -nx;
        ny = -ny;
      }
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(nx, ny), s.cam);
      const st0 = props.current.study;
      const n = s.cam.getWorldDirection(new THREE.Vector3());
      const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, st0.iso);
      const point = new THREE.Vector3();
      ray.ray.intersectPlane(pl, point);
      const fp = st0.fracturePoint;
      props.current.onPick({ point, rot: props.current.rot, ang: props.current.ang, dist: fp ? ray.ray.distanceToPoint(fp) : Infinity });
    };
    const onWheel = (e) => {
      e.preventDefault();
      const z0 = s.zoom;
      s.zoom = Math.min(Math.max(s.zoom * Math.exp(-e.deltaY * 0.0015), 1), 6);
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      s.pan = [s.pan[0] + mx / z0 - mx / s.zoom, s.pan[1] + my / z0 - my / s.zoom];
      clampPan();
      setView({ zoom: s.zoom });
      s.dirty = true;
    };
    const clampPan = () => {
      const [w, h] = s.size;
      const mx = (w / 2) * (1 - 1 / s.zoom);
      const my = (h / 2) * (1 - 1 / s.zoom);
      s.pan = [Math.min(Math.max(s.pan[0], -mx), mx), Math.min(Math.max(s.pan[1], -my), my)];
    };
    s.reset = () => {
      s.zoom = 1;
      s.pan = [0, 0];
      setView({ zoom: 1 });
      s.dirty = true;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      s.rt.dispose();
      s.comp.mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  function draw() {
    const s = st.current;
    const p = props.current;
    const svg = svgRef.current;
    if (!s.renderer) return;
    const [w, h] = s.size;
    if (!p.study) {
      s.renderer.setRenderTarget(null);
      s.renderer.setClearColor(0x000000, 1);
      s.renderer.clear();
      if (svg) svg.innerHTML = '';
      return;
    }
    const geo = carmCamera(s.cam, p.study, p.rot, p.ang, w / h);
    const flip = p.study.region.distalUp ? -1 : 1;
    if (s.zoom > 1.001) {
      const vw = w / s.zoom;
      const vh = h / s.zoom;
      s.cam.setViewOffset(w, h, w / 2 - vw / 2 + s.pan[0] * flip, h / 2 - vh / 2 + s.pan[1] * flip, vw, vh);
    } else s.cam.clearViewOffset();
    s.cam.layers.set(LAYER_DRR);
    p.study.setSoftDrr(p.soft);
    const r = s.renderer;
    r.setRenderTarget(s.rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(p.study.scene, s.cam);
    r.setRenderTarget(null);
    const u = s.comp.mat.uniforms;
    u.tAtt.value = s.rt.texture;
    u.uTexel.value.set(1 / s.rt.width, 1 / s.rt.height);
    u.uGain.value = p.windowing.gain;
    u.uLevel.value = p.windowing.level;
    u.uWidth.value = p.windowing.width;
    u.uInvert.value = p.windowing.invert ? 1 : 0;
    u.uSeed.value = s.seed;
    u.uRotate.value = p.study.region.distalUp ? 1 : 0;
    const z = s.zoom;
    u.uCollim.value.set(Math.min(geo.collim[0] * z, 4), Math.min(geo.collim[1] * z, 4));
    r.render(s.comp.scene, s.comp.cam);
    drawOverlay(geo);
  }

  function project(v) {
    const s = st.current;
    const [w, h] = s.size;
    const q = v.clone().project(s.cam);
    let x = ((q.x + 1) / 2) * w;
    let y = ((1 - q.y) / 2) * h;
    if (props.current.study.region.distalUp) {
      x = w - x;
      y = h - y;
    }
    return [x, y, q.z < 1];
  }
  function pxRadius(v, r) {
    const s = st.current;
    const right = new THREE.Vector3().setFromMatrixColumn(s.cam.matrixWorld, 0);
    const a = project(v);
    const b = project(v.clone().addScaledVector(right, r));
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  function drawOverlay() {
    const svg = svgRef.current;
    const p = props.current;
    if (!svg) return;
    const [w, h] = st.current.size;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let out = '';
    // marcador plomado "D" del lado derecho del paciente
    const right = new THREE.Vector3(-1, 0, 0);
    const c = project(p.study.iso);
    const rr = project(p.study.iso.clone().add(right));
    const side = rr[0] < c[0] ? 'left' : 'right';
    const mx = side === 'left' ? 22 : w - 40;
    out += `<g class="lead"><rect x="${mx - 4}" y="${h - 58}" width="26" height="28" rx="3"/><text x="${mx + 9}" y="${h - 37}">${t('D')}</text></g>`;
    if (p.answer) {
      const [x, y] = project(p.answer.pos);
      const r = Math.max(pxRadius(p.answer.pos, p.answer.radius), 10);
      out += `<circle class="ans" cx="${x}" cy="${y}" r="${r}"/><circle class="ans-dot" cx="${x}" cy="${y}" r="3"/>`;
    }
    for (const m of p.marks) {
      if (m.rot != null && (Math.abs(m.rot - p.rot) > 0.5 || Math.abs(m.ang - p.ang) > 0.5)) continue;
      const [x, y] = project(m.pos);
      out += `<g class="mark" style="--mc:${m.color || '#ffcf33'}"><circle cx="${x}" cy="${y}" r="13"/><line x1="${x - 22}" y1="${y}" x2="${x - 8}" y2="${y}"/><line x1="${x + 8}" y1="${y}" x2="${x + 22}" y2="${y}"/><line x1="${x}" y1="${y - 22}" x2="${x}" y2="${y - 8}"/><line x1="${x}" y1="${y + 8}" x2="${x}" y2="${y + 22}"/></g>`;
    }
    const lms = p.study.landmarks;
    if (p.focus) {
      const l = lms.find((x) => x.name === p.focus);
      if (l) {
        const [x, y] = project(l.pos);
        out += `<circle class="focus" cx="${x}" cy="${y}" r="20"/><circle class="focus focus--pulse" cx="${x}" cy="${y}" r="20"/>`;
      }
    }
    if (p.labels) {
      for (const l of lms) {
        const [x, y, ok] = project(l.pos);
        if (!ok || x < 0 || y < 0 || x > w || y > h) continue;
        const left = x > w * 0.55;
        const tx = left ? x - 16 : x + 16;
        out += `<g class="lbl"><circle cx="${x}" cy="${y}" r="2.6"/><line x1="${x}" y1="${y}" x2="${tx}" y2="${y - 10}"/><text x="${tx + (left ? -3 : 3)}" y="${y - 13}" text-anchor="${left ? 'end' : 'start'}">${t(l.name)}</text></g>`;
      }
    }
    svg.innerHTML = out;
  }

  // cualquier cambio de props → redibujar
  useEffect(() => {
    st.current.dirty = true;
  });
  useEffect(() => {
    st.current.reset?.();
  }, [study]);

  const region = study?.region;
  const proj = region?.presets?.find((x) => Math.abs(x.rot - rot) < 0.5 && Math.abs(x.ang - ang) < 0.5);

  return (
    <div ref={wrapRef} className={`xray-view ${onPick ? 'is-pick' : ''} ${className}`}>
      <canvas ref={canvasRef} />
      <svg ref={svgRef} className="xray-overlay" />
      {failed && <div className="viewer-fail">{t('Tu navegador no permite WebGL. Prueba con otro navegador o activa la aceleración por hardware.')}</div>}
      {!study && !failed && <div className="xray-loading">{t('Cargando modelos óseos…')}</div>}
      {hud && study && (
        <div className="hud-corners" aria-hidden="true">
          <span className="hc tl">
            {title || t(region.title)} · {proj ? t(proj.label) : t('Proyección libre')}
          </span>
          <span className="hc tr">
            {rotLabel(rot)} · {angLabel(ang)}
          </span>
          <span className="hc bl">
            SID 100 cm · {t('DRR simulado')}
            {study.scale < 1 ? ` · ${t('pediátrico')}` : ''}
          </span>
          <span className="hc br">
            {view.zoom > 1.01 ? (
              <button className="hud-btn" onClick={() => st.current.reset()}>
                ZOOM ×{view.zoom.toFixed(1)} · {t('restablecer')}
              </button>
            ) : (
              t('rueda = zoom')
            )}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
