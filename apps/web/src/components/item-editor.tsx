'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatMoney, parseMoney, toDecimalString } from '@invoica/core';
import { archiveItemAction, saveItemAction } from '@/lib/actions/items';
import { Button, Field, FormMessage, Input, Select, Textarea } from './ui';

export interface ItemValue {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  unit: string | null;
  taxCodeId: string | null;
}

export function ItemEditor({
  item,
  currency,
  taxCodes,
  onDone,
}: {
  item: ItemValue | null;
  currency: string;
  taxCodes: { id: string; label: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const price = parseMoney(String(f.get('unitPrice') ?? ''), currency);
    if (price === null || price < 0) {
      setErrors({ unitPrice: 'Enter a price, for example 450 or 450.00.' });
      return;
    }
    const input = {
      name: String(f.get('name') ?? ''),
      description: String(f.get('description') ?? ''),
      unitPrice: price,
      unit: String(f.get('unit') ?? ''),
      taxCodeId: String(f.get('taxCodeId') ?? '') || null,
    };
    start(async () => {
      const r = await saveItemAction(item?.id ?? null, input);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setMessage(r.message);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {message ? (
        <div className="sm:col-span-2">
          <FormMessage>{message}</FormMessage>
        </div>
      ) : null}
      <Field label="Name" htmlFor="i-name" error={errors.name} className="sm:col-span-2">
        <Input id="i-name" name="name" defaultValue={item?.name ?? ''} autoFocus />
      </Field>
      <Field
        label="Description"
        htmlFor="i-desc"
        hint="Shown under the name on invoices."
        className="sm:col-span-2"
      >
        <Textarea
          id="i-desc"
          name="description"
          defaultValue={item?.description ?? ''}
          className="min-h-16"
        />
      </Field>
      <Field label={`Price (${currency})`} htmlFor="i-price" error={errors.unitPrice}>
        <Input
          id="i-price"
          name="unitPrice"
          inputMode="decimal"
          defaultValue={item ? toDecimalString(item.unitPrice, currency) : ''}
        />
      </Field>
      <Field label="Unit" htmlFor="i-unit" hint="For example hour, day or item.">
        <Input id="i-unit" name="unit" defaultValue={item?.unit ?? ''} />
      </Field>
      <Field label="Tax" htmlFor="i-tax" className="sm:col-span-2">
        <Select id="i-tax" name="taxCodeId" defaultValue={item?.taxCodeId ?? ''}>
          <option value="">Use the default</option>
          {taxCodes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving' : item ? 'Save item' : 'Add item'}
        </Button>
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
                await archiveItemAction(item.id);
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
  taxCodes: { id: string; label: string }[];
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(items.length === 0 ? 'new' : null);
  const label = (id: string | null) => taxCodes.find((t) => t.id === id)?.label ?? 'Default tax';
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
                  <span className="min-w-0">
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
