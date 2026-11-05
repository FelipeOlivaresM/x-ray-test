// Repara mallas no cerradas (agujeros, aristas no manifold) para el radiograma simulado.
// 1) Voxeliza la malla por paridad de cruces en los 3 ejes y vota (2 de 3),
//    lo que tolera agujeros pequeños.
// 2) Suaviza el volumen y extrae una superficie cerrada con "surface nets".
// 3) Suavizado de Taubin para quitar el escalonado.
// Uso: node tools/remesh.mjs            (procesa la lista REMESH sobre public/models)
//      node tools/remesh.mjs radius      (solo los nombres indicados)
import fs from 'node:fs';

const DIR = new URL('../public/models/', import.meta.url);
// [tamaño de vóxel en decímetros (0.012 = 1,2 mm), triángulos objetivo]
const REMESH = {
  radius: [0.011, 7000],
  ulna: [0.011, 7000],
  scapula: [0.011, 9000],
  pelvis: [0.014, 14000],
  sacrum: [0.014, 7000],
  hand_05: [0.0055, 1400],
  hand_06: [0.0055, 1300],
  hand_07: [0.0055, 2600],
  hand_08: [0.0055, 1500],
  hand_10: [0.0055, 1300],
  hand_19: [0.005, 500],
  ghost_ribcage: [0.022, 36000],
  ghost_skull: [0.026, 14000],
  ghost_cervical: [0.014, 5000],
  ghost_thoracic: [0.016, 10000],
  ghost_lumbar: [0.017, 7000],
  ghost_sternum: [0.014, 2400],
  ghost_foot: [0.013, 16000],
  ghost_l_femur: [0.02, 3000],
  ghost_l_tibia: [0.018, 2000],
  ghost_l_fibula: [0.012, 1300],
  ghost_l_humerus: [0.016, 2400],
  ghost_l_clavicle: [0.012, 1200],
  ghost_l_scapula: [0.013, 5000],
  ghost_l_patella: [0.012, 400],
};

function readBin(name) {
  const buf = fs.readFileSync(new URL(`${name}.bin`, DIR));
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nv = dv.getUint32(4, true);
  const ni = dv.getUint32(8, true);
  const lo = [0, 1, 2].map((i) => dv.getFloat32(12 + i * 4, true));
  const hi = [0, 1, 2].map((i) => dv.getFloat32(24 + i * 4, true));
  const pos = new Float64Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) pos[i] = lo[i % 3] + (dv.getUint16(36 + i * 2, true) / 65535) * (hi[i % 3] - lo[i % 3]);
  let off = 36 + nv * 6;
  off += (4 - (off % 4)) % 4;
  const idx = new Uint32Array(ni);
  for (let i = 0; i < ni; i++) idx[i] = nv > 65535 ? dv.getUint32(off + i * 4, true) : dv.getUint16(off + i * 2, true);
  return { pos, idx };
}

function writeBin(name, pos, tris) {
  const nv = pos.length / 3;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], pos[i]);
    hi[i % 3] = Math.max(hi[i % 3], pos[i]);
  }
  const big = nv > 65535;
  let size = 36 + nv * 6;
  size += (4 - (size % 4)) % 4;
  const idxOff = size;
  size += tris.length * (big ? 4 : 2);
  const buf = Buffer.alloc(size);
  buf.write('RSM1', 0, 'ascii');
  buf.writeUInt32LE(nv, 4);
  buf.writeUInt32LE(tris.length, 8);
  [...lo, ...hi].forEach((v, i) => buf.writeFloatLE(v, 12 + i * 4));
  for (let i = 0; i < pos.length; i++) {
    const k = i % 3;
    const span = Math.max(hi[k] - lo[k], 1e-6);
    buf.writeUInt16LE(Math.round(((pos[i] - lo[k]) / span) * 65535), 36 + i * 2);
  }
  for (let i = 0; i < tris.length; i++) {
    if (big) buf.writeUInt32LE(tris[i], idxOff + i * 4);
    else buf.writeUInt16LE(tris[i], idxOff + i * 2);
  }
  fs.writeFileSync(new URL(`${name}.bin`, DIR), buf);
  return { lo, hi, bytes: size };
}

