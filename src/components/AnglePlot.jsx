import { useRef } from 'react';

const W = 420;
const H = 200;
const M = { l: 34, r: 12, t: 14, b: 26 };
const RX = [-180, 180];
const AY = [-45, 45];
const px = (rot) => M.l + ((rot - RX[0]) / (RX[1] - RX[0])) * (W - M.l - M.r);
const py = (ang) => M.t + ((AY[1] - ang) / (AY[1] - AY[0])) * (H - M.t - M.b);

/**
 * Mapa rotación × angulación del arco en C. Se puede arrastrar el marcador;
 * cerca de una proyección predefinida, se "imanta" a ella.
 */
export default function AnglePlot({ rot, ang, presets = [], target = null, onChange, disabled = false }) {
  const ref = useRef(null);

  function fromEvent(e) {
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    let nr = RX[0] + ((x - M.l) / (W - M.l - M.r)) * (RX[1] - RX[0]);
    let na = AY[1] - ((y - M.t) / (H - M.t - M.b)) * (AY[1] - AY[0]);
    nr = Math.round(Math.min(Math.max(nr, RX[0]), RX[1]));
    na = Math.round(Math.min(Math.max(na, AY[0]), AY[1]));
    const near = presets.find((p) => Math.abs(p.rot - nr) <= 5 && Math.abs(p.ang - na) <= 4);
    if (near) return [near.rot, near.ang];
    return [nr, na];
  }
  const onDown = (e) => {
    if (disabled) return;
    ref.current.setPointerCapture(e.pointerId);
    onChange?.(...fromEvent(e));
  };
  const onMove = (e) => {
    if (disabled || !ref.current.hasPointerCapture(e.pointerId)) return;
    onChange?.(...fromEvent(e));
  };
  const onKey = (e) => {
    if (disabled) return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') onChange?.(Math.max(rot - step, RX[0]), ang);
    else if (e.key === 'ArrowRight') onChange?.(Math.min(rot + step, RX[1]), ang);
    else if (e.key === 'ArrowUp') onChange?.(rot, Math.min(ang + step, AY[1]));
    else if (e.key === 'ArrowDown') onChange?.(rot, Math.max(ang - step, AY[0]));
    else return;
    e.preventDefault();
  };

  const xs = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
  const ys = [-45, -30, -15, 0, 15, 30, 45];
  const xl = { '-180': 'PA', '-90': 'IZQ 90', 0: 'AP', 90: 'DER 90', 180: 'PA' };

  return (
    <svg
      ref={ref}
      className={`angle-plot ${disabled ? 'is-disabled' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Mapa de rotación y angulación del tubo"
      aria-valuetext={`rotación ${rot} grados, angulación ${ang} grados`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onKeyDown={onKey}
    >
      <rect className="ap-bg" x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
      {xs.map((x) => (
        <g key={`x${x}`}>
          <line className={x === 0 ? 'ap-axis' : 'ap-grid'} x1={px(x)} x2={px(x)} y1={M.t} y2={H - M.b} />
          {xl[x] && (
            <text className="ap-tick" x={px(x)} y={H - 9} textAnchor="middle">
              {xl[x]}
            </text>
          )}
        </g>
      ))}
      {ys.map((y) => (
        <g key={`y${y}`}>
          <line className={y === 0 ? 'ap-axis' : 'ap-grid'} x1={M.l} x2={W - M.r} y1={py(y)} y2={py(y)} />
          <text className="ap-tick" x={M.l - 5} y={py(y) + 3} textAnchor="end">
            {y > 0 ? `+${y}` : y}
          </text>
        </g>
      ))}
      <text className="ap-label" x={M.l + 4} y={M.t + 10}>
        CEFÁLICA
      </text>
      <text className="ap-label" x={M.l + 4} y={H - M.b - 4}>
        CAUDAL
      </text>
      {presets.map((p) => (
        <g key={p.id} className="ap-preset" transform={`translate(${px(p.rot)} ${py(p.ang)})`}>
          <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" />
          <text x="7" y="-6">
            {p.short || p.label}
          </text>
        </g>
      ))}
      {target && (
        <g className="ap-target" transform={`translate(${px(target.rot)} ${py(target.ang)})`}>
          <circle r="9" />
          <circle r="2" />
        </g>
      )}
      <g className="ap-cur" transform={`translate(${px(rot)} ${py(ang)})`}>
        <line x1="-14" x2="-5" y1="0" y2="0" />
        <line x1="5" x2="14" y1="0" y2="0" />
        <line x1="0" x2="0" y1="-14" y2="-5" />
        <line x1="0" x2="0" y1="5" y2="14" />
        <circle r="5" />
      </g>
    </svg>
  );
}
