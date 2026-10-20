'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@invoica/core';
import { saveClientAction } from '@/lib/actions/clients';
import { COUNTRIES } from '@/lib/countries';
import { Button, Checkbox, Field, FormMessage, Input, Panel, Select, Textarea } from './ui';
import { followUntouched } from '@/lib/follow-untouched';
import { reach } from '@/lib/reach';
import { LeaveDialog, useLeaveGuard } from './leave-guard';
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

/** What the form edits, as it holds it: text as typed, an empty field as ''. */
interface FormValues {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postcode: string;
  countryCode: string;
  taxNumber: string;
  currency: string;
  paymentTermsDays: string;
  notes: string;
  remindersEnabled: boolean;
  fields: ClientFormValues['fields'];
}

type TextKey = Exclude<keyof FormValues, 'remindersEnabled' | 'fields'>;

function valuesOf(initial: Partial<ClientFormValues> | undefined, defaultCountry: string): FormValues {
  const t = (k: keyof ClientFormValues) => (initial?.[k] as string | null | undefined) ?? '';
  return {
    name: t('name'),
    contactName: t('contactName'),
    email: t('email'),
    phone: t('phone'),
    addressLine1: t('addressLine1'),
    addressLine2: t('addressLine2'),
    city: t('city'),
    region: t('region'),
    postcode: t('postcode'),
    countryCode: t('countryCode') || defaultCountry,
    taxNumber: t('taxNumber'),
    currency: t('currency'),
    paymentTermsDays: initial?.paymentTermsDays?.toString() ?? '',
    notes: t('notes'),
    remindersEnabled: initial?.remindersEnabled ?? true,
    fields: initial?.fields ?? [],
  };
}

export function ClientForm({
  id,
  version: shown,
  initial,
  defaultCountry,
  onSaved,
  compact,
}: {
  id: string | null;
  /** The version of the client this page shows (docs/specs/changes-elsewhere.md); none for a new client. */
  version?: string;
  initial?: Partial<ClientFormValues>;
  defaultCountry: string;
  /** Called instead of navigating, when the form is used inside the invoice editor. */
  onSaved?: (id: string, name: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const ready = useHydrated();
  // What the form shows, held here so a change made elsewhere can be shown in the fields not typed in.
  const [v, setV] = useState(() => valuesOf(initial, defaultCountry));
  // The client as the page last had it from the server. When it changes (fetched again after a refusal), each
  // field not changed here takes the new value, and what was typed stays (docs/specs/changes-elsewhere.md, rule 8).
  const [loaded, setLoaded] = useState(initial);
  if (initial !== loaded) {
    setLoaded(initial);
    setV(followUntouched(valuesOf(loaded, defaultCountry), v, valuesOf(initial, defaultCountry)));
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // A new client's form keeps one request key, so saving again after a lost answer makes one client.
  const [key] = useState(() => requestKey());
  // Refused because the client changed elsewhere: "Save mine anyway" saves against the version fetched since.
  const [conflict, setConflict] = useState(false);
  const replacing = useRef(false);
  // Typed in since the page opened: leaving it asks first.
  const [dirty, setDirty] = useState(false);
  const change = <K extends keyof FormValues>(k: K, value: FormValues[K]) => {
    setDirty(true);
    setV((prev) => ({ ...prev, [k]: value }));
  };
  const fields = v.fields;
  const setFields = (next: FormValues['fields']) => change('fields', next);
  const text = (k: TextKey) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      change(k, e.target.value),
  });
  const guard = useLeaveGuard(dirty && !compact);
  // The version this form opened with; a successful save leaves the page.
  const [initialVersion] = useState(shown);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const terms = v.paymentTermsDays.trim();
    const input = {
      ...(id ? {} : { idempotencyKey: key }),
      name: v.name,
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      addressLine1: v.addressLine1,
      addressLine2: v.addressLine2,
      city: v.city,
      region: v.region,
      postcode: v.postcode,
      countryCode: v.countryCode,
      taxNumber: v.taxNumber,
      currency: v.currency,
      paymentTermsDays: terms === '' ? null : Number(terms),
      notes: v.notes,
      remindersEnabled: v.remindersEnabled,
      fields,
    };
    const replace = replacing.current;
    replacing.current = false;
    startTransition(async () => {
      const result = await reach(saveClientAction(id, input, replace ? shown : initialVersion));
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        if (result.code === 'client_changed') {
          setConflict(true);
          // The page's version is fetched again, for "Save mine anyway"; what was typed stays.
          router.refresh();
        }
        return;
      }
      setDirty(false);
      if (onSaved) onSaved(result.data.id, input.name.trim());
      else {
        router.push(`/clients/${result.data.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <LeaveDialog guard={guard} />
      {message ? <FormMessage>{message}</FormMessage> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client or company name" htmlFor="c-name" error={errors.name} className="sm:col-span-2">
          <Input
            id="c-name"
            name="name"
            {...text('name')}
            required
            aria-invalid={!!errors.name}
            autoFocus={compact}
          />
        </Field>
        <Field label="Contact person" htmlFor="c-contact" hint="Optional">
          <Input id="c-contact" name="contactName" {...text('contactName')} />
        </Field>
        <Field label="Email for invoices" htmlFor="c-email" error={errors.email}>
          <Input id="c-email" name="email" type="email" {...text('email')} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-[15px] font-semibold">Address</legend>
        <Field label="Address line 1" htmlFor="c-a1" className="sm:col-span-2">
          <Input id="c-a1" name="addressLine1" {...text('addressLine1')} autoComplete="off" />
        </Field>
        <Field label="Address line 2" htmlFor="c-a2" className="sm:col-span-2">
          <Input id="c-a2" name="addressLine2" {...text('addressLine2')} autoComplete="off" />
        </Field>
        <Field label="Town or city" htmlFor="c-city">
          <Input id="c-city" name="city" {...text('city')} />
        </Field>
        <Field label="County, state or region" htmlFor="c-region">
          <Input id="c-region" name="region" {...text('region')} />
        </Field>
        <Field label="Postcode" htmlFor="c-postcode">
          <Input id="c-postcode" name="postcode" {...text('postcode')} />
        </Field>
        <Field label="Country" htmlFor="c-country">
          <Select id="c-country" name="countryCode" {...text('countryCode')}>
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
            <Select id="c-currency" name="currency" {...text('currency')}>
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
            <Input id="c-terms" name="paymentTermsDays" inputMode="numeric" {...text('paymentTermsDays')} />
          </Field>
          <Field label="Their tax number" htmlFor="c-tax" hint="Optional">
            <Input id="c-tax" name="taxNumber" {...text('taxNumber')} />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="remindersEnabled"
              label="Send reminders to this client"
              hint="When reminders are on in Settings. Untick for clients who prefer a phone call."
              checked={v.remindersEnabled}
              onChange={(e) => change('remindersEnabled', e.target.checked)}
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
          <Textarea id="c-notes" name="notes" {...text('notes')} />
        </Field>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !ready}>
          {pending ? 'Saving' : id ? 'Save changes' : 'Save client'}
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
