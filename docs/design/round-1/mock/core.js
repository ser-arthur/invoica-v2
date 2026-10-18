// Totals and formatting for the template mocks. Amounts are integers in minor units;
// quantities are integers in thousandths; tax rates are integers in basis points.
'use strict';

function roundHalfUp(numerator, denominator) {
  const q = Math.floor(numerator / denominator);
  const r = numerator - q * denominator;
  return 2 * r >= denominator ? q + 1 : q;
}

function lineAmount(line) {
  return roundHalfUp(Math.round(line.qty * 1000) * line.unitMinor, 1000);
}

function totals(doc) {
  const lines = doc.lines.map((l) => ({ ...l, amountMinor: lineAmount(l) }));
  const subtotal = lines.reduce((s, l) => s + l.amountMinor, 0);
  const discount = doc.discount ? doc.discount.amountMinor : 0;
  const taxMap = new Map();
  for (const l of lines) {
    for (const t of l.taxes || []) {
      const key = `${t.name}|${t.rateBp}`;
      const entry = taxMap.get(key) || { name: t.name, rateBp: t.rateBp, baseMinor: 0, taxMinor: 0 };
      entry.baseMinor += l.amountMinor;
      taxMap.set(key, entry);
    }
    if (!(l.taxes || []).length && doc.showNoTaxBand) {
      const key = `none`;
      const entry = taxMap.get(key) || { name: doc.showNoTaxBand, rateBp: null, baseMinor: 0, taxMinor: 0 };
      entry.baseMinor += l.amountMinor;
      taxMap.set(key, entry);
    }
  }
  const taxes = [...taxMap.values()].map((t) => ({ ...t, taxMinor: t.rateBp == null ? 0 : roundHalfUp(t.baseMinor * t.rateBp, 10000) }));
  const taxTotal = taxes.reduce((s, t) => s + t.taxMinor, 0);
  const total = subtotal - discount + taxTotal;
  const paid = (doc.payments || []).reduce((s, p) => s + p.amountMinor, 0);
  return { lines, subtotal, discount, taxes, taxTotal, total, paid, due: total - paid };
}

function money(doc) {
  const nf = new Intl.NumberFormat(doc.locale, { style: 'currency', currency: doc.currency });
  const exp = nf.resolvedOptions().maximumFractionDigits;
  const plain = new Intl.NumberFormat(doc.locale, { minimumFractionDigits: exp, maximumFractionDigits: exp });
  return {
    fmt: (minor) => nf.format(minor / 10 ** exp),
    num: (minor) => plain.format(minor / 10 ** exp),
  };
}

function date(doc, iso, style = 'long') {
  const [y, m, d] = iso.split('-').map(Number);
  const opts = style === 'short' ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(doc.locale, { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function qty(n) {
  return Number.isInteger(n) ? String(n) : String(n).replace(/0+$/, '');
}

function rate(bp) {
  return `${(bp / 100).toString()}%`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { totals, money, date, qty, rate, esc, lineAmount };
