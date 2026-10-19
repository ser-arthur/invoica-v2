import { computeDocument, type DocumentSnapshot, type LineStyle, type TaxCode } from '@invoica/core';

const VAT20: TaxCode = {
  label: 'Standard rate',
  treatment: 'standard',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};
const GH: TaxCode = {
  label: 'Standard rate',
  treatment: 'standard',
  components: [
    { name: 'NHIL', ratePpm: 25_000, compound: false },
    { name: 'GETFund Levy', ratePpm: 25_000, compound: false },
    { name: 'VAT', ratePpm: 150_000, compound: false },
  ],
};

export interface LineSpec {
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  serviceDate?: string;
  tax?: TaxCode | null;
}

export function snapshot(o: {
  number: string;
  currency: string;
  lineStyle: LineStyle;
  template: string;
  seller: Partial<DocumentSnapshot['seller']> & { name: string };
  buyer: Partial<DocumentSnapshot['buyer']> & { name: string };
  lines: LineSpec[];
  title?: string;
  summary?: string;
  discounts?: Parameters<typeof computeDocument>[0]['discounts'];
  deposit?: number;
  notes?: string;
  terms?: string;
  taxLevel?: 'document' | 'line';
}): DocumentSnapshot {
  const totals = computeDocument({
    currency: o.currency,
    pricesIncludeTax: false,
    taxLevel: o.taxLevel ?? 'line',
    rounding: 'half-up',
    lines: o.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, tax: l.tax ?? null })),
    discounts: o.discounts,
    paid: o.deposit ?? 0,
  });
  return {
    version: 1,
    kind: 'invoice',
    number: o.number,
    issueDate: '2026-10-18',
    dueDate: '2026-11-17',
    supplyDate: '2026-10-16',
    servicePeriod: null,
    reference: 'PO-4471',
    title: o.title ?? null,
    summary: o.summary ?? null,
    currency: o.currency,
    locale: 'en-GB',
    lineStyle: o.lineStyle,
    pricesIncludeTax: false,
    taxLevel: o.taxLevel ?? 'line',
    rounding: 'half-up',
    seller: {
      legalName: null,
      businessType: 'sole_trader',
      companyNumber: null,
      email: 'hello@example.com',
      phone: null,
      website: null,
      address: {
        line1: '12 Example Yard',
        line2: null,
        city: 'Bristol',
        region: null,
        postcode: 'BS1 4XX',
        countryCode: 'GB',
      },
      taxRegistered: false,
      taxNumber: null,
      brandColour: '#17795a',
      logoFileId: null,
      ...o.seller,
    },
    buyer: {
      contactName: null,
      email: null,
      address: {
        line1: '1 Sample Street',
        line2: null,
        city: 'Leeds',
        region: null,
        postcode: 'LS1 1AA',
        countryCode: 'GB',
      },
      taxNumber: null,
      fields: [],
      ...o.buyer,
    },
    lines: o.lines.map((l, i) => ({
      title: l.title,
      description: l.description ?? null,
      quantity: l.quantity,
      unit: l.unit ?? null,
      unitPrice: l.unitPrice,
      serviceDate: l.serviceDate ?? null,
      tax: l.tax ?? null,
      amount: totals.lines[i]!.amount,
      discount: totals.lines[i]!.discount,
      net: totals.lines[i]!.net,
      taxAmount: totals.lines[i]!.tax,
    })),
    totals,
    paymentsShown: o.deposit ? [{ label: 'Deposit received', amount: o.deposit, paidOn: '2026-09-20' }] : [],
    balanceDue: totals.balance,
    notes: o.notes ?? null,
    terms: o.terms ?? null,
    template: o.template,
    payment: {
      bank: {
        accountName: o.seller.name,
        bankName: 'Example Bank',
        sortCode: '00-00-00',
        accountNumber: '00000000',
        iban: null,
        swift: null,
      },
      mobileMoney: null,
      paymentLink: null,
    },
    credits: null,
  };
}

