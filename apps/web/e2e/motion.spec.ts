import { expect, test } from '@playwright/test';

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

// docs/specs/website-showcase.md, criteria 5 and 6: the hero's one load sequence. Every animation on the page's own
// clock is held still and stepped through, frame by frame.

type Point = [number, number];
type Frame = {
  t: number;
  /** Line by line, whether the near and far copies sit in the same place with the same opacity. */
  aligned: boolean[];
  /** Points of the headline shown by neither copy, or by both. */
  gaps: number;
  doubled: number;
  /** Where the grey starts, and where the crease is drawn up to, in pixels down the page. */
  front: number;
  tip: number;
  /** Whether the end of each line, past the fold, is grey yet. */
  grey: boolean[];
  header: number;
};

test('loading the home page, the headline rises whole and the crease draws up from its foot', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const { frames, ends } = await page.evaluate(() => {
    const held = document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline);
    for (const a of held) a.pause();
    const heading = document.querySelector('main h1') as HTMLElement;
    const far = heading.nextElementSibling as HTMLElement;
    const svg = far.nextElementSibling as SVGSVGElement;
    const brand = document.querySelector('header a') as HTMLElement;
    const polygon = (el: Element): Point[] => {
      const box = el.getBoundingClientRect();
      return [...getComputedStyle(el).clipPath.matchAll(/(-?[\d.]+)%\s+(-?[\d.]+)%/g)].map(([, x, y]) => [
        box.left + (box.width * Number(x)) / 100,
        box.top + (box.height * Number(y)) / 100,
      ]);
    };
    const inside = (poly: Point[], [x, y]: Point) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]!;
        const [xj, yj] = poly[j]!;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const onEdge = (poly: Point[], [x, y]: Point) =>
      poly.some((a, i) => {
        const b = poly[(i + 1) % poly.length]!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < 1;
      });
    const nearLines = [...heading.children] as HTMLElement[];
    const farLines = [...far.children] as HTMLElement[];
    // the end of each line's words, a little in from the last letter
    const ends = nearLines.map((line): Point => {
      const range = document.createRange();
      range.selectNodeContents(line);
      const r = range.getBoundingClientRect();
      return [r.right - r.height * 0.15, r.top + r.height / 2];
    });
    const frames: Frame[] = [];
    for (let t = 0; t <= 2000; t += 40) {
      for (const a of held) a.currentTime = t;
      const near = polygon(heading);
      const past = polygon(far);
      const box = heading.getBoundingClientRect();
      let gaps = 0;
      let doubled = 0;
      for (let x = box.left + 1.5; x < box.right; x += 4) {
        for (let y = box.top + 1.5; y < box.bottom; y += 4) {
          const p: Point = [x, y];
          if (onEdge(near, p) || onEdge(past, p)) continue;
          const shown = Number(inside(near, p)) + Number(inside(past, p));
          if (shown === 0) gaps++;
          if (shown === 2) doubled++;
        }
      }
      const aligned = nearLines.map((line, i) => {
        const a = line.getBoundingClientRect();
        const b = farLines[i]!.getBoundingClientRect();
        return (
          Math.abs(a.left - b.left) < 0.5 &&
          Math.abs(a.top - b.top) < 0.5 &&
          getComputedStyle(line).opacity === getComputedStyle(farLines[i]!).opacity
        );
      });
      const mask = getComputedStyle(svg).maskImage.match(/(-?[\d.]+)%\)\s*$/);
      const s = svg.getBoundingClientRect();
      frames.push({
        t,
        aligned,
        gaps,
        doubled,
        front: past[0]?.[1] ?? Number.NaN,
        tip: mask ? s.top + (s.height * Number(mask[1])) / 100 : Number.NaN,
        grey: ends.map((p) => inside(past, p)),
        header: Number(getComputedStyle(brand).opacity),
      });
    }
    return { frames, ends: held.map((a) => a.effect?.getComputedTiming().endTime as number) };
  });

  for (const f of frames) {
    expect(f.aligned, `the two copies at ${f.t} ms`).toEqual([true, true, true]);
    expect(f.gaps, `letters hidden at ${f.t} ms`).toBe(0);
    expect(f.doubled, `letters set twice at ${f.t} ms`).toBe(0);
    expect(f.front, `the grey ahead of the crease at ${f.t} ms`).toBeGreaterThanOrEqual(f.tip - 1);
  }
  // The grey only grows, from the foot up: the last line turns before the first.
  for (let i = 1; i < frames.length; i++)
    expect(frames[i]!.front).toBeLessThanOrEqual(frames[i - 1]!.front + 0.01);
  const turns = [0, 1, 2].map((line) => frames.findIndex((f) => f.grey[line]));
  expect(Math.min(...turns), 'every line turns grey past the fold').toBeGreaterThan(0);
  expect(turns[2]).toBeLessThan(turns[0]!);
  // The header takes part, first; everything is settled inside two seconds.
  expect(frames[0]!.header).toBeLessThan(1);
  expect(frames.at(-1)!.header).toBe(1);
  expect(Math.max(...ends)).toBeLessThanOrEqual(2000);

  // Half way up, the crease is drawn at its foot and not yet at its top: held still and looked at.
  const half = frames.find((f) => f.front <= (frames[0]!.front + frames.at(-1)!.front) / 2)!;
  const points = await page.evaluate((t) => {
    for (const a of document.getAnimations()) if (a.timeline instanceof DocumentTimeline) a.currentTime = t;
    const svg = document.querySelector('main h1')!.nextElementSibling!.nextElementSibling as SVGSVGElement;
    const line = svg.querySelectorAll('line')[1]!;
    const s = svg.getBoundingClientRect();
    const at = (k: number): Point => {
      const x1 = line.x1.baseVal.value;
      const y1 = line.y1.baseVal.value;
      const x2 = line.x2.baseVal.value;
      const y2 = line.y2.baseVal.value;
      // from the foot (x2, y2) towards the top (x1, y1)
      return [
        s.left + ((x2 + (x1 - x2) * k) / 100) * s.width,
        s.top + ((y2 + (y1 - y2) * k) / 100) * s.height,
      ];
    };
    return [at(0.3), at(0.8)];
  }, half.t);
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
