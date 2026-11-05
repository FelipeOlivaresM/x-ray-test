// Idiomas de la interfaz y del contenido.
// El español es el idioma fuente: cada texto en español es su propia clave.
// Si falta una traducción se muestra el texto en español (nunca queda vacío).
import { useSyncExternalStore } from 'react';
import en from './en.js';
import pt from './pt.js';

export const LANGS = [
  { id: 'es', short: 'ES', name: 'Español' },
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'pt', short: 'PT', name: 'Português' },
];
const PACKS = { en, pt };
const KEY = 'radiosim:lang';
// Un idioma solo se ofrece cuando ya tiene traducciones cargadas.
const ready = (id) => id === 'es' || Object.keys(PACKS[id]?.ui || {}).length > 0;
export const AVAILABLE = LANGS.filter((l) => ready(l.id));

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (AVAILABLE.some((l) => l.id === saved)) return saved;
  } catch {
    /* sin almacenamiento */
  }
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return AVAILABLE.some((l) => l.id === nav) ? nav : 'es';
}

let lang = initial();
const subs = new Set();
document.documentElement.lang = lang;

export function setLang(l) {
  if (l === lang || !AVAILABLE.some((x) => x.id === l)) return;
  lang = l;
  document.documentElement.lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* sin almacenamiento */
  }
  subs.forEach((f) => f());
}
export const getLang = () => lang;
const subscribe = (f) => {
  subs.add(f);
  return () => subs.delete(f);
};
export const useLang = () => useSyncExternalStore(subscribe, getLang);

/** Traduce un texto de la interfaz. vars reemplaza {nombre} en el resultado. */
export function t(s, vars) {
  if (s == null) return s;
  const pack = PACKS[lang];
  let out = (pack && pack.ui[s]) || s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return out;
}

/** Caso clínico con sus textos en el idioma actual. */
export function localizeCase(c) {
  if (!c || lang === 'es') return c;
  const tr = PACKS[lang]?.cases?.[c.id] || {};
  return {
    ...c,
    ...pick(tr, ['title', 'vignette', 'objective', 'hint', 'diagnosis', 'teaching', 'pitfalls']),
    region: t(c.region),
    questions: c.questions.map((q, i) => ({ ...q, ...pick(tr.questions?.[i] || {}, ['prompt', 'options', 'explanation']) })),
  };
}
function pick(o, keys) {
  const r = {};
  keys.forEach((k) => {
    if (o[k] != null) r[k] = o[k];
  });
  return r;
}

/** Idioma activo para formatos de número y fecha. */
export const locale = () => ({ es: 'es-CO', en: 'en-US', pt: 'pt-BR' })[lang];
