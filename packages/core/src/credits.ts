import { DomainError } from './errors';
import { allocate, divRound, sumMinor, toSafeNumber, type RoundingMode } from './money';
import { lineAmount } from './quantity';
import { taxCodeKey, type TaxCode, type TaxComponent, type TaxTreatment } from './tax';
import {
  computeDocumentDetail,
  summaryKey,
  type DocumentTotals,
  type LineResult,
  type TaxLevel,
  type TaxSummaryRow,
} from './totals';

/**
 * Credit notes, worked out from the invoice as issued. The rules and their acceptance criteria are in
 * docs/specs/credit-notes.md. In short: the invoice's lines are grouped by tax code; every credit note takes value
 * from groups; a group's tax on what has been credited is the invoice's tax for the group in proportion to the value
 * credited, so credits taken in any order and mix add up to the invoice exactly, row by row.
 */

export interface CreditSourceLine {
  quantity: number;
  unitPrice: number;
  tax: TaxCode | null;
  /** The invoice's line amount, quantity times unit price. */
  amount: number;
  /** The line's share of the invoice's discounts. */
  discount: number;
  /** The `taxCodeKey` of the line's tax: its group. */
  group: string;
}

export interface CreditGroup {
  key: string;
  tax: TaxCode | null;
  /** The group's lines after discounts, in the invoice's price basis. */
  value: number;
  charged: boolean;
  /** What the invoice showed for each component of the group's tax. */
  taxes: { component: TaxComponent; base: number; amount: number }[];
  /** Indexes of the group's lines. */
  lines: number[];
}

export interface CreditSource {
  currency: string;
  pricesIncludeTax: boolean;
  taxLevel: TaxLevel;
  rounding: RoundingMode;
  lines: CreditSourceLine[];
  groups: CreditGroup[];
  /** The label of a credit note's discount row: the invoice's discount label, or "Discount". */
  discountLabel: string;
}

/** What an invoice can credit, from the inputs it was issued with and the figures it showed. */
export function creditSource(
  input: {
    currency: string;
    pricesIncludeTax: boolean;
    taxLevel: TaxLevel;
    rounding: RoundingMode;
    lines: { quantity: number; unitPrice: number; tax: TaxCode | null }[];
  },
  totals: DocumentTotals,
): CreditSource {
  if (totals.lines.length !== input.lines.length) {
    throw new DomainError('credit_source_mismatch', 'The invoice lines do not match its figures.');
  }
  const labels = totals.discounts.map((d) => d.label);
  // Each line keeps the discount share it had on the invoice, so the groups come out as the invoice did.
  const { totals: again, groups } = computeDocumentDetail({
    currency: input.currency,
    pricesIncludeTax: input.pricesIncludeTax,
    taxLevel: input.taxLevel,
    rounding: input.rounding,
    lines: input.lines.map((l, i) => ({ ...l, discount: totals.lines[i]!.discount })),
  });
  const same =
    again.total === totals.total &&
    again.taxTotal === totals.taxTotal &&
    again.taxes.length === totals.taxes.length &&
    again.taxes.every((r) =>
      totals.taxes.some((t) => t.key === r.key && t.amount === r.amount && t.base === r.base),
    );
  if (!same)
    throw new DomainError('credit_source_mismatch', 'The invoice figures cannot be worked out again.');
  return {
    currency: input.currency,
    pricesIncludeTax: input.pricesIncludeTax,
    taxLevel: input.taxLevel,
    rounding: input.rounding,
    lines: input.lines.map((l, i) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      tax: l.tax,
      amount: totals.lines[i]!.amount,
      discount: totals.lines[i]!.discount,
      group: taxCodeKey(l.tax),
    })),
    groups: groups.map((g) => ({
      key: g.key,
      tax: g.code,
      value: g.value,
      charged: g.charged,
      taxes: g.taxes.map((t) => ({ component: t.component, base: t.base, amount: t.amount })),
      lines: g.lines,
    })),
    discountLabel: labels.length === 1 ? labels[0]! : 'Discount',
  };
}

