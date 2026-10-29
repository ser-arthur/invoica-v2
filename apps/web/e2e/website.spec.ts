import { expect, test, type Page } from '@playwright/test';
import { creaseSegment } from '../src/components/site/fold';
import { signUpAndOnboard } from './helpers';

// docs/specs/website.md

// The site's checks measure the page at rest: its motion stops for visitors who ask for less of it.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the home page leads with one headline, and every way in goes to sign-up or sign-in', async ({
  page,
}, info) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAccessibleName('Every invoice, all the way to paid.');

  const create = page.getByRole('link', { name: /^Create (your )?free account$/ });
  expect(await create.count()).toBeGreaterThanOrEqual(2);
  for (const link of await create.all()) await expect(link).toHaveAttribute('href', '/sign-up');
  // On a phone "Sign in" is in the header's menu (docs/specs/website-showcase.md, criterion 7), and the footer does
  // not carry it (docs/specs/website-footer.md).
  if (info.project.name === 'phone') await page.locator('header summary').click();
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

// docs/specs/website-footer.md, criteria 1 and 2.
test('the footer holds the product’s links, who is behind Invoica, its email, Privacy and Terms', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  const links: [string, string][] = [
    ['Why Invoica', '/#why'],
    ['How it works', '/#how'],
    ['Templates', '/templates'],
    ['Pricing', '/pricing'],
    ['hello@getinvoica.com', 'mailto:hello@getinvoica.com'],
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
    ['Create free account', '/sign-up'],
  ];
  for (const [name, href] of links) {
    await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  for (const name of ['About', 'Contact', 'Help centre', 'Getting started', 'Sign in', 'Cookies']) {
    await expect(footer.getByRole('link', { name, exact: true }), name).toHaveCount(0);
  }
  await expect(footer.getByText('Invoica is a trading name of Kobby S. Arthur.')).toBeVisible();
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

test('on a phone the controls come first and the templates are seen one at a time', async ({
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

  // The whole range is on the Templates page (docs/specs/templates-page.md); the row holds the six.
  await expect(cards).toHaveCount(6);
  await expect(section.getByRole('link', { name: 'See all sixteen' })).toHaveAttribute('href', '/templates');
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

test('pointing at a link tints it green, and the lit link stays as it is', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The links sit in the header on wide screens.');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Site' });
  await page.locator('#how').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const lit = nav.getByRole('link', { name: 'How it works' });
  await expect(lit).toHaveAttribute('aria-current', 'true');
  const other = nav.getByRole('link', { name: 'Templates' });
  await other.hover();
  await expect(other).toHaveCSS('background-color', 'rgba(55, 198, 107, 0.16)');
  await expect(other).toHaveCSS('color', 'rgb(9, 25, 28)');
  await lit.hover();
  await expect(lit).toHaveCSS('background-color', 'rgb(55, 198, 107)');
  await expect(lit).toHaveCSS('color', 'rgb(9, 25, 28)');
});

test('on the pricing page its link is lit', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The links sit in the header on wide screens.');
  await page.goto('/pricing');
  const nav = page.getByRole('navigation', { name: 'Site' });
  await expect(nav.locator('[aria-current]')).toHaveCount(1);
  const pricing = nav.getByRole('link', { name: 'Pricing' });
  await expect(pricing).toHaveAttribute('aria-current', 'page');
  await expect(pricing).toHaveCSS('background-color', 'rgb(55, 198, 107)');
});

test('a link clicked lights at once, and nothing passed on the way lights up', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The links sit in the header on wide screens.');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const nav = page.getByRole('navigation', { name: 'Site' });
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => {
      const lit = document.querySelector('nav[aria-label="Site"] [aria-current]')?.textContent ?? '';
      if (seen.at(-1) !== lit) seen.push(lit);
    }).observe(document.querySelector('nav[aria-label="Site"]')!, { subtree: true, attributes: true });
  });
  await nav.getByRole('link', { name: 'How it works' }).click();
  await expect(nav.locator('[aria-current]')).toHaveText('How it works');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual(['How it works']);
});

