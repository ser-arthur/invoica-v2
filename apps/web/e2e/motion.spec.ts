import { expect, test, type Page } from '@playwright/test';

// docs/specs/website.md, rule 9: movement tied to scrolling follows the page's own scroll. A container that clips with
// `overflow: hidden` becomes a scroll container, and anything inside it would follow that container's scroll, which
// never moves, so the motion would freeze.

test('every scroll-linked movement on the website follows the page’s scroll', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The same at every width.');
  for (const path of ['/', '/pricing', '/sign-in', '/no-such-page']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const found = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.timeline && !(a.timeline instanceof DocumentTimeline))
        .map((a) => {
          const source = (a.timeline as unknown as { source: Element | null }).source;
          return {
            name: (a as CSSAnimation).animationName,
            page: source === document.scrollingElement,
          };
        }),
    );
    for (const animation of found) expect(animation.page, `${path}: ${animation.name}`).toBe(true);
    if (path === '/' || path === '/pricing') expect(found.length, path).toBeGreaterThan(0);
  }
});

// docs/specs/website-showcase.md, criteria 5, 6 and 15. The hero's load sequence is held still and stepped through on
// the page's own clock.

type Point = [number, number];
type Timing = { name: string; start: number; end: number };

test('loading the home page, everything arrives in reading order and is settled inside 2.5 seconds', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const timings = await page.evaluate(() => {
    const held = document
      .getAnimations()
      .filter((a) => a.timeline instanceof DocumentTimeline)
      // animations only: a transition caught running (a pointer over a link as the page opens) has no name
      .filter((a) => (a as CSSAnimation).animationName) as CSSAnimation[];
    const heading = document.querySelector('main h1')!;
    const find = (el: Element | null | undefined, name: string): Timing | null => {
      const a = held.find(
        (x) => (x.effect as KeyframeEffect).target === el && x.animationName.includes(name),
      );
      if (!a) return null;
      const t = a.effect!.getComputedTiming();
      return { name, start: Number(t.delay), end: Number(t.endTime) };
    };
    const byText = (text: string) =>
      [...document.querySelectorAll('main p')].find((el) => el.textContent?.trim().startsWith(text));
    const slabs = held
      .filter((a) => a.animationName.includes('grow'))
      .map((a) => Number(a.effect!.getComputedTiming().delay));
    return {
      bar: find(document.querySelector('header')?.parentElement, 'barIn'),
      brand: find(document.querySelector('header a'), 'drop'),
      near: find(heading, 'slideNear'),
      far: find(heading.nextElementSibling, 'slideFar'),
      crease: find(heading.nextElementSibling?.nextElementSibling, 'draw'),
      fact: find(byText('For new businesses'), 'settle'),
      statement: find(byText('Look established from day one'), 'settle'),
      actions: find(document.querySelector('main a[href="/sign-up"]')?.parentElement, 'settle'),
      slabs,
      last: Math.max(...held.map((a) => Number(a.effect!.getComputedTiming().endTime))),
    };
  });
  const { bar, brand, near, far, crease, fact, statement, actions, slabs, last } = timings;
  for (const [name, t] of Object.entries({ bar, brand, near, far, crease, fact, statement, actions })) {
    expect(t, `${name} takes part in the sequence`).not.toBeNull();
  }
  expect(bar!.start).toBeLessThanOrEqual(brand!.start);
  expect(brand!.start).toBeLessThan(near!.start);
  expect(near!.start).toBe(far!.start);
  expect(near!.start).toBeLessThan(crease!.start);
  expect(crease!.start).toBeLessThan(fact!.start);
  expect(fact!.start).toBeLessThan(statement!.start);
  expect(statement!.start).toBeLessThan(actions!.start);
  expect(slabs).toHaveLength(6);
  expect([...slabs].sort((a, b) => a - b)).toEqual(slabs);
  expect(slabs[0]).toBeGreaterThanOrEqual(fact!.start);
  expect(last).toBeLessThanOrEqual(2500);

  // Where things are part way through: the header still coming down, the halves still apart, from opposite sides.
  const rest = await page.evaluate(() => {
    const heading = document.querySelector('main h1')!;
    return {
      near: heading.getBoundingClientRect().left,
      far: heading.nextElementSibling!.getBoundingClientRect().left,
    };
  });
  const early = await page.evaluate((t) => {
    // every animation on the page's own clock, held at t
    for (const a of document.getAnimations()) {
      if (!(a.timeline instanceof DocumentTimeline)) continue;
      a.pause();
      a.currentTime = t;
    }
    const heading = document.querySelector('main h1')!;
    return {
      bar: document.querySelector('header')!.parentElement!.getBoundingClientRect().top,
      near: heading.getBoundingClientRect().left,
      far: heading.nextElementSibling!.getBoundingClientRect().left,
    };
  }, near!.start + 100);
  expect(early.bar, 'the header is still coming down').toBeLessThan(0);
  expect(early.near, 'the near half comes from the left').toBeLessThan(rest.near - 1);
  expect(early.far, 'the far half comes from the right').toBeGreaterThan(rest.far + 1);

  // Half way through its drawing, the crease shows near its foot and not yet near its top.
  const middle = crease!.start + (crease!.end - crease!.start) / 2;
  const points = await page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      if (!(a.timeline instanceof DocumentTimeline)) continue;
      a.pause();
      a.currentTime = t;
    }
    const svg = document.querySelector('main h1')!.nextElementSibling!.nextElementSibling as SVGSVGElement;
    const line = svg.querySelectorAll('line')[1]!;
    const s = svg.getBoundingClientRect();
    const at = (k: number): Point => {
      const [x1, y1, x2, y2] = [line.x1, line.y1, line.x2, line.y2].map((v) => v.baseVal.value) as [
        number,
        number,
        number,
        number,
      ];
      // from the foot (x2, y2) towards the top (x1, y1)
      return [
        s.left + ((x2 + (x1 - x2) * k) / 100) * s.width,
        s.top + ((y2 + (y1 - y2) * k) / 100) * s.height,
      ];
    };
    return [at(0.3), at(0.85)];
  }, middle);
  const shot = await page.screenshot({ scale: 'css' });
  const green = await page.evaluate(
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
        const d = g.getImageData(Math.floor(x) - 3, Math.floor(y) - 3, 7, 7).data;
        for (let i = 0; i < d.length; i += 4) most = Math.max(most, d[i + 1]! - (d[i]! + d[i + 2]!) / 2);
        return most;
      });
    },
    { png: shot.toString('base64'), points },
  );
  expect(green[0], 'the crease drawn near its foot').toBeGreaterThan(40);
  expect(green[1], 'the crease not yet drawn near its top').toBeLessThan(20);
});

