import { describe, expect, it } from 'vitest';
import { UNREACHABLE, reach } from './reach';

/** A call to the server that never answers, or fails on the way, comes back as a message, never as a crash. */

describe('reach', () => {
  it('passes an answer through as it is', async () => {
    expect(await reach(Promise.resolve({ ok: true as const, data: 3 }))).toEqual({ ok: true, data: 3 });
    expect(await reach(Promise.resolve({ ok: false as const, message: 'No.' }))).toEqual({
      ok: false,
      message: 'No.',
    });
  });

  it('turns a failed call into a message that says the change may not have been saved', async () => {
    const r = await reach(Promise.reject(new TypeError('Failed to fetch')));
    expect(r).toEqual({ ok: false, message: UNREACHABLE, unreachable: true });
    expect(UNREACHABLE).toMatch(/may not have been saved/);
  });

  it('a call that answers nothing at all is treated as unreachable too', async () => {
    expect(await reach(Promise.resolve(undefined as never))).toMatchObject({ ok: false, unreachable: true });
  });
});
