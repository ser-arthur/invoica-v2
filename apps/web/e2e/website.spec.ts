import { expect, test, type Page } from '@playwright/test';
import { creaseSegment } from '../src/components/site/fold';
import { signUpAndOnboard } from './helpers';

// docs/specs/website.md

// The site's checks measure the page at rest: its motion stops for visitors who ask for less of it.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the home page leads with one headline, and every way in goes to sign-up or sign-in', async ({
  page,
}) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAccessibleName('Every invoice, all the way to paid.');

  const create = page.getByRole('link', { name: /^Create (your )?free account$/ });
  expect(await create.count()).toBeGreaterThanOrEqual(2);
  for (const link of await create.all()) await expect(link).toHaveAttribute('href', '/sign-up');
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toHaveAttribute('href', '/sign-in');
});

test('the money-in chart is announced month by month', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('img', {
      name: /May £4,200.*June £6,850.*July £5,100.*August £7,420.*September £6,300.*October so far £7,610/,
    }),
  ).toBeAttached();
});

test('the email on the tear-off slip arrives filled in on the sign-up form', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your email').fill('new.owner@lindenrowe.example');
  await page.getByRole('button', { name: 'Create your free account' }).click();
  await page.waitForURL(/\/sign-up\?email=/);
  await expect(page.locator('#email')).toHaveValue('new.owner@lindenrowe.example');

  await page.goto('/sign-up?email=not%20an%20email');
  await expect(page.locator('#email')).toHaveValue('');
});

test('the home page never scrolls sideways on a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `at ${width} pixels`).toBeLessThanOrEqual(client);
  }
});

test('signed in, the home page opens the dashboard', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The same at every width.');
  await signUpAndOnboard(page, 'Home Page Studio');
  await page.goto('/');
  await page.waitForURL('**/dashboard');
});

test('the crease crosses the headline and nothing else in the hero, at every width', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'The widths are set in the test.');
  for (const width of [1920, 1440, 1180, 1024, 961, 800, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    const box = await heading.locator('xpath=..').boundingBox();
    expect(box).not.toBeNull();
    const { from, to } = creaseSegment(box!);
    const yAt = (x: number) => from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x);
    const hero = page.locator('main section').first();
    const others = [
      hero.getByText('Look established from day one'),
      hero.getByRole('link', { name: 'Create your free account' }),
      hero.getByRole('link', { name: 'How it works' }),
      hero.getByText('For new businesses'),
      hero.getByText('No card needed'),
    ];
    for (const other of others) {
      const b = (await other.boundingBox())!;
      const name = await other.textContent();
      for (let x = Math.max(b.x, to.x); x <= Math.min(b.x + b.width, from.x); x += 2) {
        const y = yAt(x);
        const clear = y < b.y - 8 || y > b.y + b.height + 8;
        expect(clear, `${name} at ${width} pixels`).toBe(true);
      }
    }
    const h = (await heading.boundingBox())!;
    const crosses = [h.x + h.width * 0.3, h.x + h.width * 0.6].some(
      (x) => yAt(x) > h.y && yAt(x) < h.y + h.height,
    );
    expect(crosses, `the headline at ${width} pixels`).toBe(true);
  }
});

test('the footer carries the planned pages and the ways in', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  const planned: [string, string][] = [
    ['About', '/about'],
    ['Contact', '/contact'],
    ['Help centre', '/help'],
    ['Getting started', '/help/getting-started'],
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
    ['Cookies', '/cookies'],
    ['Pricing', '/pricing'],
    ['Sign in', '/sign-in'],
    ['Create free account', '/sign-up'],
  ];
  for (const [name, href] of planned) {
    await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
});

test('the header stays in view while the page scrolls under it', async ({ page }, info) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 2400));
  const banner = page.getByRole('banner');
  const box = (await banner.boundingBox())!;
  expect(box.y).toBe(0);
  // On a phone the way in is in the menu.
  const way =
    info.project.name === 'phone'
      ? banner.locator('summary')
      : banner.getByRole('link', { name: 'Create free account' });
  await expect(way).toBeInViewport();
});

test('the itemised invoice says the first 30 days are free, and leads to the plans', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#pricing');
  await expect(section.getByText('Free', { exact: true })).toBeVisible();
  await expect(section.getByText('for 30 days', { exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: 'Compare plans and prices' })).toHaveAttribute(
    'href',
    '/pricing',
  );
  const banner = page.getByRole('banner');
  const menu = banner.locator('summary');
  if (await menu.isVisible()) await menu.click();
  await expect(banner.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
});

// docs/specs/website-showcase.md