test('the footer’s logo rises when it comes into view, and again after the reader goes away and comes back', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const mark = page.locator('footer svg').last();
  const rising = () =>
    mark.evaluate((svg) =>
      svg
        .getAnimations()
        .some((a) => (a as CSSAnimation).animationName.includes('surface') && a.playState === 'running'),
    );
  await expect.poll(rising).toBe(false);
  await mark.scrollIntoViewIfNeeded();
  await expect.poll(rising).toBe(true);
  await expect.poll(rising, { timeout: 5000 }).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await mark.scrollIntoViewIfNeeded();
  await expect.poll(rising).toBe(true);
});

// The owner's notes of 26 October, 16:52: sign in, sign up and pricing land as they open, as the home page does.

/** Every animation on the page's own clock: its target's description, its name, when it starts and ends. */
async function loadSequence(page: Page) {
  return page.evaluate(() =>
    (document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline) as CSSAnimation[])
      .filter((a) => a.animationName)
      .map((a) => {
        const t = a.effect!.getComputedTiming();
        const el = (a.effect as KeyframeEffect).target as Element;
        return {
          name: a.animationName,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 24),
          inLine: !!el.closest('[data-testid="auth-line"]'),
          start: Number(t.delay),
          end: Number(t.endTime),
        };
      }),
  );
}

async function heldAt(page: Page, t: number, selectors: string[]) {
  return page.evaluate(
    ({ t, selectors }) => {
      for (const a of document.getAnimations()) {
        if (!(a.timeline instanceof DocumentTimeline)) continue;
        a.pause();
        a.currentTime = t;
      }
      return selectors.map((sel) => document.querySelector(sel)!.getBoundingClientRect().left);
    },
    { t, selectors },
  );
}

test('signing in, the Night panel lands: the logo, the halves from opposite sides, the crease, then each point', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'On a phone the panel is a band; the same sequence plays.');
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');
  const seq = await loadSequence(page);
  const find = (pred: (x: (typeof seq)[number]) => boolean, what: string) => {
    const hit = seq.find(pred);
    expect(hit, what).toBeDefined();
    return hit!;
  };
  const near = find((x) => x.tag === 'p' && x.text.startsWith('The smarter way'), 'the near half');
  const far = find((x) => x.tag === 'div' && x.text.startsWith('The smarter way'), 'the far half');
  const crease = find((x) => x.tag === 'svg', 'the crease');
  const points = seq.filter((x) => x.tag === 'li').map((x) => x.start);
  expect(near.start).toBe(far.start);
  expect(near.start).toBeLessThan(crease.start);
  expect(points).toHaveLength(3);
  expect([...points].sort((a, b) => a - b)).toEqual(points);
  expect(points[0]).toBeGreaterThan(crease.start);
  expect(Math.max(...seq.map((x) => x.end))).toBeLessThanOrEqual(2500);
  const rest = await heldAt(page, 5000, ['aside p', 'aside div[aria-hidden="true"]']);
  const early = await heldAt(page, near.start + 100, ['aside p', 'aside div[aria-hidden="true"]']);
  expect(early[0], 'the near half comes from the left').toBeLessThan(rest[0]! - 1);
  expect(early[1], 'the far half comes from the right').toBeGreaterThan(rest[1]! + 1);
});

