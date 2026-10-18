import type { Metadata } from 'next';
import { presetFor } from '@invoica/core';
import { listTaxCodes } from '@invoica/db';
import { SettingsForm, type ProfileValues } from '@/components/settings-form';
import { TaxCodes } from '@/components/tax-codes';
import { PageHeader } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { org, codes } = await inWorkspace(async (tx, ws) => ({
    org: ws.organisation,
    codes: await listTaxCodes(tx),
  }));
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
    rounding: org.rounding,
    defaultPaymentTermsDays: org.defaultPaymentTermsDays,
    invoicePrefix: org.invoicePrefix,
    creditNotePrefix: org.creditNotePrefix,
    numberPadding: org.numberPadding,
    brandColour: org.brandColour,
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
      <nav aria-label="Settings sections" className="mb-6 flex gap-1 overflow-x-auto text-[14px]">
        {[
          ['business', 'Business'],
          ['tax', 'Tax'],
          ['invoices', 'Invoices'],
          ['payment', 'Getting paid'],
          ['tax-codes', 'Tax codes'],
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
        <SettingsForm initial={initial} />
        <TaxCodes
          country={org.countryCode}
          presetAvailable={presetMissing}
          codes={codes.map((c) => ({
            id: c.id,
            label: c.label,
            treatment: c.treatment,
            components: c.components,
            isDefault: c.isDefault,
          }))}
        />
      </div>
    </div>
  );
}