function voxelize(pos, idx, h) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], pos[i]);
    hi[i % 3] = Math.max(hi[i % 3], pos[i]);
  }
  const o = lo.map((v) => v - 3 * h);
  const n = hi.map((v, k) => Math.ceil((v - o[k]) / h) + 4);
  const N = n[0] * n[1] * n[2];
  const at = (i, j, k) => (i * n[1] + j) * n[2] + k;
  const votes = new Uint8Array(N);
  // pequeño desfase irracional para no caer exactamente sobre aristas
  const jit = [0.1234567, 0.2345671, 0.3456712];
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    const par = new Uint8Array(N);
    for (let t = 0; t < idx.length; t += 3) {
      const P = [idx[t], idx[t + 1], idx[t + 2]].map((v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
      const bmin = Math.min(P[0][b], P[1][b], P[2][b]);
      const bmax = Math.max(P[0][b], P[1][b], P[2][b]);
      const cmin = Math.min(P[0][c], P[1][c], P[2][c]);
      const cmax = Math.max(P[0][c], P[1][c], P[2][c]);
      const j0 = Math.max(0, Math.ceil((bmin - o[b]) / h - 0.5 - jit[b]));
      const j1 = Math.min(n[b] - 1, Math.floor((bmax - o[b]) / h - 0.5 - jit[b]));
      const k0 = Math.max(0, Math.ceil((cmin - o[c]) / h - 0.5 - jit[c]));
      const k1 = Math.min(n[c] - 1, Math.floor((cmax - o[c]) / h - 0.5 - jit[c]));
      if (j0 > j1 || k0 > k1) continue;
      const [A, B, C] = P;
      const det = (B[b] - A[b]) * (C[c] - A[c]) - (C[b] - A[b]) * (B[c] - A[c]);
      if (Math.abs(det) < 1e-14) continue;
      for (let j = j0; j <= j1; j++) {
        const pb = o[b] + (j + 0.5 + jit[b]) * h;
        for (let k = k0; k <= k1; k++) {
          const pc = o[c] + (k + 0.5 + jit[c]) * h;
          const u = ((pb - A[b]) * (C[c] - A[c]) - (C[b] - A[b]) * (pc - A[c])) / det;
          const v = ((B[b] - A[b]) * (pc - A[c]) - (pb - A[b]) * (B[c] - A[c])) / det;
          if (u < 0 || v < 0 || u + v > 1) continue;
          const x = A[a] + u * (B[a] - A[a]) + v * (C[a] - A[a]);
          let i = Math.ceil((x - o[a]) / h - 0.5);
          if (i < 0) i = 0;
          if (i >= n[a]) continue;
          const ii = [0, 0, 0];
          ii[a] = i;
          ii[b] = j;
          ii[c] = k;
          par[at(ii[0], ii[1], ii[2])] ^= 1;
        }
      }
    }
    // XOR acumulado a lo largo del eje a
    const ii = [0, 0, 0];
    for (let j = 0; j < n[b]; j++)
      for (let k = 0; k < n[c]; k++) {
        let s = 0;
        for (let i = 0; i < n[a]; i++) {
          ii[a] = i;
          ii[b] = j;
          ii[c] = k;
          const q = at(ii[0], ii[1], ii[2]);
          s ^= par[q];
          votes[q] += s;
        }
      }
  }
  const field = new Float32Array(N);
  for (let q = 0; q < N; q++) field[q] = votes[q] >= 2 ? 1 : 0;
  return { field, n, o, at };
}

function blur(field, n, at) {
  // filtro separable [1 2 1]/4 en los tres ejes
  let src = field;
  for (let a = 0; a < 3; a++) {
    const dst = new Float32Array(src.length);
    for (let i = 0; i < n[0]; i++)
      for (let j = 0; j < n[1]; j++)
        for (let k = 0; k < n[2]; k++) {
          const ii = [i, j, k];
          const q = at(i, j, k);
          const m = [...ii];
          const p = [...ii];
          m[a] = Math.max(ii[a] - 1, 0);
          p[a] = Math.min(ii[a] + 1, n[a] - 1);
          dst[q] = 0.25 * src[at(m[0], m[1], m[2])] + 0.5 * src[q] + 0.25 * src[at(p[0], p[1], p[2])];
        }
    src = dst;
  }
  return src;
}

