'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import c from './controls.module.css';

/** Below this width a control's panel opens as a sheet from the foot of the screen. */
export const SHEET_QUERY = '(max-width: 639.98px)';

const GAP = 6;
const EDGE = 8;

/**
 * The panel a control opens (docs/specs/form-errors-and-controls.md): under its field on a wide screen, or above it
 * when there is more room there, at least as wide as the field; on a phone, a sheet from the foot of the screen with
 * the field's name, over a dimmed page. It is shown in the page's top layer where the browser has one, so no
 * surrounding box (a dialog that scrolls) cuts it off, and it stays in the document where it is written, so a
 * dialog's own keyboard handling still counts it as inside. A press outside it, or outside its field, closes it.
 */
export function Popup({
  open,
  anchor,
  title,
  onDismiss,
  maxHeight = 320,
  width,
  children,
  id,
  label,
  role,
}: {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  /** The field's name, shown at the head of the sheet on a phone. */
  title: string;
  onDismiss: () => void;
  maxHeight?: number;
  /** A fixed width on a wide screen; otherwise as wide as its contents and at least the field. */
  width?: number;
  children: ReactNode;
  id?: string;
  label?: string;
  role?: 'dialog';
}) {
  const panel = useRef<HTMLDivElement>(null);
  // A sheet on a phone; its head (and its close button) is drawn only then, so it is never a hidden stop for Tab. Only
  // ever open in the browser, after a press, so the width can be read here.
  const sheet = open && window.matchMedia(SHEET_QUERY).matches;
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  useLayoutEffect(() => {
    const el = panel.current;
    const field = anchor.current;
    if (!open || !el || !field) return;
    el.toggleAttribute('data-sheet', sheet);
    el.setAttribute('data-open', '');
    try {
      el.showPopover?.();
    } catch {
      // Shown already, or the browser has no top layer: the panel is fixed above the page all the same.
    }

    const place = () => {
      if (sheet) return;
      const box = field.getBoundingClientRect();
      const below = window.innerHeight - box.bottom - GAP - EDGE;
      const above = box.top - GAP - EDGE;
      el.style.minWidth = `${Math.min(box.width, window.innerWidth - 2 * EDGE)}px`;
      el.style.maxWidth = `${window.innerWidth - 2 * EDGE}px`;
      if (width) el.style.width = `${Math.min(width, window.innerWidth - 2 * EDGE)}px`;
      el.style.maxHeight = '';
      const natural = Math.min(el.scrollHeight, maxHeight);
      const up = below < natural && above > below;
      const room = Math.max(120, Math.min(maxHeight, up ? above : below));
      el.style.maxHeight = `${room}px`;
      const height = Math.min(natural, room);
      el.toggleAttribute('data-above', up);
      el.style.top = `${up ? box.top - GAP - height : box.bottom + GAP}px`;
      const panelWidth = el.offsetWidth;
      el.style.left = `${Math.max(EDGE, Math.min(box.left, window.innerWidth - panelWidth - EDGE))}px`;
    };
    place();

    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && field.contains(target)) return;
      if (target && el.contains(target) && target !== el) return;
      // A press on the panel's own box (its padding) stays inside; one on the dimmed page behind a sheet does not.
      if (target === el) {
        const r = el.getBoundingClientRect();
        const inside =
          event.clientX >= r.left &&
          event.clientX <= r.right &&
          event.clientY >= r.top &&
          event.clientY <= r.bottom;
        if (inside) return;
      }
      dismiss.current();
    };
    window.addEventListener('scroll', later, true);
    window.addEventListener('resize', later);
    document.addEventListener('pointerdown', outside, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', later, true);
      window.removeEventListener('resize', later);
      document.removeEventListener('pointerdown', outside, true);
      el.removeAttribute('data-open');
      el.removeAttribute('data-above');
      try {
        el.hidePopover?.();
      } catch {
        // Not shown in the top layer.
      }
    };
  }, [open, sheet, anchor, maxHeight, width]);

  return (
    <div
      ref={panel}
      id={id}
      popover="manual"
      className={c.popup}
      role={role}
      aria-label={role ? label : undefined}
      aria-modal={role ? false : undefined}
    >
      {open && sheet ? (
        <div className={c.sheetHead}>
          <span className={c.handle} aria-hidden="true" />
          <span className={c.sheetTitle} aria-hidden="true">
            {title}
          </span>
          <button type="button" className={c.sheetClose} aria-label="Close" onClick={() => dismiss.current()}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
      {open ? children : null}
    </div>
  );
}
