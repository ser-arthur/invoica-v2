import { describe, expect, it } from 'vitest';
import { assembleSnapshot, type SnapshotInput } from '../src/snapshot';
import { computeDocument } from '../src/totals';

const line = {
  title: 'Design',
  description: null,
  quantity: 1000,
  unit: null,
  unitPrice: 5000,
  serviceDate: null,
  tax: null,
};

function input(lines: SnapshotInput['lines']): SnapshotInput {
  return {
    kind: 'invoice',
    number: 'INV-0001',
    issueDate: '2026-10-18',
    dueDate: '2026-11-01',
    supplyDate: '2026-10-18',
    servicePeriodStart: null,
    servicePeriodEnd: null,
    reference: null,
    title: null,
    summary: null,
    currency: 'GBP',
    locale: 'en-GB',
    lineStyle: 'quantity',
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    seller: {
      name: 'Field Office',
      legalName: null,
      businessType: 'sole_trader',
      companyNumber: null,
      email: null,
      phone: null,
      website: null,
      address: { line1: null, line2: null, city: null, region: null, postcode: null, countryCode: 'GB' },
      taxRegistered: false,
      taxNumber: null,
      brandColour: '#17795a',
      logoFileId: null,
    },
    buyer: {
      name: 'Northlane Ltd',
      contactName: null,
      email: null,
      address: { line1: null, line2: null, city: null, region: null, postcode: null, countryCode: 'GB' },
      taxNumber: null,
      fields: [],
    },
    lines,
    totals: computeDocument({
      currency: 'GBP',
      pricesIncludeTax: false,
      taxLevel: 'line',
      rounding: 'half-up',
      lines,
    }),
    prepayments: [],
    notes: null,
    terms: null,
    template: 'signature',
    options: {},
    paymentDetails: {},
    credits: null,
  };
}

describe('snapshot lines', () => {
  it('keep only what the document shows, whatever else the source rows carry', () => {
    const row = { ...line, id: 'f00', organisationId: 'org', documentId: 'doc', position: 0, itemId: 'item' };
    const snap = assembleSnapshot(input([row]));
    expect(Object.keys(snap.lines[0]!).sort()).toEqual(
      [
        'amount',
        'description',
        'discount',
        'net',
        'quantity',
        'serviceDate',
        'tax',
        'taxAmount',
        'title',
        'unit',
        'unitPrice',
      ].sort(),
    );
  });
});
