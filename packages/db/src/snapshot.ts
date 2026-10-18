import type { DocumentSnapshot, DocumentTotals, SnapshotPaymentDetails, TaxCode } from '@invoica/core';
import type { Organisation } from './organisations';
import type { client, document } from './schema';

type ClientRow = typeof client.$inferSelect;
type DocumentRow = typeof document.$inferSelect;

export interface SnapshotLineSource {
  title: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  serviceDate: string | null;
  tax: TaxCode | null;
}

export interface SnapshotSource {
  org: Organisation;
  client: ClientRow;
  fields: { label: string; value: string }[];
  doc: DocumentRow & { issueDate: string };
  number: string;
  lines: SnapshotLineSource[];
  totals: DocumentTotals;
  credits: DocumentSnapshot['credits'];
}

const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v : null);

function paymentDetails(org: Organisation, options: DocumentRow['options']): SnapshotPaymentDetails {
  const bank = org.paymentDetails.bank;
  const mm = org.paymentDetails.mobileMoney;
  const hasBank = !!bank && Object.values(bank).some((v) => blankToNull(v));
  const hasMobile = !!mm && Object.values(mm).some((v) => blankToNull(v));
  return {
    bank:
      hasBank && options.showBank !== false
        ? {
            accountName: blankToNull(bank!.accountName),
            bankName: blankToNull(bank!.bankName),
            sortCode: blankToNull(bank!.sortCode),
            accountNumber: blankToNull(bank!.accountNumber),
            iban: blankToNull(bank!.iban),
            swift: blankToNull(bank!.swift),
          }
        : null,
    mobileMoney:
      hasMobile && options.showMobileMoney !== false
        ? {
            provider: blankToNull(mm!.provider),
            number: blankToNull(mm!.number),
            accountName: blankToNull(mm!.accountName),
          }
        : null,
    paymentLink: options.showPaymentLink === false ? null : blankToNull(org.paymentDetails.paymentLink),
  };
}

/** Freezes everything a document shows at the moment it is issued. */
export function buildSnapshot(s: SnapshotSource): DocumentSnapshot {
  const { org, doc, totals } = s;
  const isCredit = doc.kind === 'credit_note';
  const paymentsShown = isCredit
    ? []
    : doc.prepayments.map((p) => ({ label: p.label, amount: p.amount, paidOn: p.paidOn }));
  return {
    version: 1,
    kind: doc.kind,
    number: s.number,
    issueDate: doc.issueDate,
    dueDate: isCredit ? null : doc.dueDate,
    supplyDate: doc.supplyDate,
    servicePeriod:
      doc.servicePeriodStart && doc.servicePeriodEnd
        ? { start: doc.servicePeriodStart, end: doc.servicePeriodEnd }
        : null,
    reference: doc.reference,
    title: doc.title,
    summary: doc.summary,
    currency: doc.currency,
    locale: org.locale,
    lineStyle: doc.lineStyle,
    pricesIncludeTax: doc.pricesIncludeTax,
    taxLevel: doc.taxLevel,
    rounding: doc.rounding,
    seller: {
      name: org.name,
      legalName: org.legalName,
      businessType: org.businessType,
      companyNumber: org.companyNumber,
      email: org.email,
      phone: org.phone,
      website: org.website,
      address: {
        line1: org.addressLine1,
        line2: org.addressLine2,
        city: org.city,
        region: org.region,
        postcode: org.postcode,
        countryCode: org.countryCode,
      },
      taxRegistered: org.taxRegistered,
      taxNumber: org.taxNumber,
      brandColour: org.brandColour,
      logoFileId: org.logoFileId,
    },
    buyer: {
      name: s.client.name,
      contactName: s.client.contactName,
      email: s.client.email,
      address: {
        line1: s.client.addressLine1,
        line2: s.client.addressLine2,
        city: s.client.city,
        region: s.client.region,
        postcode: s.client.postcode,
        countryCode: s.client.countryCode,
      },
      taxNumber: s.client.taxNumber,
      fields: s.fields.map((f) => ({ label: f.label, value: f.value })),
    },
    lines: s.lines.map((l, i) => ({
      title: l.title,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      serviceDate: l.serviceDate,
      tax: l.tax,
      amount: totals.lines[i]!.amount,
      discount: totals.lines[i]!.discount,
      net: totals.lines[i]!.net,
      taxAmount: totals.lines[i]!.tax,
    })),
    totals,
    paymentsShown,
    balanceDue: isCredit ? totals.total : totals.balance,
    notes: doc.options.showNotes === false ? null : doc.notes,
    terms: doc.options.showTerms === false ? null : doc.terms,
    template: doc.template,
    payment: isCredit
      ? { bank: null, mobileMoney: null, paymentLink: null }
      : paymentDetails(org, doc.options),
    credits: s.credits,
  };
}
