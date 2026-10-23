import { describe, expect, it } from 'vitest';
import { CREASE, DRAWING_RATIO, farSide, hairlineShift, TONE_FRAME } from './fold';

describe('the hairline beside the crease', () => {
  it('sits square to the line, so the two end together at both ends', () => {
    const { xTop, xBottom } = CREASE;
    const gap = 0.6;
    const delta = hairlineShift(gap);
    // On screen, with the drawing box as wide as DRAWING_RATIO times its height (both in per cent of the box):
    const along = { x: ((xBottom - xTop) * DRAWING_RATIO) / 100, y: 1 };
    // Moving the hairline `gap` across and `delta` along the line leaves no part of the move along it.
    const move = { x: ((gap + (xBottom - xTop) * delta) * DRAWING_RATIO) / 100, y: delta };
    expect(move.x * along.x + move.y * along.y).toBeCloseTo(0, 10);
    // It still stands apart from the line: square to it, by the gap's part that is square to the line.
    const length = Math.hypot(along.x, along.y);
    const apart = Math.hypot(move.x, move.y);
    expect(apart).toBeCloseTo(((gap * DRAWING_RATIO) / 100) * (along.y / length), 10);
    expect(apart).toBeGreaterThan(0);
  });

  it('makes no change when there is no gap', () => {
    expect(hairlineShift(0)).toBe(0);
  });
});

describe('the far side of the crease, as a flat tone', () => {
  const { xTop, xBottom, extend } = CREASE;
  const height = 100 + 2 * extend;
  /** How far right of the crease a point is, in per cent of the headline's width; zero on the crease. */
  const past = (x: number, y: number) => x - (xTop + ((xBottom - xTop) * (extend + y)) / height);
  /** A corner of the tone, from per cent of its frame back to per cent of the headline's box. */
  const inBox = ([x, y]: [number, number]) =>
    [TONE_FRAME.left + (x * TONE_FRAME.width) / 100, TONE_FRAME.top + (y * TONE_FRAME.height) / 100] as const;

  it('has two corners on the crease and the rest past it', () => {
    const corners = farSide().map(inBox);
    const on = corners.filter(([x, y]) => Math.abs(past(x, y)) < 1e-9);
    expect(on).toHaveLength(2);
    for (const [x, y] of corners) expect(past(x, y)).toBeGreaterThanOrEqual(-1e-9);
  });

  it('stays inside its frame, and the frame reaches well past the headline on every side', () => {
    for (const [x, y] of farSide()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
    expect(TONE_FRAME.left).toBeLessThanOrEqual(-100);
    expect(TONE_FRAME.left + TONE_FRAME.width).toBeGreaterThanOrEqual(200);
    expect(TONE_FRAME.top).toBeLessThanOrEqual(-300);
    expect(TONE_FRAME.top + TONE_FRAME.height).toBeGreaterThanOrEqual(400);
  });

  it('covers the words past the crease and leaves the words before it', () => {
    // "paid." sits low and right of the crease; "Every" high and left.
    expect(past(60, 85)).toBeGreaterThan(0);
    expect(past(10, 15)).toBeLessThan(0);
  });
});
