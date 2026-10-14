import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';
interface Piece { key: string; side: Side; x: number; y: number; angle: number; z: number; cut: string; shade: number; light: number; fibers: string }

// Seeded PRNG so the pile is identical on every load and between the room and journal frames.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));

// A square with every side torn: points wander a few percent inward along each edge.
function tornSquare(rand: () => number): string {
  const steps = 7, pts: string[] = [];
  const tear = () => (rand() * 4).toFixed(1), corner = () => (rand() * 3).toFixed(1);
  const along = (j: number) => clamp(1, (j + (rand() - .5) * .6) * 100 / steps, 99).toFixed(1);
  pts.push(`${corner()}% ${corner()}%`);
  for (let j = 1; j < steps; j++) pts.push(`${along(j)}% ${tear()}%`);
  pts.push(`${100 - +corner()}% ${corner()}%`);
  for (let j = 1; j < steps; j++) pts.push(`${100 - +tear()}% ${along(j)}%`);
  pts.push(`${100 - +corner()}% ${100 - +corner()}%`);
  for (let j = steps - 1; j > 0; j--) pts.push(`${along(j)}% ${100 - +tear()}%`);
  pts.push(`${corner()}% ${100 - +corner()}%`);
  for (let j = steps - 1; j > 0; j--) pts.push(`${tear()}% ${along(j)}%`);
  return `polygon(${pts.join(',')})`;
}

// How far the red face sits inside its white sheet on each side (top right bottom left).
// Only the pile's outer silhouette shows it, as a torn white edge; widest facing the room.
function fibers(side: Side, rand: () => number): string {
  const inward = { top: 2, bottom: 0, left: 1, right: 3 }[side];
  return [0, 1, 2, 3].map(i => `${(i === inward ? 3 + rand() * 4 : 1.5 + rand() * 3.5).toFixed(1)}px`).join(' ');
}

// Same query as the phone media blocks in styles.css.
const PHONE = '(max-width: 640px), (pointer: coarse) and (max-height: 500px)';
const measure = () => ({ w: window.innerWidth, h: window.innerHeight, phone: matchMedia(PHONE).matches });

function buildPile(w: number, h: number, scale: number) {
  // Border depth scales with the viewport. Sheets are drawn a bit larger than the reference
  // size (fewer of them), then pushed further off-screen by however much the larger sheet's
  // inward corner would grow, so the border's reach into the room stays the same.
  const depth = Math.max(clamp(25, .05 * h, 55), clamp(17, .03 * w, 48));
  const t = scale * depth;
  const reference = scale * Math.min(3 * depth, clamp(80, .22 * Math.min(w, h), 200));
  const size = reference * 1.18;
  const offscreen = (angle: number) => {
    const a = Math.abs(angle) * Math.PI / 180;
    return (size - reference) * (Math.cos(a) + Math.sin(a)) / 2;
  };
  const pieces: Piece[] = [];
  const sides: [Side, number][] = [['top', w], ['bottom', w], ['left', h], ['right', h]];
  const place = (side: Side, along: number, depth: number): [number, number] =>
    side === 'top' ? [along, depth] : side === 'bottom' ? [along, h - depth] : side === 'left' ? [depth, along] : [w - depth, along];

  sides.forEach(([side, length], s) => {
    // Base layer: sheets overlap by about half, sit mostly off-screen, and tilt 0-15deg.
    let rand = mulberry32(101 + s * 7919);
    const baseCount = Math.ceil((length + size) / (.5 * size)) + 1;
    for (let i = 0; i < baseCount; i++) {
      const along = -size / 2 + i * (length + size) / (baseCount - 1) + (rand() - .5) * .3 * size;
      const jitter = rand() * .1 - .06, angle = rand() * 15 * (rand() < .5 ? -1 : 1);
      const [x, y] = place(side, along, t - reference / 2 + jitter * reference - offscreen(angle));
      pieces.push({ key: `${side}-base-${i}`, side, x, y, angle, z: 0, cut: tornSquare(rand), shade: .9 + rand() * .16, light: 80 + rand() * 60, fibers: fibers(side, rand) });
    }
    // Jutting layer: fewer sheets centred near the edge at 20-45deg so their corners poke into the room.
    rand = mulberry32(977 + s * 104729);
    const juttingCount = Math.max(2, Math.round(length / (1.25 * size)) + 1);
    for (let i = 0; i < juttingCount; i++) {
      const along = i * length / (juttingCount - 1) + (rand() - .5) * .4 * size;
      const jitter = rand() * .2 - .12, angle = (20 + rand() * 25) * (rand() < .5 ? -1 : 1);
      const [x, y] = place(side, along, jitter * reference - offscreen(angle));
      pieces.push({ key: `${side}-jut-${i}`, side, x, y, angle, z: 0, cut: tornSquare(rand), shade: .9 + rand() * .16, light: 80 + rand() * 60, fibers: fibers(side, rand) });
    }
  });
  // Shuffle the stacking order across both layers so the pile reads as haphazard.
  const order = mulberry32(4242);
  pieces.forEach(p => { p.z = 1 + Math.floor(order() * 500); });
  return { size, pieces };
}

export default function PaperFrame() {
  const [viewport, setViewport] = useState(measure);
  useEffect(() => {
    let frame = 0;
    const onResize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setViewport(measure())); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); };
  }, []);
  const { size, pieces } = useMemo(() => buildPile(viewport.w, viewport.h, viewport.phone ? .5 : 1), [viewport.w, viewport.h, viewport.phone]);
  const sheet = (p: Piece) => ({
    left: p.x, top: p.y, width: size, height: size, zIndex: p.z,
    transform: `translate(-50%, -50%) rotate(${p.angle.toFixed(1)}deg)`,
    '--paper-cut': p.cut, '--fibers': p.fibers, '--shade': p.shade.toFixed(3), '--light': `${p.light.toFixed(0)}deg`,
  } as CSSProperties);

  // The whole pile is drawn twice: white sheets underneath, then the red faces (inset by
  // --fibers) on top. Red-on-red seams stay red, so white only shows on the outer silhouette.
  return <div className="paper-frame" aria-hidden="true">
    <div className="paper-layer paper-layer--fibers">{pieces.map(p => <span key={p.key} className="paper-piece" style={sheet(p)} />)}</div>
    <div className="paper-layer paper-layer--sheets">{pieces.map(p => <span key={p.key} className="paper-piece" style={sheet(p)} />)}</div>
  </div>;
}
