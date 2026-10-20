import {
  formatBusinessDate,
  formatExchangeRate,
  formatMoney,
  formatQuantity,
  formatRate,
  mustShowLineDetail,
  sumMinor,
  type DocumentSnapshot,
  type PartyAddress,
  type SnapshotLine,
  type TaxCode,
} from '@invoica/core';

/** Everything a template prints, already worded and formatted. Templates only lay it out. */
export interface DocumentView {
  kind: DocumentSnapshot['kind'];
  heading: string;
  number: string;
  isDraft: boolean;
  dates: { label: string; value: string }[];
  seller: {
    name: string;
    legalName: string | null;
    addressLines: string[];
    contactLines: string[];
    taxLine: string | null;
    companyLine: string | null;
  };
  buyer: { name: string; contact: string | null; addressLines: string[]; detailLines: string[] };
  reference: string | null;
  title: string | null;
  summary: string | null;
  columns: {
    date: boolean;
    quantity: boolean;
    unitPrice: boolean;
    tax: boolean;
    quantityLabel: string;
    unitPriceLabel: string;
    taxLabel: string;
  };
  lines: {
    date: string | null;
    title: string;
    description: string | null;
    quantity: string | null;
    unitPrice: string | null;
    tax: string | null;
    amount: string;
  }[];
  totals: {
    label: string;
    value: string;
    kind: 'line' | 'tax' | 'discount' | 'total' | 'payment' | 'note';
  }[];
  amountDue: { label: string; value: string; dueLine: string | null };
  notes: string | null;
  terms: string | null;
  payment: { title: string; rows: { label: string; value: string }[] }[];
  paymentLink: string | null;
  reverseChargeNote: string | null;
  /** The rate VAT was converted to sterling at, on a UK VAT document in another currency. */
  sterlingRateNote: string | null;
  creditNote: string | null;
  legalLine: string;
  brandColour: string;
  /** Text colour that reads on the brand colour. */
  onBrand: string;
  currency: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  GH: 'Ghana',
  NG: 'Nigeria',
  KE: 'Kenya',
  ZA: 'South Africa',
  IE: 'Ireland',
  FR: 'France',
  DE: 'Germany',
  NL: 'Netherlands',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  IN: 'India',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
};

function addressLines(a: PartyAddress, sellerCountry: string | null): string[] {
  const place = [a.city, a.region].filter(Boolean).join(', ');
  const cityLine = [place, a.postcode].filter(Boolean).join(' ');
  const country =
    a.countryCode && a.countryCode !== sellerCountry ? (COUNTRY_NAMES[a.countryCode] ?? a.countryCode) : null;
  return [a.line1, a.line2, cityLine, country].filter((l): l is string => !!l && l.trim() !== '');
}

/** The rate printed in a line's tax column. */
export function lineTaxLabel(tax: TaxCode | null): string {
  if (!tax) return '';
  if (tax.components.length === 0) return tax.treatment === 'exempt' ? 'Exempt' : tax.label;
  const total = tax.components.every((c) => !c.compound)
    ? sumMinor(tax.components.map((c) => c.ratePpm))
    : null;
  const rate =
    total !== null ? formatRate(total) : tax.components.map((c) => formatRate(c.ratePpm)).join(' + ');
  return tax.treatment === 'reverse_charge' ? `${rate} RC` : rate;
}

/** Brand text colour: white on dark brand colours, near-black on light ones. */
export function readableOn(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum =
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return lum > 0.35 ? '#111a16' : '#ffffff';
}

const MINUS = String.fromCharCode(0x2212);