function surfaceNets(field, n, o, h, at, iso = 0.5) {
  const cellId = new Int32Array((n[0] - 1) * (n[1] - 1) * (n[2] - 1)).fill(-1);
  const cat = (i, j, k) => (i * (n[1] - 1) + j) * (n[2] - 1) + k;
  const pos = [];
  const corners = [];
  for (let c = 0; c < 8; c++) corners.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
  const edges = [];
  for (let c = 0; c < 8; c++)
    for (let d = 0; d < 3; d++) {
      const e = [...corners[c]];
      if (e[d] === 0) {
        e[d] = 1;
        edges.push([c, corners.findIndex((x) => x[0] === e[0] && x[1] === e[1] && x[2] === e[2])]);
      }
    }
  for (let i = 0; i < n[0] - 1; i++)
    for (let j = 0; j < n[1] - 1; j++)
      for (let k = 0; k < n[2] - 1; k++) {
        const val = corners.map((c) => field[at(i + c[0], j + c[1], k + c[2])]);
        let inside = 0;
        for (const v of val) if (v > iso) inside++;
        if (inside === 0 || inside === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let cnt = 0;
        for (const [e0, e1] of edges) {
          const a = val[e0] > iso;
          const b = val[e1] > iso;
          if (a === b) continue;
          const t = (iso - val[e0]) / (val[e1] - val[e0]);
          const c0 = corners[e0];
          const c1 = corners[e1];
          sx += c0[0] + t * (c1[0] - c0[0]);
          sy += c0[1] + t * (c1[1] - c0[1]);
          sz += c0[2] + t * (c1[2] - c0[2]);
          cnt++;
        }
        cellId[cat(i, j, k)] = pos.length / 3;
        pos.push(o[0] + (i + 0.5 + sx / cnt) * h, o[1] + (j + 0.5 + sy / cnt) * h, o[2] + (k + 0.5 + sz / cnt) * h);
      }
  const tris = [];
  // para cada arista de vóxeles con cambio de signo, un quad con las 4 celdas vecinas
  for (let i = 1; i < n[0] - 1; i++)
    for (let j = 1; j < n[1] - 1; j++)
      for (let k = 1; k < n[2] - 1; k++) {
        const v0 = field[at(i, j, k)] > iso;
        for (let a = 0; a < 3; a++) {
          const ii = [i, j, k];
          ii[a] += 1;
          if (ii[a] >= n[a]) continue;
          const v1 = field[at(ii[0], ii[1], ii[2])] > iso;
          if (v0 === v1) continue;
          const b = (a + 1) % 3;
          const c = (a + 2) % 3;
          const cell = (db, dc) => {
            const x = [i, j, k];
            x[b] -= db;
            x[c] -= dc;
            return cellId[cat(x[0], x[1], x[2])];
          };
          const q = [cell(0, 0), cell(1, 0), cell(1, 1), cell(0, 1)];
          if (q.some((x) => x < 0)) continue;
          // normal hacia afuera: del lado interior al exterior
          if (v0) tris.push(q[0], q[1], q[2], q[0], q[2], q[3]);
          else tris.push(q[0], q[2], q[1], q[0], q[3], q[2]);
        }
      }
  return { pos: new Float64Array(pos), tris };
}

function taubin(pos, tris, iters = 6, lambda = 0.5, mu = -0.53) {
  const nv = pos.length / 3;
  const nb = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < tris.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = tris[t + e];
      const b = tris[t + ((e + 1) % 3)];
      nb[a].add(b);
      nb[b].add(a);
    }
  const lists = nb.map((s) => [...s]);
  let p = pos;
  for (let it = 0; it < iters * 2; it++) {
    const f = it % 2 === 0 ? lambda : mu;
    const q = new Float64Array(p.length);
    for (let v = 0; v < nv; v++) {
      const L = lists[v];
      if (!L.length) {
        q[v * 3] = p[v * 3];
        q[v * 3 + 1] = p[v * 3 + 1];
        q[v * 3 + 2] = p[v * 3 + 2];
        continue;
      }
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (const w of L) {
        sx += p[w * 3];
        sy += p[w * 3 + 1];
        sz += p[w * 3 + 2];
      }
      const m = L.length;
      q[v * 3] = p[v * 3] + f * (sx / m - p[v * 3]);
      q[v * 3 + 1] = p[v * 3 + 1] + f * (sy / m - p[v * 3 + 1]);
      q[v * 3 + 2] = p[v * 3 + 2] + f * (sz / m - p[v * 3 + 2]);
    }
    p = q;
  }
  return p;
}


