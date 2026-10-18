import { describe, expect, it } from 'vitest';
import { buildView, renderDocumentHtml, lineTaxLabel } from '../src/index';
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

describe('rendering', () => {
  it('renders every fixture with each template and escapes text', () => {
    for (const [name, s] of Object.entries(FIXTURES)) {
      for (const template of ['signature', 'studio', 'counsel']) {
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
});
