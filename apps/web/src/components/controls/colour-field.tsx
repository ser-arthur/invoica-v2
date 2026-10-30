'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { hexToHsv, hsvToHex, readHex, type Hsv } from '@/lib/hsv';
import { Popup } from './popup';
import c from './colour.module.css';

/** The website's eight colours, offered first. */
export const SWATCHES = [
  { name: 'Forest', value: '#17795a' },
  { name: 'Orange', value: '#d9480f' },
  { name: 'Navy', value: '#1d3c5a' },
  { name: 'Plum', value: '#5b2a4e' },
  { name: 'Teal', value: '#138c86' },
  { name: 'Rose', value: '#c52a55' },
  { name: 'Lemon', value: '#f2d33b' },
  { name: 'Charcoal', value: '#2f3a3d' },
];

const pct = (x: number) => `${Math.trunc(x * 100 + 0.5)}%`;

/**
 * Invoica's own colour picker (docs/specs/form-errors-and-controls.md, "Colours"): a swatch that opens a panel (a
 * sheet on a phone) with a square for shade and brightness, a strip for hue, the website's eight colours and the code.
 * Every move changes the colour at once.
 */
export function ColourField({
  id: givenId,
  value,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
}: {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
}) {
  const ownId = useId();
  const id = givenId ?? `colour-${ownId}`;
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(ariaLabel ?? 'Colour');
  const shown = readHex(value) ?? '#17795a';

  useEffect(() => {
    if (ariaLabel) return setTitle(ariaLabel);
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) setTitle(label.textContent.trim());
  }, [ariaLabel, id]);

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        className={`${c.swatchButton} ${className ?? ''}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid === true || ariaInvalid === 'true' || undefined}
        aria-describedby={describedBy}
        data-value={shown}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={c.swatch} style={{ background: shown }} />
      </button>
      <Popup
        open={open}
        anchor={button}
        title={title}
        onDismiss={() => setOpen(false)}
        maxHeight={460}
        width={272}
        role="dialog"
        label={title}
      >
        <Picker
          value={shown}
          onChange={onChange}
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        />
      </Popup>
    </>
  );
}

function Picker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  // Hue and shade are kept here as moved, so a grey or black keeps the hue it was given.
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [code, setCode] = useState(value);
  const first = useRef<HTMLDivElement>(null);

  useEffect(() => {
    first.current?.focus();
  }, []);
  // A colour changed from outside (the code typed beside the field) moves the markers.
  useEffect(() => {
    if (hsvToHex(hsv) !== value) {
      setHsv(hexToHsv(value));
      setCode(value);
    }
    // Only when the colour given changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const set = (next: Hsv) => {
    const clamped = {
      h: Math.min(360, Math.max(0, next.h)),
      s: Math.min(1, Math.max(0, next.s)),
      v: Math.min(1, Math.max(0, next.v)),
    };
    setHsv(clamped);
    const hex = hsvToHex(clamped);
    setCode(hex);
    if (hex !== value) onChange(hex);
  };

  const drag = (read: (x: number, y: number) => void) => (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.focus();
    const at = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      read((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    };
    at(e);
    const move = (ev: PointerEvent) => at(ev);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const keys = (e: React.KeyboardEvent, axis: 'square' | 'hue') => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, () => Hsv> =
      axis === 'square'
        ? {
            ArrowLeft: () => ({ ...hsv, s: hsv.s - step }),
            ArrowRight: () => ({ ...hsv, s: hsv.s + step }),
            ArrowUp: () => ({ ...hsv, v: hsv.v + step }),
            ArrowDown: () => ({ ...hsv, v: hsv.v - step }),
          }
        : {
            ArrowLeft: () => ({ ...hsv, h: hsv.h - (e.shiftKey ? 10 : 1) }),
            ArrowDown: () => ({ ...hsv, h: hsv.h - (e.shiftKey ? 10 : 1) }),
            ArrowRight: () => ({ ...hsv, h: hsv.h + (e.shiftKey ? 10 : 1) }),
            ArrowUp: () => ({ ...hsv, h: hsv.h + (e.shiftKey ? 10 : 1) }),
            Home: () => ({ ...hsv, h: 0 }),
            End: () => ({ ...hsv, h: 360 }),
          };
    if (moves[e.key]) {
      e.preventDefault();
      set(moves[e.key]!());
    }
  };

  return (
    <div
      className={c.picker}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={first}
        className={c.square}
        style={{ '--hue': `hsl(${hsv.h} 100% 50%)` } as React.CSSProperties}
        role="slider"
        tabIndex={0}
        aria-label="Shade and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.trunc(hsv.v * 100 + 0.5)}
        aria-valuetext={`Shade ${pct(hsv.s)}, brightness ${pct(hsv.v)}`}
        onPointerDown={drag((x, y) => set({ ...hsv, s: x, v: 1 - y }))}
        onKeyDown={(e) => keys(e, 'square')}
      >
        <span
          className={c.squareThumb}
          style={{ left: pct(hsv.s), top: pct(1 - hsv.v), background: value }}
        />
      </div>
      <div
        className={c.strip}
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.trunc(hsv.h + 0.5)}
        onPointerDown={drag((x) => set({ ...hsv, h: x * 360 }))}
        onKeyDown={(e) => keys(e, 'hue')}
      >
        <span className={c.stripThumb} style={{ left: pct(hsv.h / 360) }} />
      </div>
      <div className={c.swatches} role="group" aria-label="The website’s colours">
        {SWATCHES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={c.preset}
            style={{ background: s.value }}
            aria-label={s.name}
            aria-pressed={s.value === value}
            onClick={() => set(hexToHsv(s.value))}
          />
        ))}
      </div>
      <label className={c.codeRow}>
        <span>Code</span>
        <input
          value={code}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!readHex(code) || undefined}
          onChange={(e) => {
            setCode(e.target.value);
            const hex = readHex(e.target.value);
            if (hex) {
              setHsv(hexToHsv(hex));
              if (hex !== value) onChange(hex);
            }
          }}
          onBlur={() => setCode(value)}
        />
      </label>
    </div>
  );
}
