// Iconos SVG de trazo (estilo Lucide, dibujados a mano). Sin emojis.
const P = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  cases: 'M4 6h16v13H4zM9 6V4h6v2M4 11h16',
  cube: 'M12 3 20 7.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5',
  layers: 'm12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  building: 'M4 21V5l8-2v18M12 8h8v13M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01M2 21h20',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  arrowL: 'M19 12H5M11 6l-6 6 6 6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  bone: 'M7.5 4.5a2.5 2.5 0 0 0-3.4 3.4 2.5 2.5 0 0 0 2.1 3.6l5.3 5.3a2.5 2.5 0 0 0 3.6 2.1 2.5 2.5 0 0 0 3.4-3.4 2.5 2.5 0 0 0-2.1-3.6L11.1 6.6a2.5 2.5 0 0 0-3.6-2.1z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  play: 'M7 4.5v15l12-7.5z',
  refresh: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14 7 21l5-3 5 3-1.5-7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
  compare: 'M12 3v18M4 6h5v12H4zM15 6h5v12h-5z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
};

export default function Icon({ name, size = 18, stroke = 1.8, className = '', title }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
