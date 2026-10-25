import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { secondColour, type DocumentSnapshot } from '@invoica/core';
import { organisationProfileInput } from '@invoica/schemas';
import { getDocument } from '../src/documents';
import { getOrganisation, updateOrganisationProfile } from '../src/organisations';
import { organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { TODAY, business, failure, issued, type Business } from './business';

/** Acceptance criteria 6, 7 and 9: docs/specs/invoice-templates.md, the second colour and the logo's ground. */

let t: TestDatabase;
beforeAll(async () => {
  t = await createTestDatabase();
});
afterAll(async () => {
  await t?.close();
});

const profile = async (b: Business, change: Record<string, unknown>) => {
  const org = await b.run((tx) => getOrganisation(tx, b.actor));
  return organisationProfileInput.parse({ ...org, ...change });
};
const save = async (b: Business, change: Record<string, unknown>) => {
  const input = await profile(b, change);
  await b.run((tx) => updateOrganisationProfile(tx, b.actor, input));
};
const snapshotOf = async (b: Business, id: string) =>
  (await b.run((tx) => getDocument(tx, id, TODAY)))!.document.snapshot as unknown as DocumentSnapshot;
const line = (b: Business) => [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }];

describe('the second colour and the logo’s ground in settings', () => {
  it('are saved with the profile, and the second colour can go back to automatic', async () => {
    const b = await business(t, 'Colour Office');
    await save(b, { brandColour: '#ff7a1a', accentColour: '#2b0b3f', logoGround: 'cream' });
    let org = await b.run((tx) => getOrganisation(tx, b.actor));
    expect([org.accentColour, org.logoGround]).toEqual(['#2b0b3f', 'cream']);

    await save(b, { accentColour: null });
    org = await b.run((tx) => getOrganisation(tx, b.actor));
    expect(org.accentColour).toBeNull();
  });

  it('a new organisation has an automatic second colour and a white ground', async () => {
    const b = await business(t, 'Default Office');
    const org = await b.run((tx) => getOrganisation(tx, b.actor));
    expect([org.accentColour, org.logoGround]).toEqual([null, 'white']);
  });

  it('the database refuses a second colour that is not a hex colour, and a ground outside the four', async () => {
    const b = await business(t, 'Refusing Office');
    const set = (values: Record<string, string>) =>
      b.run((tx) => tx.update(organisation).set(values).where(eq(organisation.id, b.actor.organisationId)));
    expect(await failure(set({ accentColour: 'blue' }))).toMatch(/check constraint|violates/);
    expect(await failure(set({ logoGround: 'pink' }))).toMatch(/check constraint|violates/);
  });
});

describe('what an issued invoice records', () => {
  it('the worked-out second colour when it is automatic, or the business’s own', async () => {
    const b = await business(t, 'Issuing Office');
    await save(b, { brandColour: '#c6f03a' });
    const auto = await issued(b, line(b), { template: 'marquee' });
    expect((await snapshotOf(b, auto)).seller.accentColour).toBe(secondColour('#c6f03a'));

    await save(b, { accentColour: '#3a1052', logoGround: 'black' });
    const own = await issued(b, line(b), { template: 'marquee' });
    const s = await snapshotOf(b, own);
    expect([s.seller.accentColour, s.seller.logoGround]).toEqual(['#3a1052', 'black']);
  });

  it('keeps them when the settings change afterwards', async () => {
    const b = await business(t, 'Keeping Office');
    await save(b, { brandColour: '#5b2bff', accentColour: '#f7f06d', logoGround: 'cream' });
    const id = await issued(b, line(b), { template: 'billboard' });
    await save(b, { brandColour: '#17795a', accentColour: null, logoGround: 'none' });
    const s = await snapshotOf(b, id);
    expect([s.seller.brandColour, s.seller.accentColour, s.seller.logoGround]).toEqual([
      '#5b2bff',
      '#f7f06d',
      'cream',
    ]);
  });
});
