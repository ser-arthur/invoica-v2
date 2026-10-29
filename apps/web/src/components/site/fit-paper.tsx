'use client';

import { useLayoutEffect, useRef } from 'react';
import s from './site.module.css';

/**
 * A rendered document shown as a sheet of paper as wide as the space it is given. The page's stylesheet sets a scale
 * for each width the page lays out at, so it shows without script; the script then fits it to the pixel.
 */
export function FitPaper({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const sheet = ref.current;
    if (!sheet) return;
    const fit = () => sheet.style.setProperty('--scale', String(sheet.clientWidth / 794));
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(sheet);
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.fitPaper}>
      <iframe title={title} srcDoc={html} sandbox="allow-same-origin" tabIndex={-1} aria-hidden />
    </div>
  );
}
