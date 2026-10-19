import { DomainError } from './errors';
import { allocate, assertMinor, divRound, sumMinor, toSafeNumber, type RoundingMode } from './money';
import { lineAmount } from './quantity';
import {
  RATE_SCALE,
  assertTaxCode,
  exactNetOfGross,
  exactTaxes,
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
  /**
   * A fixed amount taken off this line before tax, in minor units. Credit notes use it to give back a line's
   * share of the invoice's discounts. A document has either line discounts or document discounts, not both.
   */
  discount?: number;
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
  /** The label of the discount row when lines carry their own discounts. */
  lineDiscountLabel?: string;
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

interface Group {
  code: TaxCode | null;
  groupAmount: number;
}

/**
 * For each group, its taxes when the document's tax is rounded down once on the total: every component is worked
 * out exactly, the exact total is rounded down, and the result is shared out by largest remainder. Reverse-charge
 * tax, which is shown and not charged, is rounded down on its own.
 */
function roundDocumentTaxDown(groups: Group[], pricesIncludeTax: boolean) {
  const prepared = groups.map((g) => {
    const components = g.code?.components ?? [];
    const reverse = g.code?.treatment === 'reverse_charge';
    const inclusive = pricesIncludeTax && !reverse;
    const exactNet = inclusive
      ? exactNetOfGross(g.groupAmount, components)
      : { num: BigInt(g.groupAmount), den: 1n };
    return { g, components, reverse, inclusive, exact: exactTaxes(exactNet, components) };
  });
  const slots = prepared.flatMap((p, gi) => (p.reverse ? [] : p.exact.map((f, ci) => ({ gi, ci, f }))));
  const floors = slots.map((s) => s.f.num / s.f.den);
  let sumNum = 0n;
  let sumDen = 1n;
  for (const s of slots) {
    sumNum = sumNum * s.f.den + s.f.num * sumDen;
    sumDen = sumDen * s.f.den;
  }
  let leftover = sumNum / sumDen - floors.reduce((a, b) => a + b, 0n);
  const order = slots
    .map((s, i) => ({ i, rem: s.f.num % s.f.den, den: s.f.den }))
    .sort((a, b) => (a.rem * b.den === b.rem * a.den ? a.i - b.i : a.rem * b.den > b.rem * a.den ? -1 : 1));
  const assigned = [...floors];
  for (const o of order) {
    if (leftover <= 0n) break;
    assigned[o.i] = (assigned[o.i] ?? 0n) + 1n;
    leftover -= 1n;
  }
  const amountFor = new Map(slots.map((s, i) => [`${s.gi}:${s.ci}`, toSafeNumber(assigned[i]!, 'tax')]));
  return prepared.map((p, gi) => {
    const amounts = p.components.map((_, ci) =>
      p.reverse ? toSafeNumber(p.exact[ci]!.num / p.exact[ci]!.den, 'tax') : amountFor.get(`${gi}:${ci}`)!,
    );
    const net = p.inclusive ? p.g.groupAmount - amounts.reduce((a, b) => a + b, 0) : p.g.groupAmount;
    let charged = 0;
    const taxes: ComponentAmount[] = p.components.map((component, ci) => {
      const base = component.compound ? net + charged : net;
      charged += amounts[ci]!;
      return { component, base, amount: amounts[ci]! };
    });
    return { net, taxes, charged: !p.reverse };
  });
}

export function summaryKey(c: ComponentAmount['component'], treatment: TaxTreatment): string {
  return JSON.stringify([c.name, c.ratePpm, c.compound, treatment]);
}

/** The lines that share a tax code, and what the document charged on them together. */
export interface TaxGroupDetail {
  /** `taxCodeKey` of the code. */
  key: string;
  code: TaxCode | null;
  /** Indexes of the group's lines on the document. */
  lines: number[];
  /** The group's lines after discounts, in the document's price basis: including tax when prices include it. */
  value: number;
  /** The group's amount excluding tax. */
  net: number;
  /** Each component's base and amount for the group, in the code's order. Reverse-charge tax is shown, not charged. */
  taxes: ComponentAmount[];
  charged: boolean;
}

/**
 * Works out every figure on a document. The editor, the server, the PDF and the dashboards all call this,
 * so a figure is computed in one place only.
 */
export function computeDocument(input: DocumentInput): DocumentTotals {
  return computeDocumentDetail(input).totals;
}

/** The document's figures, with each tax group's own figures, which credit notes are worked out from. */
export function computeDocumentDetail(input: DocumentInput): {
  totals: DocumentTotals;
  groups: TaxGroupDetail[];
} {
  currency(input.currency);
  const mode = input.rounding;
  const codes = input.lines.map((l) => l.tax);
  codes.forEach((c) => c && assertTaxCode(c));

  // Line amounts and discounts are always rounded half up; the document's rounding setting applies to tax.
  const amounts = input.lines.map((l) => lineAmount(l.quantity, l.unitPrice, 'half-up'));
  const subtotal = sumMinor(amounts);

  const fixed = input.lines.map((l, i) => {
    const d = l.discount ?? 0;
    assertMinor(d, 'line discount');
    const a = amounts[i] ?? 0;
    if (a >= 0 ? d < 0 || d > a : d > 0 || d < a) {
      throw new DomainError(
        'discount_exceeds_line',
        'A line discount must be between zero and the line amount.',
      );
    }
    return d;
  });
  const fixedTotal = sumMinor(fixed);
  if (fixedTotal !== 0 && (input.discounts ?? []).length > 0) {
    throw new DomainError('discount_mixed', 'A document has either line discounts or document discounts.');
  }
  const discounts =
    fixedTotal !== 0
      ? [{ label: input.lineDiscountLabel ?? 'Discount', amount: fixedTotal }]
      : (input.discounts ?? []).map((d) => ({
          label: d.label,
          amount: discountAmount(d, subtotal, 'half-up'),
        }));
  const discountTotal = sumMinor(discounts.map((d) => d.amount));
  if (discountTotal > subtotal) {
    throw new DomainError('discount_exceeds_subtotal', 'Discounts cannot be more than the subtotal.');
  }
  const lineDiscounts = fixedTotal !== 0 ? fixed : allocate(discountTotal, amounts);
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

  const details = new Map<string, TaxGroupDetail>();
  const detailFor = (code: TaxCode | null) => {
    const key = taxCodeKey(code);
    let d = details.get(key);
    if (!d) {
      d = {
        key,
        code,
        lines: [],
        value: 0,
        net: 0,
        taxes: (code?.components ?? []).map((component) => ({ component, base: 0, amount: 0 })),
        charged: code?.treatment !== 'reverse_charge',
      };
      details.set(key, d);
    }
    return d;
  };
  const addToDetail = (code: TaxCode | null, indexes: number[], net: number, taxes: ComponentAmount[]) => {
    const d = detailFor(code);
    d.lines.push(...indexes);
    d.value += sumMinor(indexes.map((i) => afterDiscount[i] ?? 0));
    d.net += net;
    taxes.forEach((t, k) => {
      d.taxes[k]!.base += t.base;
      d.taxes[k]!.amount += t.amount;
    });
  };

  if (input.taxLevel === 'line') {
    afterDiscount.forEach((amount, i) => {
      const code = codes[i] ?? null;
      const { net, taxes, charged } = taxOf(amount, code);
      lineNet[i] = net;
      lineTax[i] = charged ? sumMinor(taxes.map((t) => t.amount)) : 0;
      addToSummary(code, taxes, net);
      addToDetail(code, [i], net, taxes);
    });
  } else {
    const groups = new Map<string, number[]>();
    codes.forEach((code, i) => {
      const key = taxCodeKey(code);
      groups.set(key, [...(groups.get(key) ?? []), i]);
    });
    const list = [...groups.values()].map((indexes) => {
      const code = codes[indexes[0] ?? 0] ?? null;
      const groupAmounts = indexes.map((i) => afterDiscount[i] ?? 0);
      return { indexes, code, groupAmounts, groupAmount: sumMinor(groupAmounts) };
    });
    // Rounded down at document level: the exact tax of the whole document is rounded down once (VAT Notice 700, 17.5),
    // then shared back to each tax in proportion to its exact amount.
    const exactDown = mode === 'down' ? roundDocumentTaxDown(list, input.pricesIncludeTax) : null;
    list.forEach((g, gi) => {
      const { net, taxes, charged } = exactDown ? exactDown[gi]! : taxOf(g.groupAmount, g.code);
      const groupTax = charged ? sumMinor(taxes.map((t) => t.amount)) : 0;
      const weights = g.groupAmounts.map((a) => Math.max(a, 0));
      const netShares = allocate(net, weights);
      const taxShares = allocate(groupTax, weights);
      g.indexes.forEach((lineIndex, j) => {
        lineNet[lineIndex] = netShares[j] ?? 0;
        lineTax[lineIndex] = taxShares[j] ?? 0;
      });
      addToSummary(g.code, taxes, net);
      addToDetail(g.code, g.indexes, net, taxes);
    });
  }

  const taxes = [...summary.values()];
  const taxTotal = sumMinor(taxes.filter((t) => t.charged).map((t) => t.amount));
  const netTotal = sumMinor(lineNet);
  const total = netTotal + taxTotal;
  const paid = assertMinor(input.paid ?? 0, 'paid');

  const totals: DocumentTotals = {
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
  return { totals, groups: [...details.values()] };
}
