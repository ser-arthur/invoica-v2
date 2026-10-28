import { expect, test, type Page } from '@playwright/test';

// docs/specs/website.md, rule 11 and acceptance criteria 13 to 16: flat colour on dark grounds, and on phones the app at
// a size that can be read. Each test sets its own widths, so it runs once.

/** Each step's heading, and a line of text its piece of the app shows. */
const STEP_PIECES = [
  ['Look established', 'Wayfinding concepts'],
  ['Numbered properly', 'INV-0044.pdf, kept as issued'],
  ['In their inbox', 'Invoice INV-0044 from Linden & Rowe Studio'],
  ['Late payers', 'A reminder about INV-0038'],
] as const;

const step = (page: Page, heading: string) =>
  page.locator('li').filter({ has: page.getByRole('heading', { name: new RegExp(heading) }) });

test('on a phone each step shows a readable piece of the app, not a picture of a screen', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Sets its own widths.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const [heading, text] of STEP_PIECES) {
    const piece = step(page, heading).locator('[data-piece]');
    await expect(piece, heading).toBeVisible();
    await expect(piece.getByText(text, { exact: true })).toBeVisible();
    const smallest = await piece.evaluate((root) => {
      const sizes: number[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent?.trim() && node.parentElement)
          sizes.push(Number(getComputedStyle(node.parentElement).fontSize.replace('px', '')));
      }
      return Math.min(...sizes);
    });
    expect(smallest, heading).toBeGreaterThanOrEqual(12);
    // the pictures of the app, and the invoices rendered live beside them
    for (const picture of await step(page, heading).locator('img, iframe').all())
      await expect(picture).toBeHidden();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [heading] of STEP_PIECES) {
    await expect(step(page, heading).locator('[data-piece]'), heading).toBeHidden();
    await expect(step(page, heading).locator('img, iframe').first(), heading).toBeVisible();
  }
});

test('on a phone the phones section shows both phones, each at a size that can be seen', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Sets its own widths.');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="phones-heading"]');
    await section.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);
    for (const id of ['phone-light', 'phone-dark']) {
      const box = (await section.getByTestId(id).boundingBox())!;
      expect(box.width, `${width}: ${id}`).toBeGreaterThanOrEqual(width * 0.42);
      expect(box.x, `${width}: ${id}`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width}: ${id}`).toBeLessThanOrEqual(width);
    }
  }
});

/** Every element on the page, and its ::before and ::after, whose background draws a gradient of the given kind. */
async function gradients(page: Page, kind: RegExp) {
  return page.evaluate((source) => {
    const pattern = new RegExp(source);
    const found: string[] = [];
    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const image = getComputedStyle(el, pseudo).backgroundImage;
        if (pattern.test(image))
          found.push(`${el.tagName.toLowerCase()}${pseudo ?? ''} ${image.slice(0, 60)}`);
      }
    }
    return found;
  }, kind.source);
}

const flat = (locator: ReturnType<Page['locator']>) =>
  locator.evaluate((el) => getComputedStyle(el).backgroundImage);

test('nothing draws a radial gradient, and dark grounds, numerals and bars are flat', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Sets its own widths.');
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/', '/pricing', '/sign-in']) {
    await page.goto(path);
    expect(await gradients(page, /radial-gradient/), path).toEqual([]);
  }
  await page.goto('/');
  // step 5's dark card, the moment INV-0044 is paid
  expect(await flat(page.getByRole('img', { name: /INV-0044 paid in full/ }))).toBe('none');
  const numerals = page.locator('li span[aria-hidden="true"]').filter({ hasText: /^[1-5]$/ });
  await expect(numerals).toHaveCount(5);
  for (const numeral of await numerals.all()) expect(await flat(numeral)).toBe('none');
  const bars = page.getByRole('img', { name: /Money in at an example studio/ });
  expect(
    await bars.evaluate((root) =>
      [...root.querySelectorAll('*')]
        .map((el) => getComputedStyle(el).backgroundImage)
        .filter((b) => b.includes('gradient')),
    ),
  ).toEqual([]);
  await page.goto('/pricing');
  expect(await flat(page.locator('article[aria-labelledby="plan-pro"]'))).toBe('none');
  await page.goto('/sign-in');
  expect(await flat(page.locator('aside'))).toBe('none');
});

test('the sign-in panel is folded: the far side of the crease is one flat shade lighter', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Sets its own widths.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/sign-in');
  const tone = page.locator('aside [data-fold-tone]');
  await expect(tone).toBeAttached();
  const { colour, image, panel } = await tone.evaluate((el) => ({
    colour: getComputedStyle(el).backgroundColor,
    image: getComputedStyle(el).backgroundImage,
    panel: getComputedStyle(el.closest('aside')!).backgroundColor,
  }));
  expect(image).toBe('none');
  expect(panel).toBe('rgb(9, 25, 28)');
  expect(colour).toBe('rgb(15, 36, 39)');
});
