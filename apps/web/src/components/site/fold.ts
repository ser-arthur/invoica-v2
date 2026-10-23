/**
 * The crease across a headline, in per cent of the headline's own box: where the line meets the top and the
 * foot of a drawing box that runs `extend` per cent of the headline's height above and below it, and the part
 * of its width the line is drawn across. The page and the tests both read these numbers.
 */
export const CREASE = { xTop: 121, xBottom: -18, extend: 14, span: [-3, 112] as [number, number] };

/**
 * The drawing box's width over its height. Both follow the headline's type size, so it is the same at every width
 * (measured at 1.669 on the home page and the sign-in panel, from 390 to 1440 pixels wide).
 */
export const DRAWING_RATIO = 1.669;

type Box = { x: number; y: number; width: number; height: number };

/**
 * How far along the crease, in its own 0 to 1, to move the hairline drawn `gap` per cent of the width beside it,
 * so that it sits square to the line on screen and the two end together.
 */
export function hairlineShift(gap: number, crease: typeof CREASE = CREASE, ratio = DRAWING_RATIO) {
  if (gap === 0) return 0;
  const across = crease.xBottom - crease.xTop;
  const k = ratio / 100;
  return (-gap * across * k * k) / (across * across * k * k + 1);
}

/** The drawn segment of the crease, in the same units as the box it is given. */
export function creaseSegment(box: Box, crease: typeof CREASE = CREASE) {
  const { xTop, xBottom, extend, span } = crease;
  const top = box.y - (box.height * extend) / 100;
  const foot = box.y + box.height * (1 + extend / 100);
  const xAt = (t: number) => box.x + (box.width * (xTop + (xBottom - xTop) * t)) / 100;
  const yAt = (t: number) => top + (foot - top) * t;
  const t0 = Math.max(0, (xTop - span[1]) / (xTop - xBottom));
  const t1 = Math.min(1, (xTop - span[0]) / (xTop - xBottom));
  return { from: { x: xAt(t0), y: yAt(t0) }, to: { x: xAt(t1), y: yAt(t1) } };
}
