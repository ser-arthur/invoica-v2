'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  DAY_NAMES,
  isoOf,
  monthGrid,
  MONTH_NAMES,
  partsOf,
  readTypedDate,
  sayDate,
  showDate,
  weekday,
} from '@/lib/typed-date';
import { cx, inputClass } from '../ui';
import { Popup } from './popup';
import c from './controls.module.css';

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const TYPE_IT = 'Enter a date, like 31/12/2026.';

function localToday() {
  const now = new Date();
  return isoOf(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export interface DateFieldProps {
  id?: string;
  name?: string;
  /** The calendar date, `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Today in the business's time zone, when the page knows it; otherwise the device's. */
  today?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
}

/**
 * Invoica's own date field (docs/specs/form-errors-and-controls.md, "Dates"): shows the date as "31 Dec 2026", takes
 * one typed in the ways people write them, and opens a month calendar from its button (on a phone, from a tap
 * anywhere on it, as a sheet). The value is always a calendar date or empty.
 */
export function DateField({
  id: givenId,
  name,
  value,
  onChange,
  min,
  max,
  today: givenToday,
  required,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
}: DateFieldProps) {
  const ownId = useId();
  const id = givenId ?? `date-${ownId}`;
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => showDate(value));
  const [wrong, setWrong] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(ariaLabel ?? 'Date');
  const today = givenToday ?? localToday();

  useEffect(() => {
    if (ariaLabel) return setTitle(ariaLabel);
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) setTitle(label.textContent.trim());
  }, [ariaLabel, id]);

  // Set when the field itself empties the value because what was typed is not a date, so that text stays to be fixed.
  const emptiedHere = useRef(false);

  // A value set from outside (a client's terms setting the due date) shows, unless it is the one being typed.
  useEffect(() => {
    if (emptiedHere.current && !value) {
      emptiedHere.current = false;
      return;
    }
    emptiedHere.current = false;
    if (document.activeElement === input.current && readTypedDate(text) === value) return;
    setText(showDate(value));
    setWrong(false);
    // Only when the value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);

  const commit = (iso: string) => {
    setText(showDate(iso));
    setWrong(false);
    if (iso !== value) onChange(iso);
  };

  // What is typed is read as it is typed; a date that is not whole yet is checked when the field is left.
  const typed = (next: string) => {
    setText(next);
    const iso = readTypedDate(next);
    if (iso) {
      setWrong(false);
      if (iso !== value) onChange(iso);
    } else if (!next.trim()) {
      setWrong(false);
      if (value) onChange('');
    }
  };
  const leave = () => {
    if (!text.trim()) return;
    const iso = readTypedDate(text);
    if (iso) setText(showDate(iso));
    else {
      setWrong(true);
      if (value) {
        emptiedHere.current = true;
        onChange('');
      }
    }
  };

  const errorId = `${id}-date-error`;
  const invalid = wrong || ariaInvalid === true || ariaInvalid === 'true';
  return (
    <div>
      <div
        ref={box}
        className={cx(inputClass, /(^|\s)w-/.test(className ?? '') ? null : 'w-full', c.dateField, className)}
        aria-disabled={disabled || undefined}
        data-invalid-date={wrong ? '' : undefined}
      >
        <input
          ref={input}
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          value={text}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, wrong ? errorId : null].filter(Boolean).join(' ') || undefined}
          data-value={value}
          data-min={min}
          data-max={max}
          onChange={(e) => typed(e.target.value)}
          onBlur={leave}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault();
              setOpen(true);
            }
            if (e.key === 'Enter') {
              const iso = readTypedDate(text);
              if (iso) commit(iso);
            }
          }}
          onPointerUp={(e) => {
            // On a touch screen the calendar is the way in; typing stays possible from a keyboard.
            if (e.pointerType === 'touch' && !disabled) setOpen(true);
          }}
        />
        <button
          type="button"
          className={c.dateButton}
          aria-label={`Choose ${title.toLowerCase()} from a calendar`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect
              x="2"
              y="3"
              width="12"
              height="11"
              rx="2.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M2.5 6.5h11M5.5 1.8v2.6M10.5 1.8v2.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {name ? <input type="hidden" name={name} value={value} /> : null}
      </div>
      {wrong ? (
        <p id={errorId} className={c.dateError}>
          {TYPE_IT}
        </p>
      ) : null}
      <Popup
        open={open}
        anchor={box}
        title={title}
        onDismiss={() => setOpen(false)}
        maxHeight={440}
        width={308}
        role="dialog"
        label={title}
      >
        <Calendar
          value={value}
          today={today}
          allowed={allowed}
          required={!!required}
          onChoose={(iso) => {
            commit(iso);
            setOpen(false);
            input.current?.focus();
          }}
          onClear={() => {
            commit('');
            setOpen(false);
            input.current?.focus();
          }}
          onClose={() => {
            setOpen(false);
            input.current?.focus();
          }}
        />
      </Popup>
    </div>
  );
}

function Calendar({
  value,
  today,
  allowed,
  required,
  onChoose,
  onClear,
  onClose,
}: {
  value: string;
  today: string;
  allowed: (iso: string) => boolean;
  required: boolean;
  onChoose: (iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState(() => value || today);
  const [y, m] = partsOf(focus);
  const weeks = useMemo(() => monthGrid(y, m), [y, m]);
  const grid = useRef<HTMLTableElement>(null);
  const titleId = useId();

  useEffect(() => {
    grid.current?.querySelector<HTMLElement>(`[data-date="${focus}"]`)?.focus();
  }, [focus]);

  const onKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => addDays(focus, -weekday(focus)),
      End: () => addDays(focus, 6 - weekday(focus)),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocus(moves[e.key]!());
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (allowed(focus)) onChoose(focus);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className={c.calendar}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div className={c.calendarHead}>
        <button
          type="button"
          className={c.monthButton}
          aria-label="Previous month"
          onClick={() => setFocus(addMonths(focus, -1))}
        >
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M8.5 3 4.5 7l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 id={titleId} className={c.monthTitle} aria-live="polite">
          {MONTH_NAMES[m - 1]} {y}
        </h2>
        <button
          type="button"
          className={c.monthButton}
          aria-label="Next month"
          onClick={() => setFocus(addMonths(focus, 1))}
        >
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M5.5 3l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <table ref={grid} role="grid" aria-labelledby={titleId} className={c.grid} onKeyDown={onKey}>
        <thead>
          <tr>
            {WEEK.map((d, i) => (
              <th key={d} scope="col" abbr={DAY_NAMES[i]}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const ok = allowed(day);
                return (
                  <td
                    key={day}
                    role="gridcell"
                    data-date={day}
                    tabIndex={day === focus ? 0 : -1}
                    aria-selected={day === value}
                    aria-disabled={!ok || undefined}
                    aria-current={day === today ? 'date' : undefined}
                    aria-label={sayDate(day)}
                    data-today={day === today ? '' : undefined}
                    data-outside={partsOf(day)[1] !== m ? '' : undefined}
                    className={c.day}
                    onClick={() => (ok ? onChoose(day) : setFocus(day))}
                  >
                    {partsOf(day)[2]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={c.calendarFoot}>
        {allowed(today) ? (
          <button type="button" className={c.textButton} onClick={() => onChoose(today)}>
            Today
          </button>
        ) : (
          <span />
        )}
        {!required && value ? (
          <button type="button" className={c.textButton} onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
