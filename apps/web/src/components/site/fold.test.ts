import { describe, expect, it } from 'vitest';
import { CREASE, DRAWING_RATIO, hairlineShift } from './fold';

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
