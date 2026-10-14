import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Project } from '../data/projects';
import { projectIllustration } from '../data/projects';
import Glyph from './Glyph';
import PaperFrame from './PaperFrame';

interface ProjectJournalProps { project: Project; onClose: () => void }

export default function ProjectJournal({ project, onClose }: ProjectJournalProps) {
  const sceneRef = useRef<HTMLDivElement>(null), fillRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const readOffset = 90;

  const sizeSpacer = useCallback(() => {
    const scene = sceneRef.current, spacer = scene?.querySelector<HTMLElement>('.journal-spacer');
    const last = scene?.querySelector<HTMLElement>(`#section-${project.sections.length - 1}`);
    if (!scene || !spacer || !last) return;
    spacer.style.height = '0px';
    const top = last.getBoundingClientRect().top - scene.getBoundingClientRect().top + scene.scrollTop;
    const have = scene.scrollHeight - scene.clientHeight;
    spacer.style.height = `${Math.max(0, Math.ceil(top - readOffset - have))}px`;
  }, [project.sections.length]);

  const monitor = useCallback(() => {
    const scene = sceneRef.current, fill = fillRef.current; if (!scene || !fill) return;
    const y = scene.scrollTop, sceneTop = scene.getBoundingClientRect().top, n = project.sections.length;
    const anchors = project.sections.map((_, i) => {
      if (i === 0) return 0;
      const el = scene.querySelector<HTMLElement>(`#section-${i}`);
      return el ? Math.max(0, el.getBoundingClientRect().top - sceneTop + y - readOffset) : Infinity;
    });
    let active = 0; for (let i = 0; i < n; i++) if (y >= anchors[i] - 1) active = i;
    let progress = 1;
    if (n < 2) { const max = scene.scrollHeight - scene.clientHeight; progress = max > 0 ? Math.min(1, y / max) : 0; }
    else if (y <= 0) progress = 0;
    else for (let i = 0; i < n - 1; i++) if (y < anchors[i + 1]) {
      const span = anchors[i + 1] - anchors[i]; progress = (i + (span > 0 ? (y - anchors[i]) / span : 0)) / (n - 1); break;
    }
    fill.style.transform = `scaleY(${progress})`; setCurrent(active);
  }, [project.sections]);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    const resize = () => { sizeSpacer(); monitor(); };
    sizeSpacer(); monitor(); scene.addEventListener('scroll', monitor, { passive: true }); window.addEventListener('resize', resize);
    scene.focus();
    return () => { scene.removeEventListener('scroll', monitor); window.removeEventListener('resize', resize); };
  }, [monitor, sizeSpacer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const image = project.cover || projectIllustration(project.illustration, true);
  return <div className="project-scene" ref={sceneRef} role="dialog" aria-modal="true" aria-labelledby="project-title" tabIndex={-1} style={{ '--accent': project.accent } as CSSProperties}>
    <PaperFrame />
    <article className="journal">
      <nav className="topic-nav" aria-label="Project contents">
        <h2 className="topic-heading">Contents</h2>
        <div className="topic-rail"><div className="topic-track"><div className="topic-fill" ref={fillRef} /></div>
          <ul className="topic-list">{project.sections.map((section, i) => <li key={`${section.title}-${i}`}>
            <button className={`topic-button${i <= current ? ' visited' : ''}`} data-target={`section-${i}`} aria-current={current === i ? 'location' : undefined}
              onClick={() => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
              <span className="topic-dot-wrap" aria-hidden="true"><span className="topic-dot" /></span><span className="topic-label">{section.title}</span>
            </button>
          </li>)}</ul>
        </div><div className="topic-progress" aria-live="polite">Section {current + 1} of {project.sections.length}</div>
      </nav>
      <figure className="hero-cover"><img src={image} alt={`${project.title} illustration`} /></figure>
      <header className="project-heading content-sheet"><span className="chapter">{project.type}</span><h1 id="project-title">{project.title}</h1><p className="lead">{project.summary}</p>
        <div className="tags">{project.tools.map(tool => <span key={tool}>{tool}</span>)}</div>
        {project.github && <p><a href={project.github} target="_blank" rel="noopener noreferrer">View source on GitHub <Glyph name="arrow" /></a></p>}
        {project.demo && <p><a href={project.demo.href} target="_blank" rel="noopener noreferrer">{project.demo.label} <Glyph name="arrow" /></a></p>}
      </header>
      {project.sections.map((section, i) => <section className="content-sheet" id={`section-${i}`} key={`${section.title}-${i}`}><h2 className="project-heading">{section.title}</h2><p>{section.text}</p>{section.code && <pre className="code-sample"><code>{section.code}</code></pre>}</section>)}
      <footer className="journal-end content-sheet"><p>End of project notes</p><button className="paper-button" onClick={onClose}>Back to projects</button></footer>
      <div className="journal-spacer" aria-hidden="true" />
    </article>
    <button className="close-project" onClick={onClose} aria-label="Close project">×</button>
  </div>;
}
