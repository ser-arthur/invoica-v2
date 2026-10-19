import { DomainError } from './errors';
import { allocate, divRound, sumMinor, toSafeNumber, type RoundingMode } from './money';
import { lineAmount } from './quantity';
import {
  splitGross,
  taxCodeKey,
  taxesOnNet,
  type TaxCode,
  type TaxComponent,
  type TaxTreatment,
} from './tax';
import {
  computeDocumentDetail,
  summaryKey,
  type DocumentTotals,
  type LineResult,
  type TaxLevel,
  type TaxSummaryRow,
} from './totals';
import type { DocumentSnapshot } from './snapshot';

/**
 * Credit notes, worked out from the invoice as issued. The rules and their acceptance criteria are in
 * docs/specs/credit-notes.md. In short: the invoice is divided into slots, the places its tax was worked out (each
 * line when tax is per line, each tax code when it is on the total). Every credit note takes value from slots. A
 * slot's tax for what has been credited from it is the tax on that value alone, with the invoice's rounding, and
 * exactly what the invoice showed once the whole slot is credited. Each note takes that, less what earlier notes
 * actually took, so credits in any order and mix add up to the invoice exactly, row by row.
 */

export interface CreditSourceLine {
  quantity: number;
  unitPrice: number;
  tax: TaxCode | null;
  /** The invoice's line amount, quantity times unit price. */
  amount: number;
  /** The line's share of the invoice's discounts. */
  discount: number;
  /** The key of the slot the line's tax was worked out in. */
  slot: string;
}

/** A place the invoice's tax was worked out, with what the invoice showed for it. */
export interface CreditSlot {
  /** `line:<index>` when tax is per line, `code:<taxCodeKey>` when it is on the total. */
  key: string;
  tax: TaxCode | null;
  /** The slot's lines after discounts, in the invoice's price basis. */
  value: number;
  charged: boolean;
  /** What the invoice showed for each component of the slot's tax. */
  taxes: { component: TaxComponent; base: number; amount: number }[];
  /** Indexes of the slot's lines. */
  lines: number[];
}

export interface CreditSource {
  currency: string;
  pricesIncludeTax: boolean;
  taxLevel: TaxLevel;
  rounding: RoundingMode;
  lines: CreditSourceLine[];
  slots: CreditSlot[];
  /** The label of a credit note's discount row: the invoice's discount label, or "Discount". */
  discountLabel: string;
}

interface SourceInput {
  currency: string;
  pricesIncludeTax: boolean;
  taxLevel: TaxLevel;
  rounding: RoundingMode;
  lines: { quantity: number; unitPrice: number; tax: TaxCode | null }[];
}

const mismatch = (message: string) => new DomainError('credit_source_mismatch', message);

/**
 * What an invoice can credit, from the inputs it was issued with, the figures it showed and, when it kept them, its
 * slots. Without slots they are worked out again, and the invoice is refused when they do not come out as it showed.
 */
export function creditSource(
  input: SourceInput,
  totals: DocumentTotals,
  kept?: readonly CreditSlot[],
): CreditSource {
  if (totals.lines.length !== input.lines.length)
    throw mismatch('The invoice lines do not match its figures.');
  const slots = kept ? checkSlots(input, totals, kept) : workSlotsOut(input, totals);
  const slotOf = new Map<number, string>();
  for (const s of slots) for (const i of s.lines) slotOf.set(i, s.key);
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
      amount: totals.lines[i]!.amount,
      discount: totals.lines[i]!.discount,
      slot: slotOf.get(i)!,
    })),
    slots,
    discountLabel: labels.length === 1 ? labels[0]! : 'Discount',
  };
}

