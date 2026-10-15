import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { mulberry32 } from '../random';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Point = [number, number];
interface Piece { side: Side; x: number; y: number; angle: number; z: number; cut: Point[]; shade: number; light: number; fibers: [number, number, number, number] }

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));

// A square with every side torn: points (in % of the sheet) wander a few percent inward along each edge.
function tornSquare(rand: () => number): Point[] {
  const steps = 7, pts: Point[] = [];
  const tear = () => rand() * 4, corner = () => rand() * 3;
  const along = (j: number) => clamp(1, (j + (rand() - .5) * .6) * 100 / steps, 99);
  pts.push([corner(), corner()]);
  for (let j = 1; j < steps; j++) pts.push([along(j), tear()]);
  pts.push([100 - corner(), corner()]);
  for (let j = 1; j < steps; j++) pts.push([100 - tear(), along(j)]);
  pts.push([100 - corner(), 100 - corner()]);
  for (let j = steps - 1; j > 0; j--) pts.push([along(j), 100 - tear()]);
  pts.push([corner(), 100 - corner()]);
  for (let j = steps - 1; j > 0; j--) pts.push([tear(), along(j)]);
  return pts;
}

// How far the red face sits inside its white sheet on each side (top right bottom left), in px.
// Only the pile's outer silhouette shows it, as a torn white edge; widest facing the room.
function fibers(side: Side, rand: () => number): [number, number, number, number] {
  const inward = { top: 2, bottom: 0, left: 1, right: 3 }[side];
  return [0, 1, 2, 3].map(i => (i === inward ? 3 + rand() * 4 : 1.5 + rand() * 3.5)) as [number, number, number, number];
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
      pieces.push({ side, x, y, angle, z: 0, cut: tornSquare(rand), shade: .9 + rand() * .16, light: 80 + rand() * 60, fibers: fibers(side, rand) });
    }
    // Jutting layer: fewer sheets centred near the edge at 20-45deg so their corners poke into the room.
    rand = mulberry32(977 + s * 104729);
    const juttingCount = Math.max(2, Math.round(length / (1.25 * size)) + 1);
    for (let i = 0; i < juttingCount; i++) {
      const along = i * length / (juttingCount - 1) + (rand() - .5) * .4 * size;
      const jitter = rand() * .2 - .12, angle = (20 + rand() * 25) * (rand() < .5 ? -1 : 1);
      const [x, y] = place(side, along, jitter * reference - offscreen(angle));
      pieces.push({ side, x, y, angle, z: 0, cut: tornSquare(rand), shade: .9 + rand() * .16, light: 80 + rand() * 60, fibers: fibers(side, rand) });
    }
  });
  // Shuffle the stacking order across both layers so the pile reads as haphazard.
  const order = mulberry32(4242);
  pieces.forEach(p => { p.z = 1 + Math.floor(order() * 500); });
  pieces.sort((a, b) => a.z - b.z);
  return { size, pieces };
}

const shade = (hex: string, s: number) => {
  const n = parseInt(hex.slice(1), 16), c = (v: number) => Math.round(clamp(0, v * s, 255));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};

