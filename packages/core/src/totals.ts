import { DomainError } from './errors';
import { allocate, assertMinor, divRound, sumMinor, toSafeNumber, type RoundingMode } from './money';
import { lineAmount } from './quantity';
import {
  RATE_SCALE,
  assertTaxCode,
  splitGross,
  taxCodeKey,
  taxesOnNet,
  type ComponentAmount,
  type TaxCode,
  type TaxTreatment,
} from './tax';
import { currency } from './currency';

/**
 * Where tax is rounded.
 * - `document`: lines taxed the same way are added up first, and each tax is worked out and rounded once on that sum.
 * - `line`: each line's tax is worked out and rounded on its own, then added up.
 */
export type TaxLevel = 'document' | 'line';

export interface LineInput {
  /** Thousandths: 1.5 is 1500. */
  quantity: number;
  /** Minor units, excluding tax unless the document's prices include tax. */
  unitPrice: number;
  tax: TaxCode | null;
}

export type DiscountInput =
  { label: string; kind: 'percent'; ratePpm: number } | { label: string; kind: 'amount'; amount: number };

export interface DocumentInput {
  currency: string;
  pricesIncludeTax: boolean;
  taxLevel: TaxLevel;
  rounding: RoundingMode;
  lines: LineInput[];
  discounts?: DiscountInput[];
  /** Payments and credits already applied, in minor units. */
  paid?: number;
}

export interface LineResult {
  /** Quantity times unit price, rounded. Includes tax when the document's prices include tax. */
  amount: number;
  /** This line's share of the document's discounts. */
  discount: number;
  /** The line's amount after discount, excluding tax. */
  net: number;
  /** Tax on this line. At document level this is the line's share of its group's tax. */
  tax: number;
}

export interface TaxSummaryRow {
  key: string;
  name: string;
  ratePpm: number;
  compound: boolean;
  treatment: TaxTreatment;
  /** The amount the tax was charged on. */
  base: number;
  amount: number;
  /**
   * False under a reverse charge: the tax is worked out and shown, but the customer accounts for it,
   * so it is not added to the total.
   */
  charged: boolean;
}

export interface DocumentTotals {
  currency: string;
  pricesIncludeTax: boolean;
  lines: LineResult[];
  /** Sum of line amounts. Includes tax when prices include tax. */
  subtotal: number;
  discounts: { label: string; amount: number }[];
  discountTotal: number;
  /** Total excluding tax. */
  net: number;
  taxes: TaxSummaryRow[];
  taxTotal: number;
  total: number;
  paid: number;
  /** Total less payments and credits. */
  balance: number;
}

function discountAmount(d: DiscountInput, subtotal: number, mode: RoundingMode): number {
  if (d.kind === 'amount') {
    assertMinor(d.amount, 'discount');
    if (d.amount < 0) throw new DomainError('discount_negative', 'A discount must not be negative.');
    return d.amount;
  }
  assertMinor(d.ratePpm, 'discount rate');
  if (d.ratePpm < 0 || d.ratePpm > RATE_SCALE) {
    throw new DomainError('discount_rate_out_of_range', 'A discount must be between 0% and 100%.');
  }
  return toSafeNumber(divRound(BigInt(subtotal) * BigInt(d.ratePpm), BigInt(RATE_SCALE), mode), 'discount');
}

function summaryKey(c: ComponentAmount['component'], treatment: TaxTreatment): string {
  return JSON.stringify([c.name, c.ratePpm, c.compound, treatment]);
}

/**
 * Works out every figure on a document. The editor, the server, the PDF and the dashboards all call this,
 * so a figure is computed in one place only.
 */
