// Anatomía real: regiones de estudio, reparos y utilidades geométricas.
// Coordenadas del modelo (decímetros): X = izquierda del paciente, Y = craneal,
// Z = anterior. El paciente está en posición anatómica (palmas hacia adelante).
// Los huesos del lado derecho (diana) quedan en X negativo.

// ------------------------------------------------------------------ vectores
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

/** Plano de corte que conserva el lado hacia `n`. */
export function plane(p, n, opts = {}) {
  const nn = v3.norm(n);
  return { n: nn, d: v3.dot(nn, p), amp: 0, freq: 10, seed: 0, ...opts };
}
/** El mismo plano conservando el lado opuesto (ruido complementario). */
export const flip = (pl) => ({ ...pl, n: v3.mul(pl.n, -1), d: -pl.d, amp: -(pl.amp || 0) });

// ------------------------------------------------------------------ ejes óseos
/**
 * Marco local de un hueso largo a la altura y, a partir de las muestras del eje
 * (centroides por cortes) con una regresión local que suaviza el ruido.
 * u = hacia proximal, a = anterior, l = lateral (para el lado derecho).
 */
export function boneFrame(manifest, bone, y, win = 0.45) {
  const s = manifest.bones[bone].axis.filter(Boolean);
  let W = 0;
  let my = 0;
  const m = [0, 0];
  const pts = s.filter((p) => Math.abs(p[1] - y) <= win);
  const use = pts.length >= 3 ? pts : s;
  use.forEach((p) => {
    const w = 1 - Math.min(Math.abs(p[1] - y) / (win * 1.05), 0.95);
    W += w;
    my += w * p[1];
    m[0] += w * p[0];
    m[1] += w * p[2];
  });
  my /= W;
  const mx = m[0] / W;
  const mz = m[1] / W;
  let sxy = 0;
  let szy = 0;
  let syy = 0;
  use.forEach((p) => {
    const w = 1 - Math.min(Math.abs(p[1] - y) / (win * 1.05), 0.95);
    sxy += w * (p[0] - mx) * (p[1] - my);
    szy += w * (p[2] - mz) * (p[1] - my);
    syy += w * (p[1] - my) ** 2;
  });
  const kx = syy ? sxy / syy : 0;
  const kz = syy ? szy / syy : 0;
  const c = [mx + kx * (y - my), y, mz + kz * (y - my)];
  const u = v3.norm([kx, 1, kz]);
  const a = v3.norm(v3.sub([0, 0, 1], v3.mul(u, u[2])));
  const l = v3.norm(v3.cross(a, u));
  const rs = s.slice(4, -4).map((p) => p[3]).sort((p, q) => p - q);
  const r = rs[Math.floor(rs.length * 0.35)] || 0.1;
  /** vector en el marco del hueso: lateral, proximal, anterior */
  const vec = (lat, prox, ant) => v3.add(v3.add(v3.mul(l, lat), v3.mul(u, prox)), v3.mul(a, ant));
  return { c, u, a, l, r, vec, at: (lat, prox, ant) => v3.add(c, vec(lat, prox, ant)) };
}

/** Fisis (placa de crecimiento): dos planos con un espacio radiolúcido. */
export function physisCut(F, gap = 0.035) {
  const above = plane(v3.add(F.c, v3.mul(F.u, gap / 2)), F.u, { amp: 0.012, freq: 9, seed: 3.1, clip: true });
  const below = flip(plane(v3.sub(F.c, v3.mul(F.u, gap / 2)), F.u, { amp: 0.012, freq: 9, seed: 3.1, clip: true }));
  return { above, below };
}

// ------------------------------------------------------------------ huesos
export const HAND = Array.from({ length: 23 }, (_, i) => `hand_${String(i).padStart(2, '0')}`);
export const FINGER5 = ['hand_11', 'hand_15', 'hand_19'];

export const BONE_NAMES = {
  femur: 'Fémur',
  tibia: 'Tibia',
  fibula: 'Peroné',
  patella: 'Rótula',
  humerus: 'Húmero',
  clavicle: 'Clavícula',
  scapula: 'Escápula',
  radius: 'Radio',
  ulna: 'Cúbito',
  pelvis: 'Coxal',
  sacrum: 'Sacro',
  hand: 'Mano',
};

