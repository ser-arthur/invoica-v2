/**
 * Where the hero's fold runs. It starts at the top right corner of the screen (or `reach` pixels right of
 * centre on very wide screens) and passes through one point of the headline, given in headline sizes from
 * the headline's top left corner: the middle line, just before "way". The page's styles and the tests both
 * read these numbers.
 */
export const FOLD = { anchorX: 3.59, anchorY: 1.41, reach: 900, halfContent: 592 } as const;

/** The fold as a line across the hero: its height below the hero's top edge at any distance from the left. */
export function foldLine({
  width,
  hs,
  pad,
  gutter,
}: {
  width: number;
  hs: number;
  pad: number;
  gutter: number;
}) {
  const cx = Math.min(width, width / 2 + FOLD.reach);
  const ax = Math.max(gutter, width / 2 - FOLD.halfContent) + hs * FOLD.anchorX;
  const ay = pad + hs * FOLD.anchorY;
  return { yAt: (x: number) => (ay * (cx - x)) / (cx - ax) };
}