function workSlotsOut(input: SourceInput, totals: DocumentTotals): CreditSlot[] {
  // Each line keeps the discount share it had on the invoice, so the slots come out as the invoice did.
  const { totals: again, slots } = computeDocumentDetail({
    currency: input.currency,
    pricesIncludeTax: input.pricesIncludeTax,
    taxLevel: input.taxLevel,
    rounding: input.rounding,
    lines: input.lines.map((l, i) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      tax: l.tax,
      discount: totals.lines[i]!.discount,
    })),
  });
  const same =
    again.total === totals.total &&
    again.taxTotal === totals.taxTotal &&
    again.taxes.length === totals.taxes.length &&
    again.taxes.every((r) =>
      totals.taxes.some((t) => t.key === r.key && t.amount === r.amount && t.base === r.base),
    );
  if (!same) throw mismatch('The invoice figures cannot be worked out again.');
  return slots.map((s) => ({
    key: s.key,
    tax: s.code,
    value: s.value,
    charged: s.charged,
    taxes: s.taxes.map((t) => ({ component: t.component, base: t.base, amount: t.amount })),
    lines: s.lines,
  }));
}

/** Slots an invoice kept at issue, checked against its lines and its tax rows. */
function checkSlots(input: SourceInput, totals: DocumentTotals, kept: readonly CreditSlot[]): CreditSlot[] {
  const seen = new Set<number>();
  for (const s of kept) {
    for (const i of s.lines) {
      if (seen.has(i) || !input.lines[i] || taxCodeKey(input.lines[i]!.tax) !== taxCodeKey(s.tax)) {
        throw mismatch('The invoice’s slots do not match its lines.');
      }
      seen.add(i);
    }
    const value = sumMinor(s.lines.map((i) => totals.lines[i]!.amount - totals.lines[i]!.discount));
    if (value !== s.value) throw mismatch('The invoice’s slots do not match its lines.');
  }
  if (seen.size !== input.lines.length) throw mismatch('The invoice’s slots do not cover its lines.');
  // The tax rows the slots add up to, built the way the invoice built its rows.
  const sums = new Map<string, { base: number; amount: number }>();
  const add = (key: string, base: number, amount: number) => {
    const row = sums.get(key) ?? { base: 0, amount: 0 };
    row.base += base;
    row.amount += amount;
    sums.set(key, row);
  };
  for (const s of kept) {
    if (!s.tax) continue;
    if (s.tax.components.length === 0) add(JSON.stringify([s.tax.label, s.tax.treatment]), s.value, 0);
    for (const t of s.taxes) add(summaryKey(t.component, s.tax.treatment), t.base, t.amount);
  }
  const same =
    sums.size === totals.taxes.length &&
    totals.taxes.every((r) => sums.get(r.key)?.base === r.base && sums.get(r.key)?.amount === r.amount);
  if (!same) throw mismatch('The invoice’s slots do not add up to its tax.');
  return kept.map((s) => ({ ...s, taxes: s.taxes.map((t) => ({ ...t })), lines: [...s.lines] }));
}

/** The slots an invoice keeps in its snapshot at issue, so crediting never depends on working them out again. */
export function creditSlots(input: SourceInput, totals: DocumentTotals): CreditSlot[] {
  return workSlotsOut(input, totals);
}

/** The credit source for an issued invoice, from its snapshot. */
export function creditSourceOf(snapshot: DocumentSnapshot): CreditSource {
  return creditSource(
    {
      currency: snapshot.currency,
      pricesIncludeTax: snapshot.pricesIncludeTax,
      taxLevel: snapshot.taxLevel,
      rounding: snapshot.rounding,
      lines: snapshot.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, tax: l.tax })),
    },
    snapshot.totals,
    snapshot.slots,
  );
}

/** What one credit note took from one slot. */
export interface SlotTake {
  slot: string;
  value: number;
  /** For each component of the slot's tax, in its order. */
  taxes: { base: number; amount: number }[];
}

/** What one credit note took from the invoice. Credit notes keep it in their snapshot. */
export interface CreditTaken {
  /** Quantities of invoice lines, by position. */
  lines: { index: number; quantity: number }[];
  slots: SlotTake[];
}

