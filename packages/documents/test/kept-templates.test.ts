import { describe, expect, it } from 'vitest';
import { buildView, renderDocumentHtml } from '../src/index';
import { FIXTURES } from './fixtures';

/** Signature and Ticket after the design pass the owner approved on 25 October (docs/specs/invoice-templates.md). */

const fontUrl = (f: string) => f;
const bodyOf = (html: string) => html.slice(html.indexOf('<body'));

describe('Signature puts the amount due first', () => {
  it('on a slip before the parties and the lines', () => {
    const s = { ...FIXTURES.ukVat!, template: 'signature' };
    const v = buildView(s);
    const body = bodyOf(renderDocumentHtml(s, { fontUrl }));
    const slip = body.indexOf('class="slip"');
    expect(slip).toBeGreaterThan(-1);
    expect(body.indexOf(v.amountDue.value, slip)).toBeLessThan(body.indexOf(v.buyer.name));
    expect(body.indexOf(v.amountDue.value, slip)).toBeLessThan(body.indexOf(v.lines[0]!.title));
  });
});

describe('Ticket ends with a stub to pay from', () => {
  it('after a perforation: the amount, the bank details and the reference', () => {
    const s = { ...FIXTURES.ukVat!, template: 'ticket' };
    const v = buildView(s);
    const body = bodyOf(renderDocumentHtml(s, { fontUrl }));
    const perf = body.indexOf('class="perf"');
    expect(perf).toBeGreaterThan(-1);
    const stub = body.slice(perf);
    expect(stub).toContain(`Pay ${v.seller.name.replace('&', '&amp;')}`);
    expect(stub).toContain(v.amountDue.value);
    expect(stub).toContain('00-00-00');
    expect(stub).toContain(v.number);
  });
});
