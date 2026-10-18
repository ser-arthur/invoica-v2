'use client';

import { useMemo } from 'react';
import type { DocumentSnapshot } from '@invoica/core';
import { renderDocumentHtml, sampleSnapshot, TEMPLATE_LIST } from '@invoica/documents';
import { Paper } from './paper';
import { cx } from './ui';

/** Choose a template by seeing each one with the business's own name, colour and details. */
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
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-3 text-[13px] font-medium text-ink-soft">Template</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {previews.map((t) => (
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