/** A CSS-style linear-gradient(angle) across a w × h box at (x, y): 0deg points up, 90deg points right. */
function cssGradient(g: CanvasRenderingContext2D, deg: number, x: number, y: number, w: number, h: number, stops: [number, string][]) {
  const a = (deg * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2, cy = y + h / 2, grad = g.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  stops.forEach(([at, color]) => grad.addColorStop(at, color));
  return grad;
}

/** Repeating stripes for the construction-paper grain: a tile `period` px wide, turned to the CSS angle. */
function stripes(g: CanvasRenderingContext2D, period: number, deg: number, stops: [number, string][]) {
  const tile = document.createElement('canvas');
  tile.width = period; tile.height = 1;
  const t = tile.getContext('2d')!, grad = t.createLinearGradient(0, 0, period, 0);
  stops.forEach(([at, color]) => grad.addColorStop(at, color));
  t.fillStyle = grad; t.fillRect(0, 0, period, 1);
  const pattern = g.createPattern(tile, 'repeat')!;
  pattern.setTransform(new DOMMatrix().rotate(deg - 90));
  return pattern;
}

/**
 * Paints the whole pile once: white torn sheets (with one shadow for the layer), then each sheet's red face, inset by
 * its fibre widths, with its own drop shadow and paper grain. Red-on-red seams stay red, so the white only shows on
 * the pile's outer silhouette.
 */
// The canvas overhangs the window by this much on every side (see .paper-frame), so the crumple filter's
// displacement pulls in paper rather than empty pixels at the window's edges.
const BLEED = 16;

function paintPile(canvas: HTMLCanvasElement, w: number, h: number, size: number, pieces: Piece[]) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round((w + 2 * BLEED) * dpr); canvas.height = Math.round((h + 2 * BLEED) * dpr);
  const g = canvas.getContext('2d')!;
  const outline = (ctx: CanvasRenderingContext2D, cut: Point[], x: number, y: number, cw: number, ch: number) => {
    ctx.beginPath();
    cut.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + (px / 100) * cw, y + (py / 100) * ch));
    ctx.closePath();
  };
  const place = (ctx: CanvasRenderingContext2D, p: Piece) => {
    ctx.setTransform(dpr, 0, 0, dpr, BLEED * dpr, BLEED * dpr);
    ctx.translate(p.x, p.y);
    ctx.rotate((p.angle * Math.PI) / 180);
  };

  // White fibres, all sheets, composited with one soft shadow.
  const fibresLayer = document.createElement('canvas');
  fibresLayer.width = canvas.width; fibresLayer.height = canvas.height;
  const f = fibresLayer.getContext('2d')!;
  for (const p of pieces) {
    place(f, p);
    outline(f, p.cut, -size / 2, -size / 2, size, size);
    f.fillStyle = cssGradient(f, p.light, -size / 2, -size / 2, size, size, [[0, '#fffdf6'], [1, '#eee8dc']]);
    f.fill();
  }
  g.save();
  g.shadowColor = '#6946384d'; g.shadowOffsetY = 4 * dpr; g.shadowBlur = 3 * dpr;
  g.drawImage(fibresLayer, 0, 0);
  g.restore();

  const fine = stripes(g, 5, 23, [[0, '#ffffff00'], [0.79, '#ffffff00'], [0.8, '#ffffff0c'], [1, '#ffffff0c']]);
  const bands = stripes(g, 27, 103, [[0, '#ffffff00'], [18 / 27, '#ffffff00'], [19 / 27, '#ffffff14'], [21 / 27, '#76271c1a'], [1, '#76271c00']]);
  for (const p of pieces) {
    const [top, right, bottom, left] = p.fibers;
    const x = -size / 2 + left, y = -size / 2 + top, cw = size - left - right, ch = size - top - bottom;
    place(g, p);
    outline(g, p.cut, x, y, cw, ch);
    g.fillStyle = cssGradient(g, p.light, x, y, cw, ch, [[0, shade('#ff766a', p.shade)], [0.92, shade('#c63b35', p.shade)], [1, shade('#c63b35', p.shade)]]);
    // Two shadows, as the DOM version had: a tight contact shadow and a wider soft one.
    g.shadowColor = '#6c514226'; g.shadowOffsetY = 8 * dpr; g.shadowBlur = 5 * dpr; g.fill();
    g.shadowColor = '#6946385c'; g.shadowOffsetY = 3 * dpr; g.shadowBlur = 2 * dpr; g.fill();
    g.shadowColor = 'transparent';
    g.save();
    g.clip();
    for (const [cx, cy, r, inner, outer] of [[0.16, 0.28, 0.38, '#ffffff25', '#ffffff00'], [0.78, 0.72, 0.4, '#6c211620', '#6c211600']] as const) {
      const glow = g.createRadialGradient(x + cx * cw, y + cy * ch, 0, x + cx * cw, y + cy * ch, r * cw);
      glow.addColorStop(0, inner); glow.addColorStop(1, outer);
      g.fillStyle = glow; g.fillRect(x, y, cw, ch);
    }
    g.fillStyle = bands; g.fillRect(x, y, cw, ch);
    g.fillStyle = fine; g.fillRect(x, y, cw, ch);
    g.restore();
  }
}

/**
 * The construction-paper border around the whole site, painted once onto a single canvas (and again on resize).
 * As one element it costs the browser nothing per frame; as ~400 clipped, filtered elements it had to hit-test and
 * re-layer every one of them whenever anything on the page changed. The crumple filter still applies (styles.css).
 */
export default function PaperFrame() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState(measure);
  useEffect(() => {
    let frame = 0;
    const onResize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setViewport(measure())); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); };
  }, []);
  const pile = useMemo(() => buildPile(viewport.w, viewport.h, viewport.phone ? .5 : 1), [viewport.w, viewport.h, viewport.phone]);
  useLayoutEffect(() => {
    if (ref.current) paintPile(ref.current, viewport.w, viewport.h, pile.size, pile.pieces);
  }, [pile, viewport.w, viewport.h]);
  return <canvas className="paper-frame" ref={ref} aria-hidden="true" />;
}
