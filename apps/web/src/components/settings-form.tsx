'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { SUPPORTED_CURRENCIES, allowedRounding, type RoundingChoice } from '@invoica/core';
import { saveProfileAction } from '@/lib/actions/settings';
import { COUNTRIES, TIME_ZONES } from '@/lib/countries';
import { Button, Checkbox, Field, FormMessage, Input, Panel, Select, Textarea } from './ui';
import type { DocumentSnapshot } from '@invoica/core';
import { TemplatePicker } from './template-picker';
import { LeaveDialog, useLeaveGuard } from './leave-guard';
import { followUntouched } from '@/lib/follow-untouched';
import { reach } from '@/lib/reach';
import { useHydrated } from '@/lib/use-hydrated';

export interface ProfileValues {
  name: string;
  legalName: string | null;
  businessType: string;
  companyNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  countryCode: string;
  baseCurrency: string;
  timeZone: string;
  taxRegistered: boolean;
  taxNumber: string | null;
  pricesIncludeTax: boolean;
  taxLevel: 'document' | 'line';
  rounding: 'half-up' | 'half-even' | 'down';
  sterlingRateMethod: 'hmrc_period' | 'market';
  defaultPaymentTermsDays: number;
  invoicePrefix: string;
  creditNotePrefix: string;
  numberPadding: number;
  brandColour: string;
  defaultTemplate: string;
  paymentDetails: {
    bank?: {
      accountName?: string | null;
      bankName?: string | null;
      sortCode?: string | null;
      accountNumber?: string | null;
      iban?: string | null;
      swift?: string | null;
    };
    mobileMoney?: { provider?: string | null; number?: string | null; accountName?: string | null };
    paymentLink?: string | null;
  };
  defaultNotes: string | null;
  defaultTerms: string | null;
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Panel id={id} className="scroll-mt-24">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <p className="mt-1 text-[14px] text-muted">{description}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">{children}</div>
      </div>
    </Panel>
  );
}

/** How a rounding choice reads in Settings, for the country it is offered in. */
function describeRounding(choice: RoundingChoice, country: string): { label: string; hint: string } {
  const unit = country === 'GB' ? 'penny' : 'unit';
  const key = `${choice.taxLevel}:${choice.rounding}`;
  switch (key) {
    case 'line:half-up':
      return {
        label: `Per line, to the nearest ${unit}`,
        hint:
          country === 'GB'
            ? 'HMRC allows this for every business. The usual choice.'
            : 'Each line is taxed and rounded on its own.',
      };
    case 'document:down':
      return {
        label: 'On the invoice total, rounded down',
        hint:
          country === 'GB'
            ? 'HMRC allows this for invoice traders, not retailers.'
            : 'Tax is worked out on the total and rounded down once.',
      };
    case 'document:half-up':
      return {
        label: `On the invoice total, to the nearest ${unit}`,
        hint:
          country === 'GH'
            ? 'Each tax is worked out once on the total. The usual choice in Ghana.'
            : 'Tax is worked out on the total and rounded once.',
      };
    case 'line:half-even':
      return {
        label: 'Per line, ties to the nearest even unit',
        hint: 'Each line is rounded on its own; a tie goes to the even unit.',
      };
    case 'document:half-even':
      return {
        label: 'On the invoice total, ties to the nearest even unit',
        hint: 'Rounded once on the total; a tie goes to the even unit.',
      };
    default:
      return { label: 'Per line, rounded down', hint: 'Each line is taxed and rounded down on its own.' };
  }
}

