import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/client';
import { databaseProblem, describeDatabaseError } from '../src/client';
import { createTestDatabase, type TestDatabase } from './helpers';

// docs/deploy.md step 6: when the health check says the database is unavailable, the function's log says why, in
// the driver's words, which name the role or the host but never a password.

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t.close();
});

describe('why the database does not answer', () => {
  it('says nothing when it answers, for the app role and the worker role', async () => {
    expect(await databaseProblem(t.db)).toBeNull();
    expect(await databaseProblem(t.worker.db)).toBeNull();
  });

  it('names a wrong password by its code and the role, and never repeats the password', async () => {
    const url = new URL(t.appUrl);
    url.password = 'not-the-password-xyz';
    const wrong = createDatabase(url.toString(), { max: 1 });
    try {
      const problem = await databaseProblem(wrong.db);
      expect(problem).toMatch(/^28P01 password authentication failed for user "invoica_app"/);
      expect(problem).not.toContain('not-the-password-xyz');
    } finally {
      await wrong.pool.end();
    }
  });

  it('names a database that is not there', async () => {
    const url = new URL(t.appUrl);
    url.pathname = '/invoica_not_here';
    const missing = createDatabase(url.toString(), { max: 1 });
    try {
      expect(await databaseProblem(missing.db)).toMatch(/^3D000 database "invoica_not_here" does not exist/);
    } finally {
      await missing.pool.end();
    }
  });

  it('names a refused connection', async () => {
    const url = new URL(t.appUrl);
    url.hostname = '127.0.0.1';
    url.port = '1';
    const refused = createDatabase(url.toString(), { max: 1 });
    try {
      expect(await databaseProblem(refused.db)).toMatch(/^ECONNREFUSED/);
    } finally {
      await refused.pool.end();
    }
  });
});

describe('the words for an error', () => {
  it('reads the driver error inside a failed query', () => {
    const driver = Object.assign(new Error('password authentication failed for user "invoica_app"'), {
      code: '28P01',
    });
    const query = Object.assign(new Error('Failed query: select 1\nparams: '), { cause: driver });
    expect(describeDatabaseError(query)).toBe('28P01 password authentication failed for user "invoica_app"');
  });

  it('reads the first of several connection errors', () => {
    const first = Object.assign(new Error('connect ECONNREFUSED ::1:5432'), { code: 'ECONNREFUSED' });
    const all = Object.assign(new AggregateError([first], ''), { code: 'ECONNREFUSED' });
    expect(describeDatabaseError(all)).toBe('ECONNREFUSED connect ECONNREFUSED ::1:5432');
  });

  it('keeps to 200 characters, and says something for an error with no words', () => {
    expect(describeDatabaseError(new Error('x'.repeat(500)))).toHaveLength(200);
    expect(describeDatabaseError({})).toBe('no reason given');
  });
});
