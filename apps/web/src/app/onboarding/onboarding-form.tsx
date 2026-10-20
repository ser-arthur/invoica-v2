'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SUPPORTED_CURRENCIES } from '@invoica/core';
import { Button, Checkbox, Field, FormMessage, Input, Select } from '@/components/ui';
import { createOrganisationAction } from '@/lib/actions/onboarding';
import { COUNTRIES, TIME_ZONES } from '@/lib/countries';
import { reach } from '@/lib/reach';
import { useHydrated } from '@/lib/use-hydrated';

const BUSINESS_TYPES = [
  { value: 'sole_trader', label: 'Sole trader or freelancer' },
  { value: 'limited_company', label: 'Limited company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Something else' },
];

export function OnboardingForm() {
  const router = useRouter();
  const ready = useHydrated();
  const [country, setCountry] = useState<string>('GB');
  const preset = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];
  const [currency, setCurrency] = useState<string>(preset.currency);
  const [timeZone, setTimeZone] = useState<string>(preset.timeZone);
  const [registered, setRegistered] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function chooseCountry(code: string) {
    setCountry(code);
    const next = COUNTRIES.find((c) => c.code === code);
    if (next) {
      setCurrency(next.currency);
      setTimeZone(next.timeZone);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get('name') ?? ''),
      businessType: String(form.get('businessType') ?? 'sole_trader'),
      countryCode: country,
      baseCurrency: currency,
      timeZone,
      taxRegistered: registered,
      taxNumber: registered ? String(form.get('taxNumber') ?? '') : null,
    };
    startTransition(async () => {
      const result = await reach(createOrganisationAction(input));
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      router.push('/dashboard?welcome=1');
      router.refresh();
    });
  }

  const taxName = country === 'GB' || country === 'GH' || country === 'IE' ? 'VAT' : 'tax';

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6" noValidate>
      {message ? <FormMessage>{message}</FormMessage> : null}
      <Field
        label="Business name"
        htmlFor="name"
        error={errors.name}
        hint="As you want it to appear on your invoices."
      >
        <Input id="name" name="name" autoComplete="organization" required aria-invalid={!!errors.name} />
      </Field>
      <Field label="What kind of business is it?" htmlFor="businessType">
        <Select id="businessType" name="businessType" defaultValue="sole_trader">
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Country" htmlFor="country" error={errors.countryCode}>
          <Select id="country" value={country} onChange={(e) => chooseCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Main currency" htmlFor="currency" error={errors.baseCurrency}>
          <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}, {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Time zone" htmlFor="timeZone" hint="Due dates and overdue invoices follow this.">
        <Select id="timeZone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
          {[...new Set([timeZone, ...TIME_ZONES])].map((z) => (
            <option key={z} value={z}>
              {z.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-4">
        <Checkbox
          label={`I am registered for ${taxName}`}
          hint={`Leave this unticked if you do not charge ${taxName}. Your invoices will show no tax.`}
          checked={registered}
          onChange={(e) => setRegistered(e.target.checked)}
        />
        {registered ? (
          <Field
            label={`${taxName === 'VAT' ? 'VAT' : 'Tax'} registration number`}
            htmlFor="taxNumber"
            error={errors.taxNumber}
          >
            <Input id="taxNumber" name="taxNumber" autoComplete="off" />
          </Field>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending || !ready} className="self-start">
        {pending ? 'Setting up' : 'Continue to Invoica'}
      </Button>
    </form>
  );
}
