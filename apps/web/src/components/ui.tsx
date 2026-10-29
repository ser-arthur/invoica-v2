import Link from 'next/link';
import { cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { formatMoney, STATE_LABELS, type DocumentState } from '@invoica/core';
import { Logo } from './logo';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunk',
  ghost: 'text-ink-soft hover:bg-sunk hover:text-ink',
  danger: 'bg-surface text-danger border border-line-strong hover:bg-danger-soft',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(buttonBase, variants[variant], sizes[size], extra);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** The logo, sized by font size like the word it replaced. */
export function Wordmark({ className }: { className?: string }) {
  return <Logo className={cx('text-ink', className)} />;
}

/**
 * A label, its control, and under it the control's error or, when there is none, its hint. `keepHint` keeps a hint
 * that is not about what was typed (a link such as "Forgot your password?") under the error too.
 */
export function Field({
  label,
  hint,
  error,
  keepHint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  keepHint?: boolean;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  // The control the label names is marked invalid and described by the error while there is one.
  const control =
    error && isValidElement<Record<string, unknown>>(children) && children.props.id === htmlFor
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          'aria-invalid': true,
          'aria-describedby': [
            ...new Set([...String(children.props['aria-describedby'] ?? '').split(' '), `${htmlFor}-error`]),
          ]
            .filter(Boolean)
            .join(' '),
        })
      : children;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      {control}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-start gap-1.5 text-[13px] text-danger">
          <ErrorMark />
          <span>{error}</span>
        </p>
      ) : null}
      {hint && (!error || keepHint) ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The small circled mark before a field's error, so the error does not rest on its colour alone. */
export function ErrorMark({ className = 'mt-px' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cx('size-3.5 shrink-0', className)}>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M8 4.2v4.6" stroke="var(--color-surface, #fff)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="11.3" r="1" fill="var(--color-surface, #fff)" />
    </svg>
  );
}

/** A link inside a sentence: underlined, because the brand colour alone does not set it apart from the text. */
export const inlineLinkClass = 'font-medium text-brand underline underline-offset-4 hover:decoration-2';

export const inputClass =
  'h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 aria-[invalid=true]:border-danger';

/** Fields fill their container unless the caller gives them a width of their own. */
const width = (className?: string) => (/(^|\s)w-/.test(className ?? '') ? null : 'w-full');

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(inputClass, width(className), className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cx(inputClass, width(className), 'h-auto min-h-24 py-2 leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cx(inputClass, width(className), 'select-chevron pr-9', className)} {...props} />;
}

export function Checkbox({
  label,
  hint,
  ...props
}: ComponentProps<'input'> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-0.5 size-4.5 shrink-0 accent-[var(--brand)]" {...props} />
      <span className="flex flex-col">
        <span className="text-[15px] text-ink">{label}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

const pillTone: Record<DocumentState | 'overdue', string> = {
  draft: 'bg-sunk text-muted',
  issued: 'bg-info-soft text-info',
  sent: 'bg-info-soft text-info',
  part_paid: 'bg-warn-soft text-warn',
  paid: 'bg-brand-soft text-brand',
  credited: 'bg-sunk text-ink-soft',
  settled: 'bg-brand-soft text-brand',
  void: 'bg-sunk text-muted line-through',
  overdue: 'bg-danger-soft text-danger',
};

export function StatePill({ state, overdue }: { state: DocumentState; overdue?: boolean }) {
  const key = overdue ? 'overdue' : state;
  const label = overdue ? (state === 'part_paid' ? 'Part paid, late' : 'Overdue') : STATE_LABELS[state];
  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap',
        pillTone[key],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function Money({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  return <span className={cx('tabular', className)}>{formatMoney(amount, currency)}</span>;
}

/** A large amount with its minor units set smaller, so the whole figure reads first. */
export function Headline({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const text = formatMoney(amount, currency);
  const m = /^(.*\d)([.,]\d+)(\D*)$/.exec(text);
  return (
    <span className={cx('tabular', className)}>
      {m ? (
        <>
          {m[1]}
          <span className="ml-[0.04em] align-[0.95em] text-[0.4em] tracking-normal text-muted">{m[2]}</span>
          {m[3]}
        </>
      ) : (
        text
      )}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex text-[13px] text-muted hover:text-ink">
            {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] text-ink sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-[60ch] [overflow-wrap:anywhere] text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ className, children, ...props }: ComponentProps<'section'>) {
  return (
    <section className={cx('rounded-[14px] border border-line bg-surface', className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** A blank sheet of paper with a line of brand colour where the amount goes. Decoration for empty states. */
export function PaperMark() {
  return (
    <svg width="56" height="68" viewBox="0 0 56 68" aria-hidden="true" className="mb-1">
      <path
        d="M6 2h32l14 14v46a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z"
        fill="var(--surface)"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <path d="M38 2v10a4 4 0 0 0 4 4h10" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
      <rect x="10" y="22" width="20" height="3" rx="1.5" fill="var(--line-strong)" />
      <rect x="10" y="31" width="30" height="3" rx="1.5" fill="var(--line)" />
      <rect x="10" y="38" width="26" height="3" rx="1.5" fill="var(--line)" />
      <rect x="22" y="52" width="24" height="6" rx="3" fill="var(--brand-bright)" />
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-10 sm:items-center sm:text-center">
      <PaperMark />
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="max-w-[46ch] text-muted">{body}</p>
      {action}
    </div>
  );
}

export function FormMessage({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'info';
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'rounded-[10px] px-4 py-3 text-sm [overflow-wrap:anywhere]',
        tone === 'danger' ? 'flex items-start gap-2 bg-danger-soft text-danger' : 'bg-info-soft text-info',
      )}
    >
      {tone === 'danger' ? (
        <>
          <ErrorMark className="mt-[3px]" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </div>
  );
}