// Simplificación por colapso de aristas (error cuadrático) que conserva la
// superficie cerrada: se rechazan colapsos que rompen la condición de enlace
// o que invierten caras.
function decimate(posIn, trisIn, target) {
  const pos = Float64Array.from(posIn);
  const nv = pos.length / 3;
  const F = Int32Array.from(trisIn);
  const nf = F.length / 3;
  const alive = new Uint8Array(nf).fill(1);
  let live = nf;
  const vf = Array.from({ length: nv }, () => []);
  for (let f = 0; f < nf; f++) for (let e = 0; e < 3; e++) vf[F[f * 3 + e]].push(f);
  const Q = new Float64Array(nv * 10);
  const faceNormal = (f, out) => {
    const a = F[f * 3] * 3;
    const b = F[f * 3 + 1] * 3;
    const c = F[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    out[0] = uy * vz - uz * vy;
    out[1] = uz * vx - ux * vz;
    out[2] = ux * vy - uy * vx;
    return out;
  };
  const nrm = [0, 0, 0];
  for (let f = 0; f < nf; f++) {
    faceNormal(f, nrm);
    const l = Math.hypot(nrm[0], nrm[1], nrm[2]);
    if (l < 1e-14) continue;
    const a = nrm[0] / l, b = nrm[1] / l, c = nrm[2] / l;
    const i0 = F[f * 3] * 3;
    const d = -(a * pos[i0] + b * pos[i0 + 1] + c * pos[i0 + 2]);
    const w = l; // ponderado por área
    const q = [a * a, a * b, a * c, a * d, b * b, b * c, b * d, c * c, c * d, d * d];
    for (let e = 0; e < 3; e++) {
      const v = F[f * 3 + e];
      for (let k = 0; k < 10; k++) Q[v * 10 + k] += q[k] * w;
    }
  }
  const err = (q, x, y, z) =>
    q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  const qs = new Float64Array(10);
  const best = (a, b) => {
    for (let k = 0; k < 10; k++) qs[k] = Q[a * 10 + k] + Q[b * 10 + k];
    const A = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]];
    const B = [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]];
    const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    let bp = M;
    let be = err(qs, M[0], M[1], M[2]);
    for (const P of [A, B]) {
      const e = err(qs, P[0], P[1], P[2]);
      if (e < be) {
        be = e;
        bp = P;
      }
    }
    return [be, bp];
  };
  const nbrs = (v) => {
    const s = new Set();
    for (const f of vf[v]) if (alive[f]) for (let e = 0; e < 3; e++) s.add(F[f * 3 + e]);
    s.delete(v);
    return s;
  };
  const o1 = [0, 0, 0];
  const o2 = [0, 0, 0];
  const valid = (a, b, P) => {
    const na = nbrs(a);
    const nb = nbrs(b);
    let common = 0;
    for (const x of na) if (nb.has(x)) common++;
    if (common !== 2) return false;
    for (const v of [a, b]) {
      for (const f of vf[v]) {
        if (!alive[f]) continue;
        const has = [F[f * 3], F[f * 3 + 1], F[f * 3 + 2]];
        if (has.includes(a) && has.includes(b)) continue;
        faceNormal(f, o1);
        const save = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
        pos[v * 3] = P[0];
        pos[v * 3 + 1] = P[1];
        pos[v * 3 + 2] = P[2];
        faceNormal(f, o2);
        pos[v * 3] = save[0];
        pos[v * 3 + 1] = save[1];
        pos[v * 3 + 2] = save[2];
        const l1 = Math.hypot(...o1);
        const l2 = Math.hypot(...o2);
        if (l2 < 1e-12) return false;
        if ((o1[0] * o2[0] + o1[1] * o2[1] + o1[2] * o2[2]) / (l1 * l2 + 1e-30) < 0.25) return false;
      }
    }
    return true;
  };
  for (let pass = 0; pass < 60 && live > target; pass++) {
    const edges = [];
    const seen = new Set();
    for (let f = 0; f < nf; f++) {
      if (!alive[f]) continue;
      for (let e = 0; e < 3; e++) {
        const a = F[f * 3 + e];
        const b = F[f * 3 + ((e + 1) % 3)];
        const key = a < b ? a * nv + b : b * nv + a;
        if (seen.has(key)) continue;
        seen.add(key);
        const [c] = best(a, b);
        edges.push([c, a, b]);
      }
    }
    edges.sort((x, y) => x[0] - y[0]);
    const locked = new Uint8Array(nv);
    let done = 0;
    const budget = Math.max(1, Math.floor((live - target) / 2));
    for (const [, a, b] of edges) {
      if (live <= target || done >= budget) break;
      if (locked[a] || locked[b]) continue;
      const [, P] = best(a, b);
      if (!valid(a, b, P)) continue;
      // colapsar a → b
      for (const x of nbrs(a)) locked[x] = 1;
      for (const x of nbrs(b)) locked[x] = 1;
      locked[a] = locked[b] = 1;
      pos[b * 3] = P[0];
      pos[b * 3 + 1] = P[1];
      pos[b * 3 + 2] = P[2];
      for (let k = 0; k < 10; k++) Q[b * 10 + k] += Q[a * 10 + k];
      for (const f of vf[a]) {
        if (!alive[f]) continue;
        const i = f * 3;
        if (F[i] === b || F[i + 1] === b || F[i + 2] === b) {
          alive[f] = 0;
          live--;
          continue;
        }
        for (let e = 0; e < 3; e++) if (F[i + e] === a) F[i + e] = b;
        vf[b].push(f);
      }
      vf[a] = [];
      done++;
    }
    if (!done) break;
  }
  // compactar
  const remap = new Int32Array(nv).fill(-1);
  const outPos = [];
  const outTris = [];
  for (let f = 0; f < nf; f++) {
    if (!alive[f]) continue;
    for (let e = 0; e < 3; e++) {
      const v = F[f * 3 + e];
      if (remap[v] < 0) {
        remap[v] = outPos.length / 3;
        outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      }
      outTris.push(remap[v]);
    }
  }
  return { pos: new Float64Array(outPos), tris: outTris };
}

