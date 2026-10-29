import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, INVOICA_COLOUR, liftForNight, SIGNATURE_STYLES } from '@invoica/core';
import { buildView, creaseFold, renderDocumentHtml, TEMPLATE_LIST, TEMPLATES } from '../src/index';
import { FIXTURES } from './fixtures';

// docs/specs/invoice-templates.md, "Signature's styles, Powered by Invoica, and Monochrome", criteria 14 and 17 to 23.

const fontUrl = (f: string) => f;
const bodyOf = (html: string) => html.slice(html.indexOf('<body'));
const render = (template: string, extra: object = {}) =>
  bodyOf(renderDocumentHtml({ ...FIXTURES.ukVat!, template, ...extra }, { fontUrl }));

describe('Signature’s four styles', () => {
  it('are templates, listed once in the picker under Signature, Night head first', () => {
    for (const style of SIGNATURE_STYLES) expect(Object.keys(TEMPLATES)).toContain(style);
    const signature = TEMPLATE_LIST.find((t) => t.id === 'signature')!;
    expect(signature.styles?.map((s) => [s.id, s.name])).toEqual([
      ['signature', 'Night head'],
      ['signature-light', 'Light'],
      ['signature-route', 'Route'],
      ['signature-route-dark', 'Route on Night'],
    ]);
    for (const style of SIGNATURE_STYLES.slice(1))
      expect(TEMPLATE_LIST.some((t) => t.id === style)).toBe(false);
  });

  it('each put the amount due before the parties and the lines (criterion 14)', () => {
    const v = buildView(FIXTURES.ukVat!);
    for (const style of SIGNATURE_STYLES) {
      const body = render(style);
      const due = body.indexOf(v.amountDue.value);
      expect(due, style).toBeGreaterThan(-1);
      expect(due, style).toBeLessThan(body.indexOf(v.buyer.name));
      expect(due, style).toBeLessThan(body.indexOf(v.lines[0]!.title));
    }
    expect(render('signature-light')).toContain('class="slip"');
  });

  it('each end with “Powered by” and Invoica’s wordmark, on every plan (criterion 19)', () => {
    for (const style of SIGNATURE_STYLES)
      for (const madeWithInvoica of [true, false, undefined]) {
        const body = render(style, { madeWithInvoica });
        expect(body, style).toContain('Powered by');
        expect(body, style).toContain('aria-label="Invoica"');
        expect(body, style).not.toContain('Made with Invoica');
      }
  });

  it('no other template carries anything of Invoica, whatever the snapshot says (criterion 19)', () => {
    for (const template of Object.keys(TEMPLATES).filter((t) => !SIGNATURE_STYLES.includes(t)))
      for (const madeWithInvoica of [true, false]) {
        const body = render(template, { madeWithInvoica });
        expect(body, template).not.toContain('Powered by');
        expect(body, template).not.toContain('Made with Invoica');
      }
  });
});

describe('the Night head’s fold (criterion 18)', () => {
  it('starts the lighter part of the band on the crease’s own line', () => {
    const { line, tone } = creaseFold();
    // Points are in per cent of the number's box; the tone's edge is its first and last points.
    const [a, b] = line;
    const cross = (p: readonly [number, number]) =>
      (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const edge = [tone[0]!, tone[tone.length - 1]!];
    for (const p of edge) expect(Math.abs(cross(p))).toBeLessThan(1e-6);
    // the edge runs well past the band either way, and the lighter part lies past the crease (its right)
    expect(edge[0]![1]).toBeLessThan(-1000);
    expect(edge[1]![1]).toBeGreaterThan(1000);
    for (const p of tone.slice(1, -1)) expect(cross(p)).toBeGreaterThan(0);
  });

  it('draws the band and the number from the same fold for a short number and a long one', () => {
    const short = render('signature', { number: '7' });
    const long = render('signature', { number: 'INV-2026-000123' });
    for (const body of [short, long]) {
      expect(body).toContain('class="tone"');
      expect(body).toContain('class="t s past"');
    }
    const toneOf = (body: string) => /class="tone" style="([^"]+)"/.exec(body)?.[1];
    expect(toneOf(short)).toBeDefined();
    expect(toneOf(short)).toBe(toneOf(long));
  });
});

describe('Route (criterion 21)', () => {
  it('shows the days from issue to due, worked out from the business dates', () => {
    const s = FIXTURES.ukVat!;
    const v = buildView(s);
    expect(v.route).not.toBeNull();
    expect(v.route!.days).toBe(daysBetween(s.issueDate, s.dueDate!));
    for (const style of ['signature-route', 'signature-route-dark'])
      expect(render(style), style).toContain(`${v.route!.days} days to pay`);
  });

  it('says one day, and leaves the route out without a due date', () => {
    const s = FIXTURES.ukVat!;
    const next = { ...s, dueDate: addDays(s.issueDate, 1) };
    expect(buildView(next).route!.days).toBe(1);
    expect(render('signature-route', { dueDate: next.dueDate })).toContain('1 day to pay');
    expect(buildView({ ...s, dueDate: null }).route).toBeNull();
    expect(render('signature-route', { dueDate: null })).not.toContain('class="route"');
    const credit = {
      ...s,
      kind: 'credit_note' as const,
      dueDate: null,
      credits: { number: 'INV-0001', issueDate: s.issueDate, reason: 'Returned' },
    };
    expect(buildView(credit).route).toBeNull();
  });
});

