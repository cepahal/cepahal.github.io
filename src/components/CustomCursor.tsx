import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface CustomCursorProps { modalTarget?: HTMLDialogElement | null }

export default function CustomCursor({ modalTarget }: CustomCursorProps) {
  const [enabled, setEnabled] = useState(false), [portalTarget, setPortalTarget] = useState<HTMLDialogElement | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('custom-cursor');
    const move = (e: PointerEvent) => {
      const cursor = cursorRef.current; if (!cursor) return;
      cursor.hidden = false; cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`;
      cursor.classList.toggle('hover', Boolean((e.target as Element | null)?.closest?.('button, a, [tabindex]')));
    };
    const down = () => cursorRef.current?.classList.add('down'), up = () => cursorRef.current?.classList.remove('down');
    const leave = () => { if (cursorRef.current) cursorRef.current.hidden = true; };
    const enter = () => { if (cursorRef.current) cursorRef.current.hidden = false; };
    document.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerdown', down); document.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave); document.documentElement.addEventListener('pointerenter', enter);
    return () => { document.body.classList.remove('custom-cursor'); document.removeEventListener('pointermove', move); document.removeEventListener('pointerdown', down); document.removeEventListener('pointerup', up); document.documentElement.removeEventListener('pointerleave', leave); document.documentElement.removeEventListener('pointerenter', enter); };
  }, [enabled]);
  if (!enabled) return null;
  const cursor = <div className="cursor" ref={cursorRef} hidden aria-hidden="true" />;
  return portalTarget?.open ? createPortal(cursor, portalTarget) : cursor;
}
