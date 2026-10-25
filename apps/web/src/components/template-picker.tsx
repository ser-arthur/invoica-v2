'use client';

import { useMemo, useState } from 'react';
import type { DocumentSnapshot } from '@invoica/core';
import {
  BUSINESS_KINDS,
  renderDocumentHtml,
  RETIRED_TEMPLATES,
  sampleSnapshot,
  TEMPLATE_LIST,
  type BusinessKind,
  type TemplateFeel,
} from '@invoica/documents';
import { Paper } from './paper';
import { cx } from './ui';

const FEELS: { id: TemplateFeel; name: string }[] = [
  { id: 'playful', name: 'Playful' },
  { id: 'in between', name: 'In between' },
  { id: 'grounded', name: 'Grounded' },
];

/** One row of filter choices: "All" and then each option, as radios styled as chips. */
function Filter<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { id: T; name: string }[];
  value: T | 'all';
  onChange: (value: T | 'all') => void;
}) {
  const all: { id: T | 'all'; name: string }[] = [{ id: 'all', name: 'All' }, ...options];
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden="true" className="mr-1 text-[13px] text-muted">
        {legend}
      </span>
      {all.map((o) => (
        <label
          key={o.id}
          className={cx(
            'relative inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-[13px] transition-colors',
            'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
            value === o.id
              ? 'border-brand bg-brand-soft/50 font-medium text-ink'
              : 'border-line text-ink-soft hover:border-line-strong',
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.id}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
            className="sr-only"
          />
          {o.name}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Choose a template by seeing each one with the business's own name, colour and details, filtered by kind of
 * business and by feel.
 */
export function TemplatePicker({
  value,
  onChange,
  seller,
  logoUrl,
}: {
  value: string;
  onChange: (id: string) => void;
  seller: DocumentSnapshot['seller'];
  logoUrl: string | null;
}) {
  const [kind, setKind] = useState<BusinessKind | 'all'>('all');
  const [feel, setFeel] = useState<TemplateFeel | 'all'>('all');
  const previews = useMemo(
    () =>
      TEMPLATE_LIST.map((t) => ({
        ...t,
        html: renderDocumentHtml(sampleSnapshot({ template: t.id, seller }), {
          fontUrl: (f) => `/doc-fonts/${f}`,
          logoUrl,
        }),
      })),
    [seller, logoUrl],
  );
  const shown = previews.filter(
    (t) => (kind === 'all' || t.kinds.includes(kind)) && (feel === 'all' || t.feel === feel),
  );
  const retired = RETIRED_TEMPLATES.find((t) => t.id === value);
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-3 text-[13px] font-medium text-ink-soft">Template</legend>
      <div className="mb-4 flex flex-col gap-2.5">
        <Filter
          legend="Kind of business"
          name="template-kind"
          options={BUSINESS_KINDS}
          value={kind}
          onChange={setKind}
        />
        <Filter legend="Feel" name="template-feel" options={FEELS} value={feel} onChange={setFeel} />
      </div>
      {retired ? (
        <p className="mb-4 text-[14px] text-muted" role="note">
          {retired.name} has left the range. Invoices already issued in it keep it, and new ones use it until
          you choose another here.
        </p>
      ) : null}
      {shown.length === 0 ? (
        <p className="text-[14px] text-muted">No template matches both filters. Choose All in one of them.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {shown.map((t) => (
          <label
            key={t.id}
            className={cx(
              'flex cursor-pointer flex-col gap-3 rounded-[14px] border p-3 transition-colors',
              value === t.id
                ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30'
                : 'border-line hover:border-line-strong',
            )}
          >
            <input
              type="radio"
              name="template"
              value={t.id}
              checked={value === t.id}
              onChange={() => onChange(t.id)}
              className="sr-only"
            />
            <Paper html={t.html} width={180} title={`${t.name} template`} className="mx-auto" />
            <span>
              <span className="block font-medium">{t.name}</span>
              <span className="block text-[13px] text-muted">{t.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
