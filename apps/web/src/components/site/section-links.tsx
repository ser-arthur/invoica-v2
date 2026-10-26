'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type SectionLink = { label: string; href: string; section: string };

/**
 * The header's links. On the home page, as it scrolls, the link for the section a third of the way down the screen is
 * marked as current (site.module.css draws it with the dot from the logo's first i). Elsewhere none is marked.
 */
export function SectionLinks({ links }: { links: SectionLink[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const sections = links
      .map((link) => document.getElementById(link.section))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      const at = sections.find((el) => {
        const box = el.getBoundingClientRect();
        return box.top <= line && box.bottom > line;
      });
      setCurrent(at?.id ?? null);
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
  }, [links]);
  return (
    <>
      {links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={current === link.section ? 'true' : undefined}>
          {link.label}
        </Link>
      ))}
    </>
  );
}
