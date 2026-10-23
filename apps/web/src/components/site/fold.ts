/**
 * The crease across a headline, in per cent of the headline's own box: where the line meets the top and the
 * foot of a drawing box that runs `extend` per cent of the headline's height above and below it, and the part
 * of its width the line is drawn across. The page and the tests both read these numbers.
 */
export const CREASE = { xTop: 121, xBottom: -18, extend: 14, span: [-3, 112] as [number, number] };

type Box = { x: number; y: number; width: number; height: number };

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
