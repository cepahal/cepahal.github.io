import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { projectIllustration, projects } from '../data/projects';

interface RoomProps { onOpenProject: (id: string, opener: HTMLElement | null) => void; onOpenAbout: () => void }
const tilts = [-0.6, 0.8, -0.8, 1.2, -1.0];
const mod = (a: number, n: number) => ((a % n) + n) % n;

function quadMatrix(w: number, h: number, q: number[][]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q as [[number, number], [number, number], [number, number], [number, number]];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, k = 0;
  if (dx3 !== 0 || dy3 !== 0) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den; k = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3, f = y0;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${k / h},0,0,1,0,${c},${f},0,1)`;
}

export default function Room({ onOpenProject, onOpenAbout }: RoomProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<number>(Math.max(1, projects.length));
  const pos = useRef(0), target = useRef(0), step = useRef(1), frame = useRef(0);
  const drag = useRef({ pressed: false, dragging: false, x: 0, start: 0, samples: [] as { t: number; x: number }[] });
  const justDragged = useRef(false), wheelTimer = useRef<number | undefined>(undefined), wheelDirection = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [slotPositions, setSlotPositions] = useState<number[]>([]);
  const reduced = useRef(false);

  const layout = useCallback(() => {
    const box = boxRef.current; if (!box) return;
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    const s = Math.min(110, Math.max(35, .08 * w)), t = Math.min(80, Math.max(25, .06 * h)), f = Math.min(260, Math.max(120, .24 * h));
    box.style.setProperty('--side', `${s}px`); box.style.setProperty('--top', `${t}px`); box.style.setProperty('--floor', `${f}px`);
    const backH = Math.max(1, h - t - f), backW = Math.max(1, w - 2 * s);
    const mappings: [string, number, number, number[][]][] = [
      ['left', 480, backH, [[0, 0], [s, t], [s, h - f], [0, h]]],
      ['right', 480, backH, [[w, 0], [w - s, t], [w - s, h - f], [w, h]]],
      ['top', backW, 480, [[0, 0], [w, 0], [w - s, t], [s, t]]],
      ['floor', backW, 768, [[0, h], [w, h], [w - s, h - f], [s, h - f]]],
    ];
    mappings.forEach(([name, pw, ph, q]) => { const plane = box.querySelector<HTMLElement>(`[data-plane="${name}"]`); if (plane) { plane.style.width = `${pw}px`; plane.style.height = `${ph}px`; plane.style.transform = quadMatrix(pw, ph, q); } });
  }, []);

  const render = useCallback(() => {
    const cards = cardsRef.current; if (!cards) return;
    setSlotPositions(Array.from({ length: ring }, (_, k) => {
      let d = k - pos.current; d -= ring * Math.round(d / ring); return d * step.current;
    }));
  }, [ring]);
  const animate = useCallback(() => {
    if (frame.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last || 16); last = now;
      const diff = target.current - pos.current;
      if (reduced.current || Math.abs(diff) < .0004) { pos.current = target.current; frame.current = 0; render(); return; }
      pos.current += diff * (1 - Math.exp(-dt / 95)); render(); frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [render]);
  const go = useCallback((dir: number) => { target.current = Math.round(target.current) + dir; animate(); }, [animate]);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    layout();
    const observer = new ResizeObserver(layout); if (boxRef.current) observer.observe(boxRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, [layout]);

  useEffect(() => {
    const cards = cardsRef.current; if (!cards) return;
    const measure = () => {
      const first = cards.querySelector<HTMLElement>('.slot'); if (!first) return;
      const cardW = first.offsetWidth, gap = parseFloat(getComputedStyle(cards).columnGap) || 0;
      step.current = cardW + gap;
      const needed = (window.innerWidth + 2 * cardW + 2 * step.current) / step.current;
      setRing(projects.length * Math.max(1, Math.ceil(needed / projects.length)));
    };
    measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => { render(); }, [ring, render]);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { ...drag.current, pressed: true, dragging: false, x: e.clientX, start: pos.current, samples: [{ t: e.timeStamp, x: e.clientX }] };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d.pressed) return;
    const dx = e.clientX - d.x;
    if (!d.dragging && Math.abs(dx) > 6) { d.dragging = true; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }
    if (!d.dragging) return;
    e.preventDefault(); pos.current = d.start - dx / step.current; target.current = pos.current;
    d.samples.push({ t: e.timeStamp, x: e.clientX }); while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 120) d.samples.shift(); render();
  };
  const onPointerUp = () => {
    const d = drag.current; if (!d.pressed) return; d.pressed = false;
    if (!d.dragging) return; d.dragging = false; setDragging(false);
    justDragged.current = true;
    const first = d.samples[0], last = d.samples[d.samples.length - 1];
    const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    target.current = Math.round(pos.current - Math.min(3, Math.max(-3, velocity * 220 / step.current))); animate();
  };

  const cards = Array.from({ length: ring }, (_, k) => ({ project: projects[k % projects.length], k }));
  return <>
    <main className="room wallpaper" id="room">
      <div className="box-interior" id="box-interior" ref={boxRef} aria-hidden="true">
        <div className="wall wall-left"><div className="plane plane-dots" data-plane="left" /></div>
        <div className="wall wall-right"><div className="plane plane-dots" data-plane="right" /></div>
        <div className="wall wall-top"><div className="plane plane-dots" data-plane="top" /></div>
        <div className="wall wall-bottom"><div className="plane plane-floor" data-plane="floor" /></div><div className="box-shadow-overlay" />
      </div>
      <header className="room-header"><h1 className="taped-title">PROJECTS<span className="tape" aria-hidden="true" /></h1></header>
      <section className="carousel" aria-roledescription="carousel" aria-label="Projects" onKeyDown={e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }} onWheel={e => {
        const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!raw) return;
        e.preventDefault(); const px = e.deltaMode === 1 ? raw * 16 : raw; wheelDirection.current = Math.sign(px);
        pos.current += px * 1.6 / step.current; target.current = pos.current; render();
        window.clearTimeout(wheelTimer.current); wheelTimer.current = window.setTimeout(() => { target.current = Math.round(pos.current + wheelDirection.current * .25); animate(); }, 140);
      }}>
        <div className={`cards${dragging ? ' dragging' : ''}`} ref={cardsRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {cards.map(({ project, k }, i) => {
            const clone = k >= projects.length;
            return <div className="slot" key={k} aria-hidden={clone || undefined} style={{ transform: `translate3d(${slotPositions[i] ?? 0}px,0,0)` }}>
              <button className="project-card" tabIndex={clone ? -1 : undefined} style={{ '--accent': project.accent, '--tilt': `${tilts[k % tilts.length]}deg` } as CSSProperties} aria-label={`Read about ${project.title}`} onFocus={e => {
                if (!e.currentTarget.matches(':focus-visible')) return;
                const half = Math.floor(projects.length / 2), base = Math.round(target.current);
                target.current = base + mod(mod(k % projects.length - base, projects.length) + half, projects.length) - half; animate();
              }} onClick={e => { if (justDragged.current) { e.preventDefault(); justDragged.current = false; return; } onOpenProject(project.id, e.currentTarget); }}>
                <img className="card-art" src={project.cover || projectIllustration(project.illustration)} alt={project.title} draggable="false" />
                <span className="card-type">{project.type}</span><span className="card-title">{project.title}</span><span className="card-description">{project.summary}</span>
                <span className="card-footer"><span>Open project</span><span aria-hidden="true">↗</span></span>
              </button>
            </div>;
          })}
        </div>
      </section>
    </main>
    <button className="mail-dock" aria-label="Open about me letter" onClick={onOpenAbout}>
      <svg viewBox="0 0 40 28" aria-hidden="true"><rect x="1" y="1" width="38" height="26" rx="2" fill="#e6524a" stroke="#c43f38" strokeWidth="2"/><path d="m1 2 19 14L39 2" fill="none" stroke="#c43f38" strokeWidth="2"/><circle cx="20" cy="15" r="5" fill="#FAF9F6"/></svg>
    </button>
  </>;
}
