import { describe, expect, it } from 'vitest';
import type { DocumentSnapshot } from '@invoica/core';
import { buildView, renderDocumentHtml, TEMPLATE_LIST } from '../src/index';
import { FIXTURES } from './fixtures';

/** docs/specs/vat-in-sterling.md, criteria 6 and 7: the VAT in sterling and the rate it was converted at. */

const euro: DocumentSnapshot = {
  ...FIXTURES.ukVat!,
  currency: 'EUR',
  sterlingVat: {
    rate: 1_150_000,
    method: 'hmrc_period',
    rateDate: '2026-10-01',
    charged: 97_391,
    reverseCharge: 0,
  },
};

describe('VAT in sterling on the document', () => {
  it('an invoice shows its VAT in sterling and the HMRC period rate', () => {
    const v = buildView(euro);
    expect(v.totals.find((t) => t.label === 'VAT in sterling')?.value).toBe('£973.91');
    expect(v.sterlingRateNote).toBe('VAT in sterling at £1 = 1.1500 EUR, HMRC period rate for October 2026.');
  });

  it('a market rate names the date', () => {
    const v = buildView({
      ...euro,
      sterlingVat: { ...euro.sterlingVat!, method: 'market', rateDate: '2026-10-16' },
    });
    expect(v.sterlingRateNote).toBe(
      'VAT in sterling at £1 = 1.1500 EUR, UK market selling rate on 16 October 2026.',
    );
  });

  it('reverse-charge VAT is shown in sterling on its own', () => {
    const v = buildView({
      ...euro,
      sterlingVat: { ...euro.sterlingVat!, charged: 0, reverseCharge: 17_391 },
    });
    expect(v.totals.find((t) => t.label === 'Reverse-charge VAT in sterling')?.value).toBe('£173.91');
    expect(v.totals.map((t) => t.label)).not.toContain('VAT in sterling');
  });

  it('a credit note shows the VAT it credits in sterling', () => {
    const v = buildView({ ...euro, kind: 'credit_note', paymentsShown: [] });
    expect(v.totals.find((t) => t.label === 'VAT credited in sterling')?.value).toBe('£973.91');
  });

  it('every template prints the figure and the rate', () => {
    for (const { id: template } of TEMPLATE_LIST) {
      const html = renderDocumentHtml({ ...euro, template }, { fontUrl: (f) => `/fonts/${f}` });
      expect(html, template).toContain('VAT in sterling');
      expect(html, template).toContain('£973.91');
      expect(html, template).toContain('£1 = 1.1500 EUR');
    }
  });

  it('a document without it shows neither', () => {
    const v = buildView(FIXTURES.ukVat!);
    expect(v.sterlingRateNote).toBeNull();
    expect(v.totals.map((t) => t.label).join(' ')).not.toMatch(/sterling/);
  });
});
