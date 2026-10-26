'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export type SectionLink = { label: string; href: string; section: string };

/**
 * The header's links. A link to a page of its own (Pricing) is current on that page. On the home page, as it scrolls,
 * the link for the section a third of the way down the screen is current; a link that is clicked becomes current at
 * once and stays so while the page moves to its section, without the sections passed on the way lighting up in turn.
 * site.module.css lights the current link in the logo's green.
 */
export function SectionLinks({ links }: { links: SectionLink[] }) {
  const pathname = usePathname();
  const page = links.find((link) => link.href === pathname);
  const [current, setCurrent] = useState<string | null>(page?.section ?? null);
  const held = useRef<string | null>(null);
  const release = useRef(0);

  useEffect(() => {
    if (page) {
      setCurrent(page.section);
      return;
    }
    const sections = links
      .map((link) => document.getElementById(link.section))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) {
      setCurrent(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (held.current) return;
      const line = window.innerHeight * 0.35;
      const at = sections.find((el) => {
        const box = el.getBoundingClientRect();
        return box.top <= line && box.bottom > line;
      });
      setCurrent(at?.id ?? null);
    };
    const onScroll = () => {
      if (held.current) {
        // still moving to the clicked section: let go once the page has been still for a moment
        window.clearTimeout(release.current);
        release.current = window.setTimeout(() => {
          held.current = null;
          measure();
        }, 160);
        return;
      }
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(release.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [links, page]);

  const hold = (section: string) => {
    held.current = section;
    setCurrent(section);
    window.clearTimeout(release.current);
    // let go even when the page does not move, as when it is already there
    release.current = window.setTimeout(() => {
      held.current = null;
    }, 1200);
  };

  return (
    <>
      {links.map((link) => {
        const isCurrent = current === link.section;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => hold(link.section)}
            aria-current={isCurrent ? (page ? 'page' : 'true') : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