const SIX = ['Riso', 'Marquee', 'Billboard', 'Signature', 'Atelier', 'Trade'];
const BUSINESSES = [
  'Odd Hours Press',
  'Night Shift Sound',
  'Overcast',
  'Larkspur Analytics',
  'Wilder & Rose',
  'Kestrel Roofing',
];
const SIXTEEN = [
  'Signature',
  'Sticker',
  'Riso',
  'Marquee',
  'Atelier',
  'Bloom',
  'Mark',
  'Billboard',
  'Grid',
  'Trade',
  'Statement',
  'Practice',
  'Heritage',
  'Letter',
  'Ticket',
  'Monochrome',
];
/** As the business name appears inside an invoice's HTML. */
const inHtml = (text: string) =>
  new RegExp(text.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

test('the templates shelf shows six as designed, and brings the one chosen to the front', async ({
  page,
}, info) => {
  await page.goto('/');
  const section = page.locator('#templates');
  const shelf = section.getByRole('group', { name: 'Templates' });
  const cards = shelf.getByRole('radio');
  await expect(cards).toHaveCount(6);
  for (const [i, name] of SIX.entries()) {
    await expect(cards.nth(i)).toHaveAccessibleName(`${name}, made out by ${BUSINESSES[i]}`);
    await expect(shelf.locator('iframe').nth(i)).toHaveAttribute('srcdoc', inHtml(BUSINESSES[i]!));
  }
  // Billboard in front.
  await expect(cards.nth(2)).toBeChecked();
  // Marquee in lime with navy.
  await expect(shelf.locator('iframe').nth(1)).toHaveAttribute('srcdoc', /#c5f03c/i);
  await expect(shelf.locator('iframe').nth(1)).toHaveAttribute('srcdoc', /#1b2559/i);

  // On a wide screen the cards overlap, the nearer one on top: Atelier shows its right-hand edge. On a phone they sit
  // in a row.
  const atelier = shelf.locator('label').nth(4);
  if (info.project.name === 'phone') await atelier.click();
  else {
    const box = (await atelier.boundingBox())!;
    await atelier.click({ position: { x: box.width - 16, y: box.height / 2 } });
  }
  await expect(cards.nth(4)).toBeChecked();
  await expect(section.getByText('Florists, stylists, interiors and weddings')).toBeVisible();

  await cards.nth(4).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(5)).toBeChecked();
  await expect(section.getByText('Builders, roofers, electricians and cleaners')).toBeVisible();
});

test('a name or a colour redraws all six as yours, and they go back to the examples', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#templates');
  const frames = section.getByRole('group', { name: 'Templates' }).locator('iframe');
  const colours = section.getByRole('group', { name: 'Colour' }).getByRole('radio');
  await expect(colours).toHaveCount(8);
  for (const name of ['Forest', 'Orange', 'Navy', 'Plum', 'Teal', 'Rose', 'Lemon', 'Charcoal']) {
    await expect(section.getByRole('radio', { name, exact: true })).toBeAttached();
  }

  await section.getByLabel('Business name').fill('Fernhill Joinery');
  for (let i = 0; i < 6; i++) await expect(frames.nth(i)).toHaveAttribute('srcdoc', /Fernhill Joinery/);
  await section.getByRole('radio', { name: 'Navy', exact: true }).check();
  for (let i = 0; i < 6; i++) await expect(frames.nth(i)).toHaveAttribute('srcdoc', /#1d3c5a/i);

  await section.getByRole('button', { name: 'Back to the examples' }).click();
  await expect(section.getByLabel('Business name')).toHaveValue('');
  for (const [i, business] of BUSINESSES.entries()) {
    await expect(frames.nth(i)).toHaveAttribute('srcdoc', inHtml(business));
  }
});

test('all sixteen are a click away, named, in the picker’s order', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'On a phone the sixteen join the six in one row (below).');
  await page.goto('/');
  const section = page.locator('#templates');
  await section.getByRole('button', { name: 'See all sixteen' }).click();
  const all = section.getByRole('list', { name: 'All sixteen templates' });
  await expect(all.getByRole('listitem')).toHaveCount(15);
  await expect(all.locator('strong')).toHaveText(SIXTEEN);
  await section.getByRole('button', { name: 'Hide the sixteen' }).click();
  await expect(all).toBeHidden();
});