test('on a phone, the line at the top of sign in lands: its halves from opposite sides, the crease after them', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'On a wide screen the panel lands (above).');
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');
  const seq = await loadSequence(page);
  const line = '[data-testid="auth-line"] [data-line="light"]';
  const near = seq.find((x) => x.inLine && x.tag === 'p');
  const far = seq.find((x) => x.inLine && x.tag === 'div' && x.text.startsWith('The smarter way'));
  const crease = seq.filter((x) => x.inLine && x.tag === 'svg').map((x) => x.start);
  expect(near, 'the near half').toBeDefined();
  expect(far, 'the far half').toBeDefined();
  expect(near!.start).toBe(far!.start);
  expect(Math.min(...crease)).toBeGreaterThan(near!.start);
  expect(Math.max(...seq.map((x) => x.end))).toBeLessThanOrEqual(2500);
  const rest = await heldAt(page, 5000, [`${line} p`, `${line} div[aria-hidden="true"]`]);
  const early = await heldAt(page, near!.start + 100, [`${line} p`, `${line} div[aria-hidden="true"]`]);
  expect(early[0], 'the near half comes from the left').toBeLessThan(rest[0]! - 1);
  expect(early[1], 'the far half comes from the right').toBeGreaterThan(rest[1]! + 1);
});

test('the pricing page lands: its heading from opposite sides, then the words, the trial and the plans in turn', async ({
  page,
}) => {
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle');
  const seq = await loadSequence(page);
  const start = (pred: (x: (typeof seq)[number]) => boolean, what: string) => {
    const hits = seq.filter(pred);
    expect(hits.length, what).toBeGreaterThan(0);
    return Math.min(...hits.map((x) => x.start));
  };
  const first = start((x) => x.text === 'Plans that grow', 'the heading’s first half');
  const second = start((x) => x.text === 'with your business.', 'its second half');
  const lead = start((x) => x.text.startsWith('Start with everything'), 'the words under it');
  const trial = start((x) => x.text.startsWith('30'), 'the trial');
  const plans = seq.filter((x) => x.tag === 'article').map((x) => x.start);
  expect(first).toBe(second);
  expect(first).toBeLessThan(lead);
  expect(lead).toBeLessThan(trial);
  expect(plans).toHaveLength(3);
  expect([...plans].sort((a, b) => a - b)).toEqual(plans);
  expect(plans[0]).toBeGreaterThan(trial);
  expect(Math.max(...seq.map((x) => x.end))).toBeLessThanOrEqual(2500);
});

test('with less motion asked for, nothing on the website moves when it loads', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/pricing', '/sign-in']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const moving = await page.evaluate(() =>
      document.getAnimations().map((a) => (a as CSSAnimation).animationName),
    );
    expect(moving, path).toEqual([]);
  }
});

// docs/specs/website-showcase.md, the owner's notes of 28 October, 00:35: as the phones band passes the two phones
// part a little, and on phones they rise out of the band's foot as it comes into view.

test('as the phones band passes the two phones part a little, and on phones they rise into place', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const pairTop = await page
    .getByTestId('phone-light')
    .evaluate((el) => el.parentElement!.getBoundingClientRect().top + scrollY);
  const height = page.viewportSize()!.height;
  const at = async (offset: number) => {
    await page.evaluate((y) => window.scrollTo(0, y), pairTop - offset);
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const length = (value: string) => Number(value.replace(/[^\d.-]/g, '') || '0');
      const moved = (id: string) => {
        const t = getComputedStyle(document.querySelector(`[data-testid="${id}"]`)!).translate;
        const [x = '0', y = '0'] = t === 'none' ? [] : t.split(' ');
        return { x: length(x), y: length(y) };
      };
      return { light: moved('phone-light'), dark: moved('phone-dark') };
    });
  };
  const arriving = await at(height - 80);
  const leaving = await at(-200);
  if (info.project.name === 'phone') {
    expect(arriving.light.y).toBeGreaterThan(80);
    expect(arriving.dark.y).toBeGreaterThan(arriving.light.y);
    expect(leaving.light.y).toBe(0);
    expect(leaving.dark.y).toBe(0);
  } else {
    // apart = how far the dark phone sits right of and below the light one, beyond where they rest
    const apart = (m: typeof arriving) => m.dark.x - m.light.x + (m.dark.y - m.light.y);
    expect(apart(leaving)).toBeGreaterThan(apart(arriving) + 40);
  }
});
