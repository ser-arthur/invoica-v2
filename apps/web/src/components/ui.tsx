import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { formatMoney, STATE_LABELS, type DocumentState } from '@invoica/core';

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

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cx('font-display font-bold tracking-[-0.03em] text-ink', className)}
      aria-label="Invoica"
    >
      invoiça<span className="text-brand-bright">.</span>
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 aria-[invalid=true]:border-danger';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cx(inputClass, 'h-auto min-h-24 py-2 leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cx(inputClass, 'pr-8', className)} {...props} />;
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
        <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-[60ch] text-muted">{description}</p> : null}
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

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-10 sm:items-center sm:text-center">
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
        'rounded-[10px] px-4 py-3 text-sm',
        tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info',
      )}
    >
      {children}
    </div>
  );
}
