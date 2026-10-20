'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { formatMoney, parseMoney, toDecimalString } from '@invoica/core';
import { archiveItemAction, saveItemAction } from '@/lib/actions/items';
import { Button, Field, FormMessage, Input, Select, Textarea } from './ui';
import { followUntouched } from '@/lib/follow-untouched';
import { reach } from '@/lib/reach';
import { LeaveDialog, useLeaveGuard } from './leave-guard';
import { useHydrated } from '@/lib/use-hydrated';
import { requestKey } from '@/lib/request-key';

export interface ItemValue {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  unit: string | null;
  taxCodeId: string | null;
  /** The version this page shows (docs/specs/changes-elsewhere.md). */
  version?: string;
}

/** A tax code an item can use; an archived one is offered only to the item that already uses it. */
export interface TaxCodeOption {
  id: string;
  label: string;
  archived: boolean;
}

/** What the form edits, as it holds it. */
interface ItemFormValues {
  name: string;
  description: string;
  unitPrice: string;
  unit: string;
  taxCodeId: string;
}

const valuesOf = (item: ItemValue | null, currency: string): ItemFormValues => ({
  name: item?.name ?? '',
  description: item?.description ?? '',
  unitPrice: item ? toDecimalString(item.unitPrice, currency) : '',
  unit: item?.unit ?? '',
  taxCodeId: item?.taxCodeId ?? '',
});

const optionLabel = (t: TaxCodeOption) => (t.archived ? `${t.label} (archived)` : t.label);

export function ItemEditor({
  item,
  currency,
  taxCodes,
  onDone,
}: {
  item: ItemValue | null;
  currency: string;
  taxCodes: TaxCodeOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const ready = useHydrated();
  // What the form shows, held here so a change made elsewhere can be shown in the fields not typed in.
  const [v, setV] = useState(() => valuesOf(item, currency));
  // The item as the page last had it. When it changes (fetched again after a refusal), each field not changed here
  // takes the new value, and what was typed stays (docs/specs/changes-elsewhere.md, rule 8).
  const [loaded, setLoaded] = useState(item);
  if (item !== loaded) {
    setLoaded(item);
    setV(followUntouched(valuesOf(loaded, currency), v, valuesOf(item, currency)));
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // A new item's form keeps one request key, so saving again after a lost answer makes one item.
  const [key] = useState(() => requestKey());
  // The version this editor opened with; a successful save closes it.
  const [opened] = useState(item?.version);
  // Refused because the item changed elsewhere: "Save mine anyway" saves against the version fetched since.
  const [conflict, setConflict] = useState(false);
  const replacing = useRef(false);
  // Typed in since the editor opened: leaving the page asks first.
  const [dirty, setDirty] = useState(false);
  const guard = useLeaveGuard(dirty);
  const text = (k: keyof ItemFormValues) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDirty(true);
      setV((prev) => ({ ...prev, [k]: e.target.value }));
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const price = parseMoney(v.unitPrice, currency);
    if (price === null || price < 0) {
      setErrors({ unitPrice: 'Enter a price, for example 450 or 450.00.' });
      return;
    }
    const input = {
      ...(item ? {} : { idempotencyKey: key }),
      name: v.name,
      description: v.description,
      unitPrice: price,
      unit: v.unit,
      taxCodeId: v.taxCodeId || null,
    };
    const replace = replacing.current;
    replacing.current = false;
    start(async () => {
      const r = await reach(saveItemAction(item?.id ?? null, input, replace ? item?.version : opened));
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setMessage(r.message);
        if (r.code === 'item_changed') {
          setConflict(true);
          // The item's version is fetched again, for "Save mine anyway"; what was typed stays.
          router.refresh();
        }
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <LeaveDialog guard={guard} />
      {message ? (
        <div className="sm:col-span-2">
          <FormMessage>{message}</FormMessage>
        </div>
      ) : null}
      <Field label="Name" htmlFor="i-name" error={errors.name} className="sm:col-span-2">
        <Input id="i-name" name="name" {...text('name')} autoFocus />
      </Field>
      <Field
        label="Description"
        htmlFor="i-desc"
        hint="Shown under the name on invoices."
        className="sm:col-span-2"
      >
        <Textarea id="i-desc" name="description" {...text('description')} className="min-h-16" />
      </Field>
      <Field label={`Price (${currency})`} htmlFor="i-price" error={errors.unitPrice}>
        <Input id="i-price" name="unitPrice" inputMode="decimal" {...text('unitPrice')} />
      </Field>
      <Field label="Unit" htmlFor="i-unit" hint="For example hour, day or item.">
        <Input id="i-unit" name="unit" {...text('unit')} />
      </Field>
      <Field label="Tax" htmlFor="i-tax" className="sm:col-span-2">
        <Select id="i-tax" name="taxCodeId" {...text('taxCodeId')}>
          <option value="">Use the default</option>
          {taxCodes
            .filter((t) => !t.archived || t.id === item?.taxCodeId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {optionLabel(t)}
              </option>
            ))}
        </Select>
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending || !ready}>
          {pending ? 'Saving' : item ? 'Save item' : 'Add item'}
        </Button>
        {conflict ? (
          <Button
            type="submit"
            variant="danger"
            disabled={pending}
            onClick={() => {
              replacing.current = true;
            }}
          >
            Save mine anyway
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {item ? (
          <Button
            type="button"
            variant="danger"
            className="ml-auto"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await reach(archiveItemAction(item.id));
                if (!r.ok) return setMessage(r.message);
                router.refresh();
                onDone();
              })
            }
          >
            Archive
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ItemsList({
  items,
  currency,
  taxCodes,
}: {
  items: ItemValue[];
  currency: string;
  taxCodes: TaxCodeOption[];
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(items.length === 0 ? 'new' : null);
  const label = (id: string | null) => {
    const code = taxCodes.find((t) => t.id === id);
    return code ? optionLabel(code) : 'Default tax';
  };
  return (
    <div className="flex flex-col gap-4">
      {editing === 'new' ? (
        <div className="rounded-[14px] border border-line bg-surface p-5">
          <h2 className="mb-4 text-[15px] font-semibold">New item</h2>
          <ItemEditor item={null} currency={currency} taxCodes={taxCodes} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <Button className="self-start" onClick={() => setEditing('new')}>
          New item
        </Button>
      )}
      {items.length > 0 ? (
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
          {items.map((it) =>
            editing === it.id ? (
              <li key={it.id} className="p-5">
                <ItemEditor
                  item={it}
                  currency={currency}
                  taxCodes={taxCodes}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setEditing(it.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-sunk"
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-medium">{it.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {it.description ?? label(it.taxCodeId)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-medium tabular">{formatMoney(it.unitPrice, currency)}</span>
                    <span className="block text-[13px] text-muted">
                      {it.unit ? `per ${it.unit}` : 'each'}
                    </span>
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}
