import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Project } from '../data/projects';
import { projectIllustration } from '../data/projects';
import { mulberry32, seedFrom } from '../random';
import Glyph from './Glyph';
import PaperVine from './PaperVine';

interface ProjectJournalProps { project: Project; onClose: () => void }

const READ_OFFSET = 90;

/**
 * A torn-paper outline as a clip-path polygon. Edges run in % of the box while the tear depth is in px (between
 * `min` and `max` in from the edge, with the odd deeper nick), so the tear looks the same on every size of sheet.
 */
function tornEdge(rand: () => number, min: number, max: number) {
  const depth = () => (min + rand() * (max - min) + (rand() < 0.08 ? rand() * 2 : 0)).toFixed(1);
  const pts: string[] = [];
  const edge = (count: number, at: (t: string, d: string) => string) => {
    for (let i = 0; i < count; i++) pts.push(at((((i + (rand() - 0.5) * 0.6) / count) * 100).toFixed(2), depth()));
  };
  edge(46, (t, d) => `${t}% ${d}px`);
  edge(18, (t, d) => `calc(100% - ${d}px) ${t}%`);
  edge(46, (t, d) => `${(100 - +t).toFixed(2)}% calc(100% - ${d}px)`);
  edge(18, (t, d) => `${d}px ${(100 - +t).toFixed(2)}%`);
  return `polygon(${pts.join(',')})`;
}

