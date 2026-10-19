'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog. It is rendered at the end of the page, so no surrounding layer (a list row, the phone tab bar) can
 * sit above it. While it is open the rest of the page is inert, Tab and Shift+Tab stay inside it, and Escape closes
 * it. Focus starts on the control marked `autoFocus`, or the first control, and returns to what opened the dialog.
 */
export function Dialog({
  title,
  children,
  onClose,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  // Read while rendering, before a control inside the dialog takes focus.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    const root = box.current?.parentElement;
    const others = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== root && !el.inert,
    );
    for (const el of others) el.inert = true;
    const focusables = () => [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (!box.current?.contains(document.activeElement)) (focusables()[0] ?? box.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? at <= 0
          ? items[items.length - 1]!
          : items[at - 1]!
        : at === -1 || at === items.length - 1
          ? items[0]!
          : items[at + 1]!;
      e.preventDefault();
      next.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      for (const el of others) el.inert = false;
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
    >
      <div
        ref={box}
        tabIndex={-1}
        className={
          className ??
          'max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[16px] bg-surface p-6 shadow-lift outline-none'
        }
      >
        <h2 id={`${id}-title`} className="font-display text-xl font-semibold">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