export function SettingsForm({
  initial,
  version: shown,
  logoUrl,
  brandNote = null,
  next = { invoice: 1, creditNote: 1 },
}: {
  initial: ProfileValues;
  /** The version of the settings this page shows (docs/specs/changes-elsewhere.md). */
  version: string;
  logoUrl: string | null;
  /** Shown beside the template and colour when the plan keeps documents in Invoica's own look. */
  brandNote?: string | null;
  /** The sequences the next invoice and credit note will get. */
  next?: { invoice: number; creditNote: number };
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [v, setV] = useState(initial);
  // The settings as the page last had them from the server. When they change (fetched again after a refusal, or
  // after a save), each field not changed here takes the new value, and what was typed stays.
  const [loaded, setLoaded] = useState(initial);
  if (initial !== loaded) {
    setLoaded(initial);
    setV(followUntouched(loaded, v, initial));
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'danger' | 'info'; text: string } | null>(null);
  const [pending, start] = useTransition();
  // The version each save is made against: the one shown, then the one each save answers with.
  const [version, setVersion] = useState(shown);
  // Refused because the settings changed elsewhere: "Save mine anyway" saves against the version fetched since.
  const [conflict, setConflict] = useState(false);

  // Changed here since the last save: leaving the page asks first.
  const [dirty, setDirty] = useState(false);
  const guard = useLeaveGuard(dirty);
  // Counts changes, so a save answered after more typing leaves that typing marked as not saved.
  const changes = useRef(0);
  const change = (update: (prev: ProfileValues) => ProfileValues) => {
    changes.current += 1;
    setDirty(true);
    setV(update);
  };

  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    change((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof ProfileValues) => ({
    value: (v[key] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as never),
    'aria-invalid': !!errors[key as string],
  });
  const bank = v.paymentDetails.bank ?? {};
  const mm = v.paymentDetails.mobileMoney ?? {};
  const setBank = (k: keyof NonNullable<ProfileValues['paymentDetails']['bank']>, value: string) =>
    set('paymentDetails', { ...v.paymentDetails, bank: { ...bank, [k]: value } });
  const setMm = (k: keyof NonNullable<ProfileValues['paymentDetails']['mobileMoney']>, value: string) =>
    set('paymentDetails', { ...v.paymentDetails, mobileMoney: { ...mm, [k]: value } });
  const taxWord = v.countryCode === 'GB' || v.countryCode === 'GH' || v.countryCode === 'IE' ? 'VAT' : 'tax';
  const previewSeller: DocumentSnapshot['seller'] = useMemo(
    () => ({
      name: v.name || 'Your business',
      legalName: v.legalName,
      businessType: v.businessType,
      companyNumber: v.companyNumber,
      email: v.email,
      phone: v.phone,
      website: v.website,
      address: {
        line1: v.addressLine1,
        line2: v.addressLine2,
        city: v.city,
        region: v.region,
        postcode: v.postcode,
        countryCode: v.countryCode,
      },
      taxRegistered: v.taxRegistered,
      taxNumber: v.taxNumber,
      brandColour: /^#[0-9a-fA-F]{6}$/.test(v.brandColour) ? v.brandColour : '#17795a',
      logoFileId: null,
    }),
    [v],
  );

  const roundingChoices = allowedRounding(v.countryCode);
  const rounding =
    roundingChoices.find((c) => c.taxLevel === v.taxLevel && c.rounding === v.rounding) ??
    roundingChoices[0]!;

  function save(replace: boolean) {
    setMessage(null);
    const changesAtSave = changes.current;
    start(async () => {
      // A choice not offered for the country (after the country changed) becomes the country's usual one.
      const r = await reach(
        saveProfileAction(
          { ...v, taxLevel: rounding.taxLevel, rounding: rounding.rounding },
          replace ? shown : version,
        ),
      );
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setMessage({ tone: 'danger', text: r.message });
        if (r.code === 'settings_changed') {
          setConflict(true);
          // The page's version is fetched again, for "Save mine anyway"; what was typed stays.
          router.refresh();
        }
        return;
      }
      setErrors({});
      setConflict(false);
      if (changes.current === changesAtSave) setDirty(false);
      setVersion(r.data.version);
      setMessage({
        tone: 'info',
        text: 'Settings saved. New invoices use them; issued invoices keep what they were issued with.',
      });
      router.refresh();
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <Section
        id="business"
        title="Business"
        description="Who your invoices are from. Limited companies show their registered name and number."
      >
        <Field label="Trading name" htmlFor="s-name" error={errors.name}>
          <Input id="s-name" {...text('name')} />
        </Field>
        <Field label="Registered or legal name" htmlFor="s-legal" hint="If different from your trading name.">
          <Input id="s-legal" {...text('legalName')} />
        </Field>
        <Field label="Kind of business" htmlFor="s-type">
          <Select id="s-type" {...text('businessType')}>
            <option value="sole_trader">Sole trader or freelancer</option>
            <option value="limited_company">Limited company</option>
            <option value="partnership">Partnership</option>
            <option value="other">Something else</option>
          </Select>
        </Field>
        <Field
          label="Company number"
          htmlFor="s-company"
          hint={v.businessType === 'limited_company' ? 'Printed on your invoices.' : 'Optional'}
        >
          <Input id="s-company" {...text('companyNumber')} />
        </Field>
        <Field label="Email" htmlFor="s-email" error={errors.email}>
          <Input id="s-email" type="email" {...text('email')} />
        </Field>
        <Field label="Phone" htmlFor="s-phone">
          <Input id="s-phone" type="tel" {...text('phone')} />
        </Field>
        <Field label="Website" htmlFor="s-web" className="sm:col-span-2">
          <Input id="s-web" {...text('website')} />
        </Field>
        <Field label="Address line 1" htmlFor="s-a1" className="sm:col-span-2">
          <Input id="s-a1" {...text('addressLine1')} />
        </Field>
        <Field label="Address line 2" htmlFor="s-a2" className="sm:col-span-2">
          <Input id="s-a2" {...text('addressLine2')} />
        </Field>
        <Field label="Town or city" htmlFor="s-city">
          <Input id="s-city" {...text('city')} />
        </Field>
        <Field label="County, state or region" htmlFor="s-region">
          <Input id="s-region" {...text('region')} />
        </Field>
        <Field label="Postcode" htmlFor="s-post">
          <Input id="s-post" {...text('postcode')} />
        </Field>
        <Field label="Country" htmlFor="s-country">
          <Select id="s-country" {...text('countryCode')}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Main currency"
          htmlFor="s-cur"
          hint="Dashboard totals and saved items are in this currency. Changing it keeps each item's price as the same figure."
        >
          <Select id="s-cur" {...text('baseCurrency')}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}, {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time zone" htmlFor="s-tz">
          <Select id="s-tz" {...text('timeZone')}>
            {[...new Set([v.timeZone, ...TIME_ZONES])].map((z) => (
              <option key={z} value={z}>
                {z.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section
        id="tax"
        title={taxWord === 'VAT' ? 'VAT' : 'Tax'}
        description="Whether you charge tax and how it is worked out. Your tax codes are listed below this form."
      >
        <div className="sm:col-span-2">
          <Checkbox
            label={`Registered for ${taxWord}`}
            hint={`Unticked: your invoices show no ${taxWord} and no ${taxWord} number.`}
            checked={v.taxRegistered}
            onChange={(e) => set('taxRegistered', e.target.checked)}
          />
        </div>
        {v.taxRegistered ? (
          <Field
            label={`${taxWord === 'VAT' ? 'VAT' : 'Tax'} registration number`}
            htmlFor="s-taxno"
            error={errors.taxNumber}
          >
            <Input id="s-taxno" {...text('taxNumber')} />
          </Field>
        ) : null}
        {v.taxRegistered ? (
          <Field
            label="How tax is rounded"
            htmlFor="s-round"
            hint={describeRounding(rounding, v.countryCode).hint}
          >
            <Select
              id="s-round"
              value={`${rounding.taxLevel}:${rounding.rounding}`}
              onChange={(e) => {
                const [level, mode] = e.target.value.split(':') as [
                  ProfileValues['taxLevel'],
                  ProfileValues['rounding'],
                ];
                change((p) => ({ ...p, taxLevel: level, rounding: mode }));
              }}
            >
              {roundingChoices.map((c) => (
                <option key={`${c.taxLevel}:${c.rounding}`} value={`${c.taxLevel}:${c.rounding}`}>
                  {describeRounding(c, v.countryCode).label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {v.taxRegistered ? (
          <div className="sm:col-span-2">
            <Checkbox
              label="My prices include tax"
              hint="Tax is worked out of the prices you enter. Leave unticked to add tax on top."
              checked={v.pricesIncludeTax}
              onChange={(e) => set('pricesIncludeTax', e.target.checked)}
            />
          </div>
        ) : null}
        {v.taxRegistered && v.countryCode === 'GB' ? (
          <Field
            label="VAT on invoices in other currencies"
            htmlFor="s-sterling"
            hint="The VAT is also shown in pounds, converted at this rate. Use the same one for every invoice."
          >
            <Select
              id="s-sterling"
              value={v.sterlingRateMethod}
              onChange={(e) =>
                set('sterlingRateMethod', e.target.value as ProfileValues['sterlingRateMethod'])
              }
            >
              <option value="hmrc_period">HMRC period rate for the month</option>
              <option value="market">UK market selling rate on the day</option>
            </Select>
          </Field>
        ) : null}
      </Section>

      <Section
        id="invoices"
        title="Invoices"
        description="Numbering, terms and the look new invoices start with."
      >
        <Field
          label="Invoice number prefix"
          htmlFor="s-ip"
          error={errors.invoicePrefix}
          hint={`The next invoice will be ${v.invoicePrefix}${String(next.invoice).padStart(v.numberPadding, '0')}.`}
        >
          <Input id="s-ip" {...text('invoicePrefix')} />
        </Field>
        <Field
          label="Credit note prefix"
          htmlFor="s-cp"
          error={errors.creditNotePrefix}
          hint={`The next credit note will be ${v.creditNotePrefix}${String(next.creditNote).padStart(v.numberPadding, '0')}.`}
        >
          <Input id="s-cp" {...text('creditNotePrefix')} />
        </Field>
        <Field label="Digits in the number" htmlFor="s-pad">
          <Select
            id="s-pad"
            value={String(v.numberPadding)}
            onChange={(e) => set('numberPadding', Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} ({'1'.padStart(n, '0')})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment due after (days)" htmlFor="s-terms" error={errors.defaultPaymentTermsDays}>
          <Input
            id="s-terms"
            inputMode="numeric"
            value={String(v.defaultPaymentTermsDays)}
            onChange={(e) => set('defaultPaymentTermsDays', Number(e.target.value.replace(/\D/g, '') || 0))}
          />
        </Field>
        {brandNote ? (
          <p className="text-[14px] text-muted sm:col-span-2" role="note">
            {brandNote}
          </p>
        ) : null}
        <TemplatePicker
          value={v.defaultTemplate}
          onChange={(id) => set('defaultTemplate', id)}
          seller={previewSeller}
          logoUrl={logoUrl}
        />
        <Field
          label="Brand colour"
          htmlFor="s-colour"
          error={errors.brandColour}
          hint="Used for accents on your invoices."
        >
          <div className="flex items-center gap-3">
            <input
              id="s-colour"
              type="color"
              value={v.brandColour}
              onChange={(e) => set('brandColour', e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-[10px] border border-line-strong bg-surface p-1"
            />
            <Input
              aria-label="Brand colour code"
              value={v.brandColour}
              onChange={(e) => set('brandColour', e.target.value)}
              className="max-w-32"
            />
          </div>
        </Field>
        <Field
          label="Note to clients"
          htmlFor="s-notes"
          hint="Printed on every new invoice. You can change it on each one."
          className="sm:col-span-2"
        >
          <Textarea id="s-notes" {...text('defaultNotes')} />
        </Field>
        <Field label="Terms" htmlFor="s-tc" hint="For example late payment terms." className="sm:col-span-2">
          <Textarea id="s-tc" {...text('defaultTerms')} />
        </Field>
      </Section>

      <Section
        id="payment"
        title="Getting paid"
        description="How clients pay you. Each invoice can show or hide these."
      >
        <Field label="Account name" htmlFor="s-bn">
          <Input
            id="s-bn"
            value={bank.accountName ?? ''}
            onChange={(e) => setBank('accountName', e.target.value)}
          />
        </Field>
        <Field label="Bank" htmlFor="s-bank">
          <Input
            id="s-bank"
            value={bank.bankName ?? ''}
            onChange={(e) => setBank('bankName', e.target.value)}
          />
        </Field>
        <Field label="Sort code" htmlFor="s-sc">
          <Input
            id="s-sc"
            value={bank.sortCode ?? ''}
            onChange={(e) => setBank('sortCode', e.target.value)}
          />
        </Field>
        <Field label="Account number" htmlFor="s-an">
          <Input
            id="s-an"
            value={bank.accountNumber ?? ''}
            onChange={(e) => setBank('accountNumber', e.target.value)}
          />
        </Field>
        <Field label="IBAN" htmlFor="s-iban" hint="For payments from abroad.">
          <Input id="s-iban" value={bank.iban ?? ''} onChange={(e) => setBank('iban', e.target.value)} />
        </Field>
        <Field label="SWIFT or BIC" htmlFor="s-swift">
          <Input id="s-swift" value={bank.swift ?? ''} onChange={(e) => setBank('swift', e.target.value)} />
        </Field>
        <Field label="Mobile money provider" htmlFor="s-mmp" hint="For example MTN MoMo or Vodafone Cash.">
          <Input id="s-mmp" value={mm.provider ?? ''} onChange={(e) => setMm('provider', e.target.value)} />
        </Field>
        <Field label="Mobile money number" htmlFor="s-mmn">
          <Input id="s-mmn" value={mm.number ?? ''} onChange={(e) => setMm('number', e.target.value)} />
        </Field>
        <Field label="Name on the mobile money account" htmlFor="s-mma">
          <Input
            id="s-mma"
            value={mm.accountName ?? ''}
            onChange={(e) => setMm('accountName', e.target.value)}
          />
        </Field>
        <Field
          label="Payment link"
          htmlFor="s-link"
          hint="A page where clients can pay by card, if you have one."
        >
          <Input
            id="s-link"
            value={v.paymentDetails.paymentLink ?? ''}
            onChange={(e) => set('paymentDetails', { ...v.paymentDetails, paymentLink: e.target.value })}
          />
        </Field>
      </Section>

      <LeaveDialog guard={guard} />
      <div className="sticky bottom-20 z-20 flex flex-col items-end gap-2 md:bottom-4">
        {message ? (
          <div className="w-full max-w-xl shadow-lift">
            <FormMessage tone={message.tone}>{message.text}</FormMessage>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" size="lg" disabled={pending || !ready} className="shadow-lift">
            {pending ? 'Saving' : 'Save settings'}
          </Button>
          {conflict ? (
            <Button
              type="button"
              size="lg"
              variant="danger"
              disabled={pending}
              className="shadow-lift"
              onClick={() => save(true)}
            >
              Save mine anyway
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