/** A line of an earlier credit note, as the ledger needs it. */
export interface CreditedLine {
  /** The invoice line it credited, or null for a line of an amount credit. */
  index: number | null;
  quantity: number;
  tax: TaxCode | null;
  /** Its amount after discount, in the invoice's price basis. */
  value: number;
}

export interface CreditState {
  /** Quantity of each invoice line credited so far. */
  quantities: number[];
  /** Value of each group: invoiced, credited so far and left. */
  groups: Record<string, { value: number; credited: number; left: number }>;
}

/** What earlier credit notes have taken from the invoice. */
export function creditState(source: CreditSource, earlier: readonly CreditedLine[]): CreditState {
  const quantities = source.lines.map(() => 0);
  const groups: CreditState['groups'] = {};
  for (const g of source.groups) groups[g.key] = { value: g.value, credited: 0, left: g.value };
  for (const c of earlier) {
    if (c.index !== null) {
      if (quantities[c.index] === undefined) {
        throw new DomainError(
          'credit_source_mismatch',
          'An earlier credit note credits a line not on the invoice.',
        );
      }
      quantities[c.index]! += c.quantity;
    }
    const g = groups[taxCodeKey(c.tax)];
    if (!g)
      throw new DomainError(
        'credit_source_mismatch',
        'An earlier credit note credits a tax not on the invoice.',
      );
    g.credited += c.value;
    g.left = g.value - g.credited;
  }
  for (const [i, q] of quantities.entries()) {
    if (q > source.lines[i]!.quantity) {
      throw new DomainError(
        'credit_source_mismatch',
        'Earlier credit notes credit more of a line than was invoiced.',
      );
    }
  }
  for (const g of Object.values(groups)) {
    if (g.left < 0)
      throw new DomainError('credit_source_mismatch', 'Earlier credit notes credit more than was invoiced.');
  }
  return { quantities, groups };
}

/** A credit note line: an invoice line (by position) or, for an amount credit, a share at one tax code. */
export interface PlannedCreditLine {
  index: number | null;
  group: string;
  quantity: number;
  unitPrice: number;
  tax: TaxCode | null;
  amount: number;
  discount: number;
  value: number;
}

export interface CreditPlan {
  lines: PlannedCreditLine[];
  pricesIncludeTax: boolean;
  /** The credit note's figures. `lines` match the plan's lines in order. */
  totals: DocumentTotals;
}

/** The lines a plan adds to the ledger once its credit note is issued. */
export function creditedLines(plan: CreditPlan): CreditedLine[] {
  return plan.lines.map((l) => ({ index: l.index, quantity: l.quantity, tax: l.tax, value: l.value }));
}

const scaled = (whole: number, part: number, of: number) =>
  of === 0 ? 0 : toSafeNumber(divRound(BigInt(whole) * BigInt(part), BigInt(of), 'half-up'), 'credit');

/** A group's tax and base for each component once `credited` of its value has been credited. */
function groupTaxAt(g: CreditGroup, credited: number) {
  return g.taxes.map((t) =>
    credited === g.value
      ? { base: t.base, amount: t.amount }
      : { base: scaled(t.base, credited, g.value), amount: scaled(t.amount, credited, g.value) },
  );
}

const amountAt = (l: CreditSourceLine, quantity: number) =>
  quantity === 0 ? 0 : quantity === l.quantity ? l.amount : lineAmount(quantity, l.unitPrice, 'half-up');
const discountAt = (l: CreditSourceLine, quantity: number) => scaled(l.discount, quantity, l.quantity);

function groupLabel(g: CreditGroup): string {
  return g.tax?.label ?? 'no tax';
}