export interface CreditState {
  /** Quantity of each invoice line credited so far. */
  quantities: number[];
  /** For each slot: its value, what has been credited and what is left, and the tax credited so far. */
  slots: Record<
    string,
    { value: number; credited: number; left: number; taxes: { base: number; amount: number }[] }
  >;
}

/** What earlier credit notes have taken from the invoice. */
export function creditState(source: CreditSource, earlier: readonly CreditTaken[]): CreditState {
  const quantities = source.lines.map(() => 0);
  const slots: CreditState['slots'] = {};
  for (const s of source.slots) {
    slots[s.key] = {
      value: s.value,
      credited: 0,
      left: s.value,
      taxes: s.taxes.map(() => ({ base: 0, amount: 0 })),
    };
  }
  for (const note of earlier) {
    for (const l of note.lines) {
      if (quantities[l.index] === undefined)
        throw mismatch('An earlier credit note credits a line not on the invoice.');
      quantities[l.index]! += l.quantity;
    }
    for (const t of note.slots) {
      const s = slots[t.slot];
      if (!s || t.taxes.length !== s.taxes.length)
        throw mismatch('An earlier credit note credits a tax not on the invoice.');
      s.credited += t.value;
      s.left = s.value - s.credited;
      t.taxes.forEach((x, k) => {
        s.taxes[k]!.base += x.base;
        s.taxes[k]!.amount += x.amount;
      });
    }
  }
  for (const [i, q] of quantities.entries()) {
    if (q > source.lines[i]!.quantity)
      throw mismatch('Earlier credit notes credit more of a line than was invoiced.');
  }
  for (const slot of source.slots) {
    const s = slots[slot.key]!;
    const over = s.taxes.some((t, k) => t.base > slot.taxes[k]!.base || t.amount > slot.taxes[k]!.amount);
    if (s.left < 0 || over) throw mismatch('Earlier credit notes credit more than was invoiced.');
  }
  return { quantities, slots };
}

/** A credit note line: an invoice line (by position) or, for an amount credit, a share at one tax code. */
export interface PlannedCreditLine {
  index: number | null;
  quantity: number;
  unitPrice: number;
  tax: TaxCode | null;
  amount: number;
  discount: number;
  value: number;
  /** The value the line takes from each slot. */
  from: { slot: string; value: number }[];
}

export interface CreditPlan {
  lines: PlannedCreditLine[];
  pricesIncludeTax: boolean;
  /** The credit note's figures. `lines` match the plan's lines in order. */
  totals: DocumentTotals;
  /** What the note takes from the invoice, for the ledger. */
  taken: CreditTaken;
}

const scaled = (whole: number, part: number, of: number) =>
  of === 0 ? 0 : toSafeNumber(divRound(BigInt(whole) * BigInt(part), BigInt(of), 'half-up'), 'credit');

/**
 * A slot's tax for each component once `credited` of its value has been credited: the tax on that value alone with
 * the invoice's rounding, never more than the slot showed, and exactly what it showed once all of it is.
 */
function slotTaxAt(source: CreditSource, s: CreditSlot, credited: number): number[] {
  if (credited === s.value) return s.taxes.map((t) => t.amount);
  const components = s.taxes.map((t) => t.component);
  const worked =
    source.pricesIncludeTax && s.charged
      ? splitGross(credited, components, source.rounding).taxes
      : taxesOnNet(credited, components, source.rounding);
  return worked.map((w, k) => Math.min(w.amount, s.taxes[k]!.amount));
}

const amountAt = (l: CreditSourceLine, quantity: number) =>
  quantity === 0 ? 0 : quantity === l.quantity ? l.amount : lineAmount(quantity, l.unitPrice, 'half-up');
const discountAt = (l: CreditSourceLine, quantity: number) => scaled(l.discount, quantity, l.quantity);

/** A credit too small to split into its tax and the rest, naming the slot where it could not be split. */
class TooSmall extends DomainError {
  constructor(readonly slot: string | null = null) {
    super('credit_too_small', 'This credit is too small to split into its tax and the rest.');
  }
}
const tooSmall = (slot: string | null = null) => new TooSmall(slot);