test('on a phone the header holds the logo and the menu, and the menu holds both ways in', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  await page.goto('/');
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link')).toHaveCount(1);
  await expect(banner.getByRole('link')).toHaveAttribute('href', '/');

  // The menu button: no border, two lines of different lengths that turn into a cross.
  const button = banner.locator('summary');
  const frame = await button.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { border: cs.borderTopWidth, shadow: cs.boxShadow };
  });
  expect(frame).toEqual({ border: '0px', shadow: 'none' });
  const lines = button.locator('[data-line]');
  await expect(lines).toHaveCount(2);
  const widths = await lines.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  expect(widths[0]).not.toBe(widths[1]);
  await button.click();
  const turned = await lines.evaluateAll((els) => els.map((el) => getComputedStyle(el).rotate));
  expect(turned.every((r) => r !== 'none' && r !== '0deg')).toBe(true);

  const menu = banner.getByRole('navigation', { name: 'Menu' });
  await expect(menu.getByRole('link', { name: 'Create free account' })).toHaveAttribute('href', '/sign-up');
  await expect(menu.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  // The hero keeps its own button.
  await expect(page.locator('main').getByRole('link', { name: 'Create your free account' })).toBeVisible();
});

test('on a phone body text is 16 pixels and the hero’s sentence 19', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  await page.goto('/');
  const size = (text: string) =>
    page
      .getByText(text)
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize);
  expect(await size('Look established from day one')).toBe('19px');
  for (const text of [
    'Pick the layout that suits your work',
    'Every invoice follows the same five steps',
    'Add your logo and colour once',
    'Record payments in full or in parts',
  ]) {
    expect(await size(text), text).toBe('16px');
  }
});

test('on a phone the controls come first and the templates are seen one at a time, the sixteen in the same row', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  await page.goto('/');
  const section = page.locator('#templates');
  const shelf = section.getByRole('group', { name: 'Templates' });
  const cards = shelf.locator('label');
  const name = section.getByLabel('Business name');
  expect((await name.boundingBox())!.y).toBeLessThan((await cards.first().boundingBox())!.y);

  await shelf.scrollIntoViewIfNeeded();
  const whole = () =>
    cards.evaluateAll(
      (els) =>
        els.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left >= -1 && r.right <= innerWidth + 1;
        }).length,
    );
  expect(await whole()).toBe(1);
  await expect(section.getByText('3 of 6')).toBeVisible();

  // Swiped on, the caption follows the card in view.
  await shelf.evaluate((el) => el.scrollBy({ left: el.clientWidth * 0.85 }));
  await expect(section.getByText('4 of 6')).toBeVisible();
  await expect(section.getByText('Any business. Invoica’s own.')).toBeVisible();

  // The sixteen join the six in the same row.
  await section.getByRole('button', { name: 'See all sixteen' }).click();
  await expect(cards).toHaveCount(16);
  await expect(section.getByText(/ of 16$/)).toBeVisible();
  await section.getByRole('button', { name: 'Hide the sixteen' }).click();
  await expect(cards).toHaveCount(6);
});

test('step 5 shows the invoice paid, and the owed card is not drawn twice', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('img', { name: /INV-0044 paid in full.*£2,280\.00.*owed to you.*£4,140\.00/i }),
  ).toBeAttached();
  await expect(page.locator('[aria-label*="£6,420.00 owed across 5 invoices"]')).toHaveCount(0);
});

test('in How it works each step’s icon appears beside its numeral once the line reaches it', async ({
  page,
}) => {
  await page.goto('/');
  const marker = (heading: string) =>
    page
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: new RegExp(heading) }) })
      .locator('[data-mark]');
  await page
    .getByRole('heading', { name: /In their inbox,/ })
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  for (const heading of ['Look established', 'Numbered properly', 'In their inbox']) {
    await expect(marker(heading), heading).toHaveAttribute('data-reached', '');
    await expect(marker(heading).locator('svg'), heading).toBeVisible();
  }
  for (const heading of ['Late payers', 'Always know']) {
    await expect(marker(heading), heading).not.toHaveAttribute('data-reached', '');
  }
  // the pinned bar is gone
  await expect(page.getByRole('list', { name: 'Where INV-0044 is' })).toHaveCount(0);
});

test('sections have room between them', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Measured on a wide screen.');
  await page.goto('/');
  // the lowest edge of anything drawn inside an element
  const foot = (selector: string) =>
    page
      .locator(selector)
      .evaluate((el) =>
        Math.max(...[...el.querySelectorAll('*')].map((c) => c.getBoundingClientRect().bottom)),
      );
  const head = async (selector: string) => (await page.locator(selector).first().boundingBox())!.y;
  const how = page.locator('#how').getByText('How it works', { exact: true });
  expect((await how.boundingBox())!.y - (await foot('#why'))).toBeGreaterThanOrEqual(160);
  expect((await head('footer')) - (await foot('#pricing'))).toBeGreaterThanOrEqual(160);
});

