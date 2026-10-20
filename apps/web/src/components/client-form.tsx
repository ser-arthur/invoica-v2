'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@invoica/core';
import { saveClientAction } from '@/lib/actions/clients';
import { COUNTRIES } from '@/lib/countries';
import { Button, Checkbox, Field, FormMessage, Input, Panel, Select, Textarea } from './ui';
import { reach } from '@/lib/reach';
import { useHydrated } from '@/lib/use-hydrated';
import { requestKey } from '@/lib/request-key';

export interface ClientFormValues {
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  countryCode: string | null;
  taxNumber: string | null;
  currency: string | null;
  paymentTermsDays: number | null;
  notes: string | null;
  remindersEnabled: boolean;
  fields: { label: string; value: string; showOnDocuments: boolean }[];
}

export function ClientForm({
  id,
  initial,
  defaultCountry,
  onSaved,
  compact,
}: {
  id: string | null;
  initial?: Partial<ClientFormValues>;
  defaultCountry: string;
  /** Called instead of navigating, when the form is used inside the invoice editor. */
  onSaved?: (id: string, name: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [fields, setFields] = useState(initial?.fields ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // A new client's form keeps one request key, so saving again after a lost answer makes one client.
  const [key] = useState(() => requestKey());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? '');
    const terms = text('paymentTermsDays').trim();
    const input = {
      ...(id ? {} : { idempotencyKey: key }),
      name: text('name'),
      contactName: text('contactName'),
      email: text('email'),
      phone: text('phone'),
      addressLine1: text('addressLine1'),
      addressLine2: text('addressLine2'),
      city: text('city'),
      region: text('region'),
      postcode: text('postcode'),
      countryCode: text('countryCode'),
      taxNumber: text('taxNumber'),
      currency: text('currency'),
      paymentTermsDays: terms === '' ? null : Number(terms),
      notes: text('notes'),
      remindersEnabled: compact ? (initial?.remindersEnabled ?? true) : f.get('remindersEnabled') === 'on',
      fields,
    };
    startTransition(async () => {
      const result = await reach(saveClientAction(id, input));
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      if (onSaved) onSaved(result.data.id, input.name.trim());
      else {
        router.push(`/clients/${result.data.id}`);
        router.refresh();
      }
    });
  }

  const v = (k: keyof ClientFormValues) => (initial?.[k] as string | null | undefined) ?? '';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {message ? <FormMessage>{message}</FormMessage> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client or company name" htmlFor="c-name" error={errors.name} className="sm:col-span-2">
          <Input
            id="c-name"
            name="name"
            defaultValue={v('name')}
            required
            aria-invalid={!!errors.name}
            autoFocus={compact}
          />
        </Field>
        <Field label="Contact person" htmlFor="c-contact" hint="Optional">
          <Input id="c-contact" name="contactName" defaultValue={v('contactName')} />
        </Field>
        <Field label="Email for invoices" htmlFor="c-email" error={errors.email}>
          <Input
            id="c-email"
            name="email"
            type="email"
            defaultValue={v('email')}
            aria-invalid={!!errors.email}
          />
        </Field>
      </div>
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-[15px] font-semibold">Address</legend>
        <Field label="Address line 1" htmlFor="c-a1" className="sm:col-span-2">
          <Input id="c-a1" name="addressLine1" defaultValue={v('addressLine1')} autoComplete="off" />
        </Field>
        <Field label="Address line 2" htmlFor="c-a2" className="sm:col-span-2">
          <Input id="c-a2" name="addressLine2" defaultValue={v('addressLine2')} autoComplete="off" />
        </Field>
        <Field label="Town or city" htmlFor="c-city">
          <Input id="c-city" name="city" defaultValue={v('city')} />
        </Field>
        <Field label="County, state or region" htmlFor="c-region">
          <Input id="c-region" name="region" defaultValue={v('region')} />
        </Field>
        <Field label="Postcode" htmlFor="c-postcode">
          <Input id="c-postcode" name="postcode" defaultValue={v('postcode')} />
        </Field>
        <Field label="Country" htmlFor="c-country">
          <Select id="c-country" name="countryCode" defaultValue={v('countryCode') || defaultCountry}>
            <option value="">Not set</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      {compact ? null : (
        <fieldset className="grid gap-5 sm:grid-cols-3">
          <legend className="mb-3 text-[15px] font-semibold">Billing</legend>
          <Field
            label="Currency"
            htmlFor="c-currency"
            hint="Leave as your main currency unless they pay in another."
          >
            <Select id="c-currency" name="currency" defaultValue={v('currency')}>
              <option value="">Your main currency</option>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}, {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Payment terms (days)"
            htmlFor="c-terms"
            error={errors.paymentTermsDays}
            hint="Blank uses your usual terms."
          >
            <Input
              id="c-terms"
              name="paymentTermsDays"
              inputMode="numeric"
              defaultValue={initial?.paymentTermsDays ?? ''}
            />
          </Field>
          <Field label="Their tax number" htmlFor="c-tax" hint="Optional">
            <Input id="c-tax" name="taxNumber" defaultValue={v('taxNumber')} />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="remindersEnabled"
              label="Send reminders to this client"
              hint="When reminders are on in Settings. Untick for clients who prefer a phone call."
              defaultChecked={initial?.remindersEnabled ?? true}
            />
          </div>
        </fieldset>
      )}
      {compact ? null : (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">Extra details on invoices</h3>
            <p className="text-[13px] text-muted">
              For a purchase order number, a cost centre or anything their accounts team asks for.
            </p>
          </div>
          {fields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <Field label="Label" htmlFor={`f-l-${i}`}>
                <Input
                  id={`f-l-${i}`}
                  value={field.label}
                  onChange={(e) =>
                    setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                />
              </Field>
              <Field label="Value" htmlFor={`f-v-${i}`}>
                <Input
                  id={`f-v-${i}`}
                  value={field.value}
                  onChange={(e) =>
                    setFields(fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                  }
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove ${field.label || 'detail'}`}
                onClick={() => setFields(fields.filter((_, j) => j !== i))}
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
            onClick={() => setFields([...fields, { label: '', value: '', showOnDocuments: true }])}
          >
            <Plus className="size-4" aria-hidden /> Add a detail
          </Button>
        </div>
      )}
      {compact ? null : (
        <Field label="Private notes" htmlFor="c-notes" hint="Only you see these.">
          <Textarea id="c-notes" name="notes" defaultValue={v('notes')} />
        </Field>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !ready}>
          {pending ? 'Saving' : id ? 'Save changes' : 'Save client'}
        </Button>
      </div>
    </form>
  );
}

export function ClientFormPanel(props: Parameters<typeof ClientForm>[0]) {
  return (
    <Panel className="p-5 sm:p-7">
      <ClientForm {...props} />
    </Panel>
  );
}
