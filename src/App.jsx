import { useState } from 'react';
import { useRoute } from './lib/router.js';
import Logo from './components/Logo.jsx';
import Icon from './components/Icon.jsx';
import Home from './pages/Home.jsx';
import Cases from './pages/Cases.jsx';
import CaseRunner from './pages/CaseRunner.jsx';
import Lab from './pages/Lab.jsx';
import Bank from './pages/Bank.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Plans from './pages/Plans.jsx';
import Credits from './pages/Credits.jsx';
import { AVAILABLE, setLang, t, useLang } from './i18n/index.js';

const NAV = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/casos', label: 'Casos clínicos', icon: 'cases' },
  { to: '/lab', label: 'Laboratorio 3D', icon: 'cube' },
  { to: '/banco', label: 'Banco y repaso', icon: 'image' },
  { to: '/progreso', label: 'Mi progreso', icon: 'chart' },
  { to: '/planes', label: 'Planes', icon: 'building' },
];

export default function App() {
  const path = useRoute();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const seg = path.split('/').filter(Boolean);

  let page;
  if (seg[0] === 'casos') page = <Cases />;
  else if (seg[0] === 'caso' && seg[1]) page = <CaseRunner key={seg[1]} id={seg[1]} />;
  else if (seg[0] === 'lab') page = <Lab key={seg[1] || 'lab'} initial={seg[1]} />;
  else if (seg[0] === 'banco') page = <Bank />;
  else if (seg[0] === 'progreso') page = <Dashboard />;
  else if (seg[0] === 'planes') page = <Plans />;
  else if (seg[0] === 'creditos') page = <Credits />;
  else page = <Home />;

  const active = (to) => (to === '/' ? path === '/' : path.startsWith(to) || (to === '/casos' && seg[0] === 'caso'));

  return (
    <div className="app">
      <a className="skip" href="#contenido" onClick={(e) => (e.preventDefault(), document.getElementById('contenido')?.focus())}>
        {t('Saltar al contenido')}
      </a>
      <header className="topbar">
        <a href="#/" className="brand" onClick={() => setOpen(false)} aria-label={t('RadioSim, inicio')}>
          <Logo size={34} />
        </a>
        <button className="menu-btn" aria-label={t('Menú')} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'x' : 'menu'} size={20} />
        </button>
        <nav className={`nav ${open ? 'nav--open' : ''}`} aria-label={t('Principal')}>
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={active(n.to) ? 'active' : ''} aria-current={active(n.to) ? 'page' : undefined} onClick={() => setOpen(false)} title={t(n.label)}>
              <Icon name={n.icon} size={16} />
              <span>{t(n.label)}</span>
            </a>
          ))}
        </nav>
        {AVAILABLE.length > 1 && (
          <div className="lang" role="group" aria-label={t('Idioma')}>
            <Icon name="globe" size={15} />
            {AVAILABLE.map((l) => (
            <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} title={l.name} lang={l.id} onClick={() => setLang(l.id)}>
                {l.short}
              </button>
            ))}
          </div>
        )}
      </header>
      <main className="main" id="contenido" tabIndex={-1}>
        {page}
      </main>
      <footer className="footer">
        <div>
          <Logo size={24} />
          <p>
            {t(
              'Plataforma educativa de simulación. No sustituye la supervisión docente ni la valoración de un profesional de la salud. No emite diagnósticos para decisiones clínicas reales.',
            )}
          </p>
        </div>
        <div>
          <p>
            {t('Huesos: BodyParts3D (DBCLS, CC BY-SA 2.1 JP). Radiografías reales: Wikimedia Commons, con licencias abiertas.')}{' '}
            <a href="#/creditos">{t('Créditos y licencias')}</a>
          </p>
          <p className="muted small">{t('Prototipo académico · 2026.')}</p>
        </div>
      </footer>
    </div>
  );
}
