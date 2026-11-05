// Utilidad de desarrollo: consulta puntos de los modelos para definir reparos anatómicos.
// Uso: node tools/inspect_models.mjs '[["femur","ext",[0,1,0],[[1,7.9,9]]]]'
//   tipo: ext (punto extremo en una dirección) | cen (centroide) | box (caja)
//   filtro: lista de [eje, min, max]
import fs from 'node:fs';
const dir = new URL('../public/models/', import.meta.url);
const man = JSON.parse(fs.readFileSync(new URL('manifest.json', dir)));
function load(name) {
  const buf = fs.readFileSync(new URL(man.bones[name].file, dir));
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nv = dv.getUint32(4, true);
  const lo = [0, 1, 2].map((i) => dv.getFloat32(12 + i * 4, true));
  const hi = [0, 1, 2].map((i) => dv.getFloat32(24 + i * 4, true));
  const v = [];
  for (let i = 0; i < nv; i++) v.push([0, 1, 2].map((k) => lo[k] + (dv.getUint16(36 + (i * 3 + k) * 2, true) / 65535) * (hi[k] - lo[k])));
  return v;
}
const r3 = (p) => p.map((x) => +x.toFixed(3));
for (const [bone, kind, a, filt = []] of JSON.parse(process.argv[2] || '[]')) {
  const v = load(bone).filter((p) => filt.every(([k, lo, hi]) => p[k] >= lo && p[k] <= hi));
  let out;
  if (!v.length) out = 'vacío';
  else if (kind === 'ext') out = r3(v.reduce((b, p) => (p[0] * a[0] + p[1] * a[1] + p[2] * a[2] > b[0] * a[0] + b[1] * a[1] + b[2] * a[2] ? p : b)));
  else if (kind === 'cen') out = r3([0, 1, 2].map((k) => v.reduce((s, p) => s + p[k], 0) / v.length));
  else out = [r3([0, 1, 2].map((k) => Math.min(...v.map((p) => p[k])))), r3([0, 1, 2].map((k) => Math.max(...v.map((p) => p[k]))))];
  console.log(bone, kind, JSON.stringify(a), JSON.stringify(filt), '=>', JSON.stringify(out), v.length);
}