test('moving between the Templates and pricing pages keeps the header where it is', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'The links sit in the header on wide screens.');
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // Anything in the header that starts to move from here on is recorded.
  await page.evaluate(() => {
    const header = document.querySelector('header')!;
    const w = window as unknown as { started: string[] };
    w.started = [];
    (header as unknown as { kept: boolean }).kept = true;
    header.parentElement!.addEventListener('animationstart', (e) => w.started.push(e.animationName));
  });
  const nav = page.getByRole('navigation', { name: 'Site' });
  await nav.getByRole('link', { name: 'Templates' }).click();
  await expect(page).toHaveURL(/\/templates$/);
  await expect(nav.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Pricing' }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(nav.getByRole('link', { name: 'Pricing' })).toHaveAttribute('aria-current', 'page');
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => ({
      kept: (document.querySelector('header') as unknown as { kept?: boolean }).kept === true,
      started: (window as unknown as { started: string[] }).started,
    })),
  ).toEqual({ kept: true, started: [] });
});

test('the home page shows no email address but the footer’s, and no example domain, in its words or its invoices', async ({
  page,
}) => {
  await page.goto('/');
  // docs/specs/website-footer.md, criterion 4: the footer's own address is the one email on the page.
  expect(
    await page
      .getByRole('contentinfo')
      .evaluate((el) => (el as HTMLElement).innerText.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)),
  ).toEqual(['hello@getinvoica.com']);
  const everything = await page.evaluate(() =>
    [
      document.querySelector('main')!.innerText,
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

/** The page's own background, as drawn behind the form. */
const groundOf = (page: Page) =>
  page.locator('main').evaluate((el) => {
    for (let at: Element | null = el; at; at = at.parentElement) {
      const bg = getComputedStyle(at).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)') return bg;
    }
    return '';
  });

test('on a phone sign in and sign up open with the mark on a Night head, then the form, then the small print (41)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const path of ['/sign-in', '/sign-up']) {
    await page.goto(path);
    await expect(page.locator('aside'), path).toBeHidden();
    const head = page.getByTestId('auth-head');
    const form = page.locator('main form').first();
    const foot = page.getByTestId('auth-foot');
    await expect(head, path).toBeVisible();
    await expect(foot, path).toBeVisible();
    expect((await head.boundingBox())!.y, path).toBeLessThan((await form.boundingBox())!.y);
    expect((await foot.boundingBox())!.y, path).toBeGreaterThan((await form.boundingBox())!.y);
    // the mark at the top is the way home, and the only one; the line is the wide screen's alone
    const home = page.getByRole('link', { name: 'Invoica home' });
    await expect(home).toHaveCount(1);
    await expect(head.getByRole('link', { name: 'Invoica home' })).toBeVisible();
    await expect(page.getByText('The smarter way').first()).toBeHidden();
    await expect(foot.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(foot.getByRole('link', { name: 'Invoica home' })).toHaveCount(0);
  }
});

test('the phone page is light with a sharp Night head; Dark makes it Night, the head a shade lighter with the crease (42)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  await page.goto('/sign-in');
  const head = page.getByTestId('auth-head');
  const crease = head.locator('span[aria-hidden="true"]');
  expect(await groundOf(page)).toBe('rgb(236, 239, 237)');
  await expect(head).toHaveCSS('background-color', 'rgb(9, 25, 28)');
  await expect(crease).toBeHidden();
  for (const theme of ['light', 'dark'] as const) {
    await page.context().addCookies([{ name: 'invoica_theme', value: theme, url: page.url() }]);
    await page.goto('/sign-up');
    const button = page.locator('main form button[type="submit"]');
    if (theme === 'light') {
      expect(await groundOf(page)).toBe('rgb(236, 239, 237)');
      await expect(head).toHaveCSS('background-color', 'rgb(9, 25, 28)');
      await expect(crease).toBeHidden();
      await expect(button).toHaveCSS('background-color', 'rgb(9, 25, 28)');
    } else {
      expect(await groundOf(page)).toBe('rgb(9, 25, 28)');
      await expect(head).toHaveCSS('background-color', 'rgb(15, 36, 39)');
      await expect(crease).toBeVisible();
      await expect(button).toHaveCSS('background-color', 'rgb(207, 242, 106)');
      await expect(page.locator('main form input').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
    }
  }
});

test('in Night, “Forgot your password?” is quiet, and the way to an account stays lime', async ({ page }) => {
  await page.goto('/sign-in');
  await page.context().addCookies([{ name: 'invoica_theme', value: 'dark', url: page.url() }]);
  await page.goto('/sign-in');
  const form = page.locator('main');
  await expect(form.getByRole('link', { name: 'Forgot your password?' })).toHaveCSS(
    'color',
    'rgb(163, 178, 176)',
  );
  await expect(form.getByRole('link', { name: 'Create an account' })).toHaveCSS(
    'color',
    'rgb(207, 242, 106)',
  );
  await expect(form.getByRole('button', { name: 'Sign in' })).toHaveCSS(
    'background-color',
    'rgb(207, 242, 106)',
  );
});

test('with System, the sign-in page follows the device', async ({ page }) => {
  await page.goto('/sign-in');
  await page.context().addCookies([{ name: 'invoica_theme', value: 'system', url: page.url() }]);
  for (const [scheme, ground] of [
    ['dark', 'rgb(9, 25, 28)'],
    ['light', 'rgb(236, 239, 237)'],
  ] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/sign-in');
    expect(await groundOf(page), scheme).toBe(ground);
  }
});

test('on a wide screen with Dark, the form’s side is Night beside the panel', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Checked at desktop widths.');
  await page.goto('/sign-in');
  await page.context().addCookies([{ name: 'invoica_theme', value: 'dark', url: page.url() }]);
  await page.goto('/sign-in');
  await expect(page.locator('aside')).toBeVisible();
  expect(await groundOf(page)).toBe('rgb(9, 25, 28)');
  await expect(page.getByTestId('auth-head')).toBeHidden();
  await expect(page.getByTestId('auth-foot')).toBeHidden();
});

