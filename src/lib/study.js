// Construye un "estudio": esqueleto real + región + fractura opcional.
// Un mismo grafo de escena se usa en dos pasadas:
//   capa LAYER_SURF → vista 3D (superficie o translúcido)
//   capa LAYER_DRR  → radiograma reconstruido (espesores atenuados)
import * as THREE from 'three';
import { loadBone, loadManifest } from './assets.js';
import { LAYER_DRR, LAYER_SURF, makeDrrMaterial, makeSurfaceMaterial, setGhost } from './shaders.js';
import { LANDMARKS, REGIONS, boneFrame, drrParams } from '../data/anatomy.js';

const MU_CORTEX = 5.2;
const MU_TRAB = 1.25;
const MU_SOFT = 0.62;

// ---------------------------------------------------------------- partes blandas
function orient(g) {
  const p = g.attributes.position.array;
  const idx = g.index.array;
  let vol = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    vol += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  if (vol < 0) {
    for (let t = 0; t < idx.length; t += 3) {
      const s = idx[t + 1];
      idx[t + 1] = idx[t + 2];
      idx[t + 2] = s;
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Tubo cerrado con secciones elípticas horizontales. secs: [x,y,z,rx,rz] */
function softTube(secs, rings = 64, seg = 32) {
  const pts = secs.map((s) => new THREE.Vector3(s[0], s[1], s[2]));
  const curve = new THREE.CatmullRomCurve3(pts);
  const rx = secs.map((s) => s[3]);
  const rz = secs.map((s) => s[4]);
  const interp = (arr, t) => {
    const f = t * (arr.length - 1);
    const i = Math.min(Math.floor(f), arr.length - 2);
    const k = f - i;
    const kk = k * k * (3 - 2 * k);
    return arr[i] + (arr[i + 1] - arr[i]) * kk;
  };
  const pos = [];
  const idx = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const c = curve.getPoint(t);
    // cierre redondeado en los extremos
    const e = Math.min(t, 1 - t) * rings;
    const cap = e < 3 ? Math.sqrt(Math.max(1 - ((3 - e) / 3) ** 2, 0.04)) : 1;
    const ax = interp(rx, t) * cap;
    const az = interp(rz, t) * cap;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      pos.push(c.x + ax * Math.cos(a), c.y, c.z + az * Math.sin(a));
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      idx.push(a, a + seg, b, b, a + seg, b + seg);
    }
  const c0 = pos.length / 3;
  const p0 = curve.getPoint(0);
  const p1 = curve.getPoint(1);
  pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  for (let j = 0; j < seg; j++) {
    idx.push(c0, j, (j + 1) % seg);
    idx.push(c0 + 1, rings * seg + ((j + 1) % seg), rings * seg + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return orient(g);
}

/** Dedo: tubo circular que sigue los centroides de las falanges. */
function fingerTube(points) {
  const n = points.length;
  return softTube(points.map((p, i) => [p[0], p[1], p[2], 0.085 - (0.025 * i) / (n - 1), 0.075 - (0.022 * i) / (n - 1)]), 40, 20);
}

function softEllipsoid({ c, r }) {
  const g = new THREE.SphereGeometry(1, 32, 24);
  g.scale(r[0], r[1], r[2]);
  g.translate(c[0], c[1], c[2]);
  return orient(g);
}

// ---------------------------------------------------------------- cortical
/**
 * Atributo aShell: factor de grosor de cortical por vértice. En huesos largos
 * la cortical es gruesa en la diáfisis y fina en las epífisis.
 */
function shellAttribute(g, axisRaw) {
  if (g.attributes.aShell) return;
  const axis = (axisRaw || []).filter(Boolean);
  const p = g.attributes.position;
  const a = new Float32Array(p.count).fill(1);
  if (axis && axis.length > 8) {
    const ys = axis.map((s) => s[1]);
    const rs = axis
      .slice(4, -4)
      .map((s) => s[3])
      .sort((x, y) => x - y);
    const rShaft = rs[Math.floor(rs.length * 0.35)] || 0.1;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      let k = 0;
      while (k < ys.length - 2 && ys[k + 1] < y) k++;
      const s0 = axis[k];
      const s1 = axis[k + 1];
      const t = Math.min(Math.max((y - s0[1]) / (s1[1] - s0[1] || 1), 0), 1);
      const cx = s0[0] + (s1[0] - s0[0]) * t;
      const cz = s0[2] + (s1[2] - s0[2]) * t;
      const rl = Math.hypot(p.getX(i) - cx, p.getZ(i) - cz);
      a[i] = Math.min(Math.max(Math.pow(rShaft / Math.max(rl, 1e-3), 1.3), 0.22), 1);
    }
  }
  g.setAttribute('aShell', new THREE.BufferAttribute(a, 1));
}

// ---------------------------------------------------------------- estudio
const BONE_COLOR = '#e8dcc4';
const CONTEXT_COLOR = '#9fb4bd';

/**
 * def: { region, fracture?: (ctx) => frac, scale?, physes?: (ctx) => {bone: [cuts]} }
 * frac: { bone, point, tolerance, pieces: [{ planes, mover? }], movers: { id: { pivot, t, rot:[{from,to,deg}], follow:[bones] } } }
 */
export async function buildStudy(def) {
  const manifest = await loadManifest();
  const region = REGIONS[def.region];
  const all = Object.keys(manifest.bones);
  const geos = Object.fromEntries(await Promise.all(all.map(async (n) => [n, await loadBone(n)])));
  const ctx = { manifest, frame: (bone, y, win) => boneFrame(manifest, bone, y, win) };

  const frac = def.fracture ? def.fracture(ctx) : null;
  const physes = def.physes ? def.physes(ctx) : {};
  const scale = def.scale || 1;
  const iso = new THREE.Vector3(...region.iso);

  const root = new THREE.Group();
  root.scale.setScalar(scale);
  root.position.copy(iso).multiplyScalar(1 - scale);

  const drrSet = new Set([...region.target, ...region.context]);
  const targetSet = new Set(region.target);
  const materials = [];
  const surfMeshes = [];
  const movers = {};
  const moverOf = {}; // hueso que sigue a un fragmento
  if (frac?.movers) {
    for (const [id, m] of Object.entries(frac.movers)) {
      const pivot = new THREE.Group();
      pivot.position.set(...m.pivot);
      const content = new THREE.Group();
      content.position.set(-m.pivot[0], -m.pivot[1], -m.pivot[2]);
      pivot.add(content);
      root.add(pivot);
      const q = new THREE.Quaternion();
      for (const r of m.rot || []) {
        const from = new THREE.Vector3(...r.from).normalize();
        const to = new THREE.Vector3(...r.to).normalize();
        const axis = from.clone().cross(to).normalize();
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, (r.deg * Math.PI) / 180));
      }
      movers[id] = { pivot, content, p0: pivot.position.clone(), t: new THREE.Vector3(...(m.t || [0, 0, 0])), q };
      (m.follow || []).forEach((b) => (moverOf[b] = id));
    }
  }

  const surfState = { ghostTargets: false };

  function addPiece(name, planes, parent, role) {
    const g = geos[name];
    const inDrr = drrSet.has(name);
    const isTarget = targetSet.has(name);
    const isGhost = !inDrr;
    const surf = makeSurfaceMaterial({
      color: isTarget ? BONE_COLOR : CONTEXT_COLOR,
      ghost: isGhost,
      ghostColor: isGhost ? '#2aa9c0' : '#3fd0e6',
      opacity: isGhost ? 0.55 : 1,
      planes,
    });
    surf.userData = { role: isTarget ? 'target' : inDrr ? 'context' : 'ghost', fracture: role === 'fracture' };
    materials.push(surf);
    const sm = new THREE.Mesh(g, surf);
    sm.layers.set(LAYER_SURF);
    sm.userData.bone = name;
    sm.renderOrder = isGhost ? 2 : 0;
    parent.add(sm);
    surfMeshes.push(sm);
    if (inDrr) {
      const prm = drrParams(name);
      const mu = MU_CORTEX * (prm.mu || 1);
      shellAttribute(g, manifest.bones[name].axis);
      const outer = makeDrrMaterial({ mu, scale, planes });
      const inner = makeDrrMaterial({ mu: MU_TRAB * (prm.mu || 1) - mu, shell: prm.shell, scale, planes });
      materials.push(outer, inner);
      for (const m of [outer, inner]) {
        const dm = new THREE.Mesh(g, m);
        dm.layers.set(LAYER_DRR);
        dm.frustumCulled = false;
        parent.add(dm);
      }
    }
  }

  const hidden = new Set(def.hide || []);
  for (const name of all) {
    if (hidden.has(name)) continue;
    const follow = moverOf[name];
    const parent = follow ? movers[follow].content : root;
    const clip = region.clip?.[name] || [];
    const cuts = physes[name];
    if (frac && frac.bone === name) {
      for (const pc of frac.pieces) {
        const par = pc.mover ? movers[pc.mover].content : root;
        addPiece(name, [...pc.planes, ...clip], par, 'fracture');
      }
    } else if (frac?.extraBones?.[name]) {
      for (const pc of frac.extraBones[name]) {
        const par = pc.mover ? movers[pc.mover].content : parent;
        addPiece(name, [...pc.planes, ...clip], par, 'fracture');
      }
    } else if (cuts) {
      for (const pc of cuts) addPiece(name, [...pc, ...clip], parent, 'physis');
    } else addPiece(name, clip, parent);
  }

  // partes blandas: solo en el DRR (y como piel tenue en 3D)
  const softMeshes = [];
  for (const s of region.soft || []) {
    let g;
    if (s.tube) g = softTube(s.tube);
    else if (s.finger) g = fingerTube(s.finger);
    else if (s.ellipsoid) g = softEllipsoid(s.ellipsoid);
    const dm = new THREE.Mesh(g, makeDrrMaterial({ mu: s.mu ?? MU_SOFT, scale }));
    dm.layers.set(LAYER_DRR);
    dm.frustumCulled = false;
    root.add(dm);
    materials.push(dm.material);
    softMeshes.push(dm);
    if (!s.mu) {
      const skin = makeSurfaceMaterial({ ghost: true, ghostColor: '#f2a65a', opacity: 0.18 });
      materials.push(skin);
      const sm = new THREE.Mesh(g, skin);
      sm.layers.set(LAYER_SURF);
      sm.renderOrder = 3;
      sm.userData.skin = true;
      sm.visible = false;
      root.add(sm);
      softMeshes.push(sm);
    }
  }

  const scene = new THREE.Scene();
  scene.add(root);
  root.updateMatrixWorld(true);
  const toWorld = (p) => new THREE.Vector3(...p).multiplyScalar(scale).add(root.position);
  const inRegion = new Set([...region.target, ...region.context]);
  const landmarks = LANDMARKS.filter((l) => inRegion.has(l.bone) && (!def.landmarks || def.landmarks.includes(l.name))).map((l) => ({
    name: l.name,
    bone: l.bone,
    pos: toWorld(l.pos),
  }));

  function setReduction(k) {
    const f = 1 - k;
    for (const m of Object.values(movers)) {
      m.pivot.position.copy(m.p0).addScaledVector(m.t, f);
      m.pivot.quaternion.identity().slerp(m.q, f);
    }
    root.updateMatrixWorld(true);
  }
  setReduction(0);

  return {
    region,
    regionId: def.region,
    scene,
    root,
    iso,
    scale,
    landmarks,
    fracture: frac,
    fracturePoint: frac ? toWorld(frac.point) : null,
    tolerance: frac ? frac.tolerance * scale : 0,
    surfMeshes,
    setReduction,
    setHighlight(v) {
      materials.forEach((m) => m.uniforms.uHighlight && m.userData.fracture && (m.uniforms.uHighlight.value = v ? 1 : 0));
    },
    /** Transparencia de los huesos de la región (vista 3D). */
    setSeeThrough(v) {
      surfState.ghostTargets = v;
      materials.forEach((m) => {
        if (!m.uniforms.uGhost || m.userData.role === 'ghost' || !m.userData.role) return;
        setGhost(m, v, v ? 0.9 : 1);
      });
    },
    setSkeleton(v) {
      surfMeshes.forEach((s) => s.material.userData.role === 'ghost' && (s.visible = v));
    },
    setSkin(v) {
      softMeshes.forEach((s) => s.userData.skin && (s.visible = v));
    },
    setSoftDrr(v) {
      softMeshes.forEach((s) => !s.userData.skin && (s.visible = v));
    },
    dispose() {
      materials.forEach((m) => m.dispose());
      softMeshes.forEach((s) => s.geometry.dispose());
    },
  };
}
