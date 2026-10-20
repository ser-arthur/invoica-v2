'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { describeTaxCode, formatRate, parseRate, type TaxComponent, type TaxTreatment } from '@invoica/core';
import { archiveTaxCodeAction, loadPresetAction, saveTaxCodeAction } from '@/lib/actions/settings';
import { Button, Checkbox, Field, FormMessage, Input, Panel, PanelHeading, Select } from './ui';
import { showNotice } from '@/lib/notice';
import { reach } from '@/lib/reach';
import { requestKey } from '@/lib/request-key';

export interface TaxCodeValue {
  id: string;
  label: string;
  treatment: TaxTreatment;
  components: TaxComponent[];
  isDefault: boolean;
  /** The version this page shows (docs/specs/changes-elsewhere.md). */
  version?: string;
}

const TREATMENTS: { value: TaxTreatment; label: string }[] = [
  { value: 'standard', label: 'Standard rate' },
  { value: 'reduced', label: 'Reduced rate' },
  { value: 'zero', label: 'Zero-rated' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'outside_scope', label: 'Outside the scope of tax' },
  { value: 'reverse_charge', label: 'Reverse charge (shown, not charged)' },
  { value: 'custom', label: 'Other' },
];

function Editor({ code, onDone }: { code: TaxCodeValue | null; onDone: () => void }) {
  const router = useRouter();
  const [label, setLabel] = useState(code?.label ?? '');
  const [treatment, setTreatment] = useState<TaxTreatment>(code?.treatment ?? 'standard');
  const [rows, setRows] = useState(
    (code?.components ?? [{ name: 'VAT', ratePpm: 200_000, compound: false }]).map((c) => ({
      name: c.name,
      rate: formatRate(c.ratePpm).replace('%', ''),
      compound: c.compound,
    })),
  );
  const [isDefault, setDefault] = useState(code?.isDefault ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // A new code's form keeps one request key, so saving again after a lost answer makes one code.
  const [key] = useState(() => requestKey());
  // The version this editor opened with; a successful save closes it.
  const [opened] = useState(code?.version);
  // Refused because the code changed elsewhere: "Save mine anyway" saves against the version fetched since.
  const [conflict, setConflict] = useState(false);

  function save(replace = false) {
    const components: TaxComponent[] = [];
    for (const r of rows) {
      const ratePpm = parseRate(r.rate);
      if (ratePpm === null) {
        setMessage(`Enter ${r.name || 'each tax'}'s rate as a percentage, for example 20 or 2.5.`);
        return;
      }
      components.push({ name: r.name, ratePpm, compound: r.compound });
    }
    start(async () => {
      const result = await reach(
        saveTaxCodeAction(
          code?.id ?? null,
          {
            ...(code ? {} : { idempotencyKey: key }),
            label,
            treatment,
            components,
            isDefault,
          },
          replace ? code?.version : opened,
        ),
      );
      if (!result.ok) {
        setMessage(result.message);
        if (result.code === 'tax_code_changed') {
          setConflict(true);
          // The code's version is fetched again, for "Save mine anyway"; what was typed stays.
          router.refresh();
        }
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {message ? <FormMessage>{message}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="t-label" hint="As it appears when you choose a tax for a line.">
          <Input id="t-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Kind of supply" htmlFor="t-treatment">
          <Select
            id="t-treatment"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value as TaxTreatment)}
          >
            {TREATMENTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-medium text-ink-soft">Taxes charged, in order</p>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_6rem_auto] items-end gap-3 sm:grid-cols-[1fr_7rem_auto_auto]"
          >
            <Field label="Tax name" htmlFor={`t-n-${i}`}>
              <Input
                id={`t-n-${i}`}
                value={r.name}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
            </Field>
            <Field label="Rate %" htmlFor={`t-r-${i}`}>
              <Input
                id={`t-r-${i}`}
                inputMode="decimal"
                value={r.rate}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))}
              />
            </Field>
            <div className="hidden h-10 items-center sm:flex">
              <Checkbox
                label="On top of the taxes above"
                checked={r.compound}
                disabled={i === 0}
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, compound: e.target.checked } : x)))
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove ${r.name || 'tax'}`}
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => setRows([...rows, { name: '', rate: '', compound: false }])}
        >
          <Plus className="size-4" aria-hidden /> Add a tax
        </Button>
        <p className="text-[13px] text-muted">
          No taxes listed means lines with this code show no tax, for example for exempt supplies.
        </p>
      </div>
      <Checkbox
        label="Use for new lines"
        checked={isDefault}
        onChange={(e) => setDefault(e.target.checked)}
      />
      <div className="flex gap-2">
        <Button type="button" onClick={() => save()} disabled={pending}>
          {pending ? 'Saving' : 'Save tax code'}
        </Button>
        {conflict ? (
          <Button type="button" variant="danger" onClick={() => save(true)} disabled={pending}>
            Save mine anyway
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function TaxCodes({
  codes,
  country,
  presetAvailable,
  noStandardRates,
}: {
  codes: TaxCodeValue[];
  country: string;
  presetAvailable: string | null;
  /** The country's name when Invoica has no standard rates for it. */
  noStandardRates?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Panel id="tax-codes" className="scroll-mt-24">
      <PanelHeading
        action={
          <div className="flex gap-2">
            {presetAvailable ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await reach(loadPresetAction(country));
                    if (!r.ok) return showNotice(r.message);
                    router.refresh();
                  })
                }
              >
                Add {presetAvailable} rates
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
              New tax code
            </Button>
          </div>
        }
      >
        Tax codes
      </PanelHeading>
      {noStandardRates ? (
        <p className="px-5 pb-3 text-[13px] text-muted">
          Invoica has no standard rates for {noStandardRates}. Add a code for each rate you charge, and check
          the rates with your tax authority.
        </p>
      ) : null}
      {editing === 'new' ? <Editor code={null} onDone={() => setEditing(null)} /> : null}
      <ul className="divide-y divide-line">
        {codes.map((c) =>
          editing === c.id ? (
            <li key={c.id}>
              <Editor code={c} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li
              key={c.id}
              className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {c.label}
                  {c.isDefault ? (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-brand">
                      Default
                    </span>
                  ) : null}
                </p>
                <p className="text-[13px] text-muted">
                  {c.components.length ? describeTaxCode(c) : 'No tax charged'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(c.id)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await reach(archiveTaxCodeAction(c.id));
                      if (!r.ok) return showNotice(r.message);
                      router.refresh();
                    })
                  }
                >
                  Archive
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
    </Panel>
  );
}
