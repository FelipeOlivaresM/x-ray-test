// Progreso del estudiante, guardado en el navegador (localStorage).
// En una versión con backend esto se sincronizaría con la cuenta del usuario.
import { useSyncExternalStore } from 'react';

const KEY = 'radiosim:v1';
const empty = () => ({ name: '', attempts: [], cards: {}, days: [] });

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

let state = read();
const subs = new Set();

function write(next) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible: el progreso vive solo en esta pestaña */
  }
  subs.forEach((f) => f());
}

const today = () => new Date().toISOString().slice(0, 10);

function markDay(s) {
  const d = today();
  return s.days.includes(d) ? s.days : [...s.days, d].slice(-120);
}

export const store = {
  get: () => state,
  subscribe(f) {
    subs.add(f);
    return () => subs.delete(f);
  },
  setName(name) {
    write({ ...state, name });
  },
  addAttempt(a) {
    write({ ...state, attempts: [...state.attempts, { ...a, date: new Date().toISOString() }], days: markDay(state) });
  },
  /** Repetición espaciada tipo Leitner: cajas 1–5. */
  reviewCard(id, correct) {
    const intervals = [0, 1, 2, 4, 7, 14];
    const prev = state.cards[id] || { box: 1 };
    const box = correct ? Math.min(prev.box + 1, 5) : 1;
    const due = new Date(Date.now() + intervals[box] * 86400000).toISOString().slice(0, 10);
    write({ ...state, cards: { ...state.cards, [id]: { box, due, seen: (prev.seen || 0) + 1 } }, days: markDay(state) });
  },
  reset() {
    write(empty());
  },
};

export const useStore = () => useSyncExternalStore(store.subscribe, store.get);

export function stats(s) {
  const att = s.attempts;
  const xp = att.reduce((a, b) => a + (b.score || 0), 0);
  const best = {};
  att.forEach((a) => {
    if (!best[a.caseId] || best[a.caseId].pct < a.pct) best[a.caseId] = a;
  });
  const items = att.flatMap((a) => a.items || []);
  const acc = items.length ? items.filter((i) => i.correct).length / items.length : 0;
  // racha de días consecutivos
  let streak = 0;
  const set = new Set(s.days);
  const d = new Date();
  for (;;) {
    const k = d.toISOString().slice(0, 10);
    if (set.has(k)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return { xp, best, items, acc, streak, completed: Object.keys(best).length };
}

export function groupAcc(items, key) {
  const g = {};
  items.forEach((i) => {
    const k = i[key] || '—';
    g[k] = g[k] || { n: 0, ok: 0 };
    g[k].n++;
    if (i.correct) g[k].ok++;
  });
  return Object.entries(g)
    .map(([k, v]) => ({ key: k, n: v.n, ok: v.ok, pct: v.ok / v.n }))
    .sort((a, b) => a.pct - b.pct);
}
