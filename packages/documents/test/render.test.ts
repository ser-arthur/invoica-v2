import { describe, expect, it } from 'vitest';
import {
  buildView,
  BUSINESS_KINDS,
  renderDocumentHtml,
  lineTaxLabel,
  RETIRED_TEMPLATES,
  TEMPLATE_LIST,
  TEMPLATES,
} from '../src/index';
import { FIXTURES } from './fixtures';

const fontUrl = (f: string) => `/fonts/${f}`;

describe('document view', () => {
  it('shows quantity, unit price and the VAT rate on every line of a UK VAT invoice, even in amount-only style', () => {
    const s = { ...FIXTURES.ukVat!, lineStyle: 'amount' as const };
    const v = buildView(s);
    expect(v.heading).toBe('VAT invoice');
    expect(v.columns).toMatchObject({ quantity: true, unitPrice: true, tax: true });
    expect(v.lines.every((l) => l.tax === '20%')).toBe(true);
    expect(v.dates.map((d) => d.label)).toContain('Tax point');
    expect(v.seller.taxLine).toBe('VAT number GB 000 0000 00');
    expect(v.seller.companyLine).toMatch(/company number 00000000/);
  });

  it('shows only title and amount for a freelancer who is not registered', () => {
    const v = buildView(FIXTURES.freelancerAmounts!);
    expect(v.heading).toBe('Invoice');
    expect(v.columns).toMatchObject({ quantity: false, unitPrice: false, tax: false });
    expect(v.totals.map((t) => t.label)).toEqual(['Subtotal', 'Returning client', 'Total']);
  });

  it('lists NHIL, GETFund Levy and VAT separately with their total for Ghana', () => {
    const v = buildView(FIXTURES.ghana!);
    expect(v.totals.filter((t) => t.kind === 'tax').map((t) => t.label)).toEqual([
      'NHIL 2.5%',
      'GETFund Levy 2.5%',
      'VAT 15%',
      'Total NHIL, GETFund Levy and VAT',
    ]);
    expect(v.lines[0]?.tax).toBe('20%');
  });

  it('takes a deposit off to show the balance due', () => {
    const v = buildView(FIXTURES.ukVat!);
    expect(v.amountDue.label).toBe('Balance due');
    expect(v.totals.at(-1)?.kind).toBe('payment');
  });

  it('labels reverse-charge lines', () => {
    expect(
      lineTaxLabel({
        label: 'RC',
        treatment: 'reverse_charge',
        components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
      }),
    ).toBe('20% RC');
    expect(lineTaxLabel({ label: 'Exempt', treatment: 'exempt', components: [] })).toBe('Exempt');
  });
});

describe('the total before tax (review 2, R2-M3)', () => {
  it('is shown when prices include VAT, so the amount excluding VAT is on the document', () => {
    const s = { ...FIXTURES.ukVat!, pricesIncludeTax: true };
    const row = buildView(s).totals.find((t) => t.label === 'Total before VAT');
    expect(row?.value).toBe('£5,600.00');
  });
});

describe('reverse charge note (review L7)', () => {
  const reverseRow = {
    key: 'rc',
    name: 'VAT',
    ratePpm: 200_000,
    compound: false,
    treatment: 'reverse_charge' as const,
    base: 10_000,
    amount: 2000,
    charged: false,
  };
  const withReverse = (countryCode: string) => {
    const s = FIXTURES.ukVat!;
    return {
      ...s,
      seller: { ...s.seller, address: { ...s.seller.address, countryCode } },
      totals: { ...s.totals, taxes: [reverseRow] },
    };
  };

  it('names HMRC only for a UK seller', () => {
    expect(buildView(withReverse('GB')).reverseChargeNote).toMatch(/HMRC/);
    const other = buildView(withReverse('GH')).reverseChargeNote;
    expect(other).not.toMatch(/HMRC/);
    expect(other).toMatch(/^Reverse charge\. VAT 20%/);
  });
});

describe('rendering', () => {
  it('renders every fixture with every template, offered or retired, and escapes text', () => {
    expect(TEMPLATE_LIST).toHaveLength(16);
    expect(Object.keys(TEMPLATES)).toHaveLength(23);
    for (const [name, s] of Object.entries(FIXTURES)) {
      for (const template of Object.keys(TEMPLATES)) {
        const html = renderDocumentHtml(
          { ...s, template, buyer: { ...s.buyer, name: `${s.buyer.name} <b>&</b>` } },
          { fontUrl },
        );
        expect(html, name).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
        expect(html).not.toContain('<b>&</b>');
        expect(html).toContain('@font-face');
      }
    }
  });

  it('marks drafts', () => {
    expect(renderDocumentHtml(FIXTURES.ukVat!, { fontUrl, draft: true })).toContain('draft-mark');
  });

  it('marks a voided document across the page when shown on screen', () => {
    const html = renderDocumentHtml(FIXTURES.ukVat!, { fontUrl, voided: true });
    expect(html).toContain('class="void-mark"');
    expect(html).toContain('>VOID<');
    expect(renderDocumentHtml(FIXTURES.ukVat!, { fontUrl })).not.toContain('class="void-mark"');
  });
});

describe('the template list (docs/specs/invoice-templates.md)', () => {
  it('offers the sixteen in order, Signature first and Monochrome last', () => {
    expect(TEMPLATE_LIST.map((t) => t.id)).toEqual([
      'signature',
      'sticker',
      'riso',
      'marquee',
      'atelier',
      'bloom',
      'mark',
      'billboard',
      'grid',
      'trade',
      'statement',
      'practice',
      'heritage',
      'letter',
      'ticket',
      'monochrome',
    ]);
  });

  it('names the four retired, and the offered, their styles and the retired together are every template', () => {
    expect(RETIRED_TEMPLATES.map((t) => t.name)).toEqual(['Studio', 'Counsel', 'Ledger', 'Poster']);
    const styles = TEMPLATE_LIST.flatMap((t) => (t.styles ?? []).map((st) => st.id));
    const ids = [
      ...new Set([...TEMPLATE_LIST.map((t) => t.id), ...styles, ...RETIRED_TEMPLATES.map((t) => t.id)]),
    ].sort();
    expect(ids).toEqual(Object.keys(TEMPLATES).sort());
  });

  it('gives every offered template a feel and at least one kind of business, and every kind a template', () => {
    for (const t of TEMPLATE_LIST) {
      expect(['playful', 'in between', 'grounded']).toContain(t.feel);
      expect(t.kinds.length, t.id).toBeGreaterThan(0);
    }
    for (const k of BUSINESS_KINDS)
      expect(
        TEMPLATE_LIST.some((t) => t.kinds.includes(k.id)),
        k.id,
      ).toBe(true);
  });
});