/**
 * Builds a credit note's figures from its lines, slot by slot. `cut` takes units of tax off a slot's components,
 * which only crediting everything still owed does.
 */
function buildNote(
  source: CreditSource,
  state: CreditState,
  lines: readonly PlannedCreditLine[],
  cut: ReadonlyMap<string, readonly number[]> = new Map(),
  settles = false,
): { totals: DocumentTotals; takes: SlotTake[] } {
  const results: LineResult[] = lines.map((l) => ({
    amount: l.amount,
    discount: l.discount,
    net: l.value,
    tax: 0,
  }));
  const charges = lines.map(() => false);
  const rows = new Map<string, TaxSummaryRow>();
  const takes: SlotTake[] = [];
  let taxTotal = 0;
  for (const s of source.slots) {
    const parts = lines.flatMap((l, i) =>
      l.from.filter((f) => f.slot === s.key).map((f) => ({ i, value: f.value })),
    );
    if (parts.length === 0) continue;
    const delta = sumMinor(parts.map((p) => p.value));
    const was = state.slots[s.key]!;
    const after = was.credited + delta;
    if (after > s.value) {
      throw new DomainError(
        'credit_exceeds_group',
        `This is more than is left to credit at ${s.tax?.label ?? 'no tax'}.`,
      );
    }
    const due = slotTaxAt(source, s, after);
    const less = cut.get(s.key);
    const amounts = s.taxes.map((_, k) => due[k]! - was.taxes[k]!.amount - (less?.[k] ?? 0));
    const rest = s.taxes.map((t, k) => t.amount - was.taxes[k]!.amount);
    const inclusive = source.pricesIncludeTax && s.charged;
    if (inclusive) {
      // The note's value must hold its tax (its net is never below zero), and what is left of the slot must still
      // hold the tax left to credit, so a later note is never below zero either.
      const most = delta;
      const least = sumMinor(rest) - (s.value - after);
      if (settles) {
        // A note that settles the balance moves its tax by at most one unit for each component to keep to both.
        let over = sumMinor(amounts) - most;
        for (let k = amounts.length - 1; k >= 0 && over > 0; k--) {
          if (amounts[k]! > 0) {
            amounts[k]! -= 1;
            over -= 1;
          }
        }
        let under = least - sumMinor(amounts);
        for (let k = 0; k < amounts.length && under > 0; k++) {
          if (amounts[k]! < rest[k]!) {
            amounts[k]! += 1;
            under -= 1;
          }
        }
      }
      const total = sumMinor(amounts);
      if (total > most || total < least) throw tooSmall(s.key);
    }
    if (amounts.some((a, k) => a < 0 || a > rest[k]!)) throw tooSmall(s.key);
    const charged = s.charged ? sumMinor(amounts) : 0;
    // Each tax is charged on the net the note takes from the slot, and a tax on tax on that net and the taxes before it.
    const net = inclusive ? delta - charged : delta;
    let before = 0;
    const taxes = s.taxes.map((t, k) => {
      const base = t.component.compound ? net + before : net;
      before += amounts[k]!;
      return { component: t.component, base, amount: amounts[k]! };
    });
    taxTotal += charged;
    // The slot's tax is shared across the note's lines in it by the value each takes, so the line shares add up.
    const shares = allocate(
      charged,
      parts.map((p) => p.value),
    );
    parts.forEach((p, j) => {
      results[p.i]!.tax += shares[j]!;
      charges[p.i] = inclusive;
    });
    takes.push({ slot: s.key, value: delta, taxes: taxes.map((t) => ({ base: t.base, amount: t.amount })) });
    const treatment: TaxTreatment = s.tax?.treatment ?? 'outside_scope';
    if (s.tax && s.tax.components.length === 0) {
      const key = JSON.stringify([s.tax.label, s.tax.treatment]);
      const row = rows.get(key) ?? {
        key,
        name: s.tax.label,
        ratePpm: 0,
        compound: false,
        treatment,
        base: 0,
        amount: 0,
        charged: s.charged,
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
        charged: s.charged,
      };
      row.base += t.base;
      row.amount += t.amount;
      rows.set(key, row);
    }
  }
  // With prices including tax, a line's value includes its tax; reverse-charge tax is never included.
  results.forEach((r, i) => {
    if (charges[i]) r.net -= r.tax;
  });
  const subtotal = sumMinor(results.map((r) => r.amount));
  const discountTotal = sumMinor(results.map((r) => r.discount));
  const net = sumMinor(results.map((r) => r.net));
  const total = net + taxTotal;
  return {
    totals: {
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
    },
    takes,
  };
}

