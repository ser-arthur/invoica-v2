'use client';

import { useEffect, useRef } from 'react';

/**
 * Closes the header's menu (a disclosure, so it opens without the page's script) when the visitor taps or clicks
 * anywhere outside it, presses Escape, or chooses one of its links.
 */
export function MenuCloser() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const menu = ref.current?.closest('details');
    if (!menu) return;
    const close = (focus: boolean) => {
      if (!menu.open) return;
      menu.open = false;
      if (focus) menu.querySelector('summary')?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onChoose = (event: MouseEvent) => {
      if ((event.target as Element).closest('a')) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    menu.addEventListener('click', onChoose);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      menu.removeEventListener('click', onChoose);
    };
  }, []);
  return <span ref={ref} hidden />;
}