export const FIXTURES: Record<string, DocumentSnapshot> = {
  ukVat: snapshot({
    number: 'INV-0042',
    currency: 'GBP',
    lineStyle: 'quantity',
    template: 'signature',
    seller: {
      name: 'Harrow & Vale',
      legalName: 'Harrow and Vale Consulting Ltd',
      businessType: 'limited_company',
      companyNumber: '00000000',
      taxRegistered: true,
      taxNumber: 'GB 000 0000 00',
      brandColour: '#1d3c5a',
    },
    buyer: {
      name: 'Northlane Logistics Ltd',
      contactName: 'Accounts payable',
      fields: [{ label: 'Cost centre', value: 'OPS-12' }],
    },
    title: 'Operations review, phase one',
    summary:
      'Review of warehouse operations across two sites, with findings and a plan for the next quarter.',
    lines: [
      {
        title: 'Site visits',
        description: 'Two days on site at each warehouse',
        quantity: 4000,
        unitPrice: 65_000,
        unit: 'days',
        tax: VAT20,
      },
      { title: 'Process mapping workshop', quantity: 1000, unitPrice: 120_000, tax: VAT20 },
      {
        title: 'Findings report',
        description: 'Written report and presentation to the board',
        quantity: 1000,
        unitPrice: 180_000,
        tax: VAT20,
      },
    ],
    deposit: 150_000,
    terms:
      'Payment within 30 days. Late payments may incur interest under the Late Payment of Commercial Debts (Interest) Act 1998.',
  }),
  freelancerAmounts: snapshot({
    number: '2026-007',
    currency: 'GBP',
    lineStyle: 'amount',
    template: 'studio',
    seller: { name: 'Field Office', brandColour: '#e8590c' },
    buyer: { name: 'Mara Linden Ceramics' },
    title: 'Website for the spring collection',
    summary: 'Design and build of a new shop site, from first sketches to launch.',
    lines: [
      {
        title: 'Discovery and moodboard',
        description: 'Two calls, references and a written brief',
        quantity: 1000,
        unitPrice: 45_000,
      },
      { title: 'Design of six page templates', quantity: 1000, unitPrice: 120_000 },
      {
        title: 'Build and content entry',
        description: 'Shop, about, journal and stockists pages',
        quantity: 1000,
        unitPrice: 160_000,
      },
      { title: 'Launch support', quantity: 1000, unitPrice: 25_000 },
    ],
    discounts: [{ label: 'Returning client', kind: 'percent', ratePpm: 50_000 }],
    notes: 'Thank you for trusting me with this one.',
  }),
  ghana: snapshot({
    number: 'INV-0108',
    currency: 'GHS',
    lineStyle: 'quantity',
    template: 'counsel',
    taxLevel: 'document',
    seller: {
      name: 'Asante Building Supplies',
      taxRegistered: true,
      taxNumber: 'C0000000000',
      brandColour: '#7a2e1d',
      address: {
        line1: 'Plot 4, Example Road',
        line2: null,
        city: 'Kumasi',
        region: 'Ashanti',
        postcode: null,
        countryCode: 'GH',
      },
    },
    buyer: {
      name: 'Osei Homes Ltd',
      address: {
        line1: '9 Sample Close',
        line2: null,
        city: 'Accra',
        region: null,
        postcode: null,
        countryCode: 'GH',
      },
    },
    lines: [
      { title: 'Cement, 50 kg bags', quantity: 120_000, unitPrice: 9_850, unit: 'bags', tax: GH },
      { title: 'Iron rods, 12 mm', quantity: 80_000, unitPrice: 14_200, unit: 'lengths', tax: GH },
      { title: 'Delivery to site', quantity: 1000, unitPrice: 60_000, tax: GH },
    ],
  }),
  long: snapshot({
    number: 'INV-0311',
    currency: 'GBP',
    lineStyle: 'dated',
    template: 'signature',
    seller: { name: 'Ridgeway Labs', brandColour: '#4338ca' },
    buyer: { name: 'A client with a very long registered company name that wraps onto two lines Ltd' },
    lines: Array.from({ length: 34 }, (_, i) => ({
      title: ['API work', 'Code review', 'Pairing session', 'Deployment and monitoring'][i % 4]!,
      description:
        i % 5 === 0
          ? 'Including a long note about what was done this day, which runs on to a second line in the description column.'
          : undefined,
      quantity: [7500, 3000, 1500, 6000][i % 4]!,
      unitPrice: 8_500,
      serviceDate: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
    })),
  }),
};