function finish(
  source: CreditSource,
  state: CreditState,
  lines: PlannedCreditLine[],
  quantities: { index: number; quantity: number }[],
  cut?: ReadonlyMap<string, readonly number[]>,
  settles = false,
): CreditPlan {
  const { totals, takes } = buildNote(source, state, lines, cut, settles);
  if (totals.total <= 0)
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  return {
    lines,
    pricesIncludeTax: source.pricesIncludeTax,
    totals,
    taken: { lines: quantities, slots: takes },
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
      quantity: r.quantity,
      unitPrice: l.unitPrice,
      tax: l.tax,
      amount,
      discount,
      value,
      from: [{ slot: l.slot, value }],
    };
  });
  return finish(
    source,
    state,
    lines,
    chosen.map((r) => ({ index: r.index, quantity: r.quantity })),
  );
}

/** The slots with value left, in the invoice's order. */
function openSlots(source: CreditSource, state: CreditState) {
  return source.slots.filter((s) => state.slots[s.key]!.left > 0);
}

/** Amount lines for value taken from slots: one line for each tax code. */
function amountLines(slots: readonly CreditSlot[], shares: readonly number[]): PlannedCreditLine[] {
  const byCode = new Map<string, PlannedCreditLine>();
  slots.forEach((s, i) => {
    const value = shares[i]!;
    if (value <= 0) return;
    const key = taxCodeKey(s.tax);
    const l = byCode.get(key) ?? {
      index: null,
      quantity: 1000,
      unitPrice: 0,
      tax: s.tax,
      amount: 0,
      discount: 0,
      value: 0,
      from: [],
    };
    l.unitPrice += value;
    l.amount += value;
    l.value += value;
    l.from.push({ slot: s.key, value });
    byCode.set(key, l);
  });
  return [...byCode.values()];
}

/**
 * A credit note for an amount, in the invoice's price basis: excluding tax when its prices exclude tax, including
 * tax when they include it. The amount is shared across the slots in proportion to the value each has left.
 */
export function planAmountCredit(source: CreditSource, state: CreditState, amount: number): CreditPlan {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  }
  const open = openSlots(source, state);
  const lefts = open.map((s) => state.slots[s.key]!.left);
  if (amount > sumMinor(lefts)) {
    throw new DomainError('credit_exceeds_invoice', 'This is more than is left to credit on this invoice.');
  }
  return finish(source, state, amountLines(open, allocate(amount, lefts)), []);
}

/** The total of what is left to credit: the value left in every slot and the tax not yet credited. */
function totalLeft(source: CreditSource, state: CreditState): number {
  return sumMinor(
    source.slots.map((s) => {
      const st = state.slots[s.key]!;
      const tax = s.charged ? sumMinor(s.taxes.map((t, k) => t.amount - st.taxes[k]!.amount)) : 0;
      return source.pricesIncludeTax && s.charged ? st.left : st.left + tax;
    }),
  );
}

