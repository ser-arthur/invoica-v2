import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('./auth', () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock('./db', () => ({ getDb: () => ({}) }));

const { isSignedIn } = await import('./session');

describe('isSignedIn, for public pages', () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it('is true with a session', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } });
    await expect(isSignedIn()).resolves.toBe(true);
  });

  it('is false without one', async () => {
    getSession.mockResolvedValue(null);
    await expect(isSignedIn()).resolves.toBe(false);
  });

  it('is false when the session cannot be looked up, so the page still shows', async () => {
    getSession.mockRejectedValue(new Error('The database is not reachable'));
    await expect(isSignedIn()).resolves.toBe(false);
  });
});
