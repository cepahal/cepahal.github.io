import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface AboutLetterProps {
  visible: boolean;
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  onExplore: () => void;
}

export default function AboutLetter({ visible, dialogRef, onClose, onExplore }: AboutLetterProps) {
  const stageRef = useRef<HTMLDivElement>(null), letterRef = useRef<HTMLElement>(null), dockRef = useRef<HTMLElement | null>(null);
  const [opened, setOpened] = useState(false), [zipping, setZipping] = useState(false), [autoOpen, setAutoOpen] = useState(false), [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current; if (!dialog) return;
    if (visible && !dialog.open) {
      dialog.showModal(); setOpened(false); setZipping(false); setAutoOpen(hasOpened);
      if (hasOpened) window.setTimeout(() => { setOpened(true); requestAnimationFrame(() => letterRef.current?.focus()); }, 100);
      else requestAnimationFrame(() => dialog.querySelector<HTMLButtonElement>('.open-mail')?.focus());
    }
    if (!visible && dialog.open && !zipping) dialog.close();
  }, [visible, dialogRef, zipping, hasOpened]);

  const closeAndZip = (action: 'close' | 'explore') => {
    if (zipping) return;
    const dialog = dialogRef.current, stage = stageRef.current;
    if (!dialog || !stage) { action === 'explore' ? onExplore() : onClose(); return; }
    setOpened(false); setAutoOpen(false); setZipping(true);
    const stageRect = stage.getBoundingClientRect();
    const dockRect = dockRef.current?.getBoundingClientRect();
    const dx = dockRect ? dockRect.left + dockRect.width / 2 - stageRect.left - stageRect.width / 2 : 0;
    const dy = dockRect ? dockRect.top + dockRect.height / 2 - stageRect.top - stageRect.height / 2 : 0;
    const scale = dockRect ? dockRect.width / stageRect.width : .2;
    stage.style.setProperty('--zip-x', `${dx}px`); stage.style.setProperty('--zip-y', `${dy}px`); stage.style.setProperty('--zip-scale', `${scale}`);
    window.setTimeout(() => {
      if (dialog.open) dialog.close(); setZipping(false);
      stage.style.removeProperty('--zip-x'); stage.style.removeProperty('--zip-y'); stage.style.removeProperty('--zip-scale');
      if (action === 'explore') onExplore(); else onClose();
    }, opened ? 800 : 500);
  };

  const handleOpen = () => { setOpened(true); setHasOpened(true); requestAnimationFrame(() => letterRef.current?.focus()); };
  const handleLeave = () => { if (opened) closeAndZip('close'); };
  const dialog = <dialog className={`intro${opened ? ' open' : ''}${autoOpen ? ' auto-open' : ''}${zipping ? ' zipping closing' : ''}`} ref={dialogRef} aria-label="Welcome letter"
    onCancel={e => { e.preventDefault(); closeAndZip('close'); }} onClose={() => { if (visible) onClose(); }}>
    <div className="intro-rays" aria-hidden="true" />
    <div className="intro-content">
      <div className="mail-stage" id="mail-stage" ref={stageRef} onMouseLeave={handleLeave}>
        <div className="envelope-back" aria-hidden="true" /><div className="envelope-flap" aria-hidden="true" />
        <article className="letter" id="letter" ref={letterRef} tabIndex={-1} inert={!opened}>
          <img className="portrait" src="images/headshot.jpg" alt="Grant Andrews" /><span className="eyebrow">A NOTE FROM THE MAKER</span>
          <h1>Hi, I’m Grant Andrews.</h1>
          <p>I'm an ECE/CS Student at Duke that's interested in optimizing embedded systems.</p>
          <p>Somewhere between software, tiny circuits, and playful interfaces is my favorite place to work.</p>
          <div className="letter-links"><a href="mailto:grant.andrews@duke.edu">Say hello ↗</a><a href="https://github.com/cepahal" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>
          <button className="paper-button" onClick={() => closeAndZip('explore')}>Explore my projects →</button>
          <p className="letter-footnote">Move your mouse away to tuck this note into the corner.</p>
        </article>
        <div className="envelope-front" aria-hidden="true" />
        <button className="open-mail" onClick={handleOpen} aria-label="Open the letter"><span className="seal" aria-hidden="true">✳</span><span className="mail-caption">click to open</span></button>
      </div>
    </div>
    <button className="skip-intro" onClick={() => closeAndZip('explore')}>Skip to the projects →</button>
  </dialog>;

  // Keep the envelope above the room and put the custom pointer in the dialog's top layer.
  useEffect(() => { dockRef.current = document.querySelector('.mail-dock'); }, []);
  return dialog;
}
