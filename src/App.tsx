import { useCallback, useEffect, useRef, useState } from 'react';
import AboutLetter from './components/AboutLetter';
import CustomCursor from './components/CustomCursor';
import PaperFrame from './components/PaperFrame';
import ProjectJournal from './components/ProjectJournal';
import Room from './components/Room';
import TransitionScreen from './components/TransitionScreen';
import { projects } from './data/projects';

type Scene = 'room' | 'about' | 'journal';

export default function App() {
  const [scene, setScene] = useState<Scene>('about');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const busy = useRef(false);

  const closeAbout = useCallback(() => setScene(current => current === 'about' ? 'room' : current), []);
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
    {scene !== 'journal' && <PaperFrame />}
    <Room active={scene === 'room'} onOpenProject={openProject} onOpenAbout={openAbout} />
    <AboutLetter visible={scene === 'about'} dialogRef={dialogRef} onClose={closeAbout} onExplore={closeAbout} />
    {scene === 'journal' && project && <ProjectJournal key={project.id} project={project} onClose={closeProject} />}
    <TransitionScreen visible={transitioning} />
    <CustomCursor modalTarget={dialogRef.current} modalOpen={scene === 'about'} />
  </>;
}
