export default function Logo({ size = 34, withText = true }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="lg-rs" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38e1f5" />
            <stop offset="1" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="12" fill="#04141a" stroke="url(#lg-rs)" strokeWidth="2.5" />
        <path d="M14 22V14h8M42 14h8v8M50 42v8h-8M22 50h-8v-8" fill="none" stroke="#38e1f5" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 20c-3-3-8 1-5 4l17 17c-1 4 4 6 6 3 3 2 6-2 3-5L30 22c1-4-4-6-6-3" fill="none" stroke="#dff6fa" strokeWidth="3" strokeLinejoin="round" />
        <path d="M33 29l-4 5" stroke="#ffb547" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {withText && (
        <span className="logo-text">
          RADIO<b>SIM</b>
        </span>
      )}
    </span>
  );
}
