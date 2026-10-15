import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { mulberry32 } from '../random';

// A red construction-paper vine spiralling down the reading-progress bar. It grows with the yellow fill: the
// stem is clipped down to the reading progress, and each leaf unfurls as the stem reaches it (its data-at). The
// stem is drawn in two layers so it wraps the bar: the stretches behind the bar sit under it in a darker red,
// the stretches in front sit over it.
const CX = 20, AMP = 6.5, WAVE = 44; // bar centre (px from the rail's left), wrap radius, height of one full turn
const LIGHT = ['#f2675d', '#ef5a51', '#f47167', '#ec534a', '#f0625a'];
const DARK = ['#cf4139', '#c43a33', '#d6473f', '#bf3a33', '#c9443c'];

interface Leaf { x: number; y: number; angle: number; length: number; width: number; bend: number; at: number; upper: string; lower: string }

function growVine(height: number, seed: number) {
  const rand = mulberry32(seed), pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  // Slow, irregular wobble so the coil tightens, loosens and drifts like a real tendril instead of a perfect helix.
  const phases = [rand(), rand(), rand(), rand()].map(p => p * Math.PI * 2);
  const wobble = (y: number, a: number, b: number) => 0.6 * Math.sin(y * 0.013 + phases[a]) + 0.4 * Math.sin(y * 0.029 + phases[b]);
  const points: { x: number; y: number; phi: number }[] = [];
  for (let y = 0, phi = -Math.PI / 2; y <= height; y += 1.5) {
    points.push({ x: CX + AMP * (1 + 0.2 * wobble(y, 2, 3)) * Math.sin(phi), y, phi });
    phi += ((2 * Math.PI) / WAVE) * (1 + 0.18 * wobble(y, 0, 1)) * 1.5;
  }

  // Split into runs in front of the bar (cos φ > 0) and behind it, sharing the boundary point so the stem is continuous.
  const front: string[] = [], back: string[] = [];
  let run: string[] = [], inFront = points.length ? Math.cos(points[0].phi) > 0 : true;
  points.forEach((p, i) => {
    const here = Math.cos(p.phi) > 0, xy = `${p.x.toFixed(2)} ${p.y.toFixed(1)}`;
    if (i && here !== inFront) { run.push(xy); (inFront ? front : back).push(`M${run.join('L')}`); run = []; inFront = here; }
    run.push(xy);
  });
  if (run.length > 1) (inFront ? front : back).push(`M${run.join('L')}`);

  // Leaves sprout near each turn's outer edge, but drift along the stem, tilt anywhere from up-and-out to drooping,
  // and vary in size, width and curl. Now and then one is skipped, or a smaller one sprouts beside it.
  const leaves: Leaf[] = [];
  const sprout = (index: number, scale: number) => {
    const p = points[Math.max(0, Math.min(points.length - 1, index))];
    if (!p || p.y > height - 4) return;
    const side = Math.sin(p.phi) >= 0 ? 1 : -1, tilt = -32 + rand() * 88;
    const [upper, lower] = rand() < 0.3 ? [pick(DARK), pick(LIGHT)] : [pick(LIGHT), pick(DARK)];
    leaves.push({
      x: p.x, y: p.y, at: p.y / height, upper, lower,
      angle: side > 0 ? tilt : 180 - tilt,
      length: (10 + rand() * 6.5) * scale, width: 0.3 + rand() * 0.2, bend: (rand() - 0.5) * 5 * scale,
    });
  };
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (!prev || Math.sign(Math.cos(prev.phi)) === Math.sign(Math.cos(p.phi))) return; // only at the sides of a turn
    if (rand() < 0.12) return;
    const at = i + Math.round((rand() - 0.5) * 7);
    sprout(at, 1);
    if (rand() < 0.38) sprout(at + Math.round((rand() < 0.5 ? -1 : 1) * (2 + rand() * 3)), 0.62 + rand() * 0.2);
  });
  return { front: front.join(''), back: back.join(''), leaves };
}

/**
 * Shows the vine grown to `grow.current` (0–1), the journal's reading progress. On scroll the journal calls
 * growVineTo() directly instead of re-rendering. The stem is revealed by sliding its clipping window down while
 * sliding the stem back up by the same amount: two transforms the GPU applies without repainting anything.
 */
export function growVineTo(rail: HTMLElement, progress: number) {
  const hidden = ((1 - progress) * 100).toFixed(2);
  rail.querySelectorAll<HTMLElement>('.vine-reveal').forEach(window => {
    window.style.transform = `translateY(-${hidden}%)`;
    (window.firstElementChild as SVGSVGElement).style.transform = `translateY(${hidden}%)`;
  });
  rail.querySelectorAll<SVGGElement>('.vine-leaf').forEach(leaf => {
    const open = progress >= Number(leaf.dataset.at);
    if (leaf.classList.contains('is-open') !== open) leaf.classList.toggle('is-open', open);
  });
}

export default function PaperVine({ layer, seed, grow }: { layer: 'back' | 'front'; seed: number; grow: RefObject<number> }) {
  const ref = useRef<SVGSVGElement>(null), [height, setHeight] = useState(0);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => setHeight(Math.round(svg.getBoundingClientRect().height)));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const vine = useMemo(() => growVine(height, seed), [height, seed]);

  if (layer === 'back') {
    return <div className="vine vine-reveal" aria-hidden="true">
      <svg className="vine-stem" ref={ref}>
        <path d={vine.back} fill="none" stroke="#9e2f2a" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>;
  }
  return <>
    <div className="vine vine-reveal" aria-hidden="true">
      <svg className="vine-stem" ref={ref}>
        <path d={vine.front} fill="none" stroke="#dc4a41" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d={vine.front} fill="none" stroke="#ffb3a9" strokeOpacity=".45" strokeWidth=".9" strokeLinecap="round" />
      </svg>
    </div>
    <svg className="vine vine--leaves" aria-hidden="true">
      {vine.leaves.map((leaf, i) => {
        const l = leaf.length, w = l * leaf.width, b = leaf.bend;
        return <g key={i} transform={`translate(${leaf.x.toFixed(2)} ${leaf.y.toFixed(1)}) rotate(${leaf.angle.toFixed(1)})`}>
          <g className={`vine-leaf${grow.current >= leaf.at ? ' is-open' : ''}`} data-at={leaf.at.toFixed(4)}>
            {/* Two halves in different reds read as a sheet folded along its midrib; the tip curls by `bend`. */}
            <path d={`M0 0C${(l * 0.28).toFixed(1)} ${(-w).toFixed(1)} ${(l * 0.68).toFixed(1)} ${(-w * 0.95 + b * 0.5).toFixed(1)} ${l.toFixed(1)} ${b.toFixed(1)}Z`} fill={leaf.upper} />
            <path d={`M0 0C${(l * 0.3).toFixed(1)} ${(w * 0.9).toFixed(1)} ${(l * 0.74).toFixed(1)} ${(w * 0.8 + b * 0.5).toFixed(1)} ${l.toFixed(1)} ${b.toFixed(1)}Z`} fill={leaf.lower} />
            <path d={`M0.8 0Q${(l * 0.5).toFixed(1)} ${(b * 0.35).toFixed(1)} ${(l - 1.5).toFixed(1)} ${(b * 0.9).toFixed(1)}`} fill="none" stroke="#ffe1d7" strokeOpacity=".5" strokeWidth=".6" />
          </g>
        </g>;
      })}
    </svg>
  </>;
}