test('the header spreads wider than the page', async ({ page }, info) => {
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
});

test('a field’s focus ring is the logo’s deeper green', async ({ page }) => {
  await page.goto('/');
  const email = page.getByLabel('Your email');
  await email.focus();
  await expect(email).toHaveCSS('outline-color', 'rgb(31, 156, 87)');
});

// docs/specs/website-showcase.md, the owner's notes of 27 October, 16:34.

test('the phones section shows two phones, the dark one in front, offset so both screens show (35)', async ({
  page,
}, info) => {
  await page.goto('/');
  const section = page.locator('section[aria-labelledby="phones-heading"]');
  const light = section.getByTestId('phone-light');
  const dark = section.getByTestId('phone-dark');
  await expect(light).toHaveCount(1);
  await expect(dark).toHaveCount(1);
  await dark.scrollIntoViewIfNeeded();
  // What is on top at a point of each screen: the dark phone in front, and the light one's figures still in view.
  const at = async (phone: typeof light, fx: number, fy: number) => {
    const screen = (await phone.locator('img').boundingBox())!;
    return page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.closest('[data-testid]')?.getAttribute('data-testid'),
      [screen.x + screen.width * fx, screen.y + screen.height * fy],
    );
  };
  expect(await at(dark, 0.5, 0.3)).toBe('phone-dark');
  expect(await at(light, 0.2, 0.3)).toBe('phone-light');
  // Nothing changes under the pointer.
  if (info.project.name === 'desktop') {
    const look = () =>
      page.evaluate(() =>
        ['phone-light', 'phone-dark'].map((id) => {
          const style = getComputedStyle(document.querySelector(`[data-testid="${id}"]`)!);
          return `${style.zIndex} ${style.scale} ${style.rotate} ${style.boxShadow}`;
        }),
      );
    const before = await look();
    await light.hover({ position: { x: 40, y: 120 } });
    await page.waitForTimeout(600);
    expect(await look()).toEqual(before);
  }
});

test('on phones each figure’s caption is one short line', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const captions = page.locator('main figcaption:visible');
    expect(await captions.count()).toBeGreaterThanOrEqual(4);
    for (const caption of await captions.all()) {
      const box = (await caption.boundingBox())!;
      const line = await caption.evaluate((el) => Number(getComputedStyle(el).lineHeight.replace('px', '')));
      expect(box.height, `${width}: ${await caption.innerText()}`).toBeLessThanOrEqual(line + 1);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await expect(page.locator('figcaption', { hasText: 'The same studio’s clients' })).toHaveText(
      'The same studio’s clients',
      { useInnerText: true },
    );
  }
});