function checkClosed(tris) {
  const E = new Map();
  for (let t = 0; t < tris.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = tris[t + e];
      const b = tris[t + ((e + 1) % 3)];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      E.set(key, (E.get(key) || 0) + (a < b ? 1 : -1));
    }
  let bad = 0;
  for (const v of E.values()) if (v !== 0) bad++;
  return bad;
}

const man = JSON.parse(fs.readFileSync(new URL('manifest.json', DIR)));
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(REMESH);
for (const name of names) {
  const [h, target] = REMESH[name] || [];
  if (!h) {
    console.log(`${name}: sin tamaño de vóxel definido`);
    continue;
  }
  const t0 = Date.now();
  const { pos, idx } = readBin(name);
  const { field, n, o, at } = voxelize(pos, idx, h);
  const sm = blur(field, n, at);
  const mesh = surfaceNets(sm, n, o, h, at);
  const p2 = taubin(mesh.pos, mesh.tris);
  const dec = decimate(p2, mesh.tris, target);
  const bad = checkClosed(dec.tris);
  const r = writeBin(name, dec.pos, dec.tris);
  const meta = man.bones[name];
  meta.tris = dec.tris.length / 3;
  meta.min = r.lo.map((v) => +v.toFixed(4));
  meta.max = r.hi.map((v) => +v.toFixed(4));
  meta.remesh = h;
  console.log(`${name.padEnd(17)} vóx ${n.join('×')}  tris ${idx.length / 3} → ${mesh.tris.length / 3} → ${dec.tris.length / 3}  ${(r.bytes / 1024).toFixed(0)} KB  aristas abiertas ${bad}  ${Date.now() - t0} ms`);
}
fs.writeFileSync(new URL('manifest.json', DIR), JSON.stringify(man, null, 1));
