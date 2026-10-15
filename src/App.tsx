import { useCallback, useEffect, useRef, useState } from 'react';
import AboutLetter from './components/AboutLetter';
import CustomCursor from './components/CustomCursor';
import PaperFrame from './components/PaperFrame';
import ProjectJournal from './components/ProjectJournal';
import Room from './components/Room';
import TransitionScreen from './components/TransitionScreen';
import { projects } from './data/projects';

type Scene = 'room' | 'about' | 'journal';

/**
 * Fades out the black "powering up..." screen from index.html once the site has settled: fonts and images loaded,
 * the paper frame painted, and the welcome letter (with its blur) open. Child effects run first, so by now the
 * letter's dialog is already in the browser's top layer; re-showing the boot screen puts it back above that.
 */
function finishBoot() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  if (boot.matches(':popover-open')) { boot.hidePopover(); boot.showPopover(); }
  const loaded = new Promise(resolve => (document.readyState === 'complete' ? resolve(null) : window.addEventListener('load', resolve, { once: true })));
  const settled = Promise.all([document.fonts.ready, loaded, new Promise(resolve => setTimeout(resolve, 700))]);
  const cap = new Promise(resolve => setTimeout(resolve, 4000)); // never hold the site hostage to a slow image
  Promise.race([settled, cap]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 800);
  })));
}

export default function App() {
  const [scene, setScene] = useState<Scene>('about');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const busy = useRef(false);

  const closeAbout = useCallback(() => setScene(current => current === 'about' ? 'room' : current), []);
  const [plainRequests, setPlainRequests] = useState(0);
  const skipToCards = useCallback(() => setPlainRequests(n => n + 1), []);
  const openAbout = useCallback(() => setScene('about'), []);
  const openProject = useCallback(async (id: string, opener: HTMLElement | null) => {
    if (busy.current || scene !== 'room') return;
    busy.current = true; returnFocus.current = opener; setTransitioning(true);
    await new Promise(resolve => window.setTimeout(resolve, 320));
    setProjectId(id); setScene('journal');
    await new Promise(resolve => window.setTimeout(resolve, 350)); setTransitioning(false); busy.current = false;
  }, [scene]);
  const closeProject = useCallback(async () => {
    if (busy.current || scene !== 'journal') return;
    busy.current = true; setTransitioning(true);
    await new Promise(resolve => window.setTimeout(resolve, 650));
    setScene('room'); setProjectId(null);
    await new Promise(resolve => window.setTimeout(resolve, 300)); setTransitioning(false); busy.current = false;
    requestAnimationFrame(() => { if (returnFocus.current?.isConnected) returnFocus.current.focus(); });
  }, [scene]);

  useEffect(() => { document.body.classList.toggle('journal-open', scene === 'journal'); return () => document.body.classList.remove('journal-open'); }, [scene]);
  useEffect(finishBoot, []);
  const project = projects.find(item => item.id === projectId);

  return <>
    <svg className="paper-filter-defs" aria-hidden="true" focusable="false">
      <filter id="paper-crumple" x="-8%" y="-12%" width="116%" height="124%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".035 .055" numOctaves="3" seed="8" result="paperNoise" />
        <feDisplacementMap in="SourceGraphic" in2="paperNoise" scale="10" xChannelSelector="R" yChannelSelector="G" result="tornEdge" />
        <feColorMatrix in="paperNoise" type="saturate" values="0" result="grayNoise" />
        <feComponentTransfer in="grayNoise" result="softTexture"><feFuncA type="table" tableValues="0 .16" /></feComponentTransfer>
        <feComposite in="softTexture" in2="tornEdge" operator="in" result="paperTexture" />
        <feBlend in="tornEdge" in2="paperTexture" mode="soft-light" />
      </filter>
    </svg>
    <div className="grain" aria-hidden="true" />
    {/* One frame for the whole site; it lifts above the project notes while they're open (body.journal-open). */}
    <PaperFrame />
    <Room active={scene === 'room'} plainRequests={plainRequests} onOpenProject={openProject} onOpenAbout={openAbout} />
    <AboutLetter visible={scene === 'about'} dialogRef={dialogRef} onClose={closeAbout} onExplore={closeAbout} onSkip={skipToCards} />
    {scene === 'journal' && project && <ProjectJournal key={project.id} project={project} onClose={closeProject} />}
    <TransitionScreen visible={transitioning} />
    <CustomCursor modalTarget={dialogRef.current} modalOpen={scene === 'about'} />
  </>;
}