test('in How it works the invoice is cut away past its turned corner, so the panel shows there, not white (36)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'The pictures are shown on wide screens.');
  await page.goto('/');
  const papers = page.locator('#how [data-turned]');
  await expect(papers).toHaveCount(3);
  for (const paper of await papers.all()) {
    const { clip, width } = await paper.evaluate((el) => ({
      clip: getComputedStyle(el).clipPath,
      width: (el as HTMLElement).offsetWidth,
    }));
    // The Night head's corner is turned 18mm in from the edge of a 210mm page.
    const turn = Number(((18 / 210) * width).toFixed(1));
    expect(clip).toBe(`polygon(0px 0px, calc(100% - ${turn}px) 0px, 100% ${turn}px, 100% 100%, 0px 100%)`);
  }
});

test('on small phones no words on the home page run past the edge of the screen (38)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const width of [375, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const past = await page.evaluate(
      (w) =>
        [...document.querySelectorAll('main p, main h2, main h3, main li, main figcaption')]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            return box.width > 0 && box.right > w + 0.5 && !el.closest('[aria-hidden="true"]');
          })
          .map((el) => (el.textContent ?? '').trim().slice(0, 40)),
      width,
    );
    expect(past, `${width}px`).toEqual([]);
  }
});

// docs/specs/website-showcase.md, the owner's notes of 28 October, 01:58.

test('the menu closes with a tap outside it, with Escape, and when a link in it is chosen (39)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'The menu is for narrow screens.');
  await page.goto('/');
  const menu = page.locator('header details');
  const button = page.locator('header summary');
  const open = () => menu.evaluate((d) => (d as HTMLDetailsElement).open);

  await button.click();
  expect(await open()).toBe(true);
  await page.mouse.click(30, 600);
  await expect.poll(open).toBe(false);

  await button.click();
  expect(await open()).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(open).toBe(false);
  await expect(button).toBeFocused();

  await button.click();
  await page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'How it works' }).click();
  await expect.poll(open).toBe(false);

  // A tap inside the menu, between its links, leaves it open.
  await button.click();
  const panel = (await page.getByRole('navigation', { name: 'Menu' }).boundingBox())!;
  await page.mouse.click(panel.x + 4, panel.y + 4);
  expect(await open()).toBe(true);
});

test('in the menu the page you are on is its words in bold green, with no fill (40)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'The menu is for narrow screens.');
  await page.goto('/pricing');
  await page.locator('header summary').click();
  const lit = page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Pricing' });
  await expect(lit).toHaveAttribute('aria-current', 'page');
  await expect(lit).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(lit).toHaveCSS('color', 'rgb(20, 128, 74)');
  await expect(lit).toHaveCSS('font-weight', '800');
});

// docs/specs/website-showcase.md, criteria 44 to 47: Why Invoica's three points as a file of three folders.

/** The three folders, measured at rest: each one's box, ground, tab, the words on the tab, heading and picture. */
async function theFile(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (page.viewportSize()!.width > 760) await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('#why').scrollIntoViewIfNeeded();
  return page.locator('#why li').evaluateAll((els) =>
    els.map((el) => {
      const box = (e: Element | null) => {
        const r = e?.getBoundingClientRect();
        return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } : null;
      };
      const tab = el.querySelector('[data-tab]');
      const words = tab?.querySelector('*') ?? tab;
      return {
        box: box(el)!,
        ground: getComputedStyle(el).backgroundColor,
        tab: tab ? getComputedStyle(tab).backgroundColor : null,
        tabBox: box(tab),
        ink: words ? getComputedStyle(words).color : null,
        name: tab?.textContent?.trim() ?? null,
        heading: box(el.querySelector('h3')),
        picture: box(el.querySelector('[role="img"]')),
        rule: el.querySelector('[class*="pillarRule"]') !== null,
      };
    }),
  );
}

