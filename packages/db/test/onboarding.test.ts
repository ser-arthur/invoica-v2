import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { authUser } from '../src/schema';
import { createFirstOrganisation, myOrganisations } from '../src/organisations';
import { createTestDatabase, type TestDatabase } from './helpers';

/** Onboarding makes a person's first business once: sent again after a lost answer, or twice at once. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

async function person() {
  const userId = `user_${randomBytes(4).toString('hex')}`;
  await t.db.insert(authUser).values({ id: userId, name: 'Owner', email: `${userId}@example.test` });
  return userId;
}

const business = {
  name: 'Fern Studio',
  businessType: 'sole_trader' as const,
  countryCode: 'GB',
  baseCurrency: 'GBP',
  timeZone: 'Europe/London',
  taxRegistered: false,
  taxNumber: null,
};

describe('onboarding', () => {
  it('sent again, it returns the business made the first time', async () => {
    const userId = await person();
    const first = await createFirstOrganisation(t.db, userId, business);
    expect(await createFirstOrganisation(t.db, userId, business)).toBe(first);
    expect(await myOrganisations(t.db, userId)).toHaveLength(1);
  });

  it('sent twice at the same moment, it makes one business', async () => {
    const userId = await person();
    const ids = await Promise.all([
      createFirstOrganisation(t.db, userId, business),
      createFirstOrganisation(t.db, userId, business),
    ]);
    expect(ids[0]).toBe(ids[1]);
    expect(await myOrganisations(t.db, userId)).toHaveLength(1);
  });
});