test('the header marks the section in view as the page scrolls', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The links sit in the header on wide screens.');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Site' });
  await expect(nav.locator('[aria-current]')).toHaveCount(0);
  for (const [id, name] of [
    ['why', 'Why Invoica'],
    ['how', 'How it works'],
    ['templates', 'Templates'],
    ['pricing', 'Pricing'],
  ] as const) {
    await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const current = nav.locator('[aria-current="true"]');
    await expect(current).toHaveText(name);
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    // It lights up in the logo's green, its words dark; no dot and no underline.
    await expect(current).toHaveCSS('background-color', 'rgb(55, 198, 107)');
    await expect(current).toHaveCSS('color', 'rgb(9, 25, 28)');
    await expect(current).toHaveCSS('text-decoration-line', 'none');
    expect(await current.evaluate((el) => getComputedStyle(el, '::before').content)).toBe('none');
  }
});

test('the home page shows no email address and no example domain, in its words or its invoices', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#templates').getByRole('button', { name: 'See all sixteen' }).click();
  await expect(page.locator('#templates iframe')).not.toHaveCount(6);
  const everything = await page.evaluate(() =>
    [
      document.body.innerText,
      ...[...document.querySelectorAll('iframe')].map((frame) => frame.getAttribute('srcdoc') ?? ''),
      ...[...document.querySelectorAll('input')].map((input) => input.placeholder),
    ].join('\n'),
  );
  expect(everything).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  expect(everything).not.toMatch(/\.example\b/i);
});

test('the clients section shows the list of clients and one client’s history', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('#clients').getByRole('img', {
      name: /clients and what each owes.*Meridian Architects LLP £2,280\.00.*history: invoice INV-0044.*a payment.*credit note CN-0003/i,
    }),
  ).toBeAttached();
});

/** The most green of the pixels around each point of a screenshot of the page, as the line's colour shows there. */
async function greenness(page: Page, points: [number, number][]) {
  const shot = await page.screenshot({ scale: 'css' });
  return page.evaluate(
    async ({ png, points }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const g = canvas.getContext('2d')!;
      g.drawImage(img, 0, 0);
      return points.map(([x, y]) => {
        let most = 0;
        const d = g.getImageData(Math.floor(x) - 2, Math.floor(y) - 2, 5, 5).data;
        for (let i = 0; i < d.length; i += 4)
          most = Math.max(most, Math.abs(d[i + 1]! - (d[i]! + d[i + 2]!) / 2));
        return most;
      });
    },
    { png: shot.toString('base64'), points },
  );
}

test('the crease’s ends are drawn past the headline and fade out there', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Measured on a wide screen.');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // the top end of the line runs past the headline's right edge
  const beyond = await page.evaluate(() => {
    const svg = document.querySelector('main h1')!.nextElementSibling!.nextElementSibling as SVGSVGElement;
    const line = svg.querySelectorAll('line')[1]!;
    const s = svg.getBoundingClientRect();
    const [x1, y1, x2, y2] = [line.x1, line.y1, line.x2, line.y2].map((v) => v.baseVal.value) as [
      number,
      number,
      number,
      number,
    ];
    // where the line crosses 104% of the box's width
    const k = (104 - x2) / (x1 - x2);
    return [s.left + 1.04 * s.width, s.top + ((y2 + (y1 - y2) * k) / 100) * s.height] as [number, number];
  });
  const [past] = await greenness(page, [beyond]);
  expect(past, 'the line shows past the headline’s edge').toBeGreaterThan(10);
});

test('on a phone the sign-in and sign-up pages open with the Night band and its headline', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const path of ['/sign-in', '/sign-up']) {
    await page.goto(path);
    const band = page.locator('aside');
    await expect(band, path).toBeVisible();
    // the headline is set twice, near and far of the crease
    await expect(band.getByText('Every invoice,').first(), path).toBeVisible();
    const form = page.locator('main form').first();
    expect((await band.boundingBox())!.y, path).toBeLessThan((await form.boundingBox())!.y);
  }
});

test('the header spreads wider than the page, and the pillars have room between them', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Measured on a wide screen.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const banner = page.getByRole('banner');
  const logo = (await banner.getByRole('link').first().boundingBox())!;
  const button = (await banner.getByRole('link', { name: 'Create free account' }).boundingBox())!;
  const headline = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
  const wrap = (await page.locator('#why').boundingBox())!;
  expect(logo.x).toBeLessThan(headline.x - 24);
  expect(button.x + button.width).toBeGreaterThan(wrap.x + wrap.width - 24);
  const pillars = await page
    .locator('#why li')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  expect(pillars[1]!.left - pillars[0]!.right).toBeGreaterThanOrEqual(72);
});

test('a field’s focus ring is the logo’s deeper green', async ({ page }) => {
  await page.goto('/');
  const email = page.getByLabel('Your email');
  await email.focus();
  await expect(email).toHaveCSS('outline-color', 'rgb(31, 156, 87)');
});