// densidad cortical relativa y grosor de cortical (dm) para el DRR
export const BONE_DRR = {
  femur: { shell: 0.045 },
  tibia: { shell: 0.045 },
  humerus: { shell: 0.035 },
  fibula: { shell: 0.025 },
  radius: { shell: 0.025 },
  ulna: { shell: 0.025 },
  clavicle: { shell: 0.022 },
  patella: { shell: 0.015 },
  scapula: { shell: 0.012, mu: 0.9 },
  pelvis: { shell: 0.014 },
  sacrum: { shell: 0.012, mu: 0.85 },
  ghost_ribcage: { shell: 0.008, mu: 0.75 },
  ghost_sternum: { shell: 0.01, mu: 0.8 },
  ghost_thoracic: { shell: 0.012 },
  ghost_cervical: { shell: 0.012 },
  ghost_lumbar: { shell: 0.014 },
  ghost_foot: { shell: 0.012 },
  ghost_l_femur: { shell: 0.045 },
  hand: { shell: 0.011 },
};
export const drrParams = (name) => BONE_DRR[name.startsWith('hand_') ? 'hand' : name] || { shell: 0.012 };

// ------------------------------------------------------------------ reparos
export const LANDMARKS = [
  { name: 'Cabeza femoral', bone: 'femur', pos: [-0.8, 8.13, 0.77] },
  { name: 'Cuello femoral', bone: 'femur', pos: [-1.0, 7.99, 0.72] },
  { name: 'Trocánter mayor', bone: 'femur', pos: [-1.4, 7.92, 0.74] },
  { name: 'Trocánter menor', bone: 'femur', pos: [-0.98, 7.47, 0.62] },
  { name: 'Diáfisis femoral', bone: 'femur', pos: [-0.99, 6.0, 0.95] },
  { name: 'Cóndilo femoral medial', bone: 'femur', pos: [-0.46, 3.86, 0.72] },
  { name: 'Cóndilo femoral lateral', bone: 'femur', pos: [-1.02, 3.86, 0.76] },
  { name: 'Rótula', bone: 'patella', pos: [-0.82, 3.81, 1.12] },
  { name: 'Meseta tibial', bone: 'tibia', pos: [-0.74, 3.62, 0.8] },
  { name: 'Tuberosidad tibial', bone: 'tibia', pos: [-0.87, 3.38, 1.1] },
  { name: 'Diáfisis tibial', bone: 'tibia', pos: [-0.82, 1.76, 0.92] },
  { name: 'Maléolo medial', bone: 'tibia', pos: [-0.52, 0.04, 0.78] },
  { name: 'Cabeza del peroné', bone: 'fibula', pos: [-1.07, 3.48, 0.62] },
  { name: 'Diáfisis del peroné', bone: 'fibula', pos: [-1.01, 1.82, 0.6] },
  { name: 'Maléolo lateral', bone: 'fibula', pos: [-0.96, -0.17, 0.57] },
  { name: 'Techo acetabular', bone: 'pelvis', pos: [-0.9, 8.4, 0.76] },
  { name: 'Cresta ilíaca', bone: 'pelvis', pos: [-1.29, 9.44, 0.85] },
  { name: 'Espina ilíaca anterosuperior', bone: 'pelvis', pos: [-1.28, 8.95, 1.34] },
  { name: 'Sínfisis del pubis', bone: 'pelvis', pos: [0.0, 7.98, 1.3] },
  { name: 'Tuberosidad isquiática', bone: 'pelvis', pos: [-0.42, 7.57, 0.56] },
  { name: 'Sacro', bone: 'sacrum', pos: [0, 8.73, 0.3] },
  { name: 'Cabeza humeral', bone: 'humerus', pos: [-1.58, 13.12, 0.76] },
  { name: 'Troquíter (tubérculo mayor)', bone: 'humerus', pos: [-1.83, 13.25, 0.8] },
  { name: 'Diáfisis humeral', bone: 'humerus', pos: [-1.98, 11.76, 0.68] },
  { name: 'Epicóndilo medial', bone: 'humerus', pos: [-1.8, 10.49, 0.68] },
  { name: 'Epicóndilo lateral', bone: 'humerus', pos: [-2.38, 10.54, 0.62] },
  { name: 'Olécranon', bone: 'ulna', pos: [-1.99, 10.46, 0.56] },
  { name: 'Cabeza del radio', bone: 'radius', pos: [-2.25, 10.24, 0.72] },
  { name: 'Diáfisis radial', bone: 'radius', pos: [-2.52, 9.25, 0.97] },
  { name: 'Radio distal (metáfisis)', bone: 'radius', pos: [-2.65, 8.36, 1.24] },
  { name: 'Estiloides radial', bone: 'radius', pos: [-2.74, 8.09, 1.2] },
  { name: 'Diáfisis cubital', bone: 'ulna', pos: [-2.28, 9.25, 0.93] },
  { name: 'Estiloides cubital', bone: 'ulna', pos: [-2.35, 8.14, 1.15] },
  { name: 'Extremo esternal de la clavícula', bone: 'clavicle', pos: [-0.14, 13.19, 1.25] },
  { name: 'Tercio medio de la clavícula', bone: 'clavicle', pos: [-0.79, 13.36, 1.01] },
  { name: 'Extremo acromial de la clavícula', bone: 'clavicle', pos: [-1.4, 13.5, 0.74] },
  { name: 'Acromion', bone: 'scapula', pos: [-1.59, 13.44, 0.75] },
  { name: 'Apófisis coracoides', bone: 'scapula', pos: [-1.34, 13.2, 0.98] },
  { name: 'Cavidad glenoidea', bone: 'scapula', pos: [-1.49, 12.98, 0.64] },
  { name: 'Ángulo inferior de la escápula', bone: 'scapula', pos: [-0.95, 11.88, 0.07] },
  { name: 'Escafoides', bone: 'hand_00', pos: [-2.73, 7.97, 1.26] },
  { name: 'Semilunar', bone: 'hand_01', pos: [-2.61, 8.04, 1.19] },
  { name: 'Pisiforme', bone: 'hand_03', pos: [-2.36, 7.96, 1.32] },
  { name: '1.er metacarpiano', bone: 'hand_06', pos: [-2.91, 7.79, 1.39] },
  { name: '2.º metacarpiano', bone: 'hand_08', pos: [-2.8, 7.52, 1.3] },
  { name: '3.er metacarpiano', bone: 'hand_09', pos: [-2.62, 7.53, 1.28] },
  { name: '4.º metacarpiano', bone: 'hand_07', pos: [-2.46, 7.55, 1.29] },
  { name: '5.º metacarpiano', bone: 'hand_07', pos: [-2.31, 7.6, 1.33] },
  { name: 'Falange proximal del pulgar', bone: 'hand_10', pos: [-3.1, 7.45, 1.57] },
  { name: 'Falange proximal del 3.er dedo', bone: 'hand_14', pos: [-2.68, 7.05, 1.5] },
  { name: 'Falange distal del 3.er dedo', bone: 'hand_22', pos: [-2.76, 6.6, 1.87] },
];

