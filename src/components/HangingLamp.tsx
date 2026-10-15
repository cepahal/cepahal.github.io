import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface LampTarget { x: number; y: number; rx: number; ry: number }

// There is one lamp, and its motion is shared: the 3D map reads it to steer and dim its spotlight,
// and tells the lamp where the diorama sits (in viewport pixels) so the pool of light lands on it.
export const lamp = { drop: 0, speed: 0, swing: 0, spin: 0, focus: 0, target: null as LampTarget | null };
const listeners = new Set<() => void>();
let repaint = () => {};
let kick = 1;

export function onLampFrame(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function aimLamp(target: LampTarget) {
  lamp.target = target;
  repaint();
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

interface Size { vw: number; vh: number; width: number; rest: number; travel: number }
function measure(): Size {
  const vw = window.innerWidth, vh = window.innerHeight;
  // `rest` is where the bottom of the shade hangs; the map view's header sits just below it.
  const width = clamp(0.12 * vw, 110, 180), rest = clamp(0.12 * vh, 58, 112);
  return { vw, vh, width, rest, travel: rest + 70 };
}

// Everything on the shade canvas is soft gradients, so it is drawn at half resolution and stretched by CSS.
const SHADE_SCALE = 0.5;

/** The darkened room, with a soft cone and pool of light cut out of it. */
function drawShade(canvas: HTMLCanvasElement, s: Size, pivotY: number) {
  const w = Math.ceil(s.vw * SHADE_SCALE), h = Math.ceil(s.vh * SHADE_SCALE);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const g = canvas.getContext('2d');
  if (!g) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  const focus = lamp.focus;
  canvas.style.visibility = focus > 0.002 ? 'visible' : 'hidden';
  if (focus <= 0.002) return;
  g.setTransform(SHADE_SCALE, 0, 0, SHADE_SCALE, 0, 0);

  // CSS rotate() turns clockwise, so a positive swing carries the shade (and its beam) to the left.
  const angle = (lamp.swing * Math.PI) / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const rim = { x: s.vw / 2 - sin * s.rest, y: pivotY + cos * s.rest }, half = s.width * 0.45;
  const t = lamp.target ?? { x: s.vw / 2, y: s.vh * 0.6, rx: s.vw * 0.36, ry: s.vh * 0.3 };
  // As the lamp rises the light spreads until it covers the whole room, while the darkness fades out.
  const spread = 1 + Math.max(0, 1 - focus) ** 1.5 * 3.5;
  const pool = { x: t.x - (t.y - pivotY) * Math.tan(angle) * 0.9, y: t.y, rx: t.rx * 1.22 * spread, ry: t.ry * 1.18 * spread };
  const cone = (widen: number) => {
    g.beginPath();
    g.moveTo(rim.x - cos * half * widen, rim.y - sin * half * widen);
    g.lineTo(rim.x + cos * half * widen, rim.y + sin * half * widen);
    // The beam ends inside the pool's bright core, so the two blend with no seam.
    g.lineTo(pool.x + pool.rx * 0.55 * widen, pool.y);
    g.lineTo(pool.x - pool.rx * 0.55 * widen, pool.y);
    g.closePath();
  };

  g.globalCompositeOperation = 'source-over';
  g.fillStyle = `rgba(41, 44, 41, ${(0.62 * focus).toFixed(3)})`;
  g.fillRect(0, 0, s.vw, s.vh);

  g.globalCompositeOperation = 'destination-out';
  g.save();
  g.translate(pool.x, pool.y);
  g.scale(1, pool.ry / pool.rx);
  const spot = g.createRadialGradient(0, 0, 0, 0, 0, pool.rx);
  spot.addColorStop(0, 'rgba(0, 0, 0, 1)');
  spot.addColorStop(0.7, 'rgba(0, 0, 0, 0.95)');
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = spot;
  g.beginPath();
  g.arc(0, 0, pool.rx, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // Stacked, slightly wider copies of the cone feather its edges.
  for (const [widen, alpha] of [[1.16, 0.3], [1.07, 0.4], [1, 0.65]]) {
    g.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    cone(widen);
    g.fill();
  }

  // A faint warm haze in the beam, strongest near the bulb.
  g.globalCompositeOperation = 'source-over';
  const haze = g.createLinearGradient(rim.x, rim.y, pool.x, pool.y);
  haze.addColorStop(0, `rgba(255, 214, 150, ${(0.22 * focus).toFixed(3)})`);
  haze.addColorStop(1, 'rgba(255, 214, 150, 0)');
  g.fillStyle = haze;
  cone(1);
  g.fill();
}

const BODY = 'M89 20C87 30 78 40 62 50C40 62 14 72 6 92L194 92C186 72 160 62 138 50C122 40 113 30 111 20Z';

/** Industrial dome pendant that lowers over the campus map and lights it, and lifts away for the card view. */
export default function HangingLamp({ lit }: { lit: boolean }) {
  const fixture = useRef<HTMLDivElement>(null), shade = useRef<HTMLCanvasElement>(null), size = useRef<Size | null>(null);

  useEffect(() => {
    const apply = () => {
      const s = size.current;
      if (!s) return;
      const pivotY = (lamp.drop - 1) * s.travel, el = fixture.current;
      if (el) {
        el.style.transform = `translate3d(-50%, ${pivotY.toFixed(1)}px, 0) rotate(${lamp.swing.toFixed(2)}deg)`;
        el.style.setProperty('--glow', lamp.focus.toFixed(3));
        el.style.visibility = lamp.drop <= 0 && !lamp.speed ? 'hidden' : 'visible';
      }
      if (shade.current) drawShade(shade.current, s, pivotY);
    };
    const resize = () => {
      size.current = measure();
      const root = document.documentElement.style;
      root.setProperty('--lamp-w', `${size.current.width}px`);
      root.setProperty('--lamp-rest', `${size.current.rest}px`);
      apply();
    };
    repaint = apply;
    resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); repaint = () => {}; };
  }, []);

  useEffect(() => {
    const target = lit ? 1 : 0;
    const notify = () => listeners.forEach(listener => listener());
    if (Math.abs(lamp.drop - target) < 1e-3 && !lamp.speed && !lamp.spin) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.assign(lamp, { drop: target, speed: 0, swing: 0, spin: 0, focus: target });
      repaint();
      notify();
      return;
    }
    // Every lower and lift gives the lamp a push, alternating sides, so it swings like a pendulum.
    kick = -kick;
    lamp.spin += kick * (lit ? 29.7 : 24.3);
    let last = performance.now(), frame = 0;
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      // The cord: lowering settles with a small bounce; lifting is slower so the light visibly spreads out.
      const [stiff, drag] = lit ? [30, 7.4] : [14, 6.4];
      lamp.speed += (stiff * (target - lamp.drop) - drag * lamp.speed) * dt;
      lamp.drop += lamp.speed * dt;
      lamp.spin += (-13 * lamp.swing - 1.2 * lamp.spin) * dt; // the swing: a damped pendulum, ~1.7 s period
      lamp.swing += lamp.spin * dt;
      // The light trails the lamp, so after it lifts out of view the beam keeps spreading for a moment.
      lamp.focus += (smooth(clamp(lamp.drop, 0, 1)) - lamp.focus) * (1 - Math.exp(-dt / (lit ? 0.18 : 0.6)));
      // Stop as soon as the remaining sway is too small to see, instead of animating a quarter-degree for seconds.
      const settled = Math.abs(target - lamp.drop) < 5e-4 && Math.abs(lamp.speed) < 5e-3 && Math.abs(lamp.swing) < 0.25
        && Math.abs(lamp.spin) < 0.8 && Math.abs(target - lamp.focus) < 2e-3;
      if (settled) Object.assign(lamp, { drop: target, speed: 0, swing: 0, spin: 0, focus: target });
      repaint();
      // The 3D scene re-renders only while the change is visible there: sways under a degree barely move its light.
      if (settled || Math.abs(target - lamp.focus) > 2e-3 || Math.abs(lamp.swing) > 1) notify();
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [lit]);

  return <>
    <canvas className="lamp-shade" ref={shade} aria-hidden="true" />
    {createPortal(<div className="lamp" ref={fixture} aria-hidden="true">
      <div className="lamp__glow" />
      <div className="lamp__chain" />
      <svg className="lamp__dome" viewBox="0 0 200 104">
        <defs>
          {/* A faint mottled, oxidised finish over the plain shade: rusty blotches and pale flecks from two noise fields. */}
          <filter id="lamp-rust" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".05 .1" numOctaves="3" seed="4" />
            <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .3  0 0 0 0 .22  1.6 0 0 0 -.62" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="lamp-fleck" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".09 .16" numOctaves="2" seed="11" />
            <feColorMatrix values="0 0 0 0 .78  0 0 0 0 .72  0 0 0 0 .68  0 1.8 0 0 -.95" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <radialGradient id="lamp-enamel" cx=".5" cy=".2" r=".8"><stop offset="0" stopColor="#fffbea" /><stop offset="1" stopColor="#f2e2bd" /></radialGradient>
          <clipPath id="lamp-body"><path d={BODY} /></clipPath>
        </defs>
        <circle cx="100" cy="2.5" r="2.5" fill="none" stroke="#2f2824" strokeWidth="1.6" />
        <path d="M92 4h16l3 17H89Z" fill="#5f5049" />
        <path d={BODY} fill="#5f5049" />
        <g clipPath="url(#lamp-body)" opacity=".18">
          <rect width="200" height="104" filter="url(#lamp-rust)" />
          <rect width="200" height="104" filter="url(#lamp-fleck)" />
        </g>
        <ellipse cx="100" cy="92" rx="94" ry="9" fill="#2f2622" />
        <ellipse cx="100" cy="93.4" rx="89" ry="6.4" fill="url(#lamp-enamel)" />
      </svg>
    </div>, document.body)}
  </>;
}
