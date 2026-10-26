'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** The logo's drawing runs from -10 to 3750 across, in its own units (footer-mark.tsx). */
const LEFT = -10;
const WIDTH = 3760;

/**
 * Where the glint rests once the footer is in view: at the a when the light has run along the edge with the scroll,
 * or over the o where the browser cannot tie motion to the scroll.
 */
function restingCentre() {
  return CSS.supports('animation-timeline: view()') ? 3740 : 1700;
}

/**
 * The footer's large logo, whose glint follows a mouse pointer along the foil edge, like a holographic card turned
 * under a light, and drifts back to its place when the pointer leaves. Only with a mouse or trackpad, and never when
 * the visitor has asked for less motion.
 */
export function FooterLight({ className, children }: { className: string | undefined; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // The logo rises when half of it is in view, and again each time the reader leaves and comes back.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.dataset.armed = '';
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.5) el.dataset.seen = '';
        else if (!entry.isIntersecting) delete el.dataset.seen;
      },
      { threshold: [0, 0.5] },
    );
    seen.observe(el);
    return () => {
      seen.disconnect();
      delete el.dataset.armed;
      delete el.dataset.seen;
    };
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;
    const rest = restingCentre();
    let frame = 0;
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const at = LEFT + ((event.clientX - box.left) / box.width) * WIDTH;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--glint', `${Math.trunc(at - rest)}px`);
        el.dataset.following = 'true';
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--glint', '0px');
      delete el.dataset.following;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
