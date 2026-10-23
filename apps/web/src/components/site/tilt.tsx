'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import s from './site.module.css';

/**
 * A card that leans gently towards the pointer, like a sheet of paper picked up by one corner. Only with a
 * mouse or trackpad, and never when the visitor has asked for less motion; elsewhere it is a plain block.
 */
export function Tilt({
  children,
  className,
  style,
  max = 5,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties;
  /** The largest lean, in degrees. */
  max?: number;
  as?: 'div' | 'article';
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-hidden'?: boolean | 'true';
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
        el.dataset.tilting = 'true';
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      delete el.dataset.tilting;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [max]);
  return (
    <Tag ref={ref as never} className={`${s.tilt} ${className ?? ''}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
