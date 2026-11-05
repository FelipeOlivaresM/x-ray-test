// Materiales del motor: radiograma reconstruido (DRR), superficie 3D y "fantasma".
//
// Fracturas: cada fragmento es la malla completa del hueso recortada por hasta
// MAXP semiespacios (planos con ruido para que el trazo sea irregular).
// - En superficie se descartan los píxeles del lado eliminado.
// - En el DRR no se descarta nada: cada cara aporta ±distancia recortada al
//   intervalo que el rayo pasa dentro de los semiespacios. La suma da el
//   espesor exacto del fragmento atravesado (las "tapas" del corte salen solas).
import * as THREE from 'three';

export const MAXP = 4;
export const LAYER_SURF = 0;
export const LAYER_DRR = 1;

const NOISE = /* glsl */ `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
                 mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                 mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// desplazamiento del plano i evaluado en un punto sobre el plano
float planeOffset(vec4 nz, vec3 q) {
  return nz.x * (vnoise(q * nz.y + nz.z) - 0.5 + 0.5 * (vnoise(q * nz.y * 2.7 + nz.z) - 0.5));
}
`;

const PLANE_UNIFORMS = /* glsl */ `
#define MAXP ${MAXP}
uniform int uCount;
uniform vec4 uPlane[MAXP];  // n.xyz, d   (se conserva dot(n,p) - d - ruido >= 0)
uniform vec4 uNoise[MAXP];  // amplitud (con signo), frecuencia, semilla, 1 = recorte sin resaltar
`;

// ---------------------------------------------------------------- DRR
const drrVertex = /* glsl */ `
uniform float uShell;
attribute float aShell;
varying vec3 vLocal;
varying vec3 vCam;
void main() {
  float sh = uShell * aShell;
  vec3 p = position - normal * sh;
  vLocal = p;
  vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const drrFragment = /* glsl */ `
${PLANE_UNIFORMS}
uniform float uMu;     // coeficiente (negativo para la cáscara interna)
uniform float uScale;  // escala mundo / local
uniform float uRef;    // distancia de referencia (precisión numérica)
varying vec3 vLocal;
varying vec3 vCam;
${NOISE}
void main() {
  vec3 O = vCam;
  vec3 D = vLocal - O;
  float t = length(D);
  D /= t;
  float lo = 0.0;
  float hi = 1e4;
  for (int i = 0; i < MAXP; i++) {
    if (i >= uCount) break;
    vec3 n = uPlane[i].xyz;
    float s0 = dot(O, n) - uPlane[i].w;
    float dn = dot(D, n);
    if (abs(dn) < 1e-5) {
      if (s0 < 0.0) lo = 2e4;
      continue;
    }
    float tp = -s0 / dn;
    float off = planeOffset(uNoise[i], O + D * tp);
    tp = (off - s0) / dn;
    if (dn > 0.0) lo = max(lo, tp); else hi = min(hi, tp);
  }
  float v = lo < hi ? clamp(t, lo, hi) - uRef : 0.0;
  float s = gl_FrontFacing ? -1.0 : 1.0;
  gl_FragColor = vec4(s * v * uScale * uMu, 0.0, 0.0, 1.0);
}
`;

function planeUniforms() {
  return {
    uCount: { value: 0 },
    uPlane: { value: Array.from({ length: MAXP }, () => new THREE.Vector4()) },
    uNoise: { value: Array.from({ length: MAXP }, () => new THREE.Vector4()) },
  };
}

export function makeDrrMaterial({ mu = 1, shell = 0, scale = 1, planes = [] } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...planeUniforms(), uMu: { value: mu }, uShell: { value: shell }, uScale: { value: scale }, uRef: { value: 10 } },
    vertexShader: drrVertex,
    fragmentShader: drrFragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  setPlanes(m, planes);
  return m;
}

// ---------------------------------------------------------- superficie
const surfVertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vLocal = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const surfFragment = /* glsl */ `
${PLANE_UNIFORMS}
uniform vec3 uColor;
uniform vec3 uCutColor;
uniform float uHighlight;
uniform float uOpacity;
uniform float uGhost;      // 1 = modo transparente tipo rayos X
uniform vec3 uGhostColor;
varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vViewPos;
${NOISE}
void main() {
  float near = 1e3;
  for (int i = 0; i < MAXP; i++) {
    if (i >= uCount) break;
    vec3 n = uPlane[i].xyz;
    float f = dot(vLocal, n) - uPlane[i].w;
    vec3 q = vLocal - n * f;
    f -= planeOffset(uNoise[i], q);
    if (f < 0.0) discard;
    if (uNoise[i].w < 0.5) near = min(near, f);
  }
  vec3 N = normalize(vNormalV);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vViewPos);
  float hl = uHighlight * (1.0 - smoothstep(0.0, 0.05, near));

  if (uGhost > 0.5) {
    float ndv = abs(dot(N, V));
    float edge = pow(1.0 - ndv, 2.2);
    vec3 c = mix(uGhostColor, uCutColor, hl);
    float a = (0.05 + 0.85 * edge) * uOpacity + hl * 0.5;
    gl_FragColor = vec4(c * a, a);
    return;
  }

  vec3 L1 = normalize(vec3(0.4, 0.8, 0.6));
  vec3 L2 = normalize(vec3(-0.7, -0.1, 0.4));
  float diff = max(dot(N, L1), 0.0) * 0.75 + max(dot(N, L2), 0.0) * 0.3;
  float hemi = 0.5 + 0.5 * N.y;
  vec3 base = gl_FrontFacing ? uColor : uCutColor * 0.85;
  base *= 0.92 + 0.1 * vnoise(vLocal * 40.0);
  base = mix(base, uCutColor, hl * 0.85);
  vec3 H = normalize(L1 + V);
  float spec = pow(max(dot(N, H), 0.0), 36.0) * 0.16;
  float rim = pow(1.0 - abs(dot(N, V)), 3.0) * 0.25;
  vec3 col = base * (0.28 + 0.22 * hemi + diff) + spec + rim * vec3(0.4, 0.75, 0.85);
  gl_FragColor = vec4(col, uOpacity);
}
`;

export function makeSurfaceMaterial({ color = '#e9dfca', ghost = false, ghostColor = '#3fd0e6', opacity = 1, planes = [] } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...planeUniforms(),
      uColor: { value: new THREE.Color(color) },
      uCutColor: { value: new THREE.Color('#ff5a3c') },
      uGhostColor: { value: new THREE.Color(ghostColor) },
      uHighlight: { value: 0 },
      uOpacity: { value: opacity },
      uGhost: { value: ghost ? 1 : 0 },
    },
    vertexShader: surfVertex,
    fragmentShader: surfFragment,
    side: THREE.DoubleSide,
  });
  setGhost(m, ghost, opacity);
  setPlanes(m, planes);
  return m;
}

export function setGhost(m, ghost, opacity = m.uniforms.uOpacity.value) {
  m.uniforms.uGhost.value = ghost ? 1 : 0;
  m.uniforms.uOpacity.value = opacity;
  if (ghost) {
    m.transparent = true;
    m.depthWrite = false;
    m.blending = THREE.CustomBlending;
    m.blendEquation = THREE.AddEquation;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else {
    m.transparent = opacity < 1;
    m.depthWrite = opacity >= 1;
    m.blending = THREE.NormalBlending;
  }
  m.needsUpdate = true;
}

/**
 * planes: [{ n:[x,y,z], d, amp, freq, seed, clip }] en coordenadas locales de la malla.
 */
export function setPlanes(m, planes = []) {
  const u = m.uniforms;
  u.uCount.value = Math.min(planes.length, MAXP);
  planes.slice(0, MAXP).forEach((p, i) => {
    u.uPlane.value[i].set(p.n[0], p.n[1], p.n[2], p.d);
    u.uNoise.value[i].set(p.amp || 0, p.freq || 10, p.seed || 0, p.clip ? 1 : 0);
  });
}

// ---------------------------------------------------------- composición
const compVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const compFragment = /* glsl */ `
uniform sampler2D tAtt;
uniform vec2 uTexel;
uniform float uGain;
uniform float uLevel;
uniform float uWidth;
uniform float uInvert;
uniform float uSharpen;
uniform float uGrain;
uniform float uSeed;
uniform vec2 uCollim;    // fracción del campo colimado (1 = sin colimar)
uniform float uRotate;   // 1 = girar 180° (distal hacia arriba)
varying vec2 vUv;

