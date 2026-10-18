import { DomainError } from './errors';
import { allocate, divRound, sumMinor, toSafeNumber, type RoundingMode } from './money';
import { taxCodeKey, type TaxCode } from './tax';
import {
  computeDocument,
  type DocumentInput,
  type DocumentTotals,
  type LineResult,
  type TaxLevel,
  type TaxSummaryRow,
} from './totals';

/** An invoice line as a credit note sees it: what was invoiced, and its share of the invoice's discounts. */
export interface CreditSourceLine {
  quantity: number;
  unitPrice: number;
  tax: TaxCode | null;
  /** The line's share of the invoice's discounts, in minor units. */
  discount: number;
  /** The invoice's figures for this line. */
  result: LineResult;
}

export interface CreditSource {
  currency: string;
  pricesIncludeTax: boolean;
  taxLevel: TaxLevel;
  rounding: RoundingMode;
  lines: CreditSourceLine[];
  /** The label of the discount row on a credit note: the invoice's discount label, or "Discount". */
  discountLabel: string;
}

/** What a credit note can credit, from the invoice's stored inputs and the figures they gave at issue. */
export function creditSource(input: DocumentInput, totals: DocumentTotals): CreditSource {
  if (totals.lines.length !== input.lines.length) {
    throw new DomainError('credit_source_mismatch', 'The invoice lines do not match its figures.');
  }
  const labels = totals.discounts.map((d) => d.label);
  return {
    currency: input.currency,
    pricesIncludeTax: input.pricesIncludeTax,
    taxLevel: input.taxLevel,
    rounding: input.rounding,
    lines: input.lines.map((l, i) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      tax: l.tax,
      discount: totals.lines[i]!.discount,
      result: totals.lines[i]!,
    })),
    discountLabel: labels.length === 1 ? labels[0]! : 'Discount',
  };
}

/** A credit note line: an invoice line (by position) or, for an amount credited, a share at one tax rate. */
export interface PlannedCreditLine {
  index: number | null;
  quantity: number;
  unitPrice: number;
  tax: TaxCode | null;
}

export interface CreditPlan {
  lines: PlannedCreditLine[];
  pricesIncludeTax: boolean;
  /** The credit note's figures. `lines` match the plan's lines in order. */
  totals: DocumentTotals;
}

/**
 * The invoice's figures for the quantities credited so far. Each line keeps the invoice's price and tax, and its
 * discount share in proportion to the quantity; at the full quantity this is the invoice itself.
 */
function portion(source: CreditSource, quantities: readonly number[]): DocumentTotals {
  const included = source.lines.map((_, i) => i).filter((i) => (quantities[i] ?? 0) > 0);
  const totals = computeDocument({
    currency: source.currency,
    pricesIncludeTax: source.pricesIncludeTax,
    taxLevel: source.taxLevel,
    rounding: source.rounding,
    lineDiscountLabel: source.discountLabel,
    lines: included.map((i) => {
      const l = source.lines[i]!;
      const q = quantities[i]!;
      // At the full quantity this is exactly the line's share.
      const discount = toSafeNumber(
        divRound(BigInt(l.discount) * BigInt(q), BigInt(l.quantity), 'half-up'),
        'discount',
      );
      return { quantity: q, unitPrice: l.unitPrice, tax: l.tax, discount };
    }),
  });
  // Lines with nothing credited take no part in the calculation and have no figures.
  const results = source.lines.map(() => ({ amount: 0, discount: 0, net: 0, tax: 0 }));
  included.forEach((i, j) => {
    results[i] = totals.lines[j]!;
  });
  return { ...totals, lines: results };
}

