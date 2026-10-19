import type { BusinessDate } from './dates';
import type { DocumentTotals, TaxLevel } from './totals';
import type { RoundingMode } from './money';
import type { TaxCode } from './tax';
import type { DocumentKind } from './numbering';
import { UNLIMITED, applyEntitlements, type Entitlements } from './plans';
import type { CreditSlot, CreditTaken } from './credits';

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
  /** Shows "Made with Invoica", on the free plan. Absent on documents issued before plans existed. */
  madeWithInvoica?: boolean;
  /** For an invoice: the places its tax was worked out, kept at issue so it can be credited. */
  slots?: CreditSlot[];
  /** For a credit note: what it took from the invoice, for the credit ledger. */
  ledger?: CreditTaken;
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

export interface RawPaymentDetails {
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
}

export interface DocumentDisplayOptions {
  showBank?: boolean;
  showMobileMoney?: boolean;
  showPaymentLink?: boolean;
  showNotes?: boolean;
  showTerms?: boolean;
}

export interface SnapshotLineSource {
  title: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  serviceDate: BusinessDate | null;
  tax: TaxCode | null;
}

export interface SnapshotInput {
  kind: DocumentKind;
  number: string;
  issueDate: BusinessDate;
  dueDate: BusinessDate | null;
  supplyDate: BusinessDate | null;
  servicePeriodStart: BusinessDate | null;
  servicePeriodEnd: BusinessDate | null;
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
  lines: SnapshotLineSource[];
  totals: DocumentTotals;
  prepayments: { label: string; amount: number; paidOn: BusinessDate }[];
  notes: string | null;
  terms: string | null;
  template: string;
  options: DocumentDisplayOptions;
  paymentDetails: RawPaymentDetails;
  credits: DocumentSnapshot['credits'];
  /** What the organisation's plan allows; everything when omitted. */
  entitlements?: Entitlements;
  /** Kept on an issued invoice. */
  slots?: CreditSlot[];
  /** Kept on an issued credit note. */
  ledger?: CreditTaken;
}

const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v : null);

function paymentFor(raw: RawPaymentDetails, options: DocumentDisplayOptions): SnapshotPaymentDetails {
  const bank = raw.bank;
  const mm = raw.mobileMoney;
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
    paymentLink: options.showPaymentLink === false ? null : blankToNull(raw.paymentLink),
  };
}

/**
 * Builds the snapshot a document shows. The server freezes it at issue; the editor builds the same thing
 * for its live preview, so the preview and the PDF come from one function.
 */
export function assembleSnapshot(s: SnapshotInput): DocumentSnapshot {
  const isCredit = s.kind === 'credit_note';
  const snapshot: DocumentSnapshot = {
    version: 1,
    kind: s.kind,
    number: s.number,
    issueDate: s.issueDate,
    dueDate: isCredit ? null : s.dueDate,
    supplyDate: s.supplyDate,
    servicePeriod:
      s.servicePeriodStart && s.servicePeriodEnd
        ? { start: s.servicePeriodStart, end: s.servicePeriodEnd }
        : null,
    reference: s.reference,
    title: s.title,
    summary: s.summary,
    currency: s.currency,
    locale: s.locale,
    lineStyle: s.lineStyle,
    pricesIncludeTax: s.pricesIncludeTax,
    taxLevel: s.taxLevel,
    rounding: s.rounding,
    seller: s.seller,
    buyer: s.buyer,
    lines: s.lines.map((l, i) => ({
      title: l.title,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      serviceDate: l.serviceDate,
      tax: l.tax,
      amount: s.totals.lines[i]?.amount ?? 0,
      discount: s.totals.lines[i]?.discount ?? 0,
      net: s.totals.lines[i]?.net ?? 0,
      taxAmount: s.totals.lines[i]?.tax ?? 0,
    })),
    totals: s.totals,
    paymentsShown: isCredit
      ? []
      : s.prepayments.map((p) => ({ label: p.label, amount: p.amount, paidOn: p.paidOn })),
    balanceDue: isCredit ? s.totals.total : s.totals.balance,
    notes: s.options.showNotes === false ? null : s.notes,
    terms: s.options.showTerms === false ? null : s.terms,
    template: s.template,
    payment: isCredit
      ? { bank: null, mobileMoney: null, paymentLink: null }
      : paymentFor(s.paymentDetails, s.options),
    credits: s.credits,
    ...(s.slots ? { slots: s.slots } : {}),
    ...(s.ledger ? { ledger: s.ledger } : {}),
  };
  return applyEntitlements(snapshot, s.entitlements ?? UNLIMITED);
}