export function computeDocument(input: DocumentInput): DocumentTotals {
  currency(input.currency);
  const mode = input.rounding;
  const codes = input.lines.map((l) => l.tax);
  codes.forEach((c) => c && assertTaxCode(c));

  const amounts = input.lines.map((l) => lineAmount(l.quantity, l.unitPrice, mode));
  const subtotal = sumMinor(amounts);

  const discounts = (input.discounts ?? []).map((d) => ({
    label: d.label,
    amount: discountAmount(d, subtotal, mode),
  }));
  const discountTotal = sumMinor(discounts.map((d) => d.amount));
  if (discountTotal > subtotal) {
    throw new DomainError('discount_exceeds_subtotal', 'Discounts cannot be more than the subtotal.');
  }
  const lineDiscounts = allocate(discountTotal, amounts);
  const afterDiscount = amounts.map((a, i) => a - (lineDiscounts[i] ?? 0));

  const lineNet = new Array<number>(amounts.length).fill(0);
  const lineTax = new Array<number>(amounts.length).fill(0);
  const summary = new Map<string, TaxSummaryRow>();

  const addToSummary = (code: TaxCode | null, charged: ComponentAmount[], untaxedBase: number) => {
    if (!code) return;
    const isCharged = code.treatment !== 'reverse_charge';
    if (code.components.length === 0) {
      const key = JSON.stringify([code.label, code.treatment]);
      const row = summary.get(key) ?? {
        key,
        name: code.label,
        ratePpm: 0,
        compound: false,
        treatment: code.treatment,
        base: 0,
        amount: 0,
        charged: isCharged,
      };
      row.base += untaxedBase;
      summary.set(key, row);
      return;
    }
    for (const c of charged) {
      const key = summaryKey(c.component, code.treatment);
      const row = summary.get(key) ?? {
        key,
        name: c.component.name,
        ratePpm: c.component.ratePpm,
        compound: c.component.compound,
        treatment: code.treatment,
        base: 0,
        amount: 0,
        charged: isCharged,
      };
      row.base += c.base;
      row.amount += c.amount;
      summary.set(key, row);
    }
  };

  /** Tax on an amount. Reverse-charge tax is worked out on the amount as a net price and never charged. */
  const taxOf = (amount: number, code: TaxCode | null) => {
    const components = code?.components ?? [];
    if (code?.treatment === 'reverse_charge') {
      return { net: amount, taxes: taxesOnNet(amount, components, mode), charged: false };
    }
    if (input.pricesIncludeTax) {
      const { net, taxes } = splitGross(amount, components, mode);
      return { net, taxes, charged: true };
    }
    return { net: amount, taxes: taxesOnNet(amount, components, mode), charged: true };
  };

  if (input.taxLevel === 'line') {
    afterDiscount.forEach((amount, i) => {
      const code = codes[i] ?? null;
      const { net, taxes, charged } = taxOf(amount, code);
      lineNet[i] = net;
      lineTax[i] = charged ? sumMinor(taxes.map((t) => t.amount)) : 0;
      addToSummary(code, taxes, net);
    });
  } else {
    const groups = new Map<string, number[]>();
    codes.forEach((code, i) => {
      const key = taxCodeKey(code);
      groups.set(key, [...(groups.get(key) ?? []), i]);
    });
    for (const indexes of groups.values()) {
      const code = codes[indexes[0] ?? 0] ?? null;
      const groupAmounts = indexes.map((i) => afterDiscount[i] ?? 0);
      const groupAmount = sumMinor(groupAmounts);
      const { net, taxes, charged } = taxOf(groupAmount, code);
      const groupTax = charged ? sumMinor(taxes.map((t) => t.amount)) : 0;
      const weights = groupAmounts.map((a) => Math.max(a, 0));
      const netShares = allocate(net, weights);
      const taxShares = allocate(groupTax, weights);
      indexes.forEach((lineIndex, j) => {
        lineNet[lineIndex] = netShares[j] ?? 0;
        lineTax[lineIndex] = taxShares[j] ?? 0;
      });
      addToSummary(code, taxes, net);
    }
  }

  const taxes = [...summary.values()];
  const taxTotal = sumMinor(taxes.filter((t) => t.charged).map((t) => t.amount));
  const netTotal = sumMinor(lineNet);
  const total = netTotal + taxTotal;
  const paid = assertMinor(input.paid ?? 0, 'paid');

  return {
    currency: input.currency,
    pricesIncludeTax: input.pricesIncludeTax,
    lines: amounts.map((amount, i) => ({
      amount,
      discount: lineDiscounts[i] ?? 0,
      net: lineNet[i] ?? 0,
      tax: lineTax[i] ?? 0,
    })),
    subtotal,
    discounts,
    discountTotal,
    net: input.pricesIncludeTax ? total - taxTotal : netTotal,
    taxes,
    taxTotal,
    total,
    paid,
    balance: total - paid,
  };
}