export default function ProjectJournal({ project, onClose }: ProjectJournalProps) {
  const sceneRef = useRef<HTMLDivElement>(null), fillRef = useRef<HTMLDivElement>(null), railRef = useRef<HTMLDivElement>(null);
  const anchors = useRef<number[]>([]), frame = useRef(0), shown = useRef(-1);
  const [current, setCurrent] = useState(0);
  const seed = seedFrom(project.id);

  // Every paper card gets its own tear: white fibres reaching a little past the box (their layer is 4px larger
  // all round), with the paper face torn a little inside it, like the frame's sheets.
  const sheetCount = project.sections.length + 3;
  const tears = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: sheetCount }, () => ({ '--tear-fibers': tornEdge(rand, 0.4, 3.4), '--tear-face': tornEdge(rand, 0.6, 4.2) } as CSSProperties));
  }, [seed, sheetCount]);

  // Section positions are measured only when the layout changes (load, resize, the cover image arriving), so
  // scrolling itself never forces a layout: on phones that keeps the main thread free to paint new cards.
  const measure = useCallback(() => {
    const scene = sceneRef.current, spacer = scene?.querySelector<HTMLElement>('.journal-spacer');
    if (!scene || !spacer) return;
    const sceneTop = scene.getBoundingClientRect().top, y = scene.scrollTop;
    const top = (i: number) => scene.querySelector<HTMLElement>(`#section-${i}`)!.getBoundingClientRect().top - sceneTop + y;
    // The spacer lets the last section scroll up to the reading line. It is sized from the current layout rather
    // than reset to zero first, so re-measuring never shortens the page under a reader near the bottom.
    const n = project.sections.length, scrollable = scene.scrollHeight - scene.clientHeight - spacer.offsetHeight;
    spacer.style.height = `${Math.max(0, Math.ceil(top(n - 1) - READ_OFFSET - scrollable))}px`;
    anchors.current = project.sections.map((_, i) => (i === 0 ? 0 : Math.max(0, top(i) - READ_OFFSET)));
  }, [project.sections]);

  const update = useCallback(() => {
    frame.current = 0;
    const scene = sceneRef.current, fill = fillRef.current, rail = railRef.current, a = anchors.current;
    if (!scene || !fill || !rail || !a.length) return;
    const y = scene.scrollTop, n = a.length;
    let active = 0; for (let i = 0; i < n; i++) if (y >= a[i] - 1) active = i;
    let progress = 1;
    if (n < 2) { const max = scene.scrollHeight - scene.clientHeight; progress = max > 0 ? Math.min(1, y / max) : 0; }
    else if (y <= 0) progress = 0;
    else for (let i = 0; i < n - 1; i++) if (y < a[i + 1]) {
      const span = a[i + 1] - a[i]; progress = (i + (span > 0 ? (y - a[i]) / span : 0)) / (n - 1); break;
    }
    if (Math.abs(progress - shown.current) > 0.0005) {
      shown.current = progress;
      fill.style.transform = `scaleY(${progress})`;
      rail.style.setProperty('--grow', progress.toFixed(4));
    }
    setCurrent(active);
  }, []);

  useEffect(() => {
    const scene = sceneRef.current, article = scene?.firstElementChild;
    if (!scene || !article) return;
    const onScroll = () => { if (!frame.current) frame.current = requestAnimationFrame(update); };
    const relayout = () => { measure(); update(); };
    const observer = new ResizeObserver(relayout);
    observer.observe(article);
    relayout();
    scene.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', relayout);
    scene.focus();
    return () => { observer.disconnect(); scene.removeEventListener('scroll', onScroll); window.removeEventListener('resize', relayout); cancelAnimationFrame(frame.current); };
  }, [measure, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const image = project.cover || projectIllustration(project.illustration, true);
  const jump = (i: number) => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  // Only the article scrolls. The navigation and close button sit outside the scroller (fixed elements inside a
  // scroller make phones repaint them while scrolling), with App's paper frame layered between them and it.
  return <div className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-title" style={{ '--accent': project.accent } as CSSProperties}>
    <div className="project-scene" ref={sceneRef} tabIndex={-1}>
      <article className="journal">
        <figure className="hero-cover paper-tear" style={tears[0]}><img src={image} alt={`${project.title} illustration`} /></figure>
        <header className="project-heading content-sheet paper-tear" style={tears[1]}><span className="chapter">{project.type}</span><h1 id="project-title">{project.title}</h1><p className="lead">{project.summary}</p>
          <div className="tags">{project.tools.map(tool => <span key={tool}>{tool}</span>)}</div>
          {project.github && <p><a href={project.github} target="_blank" rel="noopener noreferrer">View source on GitHub <Glyph name="arrow" /></a></p>}
          {project.demo && <p><a href={project.demo.href} target="_blank" rel="noopener noreferrer">{project.demo.label} <Glyph name="arrow" /></a></p>}
        </header>
        {project.sections.map((section, i) => <section className="content-sheet paper-tear" style={tears[i + 2]} id={`section-${i}`} key={`${section.title}-${i}`}><h2 className="project-heading">{section.title}</h2><p>{section.text}</p>{section.code && <pre className="code-sample"><code>{section.code}</code></pre>}</section>)}
        <footer className="journal-end content-sheet paper-tear" style={tears[sheetCount - 1]}><p>End of project notes</p><button className="paper-button" onClick={onClose}>Back to projects</button></footer>
        <div className="journal-spacer" aria-hidden="true" />
      </article>
    </div>
    <nav className="topic-nav" aria-label="Project contents">
      <h2 className="topic-heading">Contents</h2>
      <div className="topic-rail" ref={railRef}><PaperVine layer="back" seed={seed} /><div className="topic-track"><div className="topic-fill" ref={fillRef} /></div><PaperVine layer="front" seed={seed} />
        <ul className="topic-list">{project.sections.map((section, i) => <li key={`${section.title}-${i}`}>
          <button className={`topic-button${i <= current ? ' visited' : ''}`} data-target={`section-${i}`} aria-current={current === i ? 'location' : undefined} onClick={() => jump(i)}>
            <span className="topic-dot-wrap" aria-hidden="true"><span className="topic-dot" /></span><span className="topic-label">{section.title}</span>
          </button>
        </li>)}</ul>
      </div>
    </nav>
    <button className="close-project" onClick={onClose} aria-label="Close project">×</button>
  </div>;
}