export function buildView(s: DocumentSnapshot, options: { draft?: boolean } = {}): DocumentView {
  const money = (amount: number) => formatMoney(amount, s.currency, { locale: s.locale });
  const date = (d: string) => formatBusinessDate(d, 'medium', s.locale);
  const isCredit = s.kind === 'credit_note';
  const isDraft = !!options.draft;
  const sellerCountry = s.seller.address.countryCode;
  const vatInvoice = s.seller.taxRegistered;
  const strictLines = mustShowLineDetail(s.seller, sellerCountry);
  const anyTax = s.lines.some(
    (l) => l.tax && (l.tax.components.length > 0 || l.tax.treatment !== 'outside_scope'),
  );
  const taxWord = sellerCountry === 'GB' || sellerCountry === 'GH' || sellerCountry === 'IE' ? 'VAT' : 'Tax';

  const style = s.lineStyle;
  const showQuantity = strictLines || style !== 'amount';
  const columns = {
    date: style === 'dated',
    quantity: showQuantity,
    unitPrice: showQuantity,
    tax: vatInvoice && anyTax,
    quantityLabel: style === 'hours' ? 'Hours' : 'Qty',
    unitPriceLabel: style === 'hours' || style === 'dated' ? 'Rate' : 'Unit price',
    taxLabel: taxWord,
  };

  const lines = s.lines.map((l: SnapshotLine) => ({
    date: l.serviceDate ? date(l.serviceDate) : null,
    title: l.title,
    description: l.description,
    quantity: showQuantity
      ? `${formatQuantity(l.quantity, s.locale)}${l.unit && style === 'quantity' ? ` ${l.unit}` : ''}`
      : null,
    unitPrice: showQuantity ? money(l.unitPrice) : null,
    tax: columns.tax ? lineTaxLabel(l.tax) : null,
    amount: money(l.amount),
  }));

  const t = s.totals;
  const totals: DocumentView['totals'] = [];
  // In Ghana the figure comes before NHIL and GETFund Levy as well as VAT.
  const beforeTax =
    sellerCountry === 'GH' ? 'Total before taxes' : `Total before ${taxWord === 'VAT' ? 'VAT' : 'tax'}`;
  // Every credit note from a registered seller prints the decrease before tax (docs/specs/credit-notes.md).
  const creditBeforeTax = isCredit && vatInvoice;
  const subtotalIsNet = t.discounts.length === 0 && !s.pricesIncludeTax;
  const hasAdjustments = t.discounts.length > 0 || t.taxes.some((r) => r.charged && r.amount > 0);
  if (creditBeforeTax && subtotalIsNet) {
    totals.push({ label: beforeTax, value: money(t.subtotal), kind: 'line' });
  } else if (hasAdjustments || s.paymentsShown.length > 0) {
    totals.push({ label: 'Subtotal', value: money(t.subtotal), kind: 'line' });
  }
  for (const d of t.discounts)
    totals.push({ label: d.label, value: `${MINUS}${money(d.amount)}`, kind: 'discount' });
  // The amount excluding tax is printed whenever it is not already the subtotal: after discounts, or when prices
  // include tax.
  if (!subtotalIsNet && (t.taxTotal > 0 || creditBeforeTax)) {
    totals.push({ label: beforeTax, value: money(t.net), kind: 'line' });
  }
  const charged = t.taxes.filter((r) => r.charged && r.ratePpm > 0);
  for (const r of charged) {
    const label = `${r.name} ${formatRate(r.ratePpm)}${s.pricesIncludeTax ? ' included' : ''}`;
    totals.push({ label, value: money(r.amount), kind: 'tax' });
  }
  if (sellerCountry === 'GH' && charged.length > 1) {
    totals.push({ label: 'Total NHIL, GETFund Levy and VAT', value: money(t.taxTotal), kind: 'tax' });
  }
  totals.push({ label: isCredit ? 'Total credited' : 'Total', value: money(t.total), kind: 'total' });
  for (const p of s.paymentsShown)
    totals.push({
      label: `${p.label}, ${date(p.paidOn)}`,
      value: `${MINUS}${money(p.amount)}`,
      kind: 'payment',
    });

  const reverse = t.taxes.filter((r) => !r.charged && r.amount > 0);
  // The HMRC wording applies to UK sellers only; elsewhere the note names the reverse charge and its figures. A UK
  // credit note asks the customer to adjust the output tax they accounted for.
  const reverseLead =
    s.seller.address.countryCode !== 'GB'
      ? 'Reverse charge.'
      : isCredit
        ? `Reverse charge: customer to account for the output tax adjustment of ${money(sumMinor(reverse.map((r) => r.amount)))} to HMRC.`
        : 'Reverse charge: customer to pay the VAT to HMRC.';
  const reverseChargeNote = reverse.length
    ? `${reverseLead} ${reverse.map((r) => `${r.name} ${formatRate(r.ratePpm)} of ${money(r.amount)} on ${money(r.base)}`).join('; ')}.`
    : null;

  const untaxed = t.taxes.filter((r) => r.charged && r.ratePpm === 0 && r.base > 0);
  for (const r of untaxed) {
    totals.push({
      label:
        r.treatment === 'zero'
          ? isCredit
            ? 'Zero-rated reduction'
            : 'Zero-rated supplies'
          : `${r.name} supplies`,
      value: money(r.base),
      kind: 'note',
    });
  }

  // VAT in sterling (docs/specs/vat-in-sterling.md): each figure converted once, with the rate it was converted at.
  const sterling = s.sterlingVat ?? null;
  if (sterling) {
    const pounds = (n: number) => formatMoney(n, 'GBP', { locale: s.locale });
    if (sterling.charged > 0)
      totals.push({
        label: isCredit ? 'VAT credited in sterling' : 'VAT in sterling',
        value: pounds(sterling.charged),
        kind: 'note',
      });
    if (sterling.reverseCharge > 0)
      totals.push({
        label: isCredit ? 'Reverse-charge VAT credited in sterling' : 'Reverse-charge VAT in sterling',
        value: pounds(sterling.reverseCharge),
        kind: 'note',
      });
  }
  const sterlingRateNote = sterling
    ? `VAT in sterling at £1 = ${formatExchangeRate(sterling.rate)} ${s.currency}, ${
        sterling.method === 'hmrc_period'
          ? `HMRC period rate for ${new Intl.DateTimeFormat(s.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${sterling.rateDate}T00:00:00Z`))}`
          : `UK market selling rate on ${formatBusinessDate(sterling.rateDate, 'long', s.locale)}`
      }.`
    : null;

  const dates: DocumentView['dates'] = [];
  dates.push({
    label: isCredit ? 'Date' : 'Issued',
    value: isDraft && !s.issueDate ? 'On issue' : date(s.issueDate),
  });
  if (s.servicePeriod)
    dates.push({ label: 'Period', value: `${date(s.servicePeriod.start)} to ${date(s.servicePeriod.end)}` });
  else if (s.supplyDate && (s.supplyDate !== s.issueDate || vatInvoice)) {
    dates.push({
      label: vatInvoice && sellerCountry === 'GB' ? 'Tax point' : 'Supplied',
      value: date(s.supplyDate),
    });
  }
  if (!isCredit && s.dueDate) dates.push({ label: 'Due', value: date(s.dueDate) });
  if (s.reference) dates.push({ label: 'Your reference', value: s.reference });

  const seller = s.seller;
  const legalName = seller.legalName && seller.legalName !== seller.name ? seller.legalName : null;
  const companyLine =
    seller.businessType === 'limited_company' && seller.companyNumber
      ? `${legalName ?? seller.name}, registered in ${sellerCountry === 'GB' ? 'England and Wales' : (COUNTRY_NAMES[sellerCountry ?? ''] ?? 'its country')}, company number ${seller.companyNumber}`
      : null;
  const taxLine =
    seller.taxRegistered && seller.taxNumber
      ? `${taxWord === 'VAT' ? 'VAT' : 'Tax'} number ${seller.taxNumber}`
      : null;

  const payment: DocumentView['payment'] = [];
  if (s.payment.bank) {
    const b = s.payment.bank;
    const rows = [
      { label: 'Account name', value: b.accountName },
      { label: 'Bank', value: b.bankName },
      { label: 'Sort code', value: b.sortCode },
      { label: 'Account number', value: b.accountNumber },
      { label: 'IBAN', value: b.iban },
      { label: 'SWIFT', value: b.swift },
    ].filter((r): r is { label: string; value: string } => !!r.value);
    if (rows.length) payment.push({ title: 'Bank transfer', rows });
  }
  if (s.payment.mobileMoney) {
    const m = s.payment.mobileMoney;
    const rows = [
      { label: 'Provider', value: m.provider },
      { label: 'Number', value: m.number },
      { label: 'Name', value: m.accountName },
    ].filter((r): r is { label: string; value: string } => !!r.value);
    if (rows.length) payment.push({ title: 'Mobile money', rows });
  }
  if (payment.length && !isCredit) {
    payment[0]!.rows.push({ label: 'Reference', value: isDraft ? 'Your invoice number' : s.number });
  }

  const due = isCredit ? t.total : s.balanceDue;
  return {
    kind: s.kind,
    heading: isCredit ? 'Credit note' : vatInvoice && sellerCountry === 'GB' ? 'VAT invoice' : 'Invoice',
    number: isDraft ? 'Draft' : s.number,
    isDraft,
    dates,
    seller: {
      name: seller.name,
      legalName,
      addressLines: addressLines(seller.address, null).filter(
        (l) => l !== COUNTRY_NAMES[sellerCountry ?? ''],
      ),
      contactLines: [seller.email, seller.phone, seller.website].filter((l): l is string => !!l),
      taxLine,
      companyLine,
    },
    buyer: {
      name: s.buyer.name,
      contact: s.buyer.contactName,
      addressLines: addressLines(s.buyer.address, sellerCountry),
      detailLines: [
        ...(s.buyer.taxNumber ? [`${taxWord === 'VAT' ? 'VAT' : 'Tax'} number ${s.buyer.taxNumber}`] : []),
        ...s.buyer.fields.map((f) => `${f.label}: ${f.value}`),
      ],
    },
    reference: s.reference,
    title: s.title,
    summary: s.summary,
    columns,
    lines,
    totals,
    amountDue: {
      label: isCredit ? 'Amount credited' : s.paymentsShown.length ? 'Balance due' : 'Amount due',
      value: money(due),
      dueLine: isCredit ? null : s.dueDate ? `Due ${formatBusinessDate(s.dueDate, 'long', s.locale)}` : null,
    },
    notes: s.notes,
    terms: s.terms,
    payment: isCredit ? [] : payment,
    paymentLink: isCredit ? null : s.payment.paymentLink,
    reverseChargeNote,
    sterlingRateNote,
    creditNote: s.credits
      ? `Credits invoice ${s.credits.number} of ${date(s.credits.issueDate)}. Reason: ${s.credits.reason}`
      : null,
    legalLine: [companyLine ?? legalName ?? seller.name, taxLine].filter(Boolean).join('. '),
    brandColour: seller.brandColour,
    onBrand: readableOn(seller.brandColour),
    currency: s.currency,
  };
}