// ------------------------------------------------------------------ partes blandas
// Secciones elípticas horizontales: [x, y, z, radio X, radio Z]
const SOFT = {
  arm: [
    [-1.62, 13.45, 0.75, 0.42, 0.45],
    [-1.75, 13.0, 0.74, 0.55, 0.55],
    [-1.95, 12.0, 0.7, 0.45, 0.5],
    [-2.05, 11.0, 0.66, 0.42, 0.44],
    [-2.14, 10.35, 0.68, 0.45, 0.42],
    [-2.3, 9.7, 0.85, 0.42, 0.38],
    [-2.43, 9.0, 1.0, 0.35, 0.3],
    [-2.56, 8.3, 1.16, 0.3, 0.2],
    [-2.6, 8.0, 1.22, 0.31, 0.2],
  ],
  palm: [
    [-2.6, 8.05, 1.22, 0.3, 0.2],
    [-2.66, 7.7, 1.3, 0.42, 0.2],
    [-2.66, 7.35, 1.38, 0.43, 0.16],
    [-2.64, 7.18, 1.45, 0.4, 0.12],
  ],
  fingers: [
    [[-2.93, 7.2, 1.42], [-2.92, 7.05, 1.45], [-3.02, 6.81, 1.62], [-3.06, 6.69, 1.78], [-3.07, 6.58, 1.83]],
    [[-2.68, 7.2, 1.46], [-2.68, 7.05, 1.5], [-2.73, 6.75, 1.69], [-2.76, 6.6, 1.87], [-2.77, 6.5, 1.91]],
    [[-2.47, 7.22, 1.45], [-2.47, 7.09, 1.49], [-2.49, 6.82, 1.69], [-2.49, 6.69, 1.87], [-2.49, 6.61, 1.93]],
    [[-2.29, 7.3, 1.45], [-2.29, 7.2, 1.49], [-2.25, 6.97, 1.63], [-2.23, 6.83, 1.75], [-2.22, 6.74, 1.81]],
    [[-2.85, 7.85, 1.32], [-2.92, 7.72, 1.42], [-3.07, 7.5, 1.55], [-3.13, 7.3, 1.63], [-3.15, 7.15, 1.67]],
  ],
  leg: [
    [-1.0, 8.15, 0.72, 0.85, 0.8],
    [-1.0, 7.4, 0.76, 0.86, 0.84],
    [-0.98, 6.4, 0.84, 0.74, 0.76],
    [-0.86, 5.0, 0.86, 0.6, 0.62],
    [-0.79, 4.0, 0.86, 0.55, 0.55],
    [-0.8, 3.3, 0.78, 0.55, 0.6],
    [-0.84, 2.6, 0.7, 0.56, 0.64],
    [-0.82, 1.6, 0.78, 0.42, 0.45],
    [-0.78, 0.6, 0.76, 0.34, 0.34],
    [-0.76, 0.0, 0.74, 0.36, 0.38],
    [-0.76, -0.35, 0.8, 0.36, 0.42],
  ],
  pelvis: [
    [0, 10.2, 0.62, 1.45, 1.0],
    [0, 9.2, 0.64, 1.7, 1.1],
    [0, 8.3, 0.66, 1.78, 1.05],
    [0, 7.75, 0.66, 1.65, 0.95],
  ],
  thorax: [
    [0, 14.1, 0.85, 0.55, 0.5],
    [0, 13.6, 0.92, 1.3, 0.85],
    [0, 13.1, 1.0, 1.62, 1.05],
    [0, 12.0, 1.05, 1.62, 1.22],
    [0, 10.6, 1.05, 1.5, 1.15],
    [0, 10.0, 0.95, 1.42, 1.05],
  ],
};
// pulmones: aire (densidad menor que la de las partes blandas)
const LUNGS = [
  { c: [-0.68, 11.95, 1.05], r: [0.52, 1.35, 0.78] },
  { c: [0.66, 11.95, 1.05], r: [0.5, 1.3, 0.75] },
];

