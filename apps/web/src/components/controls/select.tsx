'use client';

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Popup } from './popup';
import c from './controls.module.css';

/** Lists longer than this have a search at the top. */
export const SEARCH_FROM = 12;

export interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
  group: string | null;
}

/** What a change hands the page: the shape of a change event's `target`, so pages read `e.target.value` as before. */
export interface SelectChange {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  // A method, so a page's handler typed for a select's change event is accepted: it reads `target.value` only.
  onChange?(event: SelectChange): void;
  disabled?: boolean;
  required?: boolean;
  /** Search at the top of the list: on by default for lists longer than twelve. */
  searchable?: boolean;
  /** As wide as its column, the chosen option's words cut short to fit; otherwise as wide as those words. */
  fill?: boolean;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
}

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : ''))
    .join('');

/** Reads `<option>` and `<optgroup>` children, through fragments, as a page writes them for a select. */
export function readOptions(children: ReactNode, group: string | null = null): SelectOption[] {
  const out: SelectOption[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const el = child as ReactElement<{
      value?: string | number;
      label?: string;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (el.type === Fragment) out.push(...readOptions(el.props.children, group));
    else if (el.type === 'optgroup') out.push(...readOptions(el.props.children, el.props.label ?? null));
    else if (el.type === 'option') {
      const label = textOf(el.props.children);
      out.push({
        value: String(el.props.value ?? label),
        label,
        disabled: !!el.props.disabled,
        group,
      });
    }
  }
  return out;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Moves focus to the control after (or before) this one, within the open dialog when there is one. */
export function focusBeside(from: HTMLElement, backwards: boolean) {
  const scope = from.closest('[role="dialog"][aria-modal="true"]') ?? document.body;
  const all = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el === from || (el.getClientRects().length > 0 && !el.closest('[inert]')),
  );
  const at = all.indexOf(from);
  const next = all[(at + (backwards ? -1 : 1) + all.length) % all.length];
  next?.focus();
}

/** Letters without their accents, in lower case, for matching what is typed. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Invoica's own dropdown (docs/specs/form-errors-and-controls.md). Written like a select, with `<option>` children
 * and a change whose `target.value` is the choice; the choice goes into a form under `name`. Closed, it looks like the
 * app's other fields. It opens a list under it (a sheet on a phone), with a search at the top of a long list.
 */
export function Select({
  id: givenId,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  searchable,
  fill,
  className,
  children,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
}: SelectProps) {
  const ownId = useId();
  const id = givenId ?? `select-${ownId}`;
  const listId = `${id}-list`;
  const options = useMemo(() => readOptions(children), [children]);
  const [own, setOwn] = useState(() => String(defaultValue ?? options.find((o) => !o.disabled)?.value ?? ''));
  const current = value === undefined ? own : String(value);
  const chosen = options.find((o) => o.value === current) ?? options[0];
  const withSearch = searchable ?? options.length > SEARCH_FROM;

  const trigger = useRef<HTMLButtonElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState(ariaLabel ?? '');
  const typed = useRef({ text: '', at: 0 });

  // The field's name for the list and the sheet: its label, or its own `aria-label`.
  useEffect(() => {
    if (ariaLabel) return setTitle(ariaLabel);
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) setTitle(label.textContent.trim());
  }, [ariaLabel, id]);

  const shown = useMemo(() => {
    if (!withSearch || !query.trim()) return options;
    const words = fold(query).trim().split(/\s+/);
    return options.filter((o) => {
      const label = fold(o.label);
      return words.every((w) => label.includes(w));
    });
  }, [options, query, withSearch]);
  const usable = shown.filter((o) => !o.disabled);

  const optionId = (v: string) => `${id}-o-${options.findIndex((o) => o.value === v)}`;

  const openList = useCallback(
    (start?: 'first' | 'last') => {
      if (disabled) return;
      setQuery('');
      const enabled = options.filter((o) => !o.disabled);
      const from =
        start === 'first'
          ? enabled[0]?.value
          : start === 'last'
            ? enabled.at(-1)?.value
            : (enabled.find((o) => o.value === current)?.value ?? enabled[0]?.value);
      setActive(from ?? null);
      setOpen(true);
    },
    [current, disabled, options],
  );

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) trigger.current?.focus();
  }, []);

  const choose = (v: string) => {
    const option = options.find((o) => o.value === v);
    if (!option || option.disabled) return;
    close();
    if (v === current) return;
    if (value === undefined) setOwn(v);
    const target = { value: v, name };
    onChange?.({ target, currentTarget: target });
  };

  // When it opens: the search takes focus in a long list; otherwise focus stays on the field, which names the option
  // in view. The option in view is kept in sight as it moves.
  useEffect(() => {
    if (open && withSearch) searchBox.current?.focus();
  }, [open, withSearch]);
  useEffect(() => {
    if (!open || !active) return;
    const el = list.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(active)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (step: number | 'first' | 'last') => {
    if (!usable.length) return;
    if (step === 'first') return setActive(usable[0]!.value);
    if (step === 'last') return setActive(usable.at(-1)!.value);
    const at = usable.findIndex((o) => o.value === active);
    const next = at === -1 ? (step > 0 ? 0 : usable.length - 1) : at + step;
    setActive(usable[Math.max(0, Math.min(usable.length - 1, next))]!.value);
  };

  /** Typing a letter or two jumps to the next option starting with them, as a select does. */
  const jump = (key: string) => {
    const now = Date.now();
    const text = now - typed.current.at < 700 ? typed.current.text + key : key;
    typed.current = { text, at: now };
    const needle = fold(text);
    const enabled = options.filter((o) => !o.disabled);
    const from = enabled.findIndex((o) => o.value === (open ? active : current));
    const order = [...enabled.slice(from + (text.length === 1 ? 1 : 0)), ...enabled.slice(0, from + 1)];
    const hit = order.find((o) => fold(o.label).startsWith(needle));
    if (!hit) return;
    if (!open) openList();
    setActive(hit.value);
  };

  // Keys on the field (and on the search, in a long list): the keys of a select (docs/specs, "Dropdowns").
  const onKey = (event: React.KeyboardEvent) => {
    const { key, altKey } = event;
    if (!open) {
      if (
        key === 'ArrowDown' ||
        key === 'ArrowUp' ||
        key === 'Enter' ||
        key === ' ' ||
        (altKey && key === 'ArrowDown')
      ) {
        event.preventDefault();
        openList();
        return;
      }
      if (key === 'Home' || key === 'End') {
        event.preventDefault();
        openList(key === 'Home' ? 'first' : 'last');
        return;
      }
      if (key.length === 1 && !event.ctrlKey && !event.metaKey && key !== ' ') {
        event.preventDefault();
        jump(key);
      }
      return;
    }
    switch (key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case 'Tab':
        // Chooses nothing, closes the list and moves on from the field, as a select does.
        event.preventDefault();
        event.stopPropagation();
        close(false);
        requestAnimationFrame(() => trigger.current && focusBeside(trigger.current, event.shiftKey));
        return;
      case 'ArrowDown':
        event.preventDefault();
        if (altKey) return;
        move(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (altKey) {
          if (active) choose(active);
          return;
        }
        move(-1);
        return;
      case 'PageDown':
        event.preventDefault();
        move(10);
        return;
      case 'PageUp':
        event.preventDefault();
        move(-10);
        return;
      case 'Home':
      case 'End':
        // In the search, Home and End move along what was typed.
        if (withSearch && event.target === searchBox.current) return;
        event.preventDefault();
        move(key === 'Home' ? 'first' : 'last');
        return;
      case 'Enter':
        event.preventDefault();
        if (active && usable.some((o) => o.value === active)) choose(active);
        return;
      case ' ':
        if (withSearch) return;
        event.preventDefault();
        if (active) choose(active);
        return;
      default:
        if (!withSearch && key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          jump(key);
        }
    }
  };

  // The search narrows the list; the first match is the one in view.
  useEffect(() => {
    if (!open || !withSearch) return;
    if (!usable.some((o) => o.value === active)) setActive(usable[0]?.value ?? null);
    // Only when what is shown changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  let lastGroup: string | null = null;
  const rows: ReactNode[] = [];
  for (const o of shown) {
    if (o.group !== lastGroup && o.group) {
      rows.push(
        <div key={`g-${o.group}`} role="presentation" className={c.groupLabel}>
          {o.group}
        </div>,
      );
    }
    lastGroup = o.group;
    const selected = o.value === chosen?.value;
    rows.push(
      <div
        key={o.value}
        id={optionId(o.value)}
        role="option"
        aria-selected={selected}
        aria-disabled={o.disabled || undefined}
        data-value={o.value}
        data-active={o.value === active ? '' : undefined}
        className={c.option}
        onPointerMove={() => !o.disabled && o.value !== active && setActive(o.value)}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => choose(o.value)}
      >
        <span className={c.optionText}>{o.label || ' '}</span>
        {selected ? (
          <svg className={c.tick} viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>,
    );
  }

  const invalid = ariaInvalid === true || ariaInvalid === 'true';
  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && !withSearch && active ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        disabled={disabled}
        data-value={current}
        data-fill={fill ? '' : undefined}
        className={`${c.trigger} ${className ?? ''}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKey}
      >
        <span className={c.triggerText}>{chosen?.label}</span>
        <svg className={c.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <Popup open={open} anchor={trigger} title={title} onDismiss={() => close(false)}>
        {withSearch ? (
          <div className={c.search}>
            <svg className={c.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={searchBox}
              type="text"
              role="combobox"
              aria-label="Search the list"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                active && usable.some((o) => o.value === active) ? optionId(active) : undefined
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
            />
          </div>
        ) : null}
        <div
          ref={list}
          id={listId}
          role="listbox"
          aria-label={title || undefined}
          className={c.list}
          tabIndex={-1}
        >
          {rows.length ? rows : <div className={c.empty}>No matches</div>}
        </div>
      </Popup>
    </>
  );
}
