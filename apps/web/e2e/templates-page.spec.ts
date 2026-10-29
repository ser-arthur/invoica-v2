import { expect, test } from '@playwright/test';
import { liftForNight } from '@invoica/core';

// docs/specs/templates-page.md, acceptance criteria 1 to 7.

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
const MAKERS = [
  'Larkspur Analytics',
  'Crumb & Kettle',
  'Odd Hours Press',
  'Night Shift Sound',
  'Wilder & Rose',
  'Marigold Lane',
  'Parallax Labs',
  'Overcast',
  'Hollis Lane Architects',
  'Kestrel Roofing',
  'Penrose Bookkeeping',
  'Ashdown Kerr',
  'Thistle & Oak',
  'Joanna Pryce',
  'Hartley Cycle Works',
  'Fenwick Marsh',
];
/** As the business name appears inside an invoice's HTML. */
const inHtml = (text: string) =>
  new RegExp(text.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

test('the Templates page shows all sixteen in the picker’s order, each made out by its own business (1)', async ({
  page,
}) => {
  await page.goto('/templates');
  await expect(page).toHaveTitle(/^Templates/);
  const range = page.getByRole('list', { name: 'All sixteen templates' });
  await expect(range.getByRole('listitem')).toHaveCount(16);
  await expect(range.locator('strong')).toHaveText(SIXTEEN);
  for (const item of await range.getByRole('listitem').all()) {
    await expect(item.locator('span').last()).not.toBeEmpty();
  }
  const docs = await range
    .locator('iframe')
    .evaluateAll((els) => els.map((e) => (e as HTMLIFrameElement).srcdoc));
  expect(docs).toHaveLength(16);
  docs.forEach((doc, i) => expect(doc, MAKERS[i]).toMatch(inHtml(MAKERS[i]!)));
  for (const doc of docs) expect(doc).not.toMatch(inHtml('Linden & Rowe'));
  const everything = [await page.evaluate(() => document.querySelector('main')!.innerText), ...docs].join(
    '\n',
  );
  expect(everything).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  expect(everything).not.toMatch(/\.example\b/i);
});

test('a name or a colour redraws all sixteen as yours, and they go back to the examples (2)', async ({
  page,
}) => {
  await page.goto('/templates');
  const frames = page.getByRole('list', { name: 'All sixteen templates' }).locator('iframe');
  await page.getByLabel('Business name').fill('Fernhill Joinery');
  for (let i = 0; i < 16; i++) await expect(frames.nth(i)).toHaveAttribute('srcdoc', /Fernhill Joinery/);
  // Monochrome is greys only, whatever the colour (docs/specs/invoice-templates.md).
  await page.getByRole('radio', { name: 'Navy', exact: true }).check();
  for (const [i, name] of SIXTEEN.entries()) {
    if (name === 'Monochrome') await expect(frames.nth(i)).not.toHaveAttribute('srcdoc', /#1d3c5a/i);
    else await expect(frames.nth(i), name).toHaveAttribute('srcdoc', /#1d3c5a/i);
  }
  await page.getByRole('button', { name: 'Back to the examples' }).click();
  await expect(page.getByLabel('Business name')).toHaveValue('');
  for (const [i, maker] of MAKERS.entries())
    await expect(frames.nth(i)).toHaveAttribute('srcdoc', inHtml(maker));
});

test('the header’s Templates and the footer’s lead to the page, where the header’s link is current (3)', async ({
  page,
}, info) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/templates');
  if (info.project.name === 'phone') {
    await page.locator('header summary').click();
    await page.locator('header details').getByRole('link', { name: 'Templates' }).click();
  } else {
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Templates' }).click();
  }
  await expect(page).toHaveURL(/\/templates$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Sixteen layouts\./);
  // On a phone the menu closed as the link was chosen: open it again to see which link is current. On a wide screen
  // the menu's copy of the links is in the page too, folded away.
  if (info.project.name === 'phone') await page.locator('header summary').click();
  const current = page.locator('header [aria-current]:visible');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText('Templates');
  await expect(current).toHaveAttribute('aria-current', 'page');
});

test('the home page shows six, and its “See all sixteen” leads to the Templates page (4)', async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('#templates');
  await expect(section.getByRole('button', { name: /See all sixteen|Hide the sixteen/ })).toHaveCount(0);
  const more = section.getByRole('link', { name: 'See all sixteen' });
  await expect(more).toHaveAttribute('href', '/templates');
  await expect(section.locator('iframe')).toHaveCount(6);
  await more.click();
  await expect(page).toHaveURL(/\/templates$/);
});

test('on a wide screen the controls stay in sight beside the range as it scrolls (5)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'On narrower screens the controls sit above the range.');
  await page.goto('/templates');
  const last = page.getByRole('list', { name: 'All sixteen templates' }).getByRole('listitem').last();
  await last.scrollIntoViewIfNeeded();
  const header = (await page.getByRole('banner').boundingBox())!;
  const name = (await page.getByLabel('Business name').boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(name.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(name.y + name.height).toBeLessThanOrEqual(viewport.height);
  await expect(last).toBeInViewport();
});

test('the page ends with a way to sign up (6)', async ({ page }) => {
  await page.goto('/templates');
  const join = page.locator('main').getByRole('link', { name: 'Create free account' });
  await expect(join).toHaveAttribute('href', '/sign-up');
  const joinBox = (await join.boundingBox())!;
  const lastBox = (await page
    .getByRole('list', { name: 'All sixteen templates' })
    .getByRole('listitem')
    .last()
    .boundingBox())!;
  expect(joinBox.y).toBeGreaterThan(lastBox.y + lastBox.height);
});

test('on small phones no words on the Templates page run past the edge of the screen (7)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const width of [375, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/templates');
    await expect(page.getByRole('list', { name: 'All sixteen templates' }).getByRole('listitem')).toHaveCount(
      16,
    );
    const past = await page.evaluate(
      (w) =>
        [...document.querySelectorAll('main p, main h1, main h2, main li, main label, main legend')]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            return box.width > 0 && box.right > w + 0.5 && !el.closest('[aria-hidden="true"]');
          })
          .map((el) => (el.textContent ?? '').trim().slice(0, 40)),
      width,
    );
    expect(past, `${width}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('Signature’s card offers its four styles, and Route on Night redraws it in the visitor’s colour (8)', async ({
  page,
}) => {
  await page.goto('/templates');
  const range = page.getByRole('list', { name: 'All sixteen templates' });
  const signature = range.getByRole('listitem').first();
  const styles = signature.getByRole('group', { name: 'Signature’s style' }).getByRole('radio');
  await expect(styles).toHaveCount(4);
  for (const [i, name] of ['Night head', 'Light', 'Route', 'Route on Night'].entries()) {
    await expect(styles.nth(i)).toHaveAccessibleName(name);
  }
  await expect(styles.first()).toBeChecked();
  const others = await range
    .locator('iframe')
    .evaluateAll((els) => els.slice(1).map((e) => (e as HTMLIFrameElement).srcdoc));

  await page.getByRole('radio', { name: 'Navy', exact: true }).check();
  await signature.getByRole('radio', { name: 'Route on Night' }).check();
  const frame = signature.locator('iframe');
  await expect(frame).toHaveAttribute('srcdoc', /class="route"/);
  // the route's first stop in navy lifted for Night (docs/specs/invoice-templates.md, criterion 25)
  await expect(frame).toHaveAttribute('srcdoc', new RegExp(liftForNight('#1d3c5a', 0.87, 0.1), 'i'));
  await page.getByRole('button', { name: 'Back to the examples' }).click();
  await expect(frame).toHaveAttribute('srcdoc', /class="route"/);
  expect(
    await range
      .locator('iframe')
      .evaluateAll((els) => els.slice(1).map((e) => (e as HTMLIFrameElement).srcdoc)),
  ).toEqual(others);
});