function difference(after: DocumentTotals, before: DocumentTotals): DocumentTotals {
  const rows = new Map<string, TaxSummaryRow>();
  for (const r of after.taxes) rows.set(r.key, { ...r });
  for (const r of before.taxes) {
    const row = rows.get(r.key) ?? { ...r, base: 0, amount: 0 };
    row.base -= r.base;
    row.amount -= r.amount;
    rows.set(r.key, row);
  }
  const discountTotal = after.discountTotal - before.discountTotal;
  const label = after.discounts[0]?.label ?? before.discounts[0]?.label ?? 'Discount';
  const total = after.total - before.total;
  return {
    currency: after.currency,
    pricesIncludeTax: after.pricesIncludeTax,
    lines: after.lines.map((l, i) => {
      const b = before.lines[i]!;
      return {
        amount: l.amount - b.amount,
        discount: l.discount - b.discount,
        net: l.net - b.net,
        tax: l.tax - b.tax,
      };
    }),
    subtotal: after.subtotal - before.subtotal,
    discounts: discountTotal === 0 ? [] : [{ label, amount: discountTotal }],
    discountTotal,
    net: after.net - before.net,
    taxes: [...rows.values()].filter((r) => r.base !== 0 || r.amount !== 0),
    taxTotal: after.taxTotal - before.taxTotal,
    total,
    paid: 0,
    balance: total,
  };
}

/**
 * A credit note for quantities of the invoice's own lines. `credited` holds the quantity of each line already
 * credited by earlier credit notes. The figures are the invoice's figures for everything credited once this
 * note is issued, less those for everything credited before it, so credit notes taken in parts add up to the
 * invoice exactly.
 */
export function planLineCredit(
  source: CreditSource,
  credited: readonly number[],
  request: readonly { index: number; quantity: number }[],
): CreditPlan {
  if (credited.length !== source.lines.length) {
    throw new DomainError('credit_source_mismatch', 'The invoice lines do not match what was credited.');
  }
  const seen = new Set<number>();
  const after = [...credited];
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
    if (credited[r.index]! + r.quantity > line.quantity) {
      throw new DomainError('credit_exceeds_quantity', 'This is more than is left to credit on the line.');
    }
    after[r.index] = credited[r.index]! + r.quantity;
  }
  const chosen = request.filter((r) => r.quantity > 0).sort((a, b) => a.index - b.index);
  if (chosen.length === 0) throw new DomainError('credit_nothing', 'Choose at least one line to credit.');
  const totals = difference(portion(source, after), portion(source, credited));
  return {
    lines: chosen.map((r) => ({
      index: r.index,
      quantity: r.quantity,
      unitPrice: source.lines[r.index]!.unitPrice,
      tax: source.lines[r.index]!.tax,
    })),
    pricesIncludeTax: source.pricesIncludeTax,
    totals: { ...totals, lines: chosen.map((r) => totals.lines[r.index]!) },
  };
}

/**
 * A credit note for an amount, including tax. The amount is shared across the tax rates on the invoice in
 * proportion to what was invoiced at each, and each share is split into its tax and the amount before tax.
 */
export function planAmountCredit(source: CreditSource, invoice: DocumentTotals, gross: number): CreditPlan {
  if (!Number.isSafeInteger(gross) || gross <= 0) {
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  }
  const groups = new Map<string, { tax: TaxCode | null; weight: number }>();
  source.lines.forEach((l, i) => {
    const key = taxCodeKey(l.tax);
    const r = invoice.lines[i]!;
    const group = groups.get(key) ?? { tax: l.tax, weight: 0 };
    group.weight += r.net + r.tax;
    groups.set(key, group);
  });
  const list = [...groups.values()].filter((g) => g.weight > 0);
  if (list.length === 0) throw new DomainError('credit_nothing', 'This invoice has nothing to credit.');
  const shares = allocate(
    gross,
    list.map((g) => g.weight),
  );
  const lines = list
    .map((g, i) => ({ index: null, quantity: 1000, unitPrice: shares[i]!, tax: g.tax }))
    .filter((l) => l.unitPrice > 0);
  const totals = computeDocument({
    currency: source.currency,
    pricesIncludeTax: true,
    taxLevel: source.taxLevel,
    rounding: source.rounding,
    lines,
  });
  return { lines, pricesIncludeTax: true, totals };
}

/**
 * Refuses a credit note that is for nothing, for more than the balance still owed, or that credits a tax the
 * invoice did not charge or more of it than was charged once earlier credit notes are counted.
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
    const before = sumMinor(
      earlier.flatMap((t) => t.taxes.filter((r) => r.key === row.key).map((r) => r.amount)),
    );
    if (before + row.amount > charged.amount) {
      throw new DomainError(
        'credit_exceeds_tax',
        `This would credit more ${row.name} than the invoice charged.`,
      );
    }
  }
}
