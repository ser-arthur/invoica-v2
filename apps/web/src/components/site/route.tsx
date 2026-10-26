'use client';

import { useEffect, useRef, useState } from 'react';
import s from './site.module.css';

const icon = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The five stops, in the colours of the steps' numerals, each with its icon. */
const STOPS = [
  {
    name: 'Write',
    colour: '#5B8E14',
    icon: icon('M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.7 18.5z M13.8 7l3.2 3.2'),
  },
  {
    name: 'Issue',
    colour: '#3F8A1E',
    icon: icon('M6.5 3.5h7l4 4v13h-11z M13.5 3.5v4h4 M9.5 12.5h5 M9.5 16h5'),
  },
  { name: 'Send', colour: '#179A55', icon: icon('M3.5 6.5h17v11h-17z M4 7l8 6 8-6') },
  {
    name: 'Remind',
    colour: '#118A6E',
    icon: icon('M6 16.5v-5a6 6 0 0 1 12 0v5l1.5 1.5h-15z M10 20.5a2 2 0 0 0 4 0'),
  },
  { name: 'Paid', colour: '#0F7F7A', icon: icon('M5 12.5l4.5 4.5L19 7.5') },
];

/**
 * The invoice's route through How it works, pinned while it is read: a rail of five stops in the margin on a wide
 * screen, a slim bar under the header on a narrower one. The stop for the step at the middle of the screen is marked
 * and the line between the stops fills as the page scrolls. It finds the steps by `data-step` inside the element
 * marked `data-journey`.
 */
export function Route() {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    const route = ref.current;
    const journey = route?.closest<HTMLElement>('[data-journey]');
    if (!route || !journey) return;
    const steps = [...journey.querySelectorAll<HTMLElement>('[data-step]')];
    let frame = 0;
    const measure = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let at = -1;
      let progress = 0;
      steps.forEach((step, i) => {
        const box = step.getBoundingClientRect();
        if (box.top <= middle && box.bottom > middle) {
          at = i;
          // from the step's own stop towards the next one
          progress = (i + (middle - box.top) / box.height - 0.5) / (steps.length - 1);
        }
      });
      if (at === -1 && steps[0] && steps[0].getBoundingClientRect().top > middle) progress = 0;
      else if (at === -1) progress = 1;
      route.style.setProperty('--progress', String(Math.min(1, Math.max(0, progress))));
      setCurrent(at);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div ref={ref} className={s.journeyRoute}>
      <div className={s.journeyRail}>
        <span className={s.journeyLine} aria-hidden="true">
          <span className={s.journeyLineFill} />
        </span>
        <ol className={s.journeyStops} aria-label="Where INV-0044 is">
          {STOPS.map((stop, i) => (
            <li
              key={stop.name}
              className={s.journeyStop}
              aria-current={i === current ? 'step' : undefined}
              data-state={current === -1 ? 'next' : i < current ? 'done' : i === current ? 'now' : 'next'}
              style={{ '--stop': stop.colour } as React.CSSProperties}
            >
              <span className={s.journeyIcon} aria-hidden="true">
                {stop.icon}
              </span>
              <span className={s.journeyName}>{stop.name}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
