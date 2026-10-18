import type { BusinessDate } from './dates';
import type { DocumentTotals, TaxLevel } from './totals';
import type { RoundingMode } from './money';
import type { TaxCode } from './tax';
import type { DocumentKind } from './numbering';

export type LineStyle = 'amount' | 'quantity' | 'hours' | 'dated';

export interface PartyAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  countryCode: string | null;
}

export interface SnapshotSeller {
  name: string;
  legalName: string | null;
  businessType: string;
  companyNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: PartyAddress;
  taxRegistered: boolean;
  taxNumber: string | null;
  brandColour: string;
  logoFileId: string | null;
}

export interface SnapshotBuyer {
  name: string;
  contactName: string | null;
  email: string | null;
  address: PartyAddress;
  taxNumber: string | null;
  fields: { label: string; value: string }[];
}

export interface SnapshotLine {
  title: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  serviceDate: BusinessDate | null;
  tax: TaxCode | null;
  amount: number;
  discount: number;
  net: number;
  taxAmount: number;
}

export interface SnapshotPayment {
  label: string;
  amount: number;
  paidOn: BusinessDate;
}

export interface SnapshotPaymentDetails {
  bank: {
    accountName: string | null;
    bankName: string | null;
    sortCode: string | null;
    accountNumber: string | null;
    iban: string | null;
    swift: string | null;
  } | null;
  mobileMoney: { provider: string | null; number: string | null; accountName: string | null } | null;
  paymentLink: string | null;
}

/** Everything an issued document shows, frozen at issue. Templates render from this alone. */
export interface DocumentSnapshot {
  version: 1;
  kind: DocumentKind;
  number: string;
  issueDate: BusinessDate;
  dueDate: BusinessDate | null;
  supplyDate: BusinessDate | null;
  servicePeriod: { start: BusinessDate; end: BusinessDate } | null;
  reference: string | null;
  title: string | null;
  summary: string | null;
  currency: string;
  locale: string;
  lineStyle: LineStyle;
  pricesIncludeTax: boolean;
  taxLevel: TaxLevel;
  rounding: RoundingMode;
  seller: SnapshotSeller;
  buyer: SnapshotBuyer;
  lines: SnapshotLine[];
  totals: DocumentTotals;
  /** Deposits and earlier payments shown on the document, taken off to give the balance due. */
  paymentsShown: SnapshotPayment[];
  balanceDue: number;
  notes: string | null;
  terms: string | null;
  template: string;
  payment: SnapshotPaymentDetails;
  /** For a credit note: the invoice it credits and why. */
  credits: { number: string; issueDate: BusinessDate; reason: string } | null;
}

export function lineHasQuantity(style: LineStyle): boolean {
  return style !== 'amount';
}

/**
 * Whether lines must show quantity, unit price and tax rate whatever the chosen line style.
 * A full UK VAT invoice must (GOV.UK, VAT Notice 700/21, section 4).
 */
export function mustShowLineDetail(
  seller: Pick<SnapshotSeller, 'taxRegistered'>,
  countryCode: string | null,
): boolean {
  return seller.taxRegistered && countryCode === 'GB';
}