/** Builds a credit note's figures from its lines, taking each group's tax cumulatively. */
function buildNote(
  source: CreditSource,
  state: CreditState,
  lines: Omit<PlannedCreditLine, 'index' | 'quantity' | 'unitPrice' | 'tax'>[],
): DocumentTotals {
  const results: LineResult[] = lines.map((l) => ({
    amount: l.amount,
    discount: l.discount,
    net: l.value,
    tax: 0,
  }));
  const rows = new Map<string, TaxSummaryRow>();
  let taxTotal = 0;
  for (const g of source.groups) {
    const indexes = lines.map((l, i) => (l.group === g.key ? i : -1)).filter((i) => i >= 0);
    if (indexes.length === 0) continue;
    const delta = sumMinor(indexes.map((i) => lines[i]!.value));
    const before = state.groups[g.key]!.credited;
    const after = before + delta;
    if (after > g.value) {
      throw new DomainError(
        'credit_exceeds_group',
        `This is more than is left to credit at ${groupLabel(g)}.`,
      );
    }
    const was = groupTaxAt(g, before);
    const now = groupTaxAt(g, after);
    const taxes = g.taxes.map((t, k) => ({
      component: t.component,
      base: now[k]!.base - was[k]!.base,
      amount: now[k]!.amount - was[k]!.amount,
    }));
    const charged = g.charged ? sumMinor(taxes.map((t) => t.amount)) : 0;
    taxTotal += charged;
    // The group's tax is shared across the note's lines in it by their value, so the line shares add up.
    const shares = allocate(
      charged,
      indexes.map((i) => Math.max(lines[i]!.value, 0)),
    );
    indexes.forEach((i, j) => {
      const r = results[i]!;
      r.tax = shares[j]!;
      // With prices including tax, a line's value includes its tax; reverse-charge tax is never included.
      r.net = source.pricesIncludeTax && g.charged ? r.net - r.tax : r.net;
    });
    if (source.pricesIncludeTax && g.charged && delta - charged < 0 && after !== g.value) {
      throw new DomainError(
        'credit_too_small',
        'This credit is too small to split into its tax and the rest.',
      );
    }
    const treatment: TaxTreatment = g.tax?.treatment ?? 'outside_scope';
    if (g.tax && g.tax.components.length === 0) {
      const key = JSON.stringify([g.tax.label, g.tax.treatment]);
      const row = rows.get(key) ?? {
        key,
        name: g.tax.label,
        ratePpm: 0,
        compound: false,
        treatment,
        base: 0,
        amount: 0,
        charged: g.charged,
      };
      row.base += delta;
      rows.set(key, row);
    }
    for (const t of taxes) {
      const key = summaryKey(t.component, treatment);
      const row = rows.get(key) ?? {
        key,
        name: t.component.name,
        ratePpm: t.component.ratePpm,
        compound: t.component.compound,
        treatment,
        base: 0,
        amount: 0,
        charged: g.charged,
      };
      row.base += t.base;
      row.amount += t.amount;
      rows.set(key, row);
    }
  }
  const subtotal = sumMinor(results.map((r) => r.amount));
  const discountTotal = sumMinor(results.map((r) => r.discount));
  const net = sumMinor(results.map((r) => r.net));
  const total = net + taxTotal;
  return {
    currency: source.currency,
    pricesIncludeTax: source.pricesIncludeTax,
    lines: results,
    subtotal,
    discounts: discountTotal === 0 ? [] : [{ label: source.discountLabel, amount: discountTotal }],
    discountTotal,
    net,
    taxes: [...rows.values()].filter((r) => r.base !== 0 || r.amount !== 0),
    taxTotal,
    total,
    paid: 0,
    balance: total,
  };
}

