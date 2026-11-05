// Carga de los modelos óseos reales (BodyParts3D y donantes con licencia abierta).
// Formato binario propio "RSM1" generado por tools/build_models.py:
//   "RSM1" | uint32 nv | uint32 ni | 6 float32 (bbox min/max) | uint16 xyz cuantizado | pad 4 | índices
// Coordenadas en decímetros: X = izquierda del paciente, Y = craneal, Z = anterior.
import * as THREE from 'three';

const BASE = `${import.meta.env.BASE_URL}models/`;
let manifestPromise = null;
const cache = new Map();

export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(`${BASE}manifest.json`).then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json();
    });
  }
  return manifestPromise;
}

function decode(buf, name) {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'RSM1') throw new Error(`${name}: formato desconocido`);
  const nv = dv.getUint32(4, true);
  const ni = dv.getUint32(8, true);
  const lo = [0, 1, 2].map((i) => dv.getFloat32(12 + i * 4, true));
  const hi = [0, 1, 2].map((i) => dv.getFloat32(24 + i * 4, true));
  const q = new Uint16Array(buf, 36, nv * 3);
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) {
    const k = i % 3;
    pos[i] = lo[k] + (q[i] / 65535) * (hi[k] - lo[k]);
  }
  let off = 36 + nv * 6;
  off += (4 - (off % 4)) % 4;
  const idx = nv > 65535 ? new Uint32Array(buf.slice(off, off + ni * 4)) : new Uint16Array(buf.slice(off, off + ni * 2));

  // Asegura caras orientadas hacia afuera (volumen con signo positivo):
  // el radiograma simulado depende de distinguir caras de entrada y salida.
  let vol = 0;
  for (let t = 0; t < ni; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    vol +=
      pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) -
      pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) +
      pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  if (vol < 0) {
    for (let t = 0; t < ni; t += 3) {
      const s = idx[t + 1];
      idx[t + 1] = idx[t + 2];
      idx[t + 2] = s;
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  g.userData.name = name;
  return g;
}

/** Devuelve (con caché) la geometría de un hueso del manifiesto. */
export function loadBone(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      loadManifest().then(async (m) => {
        const meta = m.bones[name];
        if (!meta) throw new Error(`hueso desconocido: ${name}`);
        const r = await fetch(BASE + meta.file);
        if (!r.ok) throw new Error(`${name} ${r.status}`);
        const g = decode(await r.arrayBuffer(), name);
        g.userData.axis = meta.axis;
        return g;
      }),
    );
  }
  return cache.get(name);
}

export const loadBones = (names) => Promise.all(names.map(loadBone));
