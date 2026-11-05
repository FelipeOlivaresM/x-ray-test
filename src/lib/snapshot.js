// Miniaturas de radiografía simulada (DRR) con un único renderer compartido:
// evita abrir un contexto WebGL por cada tarjeta. Las peticiones se atienden
// en cola, una a una, y el resultado queda en caché por clave.
import * as THREE from 'three';
import { REGIONS } from '../data/anatomy.js';
import { carmCamera } from './carm.js';
import { LAYER_DRR, makeAttTarget, makeComposite } from './shaders.js';
import { buildStudy } from './study.js';

let ctx = null;
let queue = Promise.resolve();
const cache = new Map();

function context() {
  if (ctx) return ctx;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  ctx = { renderer, comp: makeComposite(), rt: makeAttTarget(renderer, 4, 4), cam: new THREE.PerspectiveCamera(20, 1, 0.5, 20) };
  return ctx;
}

function render(study, view, w, h) {
  const { renderer: r, comp, rt, cam } = context();
  const region = study.region;
  const p = region.presets.find((x) => x.id === view) || region.presets[0];
  r.setSize(w, h, false);
  rt.setSize(w, h);
  const geo = carmCamera(cam, study, p.rot, p.ang, w / h);
  cam.layers.set(LAYER_DRR);
  study.setSoftDrr(true);
  r.setRenderTarget(rt);
  r.setClearColor(0x000000, 0);
  r.clear();
  r.render(study.scene, cam);
  r.setRenderTarget(null);
  const u = comp.mat.uniforms;
  u.tAtt.value = rt.texture;
  u.uTexel.value.set(1 / w, 1 / h);
  u.uGain.value = region.gain || 0.55;
  u.uLevel.value = 0.5;
  u.uWidth.value = 1;
  u.uInvert.value = 0;
  u.uSeed.value = 3;
  u.uRotate.value = region.distalUp ? 1 : 0;
  u.uCollim.value.set(Math.min(geo.collim[0], 4), Math.min(geo.collim[1], 4));
  r.render(comp.scene, comp.cam);
  return r.domElement.toDataURL('image/jpeg', 0.82);
}

/**
 * Devuelve (promesa) un dataURL JPEG de la proyección `view` del estudio `def`.
 * def = { region, fracture?, ... } como en buildStudy; key identifica el estudio.
 */
export function snapshot(key, def, { view, w = 360, h = 300 } = {}) {
  const v = view || REGIONS[def.region].presets[0].id;
  const ck = `${key}:${v}:${w}x${h}`;
  if (cache.has(ck)) return cache.get(ck);
  const job = queue.then(async () => {
    const study = await buildStudy(def);
    try {
      return render(study, v, w, h);
    } finally {
      study.dispose();
    }
  });
  queue = job.catch(() => null);
  const safe = job.catch((e) => {
    console.warn('miniatura no disponible', e);
    cache.delete(ck);
    return null;
  });
  cache.set(ck, safe);
  return safe;
}