describe('Monochrome (criterion 22)', () => {
  const greys = (body: string) => {
    const page = body.replace(/src="[^"]*"/g, '');
    const colours = [...page.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1]!.toLowerCase());
    return colours.filter((c) => !(c.slice(0, 2) === c.slice(2, 4) && c.slice(2, 4) === c.slice(4, 6)));
  };

  it('is the sixteenth, last in the picker', () => {
    expect(TEMPLATE_LIST).toHaveLength(16);
    expect(TEMPLATE_LIST.at(-1)!.id).toBe('monochrome');
    expect(TEMPLATE_LIST.at(-1)!.name).toBe('Monochrome');
  });

  it('renders every fixture in greys only, the logo set in grey', () => {
    const mono = TEMPLATES.monochrome;
    for (const [name, s] of Object.entries(FIXTURES)) {
      const v = buildView({ ...s, template: 'monochrome' });
      const css = mono.css(v);
      const body = mono.body(v, 'data:image/png;base64,AAAA');
      expect(greys(`${css}${body}${mono.footer.color}`), name).toEqual([]);
      expect(`${css}${body}`.toLowerCase()).not.toContain(s.seller.brandColour.toLowerCase());
      expect(css).toMatch(/img\{[^}]*filter:grayscale\(1\)/);
    }
  });
});

// docs/specs/invoice-templates.md, "Signature's Night accents in the business's colour", criteria 24 to 28.
describe('Signature’s Night accents in the business’s colour', () => {
  const MINT = '#6ce4a2';
  const LIME = '#cff26a';
  const inColour = (template: string, brandColour: string) =>
    renderDocumentHtml(
      { ...FIXTURES.ukVat!, template, seller: { ...FIXTURES.ukVat!.seller, brandColour } },
      { fontUrl },
    );
  const headOf = (html: string) =>
    html.slice(html.indexOf('<header class="head">'), html.indexOf('</header>'));
  const lifted = (brand: string) => ({
    accent: liftForNight(brand, 0.8, 0.11),
    light: liftForNight(brand, 0.87, 0.1),
    deep: liftForNight(brand, 0.68, 0.13),
  });

  it('the Night head’s labels, number past the crease, due date and line take the colour (24)', () => {
    for (const brand of ['#d9480f', '#1d3c5a']) {
      const html = inColour('signature', brand);
      const { accent, light, deep } = lifted(brand);
      expect(html, brand).toContain(`.head .lab{font-size:7.8pt;color:${accent}`);
      expect(html, brand).toMatch(new RegExp(`\\.fold \\.past\\{[^}]*color:${accent}`));
      expect(html, brand).toContain(`.due .when{font-size:8.8pt;color:${light}`);
      const head = headOf(html);
      expect(head, brand).toContain(`stop-color="${light}"`);
      expect(head, brand).toContain(`stop-color="${accent}"`);
      expect(head, brand).toContain(`stop-color="${deep}"`);
      for (const ours of [MINT, LIME, '#46da80', '#2fb3a6'])
        expect(head.toLowerCase(), brand).not.toContain(ours);
      expect(html.slice(html.indexOf('<style'), html.indexOf('</style>')), brand).not.toContain(MINT);
    }
  });

  it('Route on Night’s first stop and line follow the same colours (25)', () => {
    const brand = '#d9480f';
    const html = inColour('signature-route-dark', brand);
    const { accent, light, deep } = lifted(brand);
    expect(html).toMatch(new RegExp(`\\.dot\\{[^}]*background:${light}`));
    expect(html).toContain(
      `.track{position:relative;height:.8mm;border-radius:.4mm;background:linear-gradient(90deg,${light},${accent} 55%,${deep})}`,
    );
    expect(html).not.toContain(LIME);
  });

  it('a colour near grey gives silver, and Invoica’s own colour gives today’s (27)', () => {
    const grey = lifted('#2f3a3d');
    const html = inColour('signature', '#2f3a3d');
    expect(html).toContain(`.head .lab{font-size:7.8pt;color:${grey.accent}`);
    const own = inColour('signature', INVOICA_COLOUR);
    expect(own).toContain(`.head .lab{font-size:7.8pt;color:${MINT}`);
    expect(own).toContain(`.due .when{font-size:8.8pt;color:${LIME}`);
    expect(headOf(own)).toContain('stop-color="#cff26a"');
    expect(headOf(own)).toContain('stop-color="#46da80"');
    expect(headOf(own)).toContain('stop-color="#2fb3a6"');
    const route = inColour('signature-route-dark', INVOICA_COLOUR);
    expect(route).toContain(
      '.track{position:relative;height:.8mm;border-radius:.4mm;background:linear-gradient(90deg,#cff26a,#37c66b 55%,#138c86)}',
    );
  });

  it('the turned corner and how to pay keep the business’s colour; the styles on white are unchanged (28)', () => {
    const brand = '#d9480f';
    expect(inColour('signature', brand)).toMatch(new RegExp(`\\.flap\\{[^}]*${brand}`));
    for (const style of ['signature-light', 'signature-route']) {
      const before = inColour(style, brand);
      expect(before, style).toContain(LIME);
    }
  });
});