/** A credit note for quantities of the invoice's own lines. */
export function planLineCredit(
  source: CreditSource,
  state: CreditState,
  request: readonly { index: number; quantity: number }[],
): CreditPlan {
  const seen = new Set<number>();
  for (const r of request) {
    const line = source.lines[r.index];
    if (!Number.isSafeInteger(r.index) || !line) {
      throw new DomainError('credit_line_not_found', 'A line to credit is not on this invoice.');
    }
    if (seen.has(r.index))
      throw new DomainError('credit_line_repeated', 'Each line can be credited once per note.');
    seen.add(r.index);
    if (!Number.isSafeInteger(r.quantity) || r.quantity < 0) {
      throw new DomainError('credit_quantity_invalid', 'Enter a quantity of zero or more.');
    }
    if (state.quantities[r.index]! + r.quantity > line.quantity) {
      throw new DomainError('credit_exceeds_quantity', 'This is more than is left to credit on the line.');
    }
  }
  const chosen = request.filter((r) => r.quantity > 0).sort((a, b) => a.index - b.index);
  if (chosen.length === 0) throw new DomainError('credit_nothing', 'Choose at least one line to credit.');
  const lines: PlannedCreditLine[] = chosen.map((r) => {
    const l = source.lines[r.index]!;
    const from = state.quantities[r.index]!;
    const to = from + r.quantity;
    const amount = amountAt(l, to) - amountAt(l, from);
    const discount = discountAt(l, to) - discountAt(l, from);
    const value = amount - discount;
    if (value < 0) {
      throw new DomainError('credit_too_small', 'This quantity is too small to credit on its own.');
    }
    return {
      index: r.index,
      group: l.group,
      quantity: r.quantity,
      unitPrice: l.unitPrice,
      tax: l.tax,
      amount,
      discount,
      value,
    };
  });
  const totals = buildNote(source, state, lines);
  if (totals.total <= 0)
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  return { lines, pricesIncludeTax: source.pricesIncludeTax, totals };
}

/**
 * A credit note for an amount, in the invoice's price basis: excluding tax when its prices exclude tax, including
 * tax when they include it. The amount is shared across the tax groups in proportion to the value each has left.
 */
export function planAmountCredit(source: CreditSource, state: CreditState, amount: number): CreditPlan {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  }
  const open = source.groups.filter((g) => state.groups[g.key]!.left > 0);
  const left = sumMinor(open.map((g) => state.groups[g.key]!.left));
  if (amount > left) {
    throw new DomainError('credit_exceeds_invoice', 'This is more than is left to credit on this invoice.');
  }
  const shares = allocate(
    amount,
    open.map((g) => state.groups[g.key]!.left),
  );
  const lines: PlannedCreditLine[] = open
    .map((g, i) => ({
      index: null,
      group: g.key,
      quantity: 1000,
      unitPrice: shares[i]!,
      tax: g.tax,
      amount: shares[i]!,
      discount: 0,
      value: shares[i]!,
    }))
    .filter((l) => l.value > 0);
  const totals = buildNote(source, state, lines);
  if (totals.total <= 0)
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  return { lines, pricesIncludeTax: source.pricesIncludeTax, totals };
}

/**
 * Refuses a credit note that is for nothing, for more than the balance still owed, or that credits a tax the
 * invoice did not show, or more of a tax or its base than the invoice showed once earlier credit notes are counted.
 * The planning functions already keep to these; this is checked again on every credit note before it is issued.
 */
export function checkCredit(args: {
  invoice: DocumentTotals;
  balance: number;
  earlier: readonly DocumentTotals[];
  credit: DocumentTotals;
}): void {
  const { invoice, balance, earlier, credit } = args;
  if (credit.total <= 0)
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  if (credit.total > balance) {
    throw new DomainError(
      'credit_exceeds_balance',
      'A credit note cannot be more than the balance still owed.',
    );
  }
  for (const row of credit.taxes) {
    const charged = invoice.taxes.find((r) => r.key === row.key);
    if (!charged) {
      throw new DomainError(
        'credit_tax_not_on_invoice',
        `The invoice did not charge ${row.name} at this rate.`,
      );
    }
    const before = earlier.flatMap((t) => t.taxes.filter((r) => r.key === row.key));
    const amount = sumMinor(before.map((r) => r.amount)) + row.amount;
    const base = sumMinor(before.map((r) => r.base)) + row.base;
    if (amount > charged.amount || base > charged.base) {
      throw new DomainError(
        'credit_exceeds_tax',
        `This would credit more ${row.name} than the invoice charged.`,
      );
    }
  }
}
