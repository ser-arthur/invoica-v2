'use client';

import { useEffect, useRef } from 'react';
import s from './site.module.css';

/**
 * The line down How it works: it fills to the middle of the screen as the page scrolls, and each step's icon
 * (beside its numeral, marked `data-mark`) is lit once the line has reached it, `data-reached`. On phones there is no
 * margin for the line, so the icon lights as its step reaches the middle of the screen. Without the page's script
 * the icons are lit and the line is full.
 */
export function JourneyLine() {
  const track = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const line = track.current;
    const journey = line?.closest<HTMLElement>('[data-journey]');
    if (!line || !journey) return;
    const marks = [...journey.querySelectorAll<HTMLElement>('[data-mark]')];
    journey.dataset.following = '';
    let frame = 0;
    const measure = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      const box = line.getBoundingClientRect();
      const filled = Math.min(1, Math.max(0, (middle - box.top) / box.height));
      line.style.setProperty('--fill', String(filled));
      for (const mark of marks) {
        const at = mark.getBoundingClientRect();
        if (at.top + at.height / 2 <= middle) mark.dataset.reached = '';
        else delete mark.dataset.reached;
      }
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
      delete journey.dataset.following;
    };
  }, []);
  return (
    <span ref={track} className={s.journeyTrack} aria-hidden="true">
      <span className={s.journeyFill} />
    </span>
  );
}