test('Why Invoica is a file of three folders, each wider than the one before, the colour on their tabs (44)', async ({
  page,
}) => {
  const file = await theFile(page);
  expect(file.map((f) => f.name)).toEqual(['Your identity', 'Financial clarity', 'Client management']);
  expect(file.map((f) => f.tab)).toEqual(['rgb(207, 242, 106)', 'rgb(108, 212, 122)', 'rgb(47, 179, 166)']);
  for (const f of file) {
    expect(f.ink, f.name!).toBe('rgb(9, 25, 28)');
    const [r = 0, g = 0, b = 0] = (f.ground.match(/\d+/g) ?? []).map(Number);
    expect(Math.min(r, g, b), `${f.name}: ${f.ground}`).toBeGreaterThanOrEqual(240);
    expect(f.rule, f.name!).toBe(false);
  }
  for (const i of [1, 2]) {
    expect(file[i]!.box.width, file[i]!.name!).toBeGreaterThan(file[i - 1]!.box.width + 8);
    expect(file[i]!.box.top, file[i]!.name!).toBeLessThan(file[i - 1]!.box.bottom);
  }
});

test('the folders’ tabs step across, like dividers in a file (45)', async ({ page }, info) => {
  const file = await theFile(page);
  const tabs = file.map((f) => f.tabBox!);
  if (info.project.name === 'phone') {
    const middle = (b: { left: number; right: number }) => (b.left + b.right) / 2;
    expect(tabs[0]!.left - file[0]!.box.left).toBeLessThan(40);
    expect(Math.abs(middle(tabs[1]!) - middle(file[1]!.box))).toBeLessThan(4);
    expect(file[2]!.box.right - tabs[2]!.right).toBeLessThan(40);
  } else {
    expect(tabs[1]!.left).toBeGreaterThan(tabs[0]!.right);
    expect(tabs[2]!.left).toBeGreaterThan(tabs[1]!.right);
  }
});

test('each folder holds a picture of what is filed in it, none repeating the dashboard (46)', async ({
  page,
}) => {
  await page.goto('/');
  const folders = page.locator('#why li');
  await expect(folders.nth(0).getByRole('img')).toHaveAccessibleName(/invoice.*three businesses’ colours/i);
  await expect(folders.nth(2).getByRole('img')).toHaveAccessibleName(
    /Meridian Architects LLP.*Oakridge Dental.*Ashby Print Co/,
  );
  const money = folders.nth(1).getByRole('img');
  await expect(money).toHaveAccessibleName(/last three months/);
  const name = (await money.getAttribute('aria-label'))!;
  const [total, ...parts] = [...name.matchAll(/£([\d,]+)\.00/g)].map((m) => Number(m[1]!.replace(/,/g, '')));
  expect(total).toBe(21560);
  expect(parts).toEqual([15140, 4180, 2240]);
  expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
  await expect(money).toContainText('£21,560.00');
  expect(await page.locator('#why').textContent()).not.toContain('£6,420');
  expect(await page.locator('#why').evaluate((el) => el.innerHTML)).not.toContain('6,420');
});

test('on a wide screen each picture is right of its words, on a phone above its heading (47)', async ({
  page,
}, info) => {
  const file = await theFile(page);
  for (const f of file) {
    if (info.project.name === 'phone') expect(f.picture!.bottom, f.name!).toBeLessThanOrEqual(f.heading!.top);
    else expect(f.picture!.left, f.name!).toBeGreaterThan(f.heading!.right);
  }
});

// docs/specs/website-showcase.md, the owner's note of 29 October, 04:06.

test('“Compare plans and prices” stands out as a button with a Night outline (49)', async ({ page }) => {
  await page.goto('/');
  const compare = page.locator('#pricing').getByRole('link', { name: 'Compare plans and prices' });
  await expect(compare).toHaveAttribute('href', '/pricing');
  const look = await compare.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      height: el.getBoundingClientRect().height,
      ring: cs.boxShadow,
      colour: cs.color,
      radius: cs.borderRadius,
    };
  });
  expect(look.height).toBeGreaterThanOrEqual(48);
  expect(look.ring).toMatch(/rgb\(9, 25, 28\).*inset|inset.*rgb\(9, 25, 28\)/);
  expect(look.colour).toBe('rgb(9, 25, 28)');
  expect(look.radius).not.toBe('0px');
});