float att(vec2 uv) { return max(texture2D(tAtt, uv).r, 0.0); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }

void main() {
  vec2 uv = uRotate > 0.5 ? 1.0 - vUv : vUv;
  float a = att(uv);
  // realce de bordes (procesado típico de radiografía digital)
  float b = 0.0;
  b += att(uv + vec2(uTexel.x, 0.0)) + att(uv - vec2(uTexel.x, 0.0));
  b += att(uv + vec2(0.0, uTexel.y)) + att(uv - vec2(0.0, uTexel.y));
  b += att(uv + uTexel * 2.0) + att(uv - uTexel * 2.0);
  b += att(uv + vec2(uTexel.x, -uTexel.y) * 2.0) + att(uv - vec2(uTexel.x, -uTexel.y) * 2.0);
  b /= 8.0;
  a = max(a + uSharpen * (a - b), 0.0);
  float I = 1.0 - exp(-a * uGain);
  // ruido cuántico: mayor donde llega menos señal
  float n = hash2(vUv * 913.0) - 0.5;
  I += n * uGrain * (0.35 + 0.65 * (1.0 - I));
  // efecto talón y viñeta suaves
  vec2 c = vUv - 0.5;
  I *= 1.0 - 0.18 * dot(c, c) * 2.0;
  I += 0.035 * (vUv.y - 0.5);
  float v = clamp((I - (uLevel - uWidth * 0.5)) / uWidth, 0.0, 1.0);
  // colimación
  vec2 k = abs(c) * 2.0;
  float inside = step(k.x, uCollim.x) * step(k.y, uCollim.y);
  v = mix(0.05 + 0.04 * v, v, inside);
  if (uInvert > 0.5) v = 1.0 - v;
  gl_FragColor = vec4(vec3(v) * vec3(0.97, 0.99, 1.0), 1.0);
}
`;

export function makeComposite() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tAtt: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      uGain: { value: 1 },
      uLevel: { value: 0.5 },
      uWidth: { value: 1 },
      uInvert: { value: 0 },
      uSharpen: { value: 0.9 },
      uGrain: { value: 0.035 },
      uSeed: { value: 0 },
      uCollim: { value: new THREE.Vector2(1, 1) },
      uRotate: { value: 0 },
    },
    vertexShader: compVertex,
    fragmentShader: compFragment,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { mat, scene, cam };
}

/** Destino de render para espesores: float si el navegador permite mezclarlo. */
export function makeAttTarget(renderer, w, h) {
  const canFloat = !!renderer.extensions.get('EXT_float_blend') && !!renderer.extensions.get('EXT_color_buffer_float');
  return new THREE.WebGLRenderTarget(w, h, {
    type: canFloat ? THREE.FloatType : THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
}
