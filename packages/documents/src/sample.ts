import { assembleSnapshot, computeDocument, type DocumentSnapshot, type TaxCode } from '@invoica/core';

const VAT20: TaxCode = {
  label: 'Standard rate',
  treatment: 'standard',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};

/**
 * An invented invoice for showing templates in Settings, with the business's own details. The client and the bank look
 * real and belong to no one: the account number fails the Vocalink modulus check for its sort code.
 */
export function sampleSnapshot(options: {
  template: string;
  seller?: Partial<DocumentSnapshot['seller']>;
  currency?: string;
  locale?: string;
}): DocumentSnapshot {
  const seller: DocumentSnapshot['seller'] = {
    name: 'Field Office',
    legalName: null,
    businessType: 'sole_trader',
    companyNumber: null,
    email: 'hello@fieldoffice.co.uk',
    phone: null,
    website: null,
    address: {
      line1: 'Studio 2, 18 Brunswick Yard',
      line2: null,
      city: 'Bristol',
      region: null,
      postcode: 'BS2 8PF',
      countryCode: 'GB',
    },
    taxRegistered: false,
    taxNumber: null,
    brandColour: '#17795a',
    logoFileId: null,
    ...options.seller,
  };
  const tax = seller.taxRegistered && seller.address.countryCode === 'GB' ? VAT20 : null;
  const lines = [
    {
      title: 'Discovery and moodboard',
      description: 'Two calls, references and a written brief',
      quantity: 1000,
      unit: null,
      unitPrice: 45_000,
      serviceDate: null,
      tax,
    },
    {
      title: 'Design of six page templates',
      description: null,
      quantity: 1000,
      unit: null,
      unitPrice: 120_000,
      serviceDate: null,
      tax,
    },
    {
      title: 'Build and content entry',
      description: 'Shop, about, journal and stockists pages',
      quantity: 1000,
      unit: null,
      unitPrice: 160_000,
      serviceDate: null,
      tax,
    },
  ];
  const currency = options.currency ?? 'GBP';
  const totals = computeDocument({
    currency,
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    lines,
    paid: 0,
  });
  return assembleSnapshot({
    kind: 'invoice',
    number: 'INV-0042',
    issueDate: '2026-10-18',
    dueDate: '2026-11-17',
    supplyDate: '2026-10-16',
    servicePeriodStart: null,
    servicePeriodEnd: null,
    reference: null,
    title: 'Website for the spring collection',
    summary: 'Design and build of a new shop site, from first sketches to launch.',
    currency,
    locale: options.locale ?? 'en-GB',
    lineStyle: 'amount',
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    seller,
    buyer: {
      name: 'Mara Linden Ceramics',
      contactName: null,
      email: null,
      address: {
        line1: '3 Pottery Lane',
        line2: null,
        city: 'Bath',
        region: null,
        postcode: 'BA1 1AA',
        countryCode: 'GB',
      },
      taxNumber: null,
      fields: [],
    },
    lines,
    totals,
    prepayments: [],
    notes: 'Thank you for working with me.',
    terms: null,
    template: options.template,
    options: {},
    paymentDetails: {
      bank: {
        accountName: seller.name,
        bankName: 'Monzo Business',
        sortCode: '04-00-75',
        accountNumber: '47290156',
      },
    },
    credits: null,
  });
}
