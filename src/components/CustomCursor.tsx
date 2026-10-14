import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface CustomCursorProps { modalTarget?: HTMLDialogElement | null; modalOpen: boolean }

const TRAIL = 5;

export default function CustomCursor({ modalTarget, modalOpen }: CustomCursorProps) {
  const [enabled, setEnabled] = useState(false), [portalTarget, setPortalTarget] = useState<HTMLDialogElement | null>(null);
  const layerRef = useRef<HTMLDivElement>(null), cursorRef = useRef<HTMLDivElement>(null), trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pointer = useRef({ x: -100, y: -100, seen: false }), trail = useRef(Array.from({ length: TRAIL }, () => ({ x: -100, y: -100 }))), frame = useRef(0);
  useEffect(() => {
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(fine.matches && !motion.matches);
    update(); fine.addEventListener('change', update); motion.addEventListener('change', update);
    return () => { fine.removeEventListener('change', update); motion.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPortalTarget(modalTarget ?? document.querySelector<HTMLDialogElement>('dialog.intro')));
    return () => cancelAnimationFrame(frame);
  }, [modalTarget]);

  // Each trail dot eases toward the one ahead of it; the loop stops once they have caught up.
  const draw = () => {
    let lead: { x: number; y: number } = pointer.current, moving = false;
    trail.current.forEach((dot, i) => {
      dot.x += (lead.x - dot.x) * 0.42; dot.y += (lead.y - dot.y) * 0.42;
      if (Math.abs(lead.x - dot.x) + Math.abs(lead.y - dot.y) > 0.3) moving = true;
      const el = trailRefs.current[i];
      if (el) { el.style.left = `${dot.x}px`; el.style.top = `${dot.y}px`; }
      lead = dot;
    });
    frame.current = moving ? requestAnimationFrame(draw) : 0;
  };
  // The cursor remounts when it moves in or out of the letter's top-layer dialog; put it back where the pointer is.
  useLayoutEffect(() => {
    const cursor = cursorRef.current, layer = layerRef.current, { x, y, seen } = pointer.current;
    if (!cursor || !layer) return;
    cursor.style.left = `${x}px`; cursor.style.top = `${y}px`; layer.hidden = !seen;
    trail.current.forEach((dot, i) => { dot.x = x; dot.y = y; const el = trailRefs.current[i]; if (el) { el.style.left = `${x}px`; el.style.top = `${y}px`; } });
  });
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('custom-cursor');
    const move = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, seen: true };
      const cursor = cursorRef.current; if (!cursor) return;
      if (layerRef.current) layerRef.current.hidden = false;
      cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`;
      cursor.classList.toggle('hover', Boolean((e.target as Element | null)?.closest?.('button, a, [tabindex], .campus-stage.is-hot')));
      if (!frame.current) frame.current = requestAnimationFrame(draw);
    };
    const down = () => cursorRef.current?.classList.add('down'), up = () => cursorRef.current?.classList.remove('down');
    const leave = () => { pointer.current.seen = false; if (layerRef.current) layerRef.current.hidden = true; };
    const enter = () => { pointer.current.seen = true; if (layerRef.current) layerRef.current.hidden = false; };
    document.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerdown', down); document.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave); document.documentElement.addEventListener('pointerenter', enter);
    return () => {
      document.body.classList.remove('custom-cursor'); cancelAnimationFrame(frame.current); frame.current = 0;
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerdown', down); document.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', leave); document.documentElement.removeEventListener('pointerenter', enter);
    };
  }, [enabled]);
  if (!enabled) return null;
  const layer = <div className="cursor-layer" ref={layerRef} hidden aria-hidden="true">
    {Array.from({ length: TRAIL }, (_, i) => <div key={i} className="cursor-trail" style={{ '--i': i } as CSSProperties} ref={el => { trailRefs.current[i] = el; }} />)}
    <div className="cursor" ref={cursorRef} />
  </div>;
  return modalOpen && portalTarget ? createPortal(layer, portalTarget) : layer;
}
