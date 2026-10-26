import type { Metadata } from 'next';
import { presetFor } from '@invoica/core';
import {
  listTaxCodes,
  peekNextSequence,
  profileVersionOf,
  taxCodeVersionOf,
  organisationEntitlements,
  organisationPlan,
  plansEnforced,
} from '@invoica/db';
import { SettingsForm, type ProfileValues } from '@/components/settings-form';
import { TaxCodes } from '@/components/tax-codes';
import { ReminderSettings } from '@/components/reminder-settings';
import { LogoUpload } from '@/components/logo-upload';
import { PageHeader, Panel, buttonClass } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';
import { countryName } from '@/lib/countries';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { org, codes, next } = await inWorkspace(async (tx, ws) => ({
    org: ws.organisation,
    codes: await listTaxCodes(tx),
    next: {
      invoice: await peekNextSequence(tx, 'invoice'),
      creditNote: await peekNextSequence(tx, 'credit_note'),
    },
  }));
  const now = new Date();
  const enforced = plansEnforced();
  const plan = organisationPlan(org, now);
  const brandNote = organisationEntitlements(org, now).ownBrand
    ? null
    : 'On the free plan, invoices use the Signature template in Invoica’s colour, without your logo, and say “Made with Invoica” at the foot. Your choices here are kept for when you upgrade.';
  const daysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
    : 0;
  const planLine = !enforced
    ? null
    : plan === 'trial'
      ? `Trial: ${daysLeft === 1 ? '1 day' : `${daysLeft} days`} left, with everything included. After it, the free plan keeps three active clients and the Signature template.`
      : plan === 'free'
        ? 'Free plan: up to three active clients, and invoices in the Signature template.'
        : null;
  const preset = presetFor(org.countryCode);
  const haveKeys = new Set(codes.map((c) => c.presetKey));
  const presetMissing = preset && preset.codes.some((c) => !haveKeys.has(c.key)) ? preset.name : null;
  const initial: ProfileValues = {
    name: org.name,
    legalName: org.legalName,
    businessType: org.businessType,
    companyNumber: org.companyNumber,
    email: org.email,
    phone: org.phone,
    website: org.website,
    addressLine1: org.addressLine1,
    addressLine2: org.addressLine2,
    city: org.city,
    region: org.region,
    postcode: org.postcode,
    countryCode: org.countryCode,
    baseCurrency: org.baseCurrency,
    timeZone: org.timeZone,
    taxRegistered: org.taxRegistered,
    taxNumber: org.taxNumber,
    pricesIncludeTax: org.pricesIncludeTax,
    taxLevel: org.taxLevel,
    sterlingRateMethod: org.sterlingRateMethod,
    rounding: org.rounding,
    defaultPaymentTermsDays: org.defaultPaymentTermsDays,
    invoicePrefix: org.invoicePrefix,
    creditNotePrefix: org.creditNotePrefix,
    numberPadding: org.numberPadding,
    brandColour: org.brandColour,
    accentColour: org.accentColour,
    logoGround: org.logoGround,
    defaultTemplate: org.defaultTemplate,
    paymentDetails: org.paymentDetails,
    defaultNotes: org.defaultNotes,
    defaultTerms: org.defaultTerms,
  };
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your business details, taxes and how invoices look. Issued invoices are never changed by these."
      />
      {planLine ? (
        <p className="-mt-2 mb-6 rounded-[12px] bg-brand-soft px-4 py-3 text-[14px] text-ink">{planLine}</p>
      ) : null}
      <nav aria-label="Settings sections" className="mb-6 flex gap-1 overflow-x-auto text-[14px]">
        {[
          ['logo', 'Logo'],
          ['business', 'Business'],
          ['tax', 'Tax'],
          ['invoices', 'Invoices'],
          ['payment', 'Getting paid'],
          ['tax-codes', 'Tax codes'],
          ['reminders', 'Reminders'],
          ['data', 'Your data'],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-6">
        <LogoUpload logoUrl={org.logoFileId ? `/files/${org.logoFileId}` : null} name={org.name} />
        <SettingsForm
          initial={initial}
          version={profileVersionOf(org)}
          logoUrl={org.logoFileId ? `/files/${org.logoFileId}` : null}
          brandNote={brandNote}
          next={next}
        />
        <TaxCodes
          country={org.countryCode}
          presetAvailable={presetMissing}
          noStandardRates={preset ? null : countryName(org.countryCode)}
          codes={codes.map((c) => ({
            id: c.id,
            label: c.label,
            treatment: c.treatment,
            components: c.components,
            isDefault: c.isDefault,
            version: taxCodeVersionOf(c),
          }))}
        />
        <ReminderSettings
          initial={{
            remindersEnabled: org.remindersEnabled,
            reminderOffsets: org.reminderOffsets,
            reminderWording: org.reminderWording,
          }}
          inPlan={organisationEntitlements(org, new Date()).reminders}
        />
        <Panel id="data" className="scroll-mt-24">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_1fr]">
            <div>
              <h2 className="text-[16px] font-semibold">Your data</h2>
              <p className="mt-1 text-[14px] text-muted">
                Download everything Invoica holds for {org.name}. Issued invoices are exported as issued.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 self-start">
              <a className={buttonClass('secondary')} download href="/settings/export?format=json">
                Everything (JSON)
              </a>
              <a
                className={buttonClass('secondary')}
                download
                href="/settings/export?format=csv&type=invoices"
              >
                Invoices (CSV)
              </a>
              <a
                className={buttonClass('secondary')}
                download
                href="/settings/export?format=csv&type=payments"
              >
                Payments (CSV)
              </a>
              <a
                className={buttonClass('secondary')}
                download
                href="/settings/export?format=csv&type=clients"
              >
                Clients (CSV)
              </a>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
