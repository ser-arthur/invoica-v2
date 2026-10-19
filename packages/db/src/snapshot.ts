import {
  type CreditSlot,
  type CreditTaken,
  type Entitlements,
  assembleSnapshot,
  type DocumentSnapshot,
  type DocumentTotals,
  type SnapshotLineSource,
  type SterlingVat,
} from '@invoica/core';
import type { Organisation } from './organisations';
import type { client, document } from './schema';

type ClientRow = typeof client.$inferSelect;
type DocumentRow = typeof document.$inferSelect;

export type { SnapshotLineSource };

export interface SnapshotSource {
  org: Organisation;
  client: ClientRow;
  fields: { label: string; value: string }[];
  doc: DocumentRow & { issueDate: string };
  number: string;
  lines: SnapshotLineSource[];
  totals: DocumentTotals;
  credits: DocumentSnapshot['credits'];
  /** What the organisation's plan allows at issue. */
  entitlements: Entitlements;
  /** An invoice's tax slots, kept for crediting. */
  slots?: CreditSlot[];
  /** What a credit note took from its invoice. */
  ledger?: CreditTaken;
  sterlingVat?: SterlingVat | null;
}

export function sellerFrom(org: Organisation): DocumentSnapshot['seller'] {
  return {
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
  };
}

export function buyerFrom(
  c: ClientRow,
  fields: { label: string; value: string }[],
): DocumentSnapshot['buyer'] {
  return {
    name: c.name,
    contactName: c.contactName,
    email: c.email,
    address: {
      line1: c.addressLine1,
      line2: c.addressLine2,
      city: c.city,
      region: c.region,
      postcode: c.postcode,
      countryCode: c.countryCode,
    },
    taxNumber: c.taxNumber,
    fields: fields.map((f) => ({ label: f.label, value: f.value })),
  };
}

/** Freezes everything a document shows at the moment it is issued. */
export function buildSnapshot(s: SnapshotSource): DocumentSnapshot {
  const { org, doc } = s;
  return assembleSnapshot({
    kind: doc.kind,
    number: s.number,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    supplyDate: doc.supplyDate,
    servicePeriodStart: doc.servicePeriodStart,
    servicePeriodEnd: doc.servicePeriodEnd,
    reference: doc.reference,
    title: doc.title,
    summary: doc.summary,
    currency: doc.currency,
    locale: org.locale,
    lineStyle: doc.lineStyle,
    pricesIncludeTax: doc.pricesIncludeTax,
    taxLevel: doc.taxLevel,
    rounding: doc.rounding,
    seller: sellerFrom(org),
    buyer: buyerFrom(s.client, s.fields),
    lines: s.lines,
    totals: s.totals,
    prepayments: doc.prepayments,
    notes: doc.notes,
    terms: doc.terms,
    template: doc.template,
    options: doc.options,
    paymentDetails: org.paymentDetails,
    credits: s.credits,
    entitlements: s.entitlements,
    slots: s.slots,
    ledger: s.ledger,
    sterlingVat: s.sterlingVat,
  });
}