/** The largest amount whose credit note, shared as an amount credit, is not more than `limit`. */
function largestWithin(source: CreditSource, state: CreditState, limit: number): number {
  const open = openSlots(source, state);
  const lefts = open.map((s) => state.slots[s.key]!.left);
  const left = sumMinor(lefts);
  const fits = (v: number) => {
    if (v === 0) return true;
    try {
      return buildNote(source, state, amountLines(open, allocate(v, lefts))).totals.total <= limit;
    } catch {
      return false;
    }
  };
  let lo = 0;
  let hi = left;
  while (lo < hi) {
    const mid = hi - Math.floor((hi - lo) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  // Moving a unit between slots can make a larger amount fit where a smaller one did not; look a little further.
  for (let v = Math.min(left, lo + 4); v > lo; v--) if (fits(v)) return v;
  return lo;
}

/**
 * The most an amount credit can be while its credit note stays within `balance`: the balance itself when prices
 * include tax, and the largest amount before tax whose credit note is not more than the balance when they exclude it.
 */
export function amountLimit(source: CreditSource, state: CreditState, balance: number): number {
  const left = sumMinor(openSlots(source, state).map((s) => state.slots[s.key]!.left));
  if (balance <= 0) return 0;
  if (!source.pricesIncludeTax) return largestWithin(source, state, balance);
  // With prices including tax the amount is the note's total; step down past any amount too small to split.
  for (let v = Math.min(balance, left), tries = 0; v > 0 && tries < 64; v--, tries++) {
    try {
      planAmountCredit(source, state, v);
      return v;
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
    }
  }
  return 0;
}

/**
 * A credit note for exactly the balance still owed. With prices including tax it is an amount credit of the balance,
 * its tax moved by at most one unit for each component where needed. With prices excluding tax it first takes any tax
 * still to credit on slots whose value is all credited, then the largest value whose credit note is not more than the
 * balance; when that falls short, one more unit of value is credited and the note's tax is lowered by the difference,
 * at most one unit for each component, so the total is the balance.
 */
export function planBalanceCredit(source: CreditSource, state: CreditState, balance: number): CreditPlan {
  if (!Number.isSafeInteger(balance) || balance <= 0) {
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  }
  if (balance > totalLeft(source, state)) {
    throw new DomainError('credit_exceeds_invoice', 'This is more than is left to credit on this invoice.');
  }
  if (source.pricesIncludeTax) return settleIncludingTax(source, state, balance);
  const taxLeft = (s: CreditSlot) =>
    sumMinor(s.taxes.map((t, k) => t.amount - state.slots[s.key]!.taxes[k]!.amount));
  const residues = source.slots.filter((s) => s.charged && state.slots[s.key]!.left === 0 && taxLeft(s) > 0);
  const residueTax = sumMinor(residues.map(taxLeft));
  if (residues.length > 0 && residueTax >= balance) return takeTaxLeft(source, state, balance, residues);
  if (residues.length > 0) {
    try {
      return settleExcludingTax(source, state, balance, residues, residueTax);
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
    }
  }
  return settleExcludingTax(source, state, balance, [], 0);
}

/** A note that settles the balance from the tax left on fully credited slots alone, taking only as much as is owed. */
function takeTaxLeft(
  source: CreditSource,
  state: CreditState,
  balance: number,
  residues: readonly CreditSlot[],
): CreditPlan {
  let excess =
    sumMinor(
      residues.flatMap((s) => s.taxes.map((t, k) => t.amount - state.slots[s.key]!.taxes[k]!.amount)),
    ) - balance;
  const cut = new Map<string, number[]>();
  for (const s of [...residues].reverse()) {
    const less = s.taxes.map((t, k) => {
      const take = Math.min(excess, t.amount - state.slots[s.key]!.taxes[k]!.amount);
      excess -= take;
      return take;
    });
    cut.set(s.key, less);
  }
  return finish(source, state, settleLines([], [], residues), [], cut, true);
}

/** Amount lines for value taken from slots, with the tax left on fully credited slots taken as well. */
function settleLines(
  open: readonly CreditSlot[],
  shares: readonly number[],
  residues: readonly CreditSlot[],
): PlannedCreditLine[] {
  const lines = amountLines(open, shares);
  for (const s of residues) {
    const code = taxCodeKey(s.tax);
    const line = lines.find((l) => taxCodeKey(l.tax) === code);
    if (line) line.from.push({ slot: s.key, value: 0 });
    else
      lines.push({
        index: null,
        quantity: 1000,
        unitPrice: 0,
        tax: s.tax,
        amount: 0,
        discount: 0,
        value: 0,
        from: [{ slot: s.key, value: 0 }],
      });
  }
  return lines;
}

function settleExcludingTax(
  source: CreditSource,
  state: CreditState,
  balance: number,
  residues: readonly CreditSlot[],
  residueTax: number,
): CreditPlan {
  const open = openSlots(source, state);
  const lefts = open.map((s) => state.slots[s.key]!.left);
  const linesFor = (shares: readonly number[]) => settleLines(open, shares, residues);
  const noteFor = (shares: readonly number[]) => buildNote(source, state, linesFor(shares));
  let shares = allocate(largestWithin(source, state, balance - residueTax), lefts);
  // A unit added where the slot keeps value is tried first, so tax lowered on it can be taken up by a later note.
  const order = (current: readonly number[]) =>
    open
      .map((_, i) => i)
      .filter((i) => current[i]! < lefts[i]!)
      .sort((a, b) => Number(current[a]! + 1 === lefts[a]!) - Number(current[b]! + 1 === lefts[b]!));
  for (;;) {
    const now = noteFor(shares);
    if (now.totals.total === balance) return finish(source, state, linesFor(shares), [], undefined, true);
    let next: number[] | null = null;
    for (const i of order(shares)) {
      const slot = open[i]!;
      const more = shares.map((v, j) => (j === i ? v + 1 : v));
      const bigger = noteFor(more);
      const over = bigger.totals.total - balance;
      if (over <= 0) {
        next = more;
        break;
      }
      // One more unit of value at this slot goes past the balance: lower its tax by the difference.
      const was = now.takes.find((t) => t.slot === slot.key)?.taxes ?? slot.taxes.map(() => ({ amount: 0 }));
      const then = bigger.takes.find((t) => t.slot === slot.key)!.taxes;
      let rest = over;
      const cut = then.map((t, k) => {
        const take = Math.max(Math.min(rest, t.amount - was[k]!.amount), 0);
        rest -= take;
        return take;
      });
      if (rest === 0 && slot.charged) {
        const plan = finish(source, state, linesFor(more), [], new Map([[slot.key, cut]]), true);
        if (plan.totals.total === balance) return plan;
      }
    }
    if (!next) {
      throw new DomainError(
        'credit_balance_inexact',
        'The balance cannot be credited exactly in one note. Credit an amount instead.',
      );
    }
    shares = next;
  }
}

function settleIncludingTax(source: CreditSource, state: CreditState, balance: number): CreditPlan {
  const open = openSlots(source, state);
  const lefts = open.map((s) => state.slots[s.key]!.left);
  const attempt = (shares: readonly number[]) =>
    finish(source, state, amountLines(open, shares), [], undefined, true);
  const shares = allocate(balance, lefts);
  try {
    return attempt(shares);
  } catch (error) {
    if (!(error instanceof TooSmall) || error.slot === null) throw error;
    // The slot that could not hold its tax takes a unit or two more or less, from or to another slot.
    const i = open.findIndex((s) => s.key === error.slot);
    for (const d of [1, -1, 2, -2, 3, -3]) {
      for (let j = 0; j < open.length; j++) {
        if (j === i) continue;
        const moved = shares.map((v, k) => (k === i ? v + d : k === j ? v - d : v));
        if (moved.some((v, k) => v < 0 || v > lefts[k]!)) continue;
        try {
          return attempt(moved);
        } catch (again) {
          if (!(again instanceof DomainError)) throw again;
        }
      }
    }
    throw error;
  }
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
