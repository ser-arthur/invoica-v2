import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * docs/deploy.md step 6: the health check answers whether the app can reach its database, as the app role and as
 * the worker role. When it cannot, the answer stays two words and the function's log says which connection and why.
 */

const db = vi.hoisted(() => ({
  databaseProblem: vi.fn(async (_db: unknown): Promise<string | null> => null),
}));
const handles = vi.hoisted(() => ({
  getDb: vi.fn(() => 'app-db'),
  getWorkerDb: vi.fn(() => 'worker-db'),
}));
vi.mock('@invoica/db', () => db);
vi.mock('@/lib/db', () => handles);

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('the health check', () => {
  it('answers ok when both connections answer, and logs nothing', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('./route');
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(db.databaseProblem).toHaveBeenCalledWith('app-db');
    expect(db.databaseProblem).toHaveBeenCalledWith('worker-db');
    expect(log).not.toHaveBeenCalled();
  });

  it('answers 503 when the app role cannot connect, and logs which setting and why', async () => {
    db.databaseProblem.mockImplementation(async (handle) =>
      handle === 'app-db' ? '28P01 password authentication failed for user "invoica_app"' : null,
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('./route');
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]!.join(' ')).toContain(
      'DATABASE_URL: 28P01 password authentication failed for user "invoica_app"',
    );
  });

  it('answers 503 when only the worker role cannot connect, and names that setting', async () => {
    db.databaseProblem.mockImplementation(async (handle) =>
      handle === 'worker-db' ? 'ECONNREFUSED connect ECONNREFUSED 127.0.0.1:5432' : null,
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('./route');
    const response = await GET();
    expect(response.status).toBe(503);
    expect(log.mock.calls[0]!.join(' ')).toContain('DATABASE_WORKER_URL: ECONNREFUSED');
  });
});