// ------------------------------------------------------------------ regiones
export const REGIONS = {
  pierna: {
    title: 'Pierna',
    sub: 'Tibia y peroné',
    group: 'Miembro inferior',
    target: ['tibia', 'fibula'],
    context: ['patella', 'femur', 'ghost_foot'],
    clip: { ghost_foot: [plane([-0.05, 0, 0], [-1, 0, 0], { clip: true })] },
    soft: [{ tube: SOFT.leg }],
    iso: [-0.84, 1.75, 0.78],
    detector: [3.0, 4.8],
    gain: 0.55,
    odd: 1.0,
    presets: [
      { id: 'ap', label: 'AP', rot: 0, ang: 0 , short: 'AP', note: 'Tibia y peroné completos con rodilla y tobillo. El peroné se superpone poco a la tibia en sus extremos.' },
      { id: 'lat', label: 'Lateral', rot: 90, ang: 0 , short: 'LAT', note: 'Valora angulación anteroposterior y desplazamiento. La tibia y el peroné se superponen parcialmente.' },
      { id: 'obi', label: 'Oblicua interna 45°', rot: 45, ang: 0 , short: 'OI', note: 'Separa la articulación tibioperonea proximal y despeja el peroné.' },
      { id: 'obe', label: 'Oblicua externa 45°', rot: -45, ang: 0 , short: 'OE', note: 'Aumenta la superposición del peroné; útil para seguir la cortical medial de la tibia.' },
    ],
  },
  muslo: {
    title: 'Muslo',
    sub: 'Fémur',
    group: 'Miembro inferior',
    target: ['femur'],
    context: ['patella', 'tibia', 'fibula', 'pelvis', 'sacrum'],
    soft: [{ tube: SOFT.leg }],
    iso: [-0.95, 6.0, 0.82],
    detector: [3.5, 4.8],
    gain: 0.45,
    odd: 1.0,
    presets: [
      { id: 'ap', label: 'AP', rot: 0, ang: 0 , short: 'AP', note: 'Fémur completo, cuello en rotación neutra. Incluye cadera o rodilla según el foco.' },
      { id: 'lat', label: 'Lateral', rot: 90, ang: 0 , short: 'LAT', note: 'Curvatura anterior del fémur y desplazamientos en el plano sagital.' },
    ],
  },
  cadera: {
    title: 'Cadera y pelvis',
    sub: 'Fémur proximal',
    group: 'Miembro inferior',
    target: ['femur', 'pelvis', 'sacrum'],
    context: ['ghost_l_femur', 'ghost_lumbar'],
    soft: [{ tube: SOFT.pelvis }, { tube: SOFT.leg.slice(1), cap: true }, { tube: SOFT.leg.slice(1).map((s) => [-s[0], ...s.slice(1)]) }],
    iso: [-0.45, 8.25, 0.72],
    detector: [4.3, 3.5],
    gain: 0.42,
    odd: 1.6,
    presets: [
      { id: 'ap', label: 'AP de pelvis', rot: 0, ang: 0 , short: 'AP', note: 'Pelvis, ambas caderas y fémures proximales. Busca la línea de Shenton y la simetría.' },
      { id: 'judi', label: 'Judet alar 45°', rot: 45, ang: 0 , short: 'ALAR', note: 'Oblicua alar: abre el ala ilíaca y la columna posterior del acetábulo.' },
      { id: 'judo', label: 'Judet obturatriz 45°', rot: -45, ang: 0 , short: 'OBT', note: 'Oblicua obturatriz: muestra el agujero obturador y la columna anterior.' },
      { id: 'inlet', label: 'Inlet (caudal 40°)', rot: 0, ang: -40 , short: 'IN', note: 'Entrada de la pelvis: anillo pélvico y desplazamientos anteroposteriores.' },
      { id: 'outlet', label: 'Outlet (cefálica 40°)', rot: 0, ang: 40 , short: 'OUT', note: 'Salida de la pelvis: sacro y desplazamientos verticales.' },
    ],
  },
  brazo: {
    title: 'Brazo',
    sub: 'Húmero',
    group: 'Miembro superior',
    target: ['humerus'],
    context: ['scapula', 'clavicle', 'radius', 'ulna'],
    soft: [{ tube: SOFT.arm }],
    iso: [-1.95, 11.8, 0.7],
    detector: [3.0, 4.3],
    gain: 0.5,
    odd: 0.9,
    presets: [
      { id: 'ap', label: 'AP', rot: 0, ang: 0 , short: 'AP', note: 'Húmero completo con hombro y codo; troquíter de perfil.' },
      { id: 'lat', label: 'Lateral', rot: 90, ang: 0 , short: 'LAT', note: 'Segunda proyección ortogonal del húmero.' },
    ],
  },
  antebrazo: {
    title: 'Antebrazo',
    sub: 'Radio y cúbito',
    group: 'Miembro superior',
    target: ['radius', 'ulna'],
    context: ['humerus', ...HAND],
    soft: [{ tube: SOFT.arm }, { tube: SOFT.palm }],
    iso: [-2.38, 9.15, 0.95],
    detector: [2.4, 3.6],
    gain: 0.6,
    odd: 0.7,
    distalUp: true,
    presets: [
      { id: 'ap', label: 'AP', rot: 0, ang: 0 , short: 'AP', note: 'Radio y cúbito paralelos, con codo y muñeca.' },
      { id: 'lat', label: 'Lateral', rot: 90, ang: 0 , short: 'LAT', note: 'Radio y cúbito superpuestos en el extremo distal. Valora angulación volar o dorsal.' },
    ],
  },
  muneca: {
    title: 'Muñeca',
    sub: 'Radio distal y carpo',
    group: 'Miembro superior',
    target: ['radius', 'ulna', ...HAND.slice(0, 6)],
    context: HAND.slice(6),
    soft: [{ tube: SOFT.arm }, { tube: SOFT.palm }, ...SOFT.fingers.map((f) => ({ finger: f }))],
    iso: [-2.58, 8.1, 1.2],
    detector: [1.8, 2.4],
    gain: 0.68,
    odd: 0.5,
    distalUp: true,
    presets: [
      { id: 'pa', label: 'PA', rot: 180, ang: 0 , short: 'PA', note: 'Radio distal, cúbito y carpo. Revisa las líneas de Gilula y la altura radial.' },
      { id: 'lat', label: 'Lateral', rot: 90, ang: 0 , short: 'LAT', note: 'Inclinación volar del radio, alineación radio-semilunar-hueso grande.' },
      { id: 'obl', label: 'Oblicua 45°', rot: 135, ang: 0 , short: 'OBL', note: 'Despeja el escafoides y el trapecio.' },
      { id: 'esc', label: 'Escafoides (20° al codo)', rot: 180, ang: 20 , short: 'ESC', note: 'Alarga el escafoides para buscar fracturas de su cintura.' },
    ],
  },
  mano: {
    title: 'Mano',
    sub: 'Metacarpianos y falanges',
    group: 'Miembro superior',
    target: HAND,
    context: ['radius', 'ulna'],
    soft: [{ tube: SOFT.arm.slice(-3) }, { tube: SOFT.palm }, ...SOFT.fingers.map((f) => ({ finger: f }))],
    iso: [-2.66, 7.35, 1.45],
    detector: [2.4, 3.0],
    gain: 0.72,
    odd: 0.5,
    distalUp: true,
    presets: [
      { id: 'pa', label: 'PA', rot: 180, ang: -22 , short: 'PA', note: 'Metacarpianos y falanges de frente. La angulación del tubo compensa la flexión de los dedos.' },
      { id: 'obl', label: 'Oblicua 45°', rot: 135, ang: -22 , short: 'OBL', note: 'Separa los metacarpianos que se superponen en la lateral.' },
      { id: 'lat', label: 'Lateral', rot: 90, ang: 0 , short: 'LAT', note: 'Muestra la angulación volar o dorsal de las fracturas de metacarpianos.' },
    ],
  },
  hombro: {
    title: 'Hombro',
    sub: 'Clavícula, escápula y húmero proximal',
    group: 'Miembro superior',
    target: ['clavicle', 'scapula', 'humerus'],
    context: ['ghost_ribcage', 'ghost_sternum', 'ghost_thoracic', 'ghost_cervical'],
    soft: [{ tube: SOFT.thorax }, { tube: SOFT.arm.slice(0, 5) }, ...LUNGS.map((l) => ({ ellipsoid: l, mu: -0.9 }))],
    iso: [-1.0, 12.95, 0.85],
    detector: [4.3, 3.5],
    gain: 0.5,
    odd: 1.4,
    presets: [
      { id: 'ap', label: 'AP', rot: 0, ang: 0 , short: 'AP', note: 'Cabeza humeral, glenoides, clavícula y escápula sobre el tórax.' },
      { id: 'clav', label: 'Clavícula (20° cefálica)', rot: 0, ang: 20 , short: 'CLAV', note: 'La angulación cefálica proyecta la clavícula por encima de costillas y escápula.' },
      { id: 'grashey', label: 'Grashey (oblicua 40°)', rot: 40, ang: 0 , short: 'GRSH', note: 'Oblicua verdadera: espacio glenohumeral de perfil.' },
      { id: 'y', label: 'Y escapular', rot: -120, ang: 0 , short: 'Y', note: 'Lateral de escápula: la cabeza humeral debe quedar en el centro de la Y.' },
    ],
  },
};

export const REGION_LIST = Object.entries(REGIONS).map(([id, r]) => ({ id, ...r }));

/** Todos los huesos del esqueleto (para el contexto translúcido 3D). */
export const skeletonNames = (manifest) => Object.keys(manifest.bones);
