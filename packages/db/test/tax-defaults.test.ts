import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { organisation, taxCode } from '../src/schema';
import { authUser } from '../src/schema';
import { createOrganisation } from '../src/organisations';
import { archiveTaxCode, listTaxCodes, loadPreset, updateTaxCode } from '../src/taxes';
import { withOrganisation, type Actor } from '../src/tenancy';
import { createTestDatabase, type TestDatabase } from './helpers';

/**
 * Tax defaults: prices exclude tax by default in every country; a country's standard codes are added at onboarding
 * and again from Settings, and stay editable.
 */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

async function onboard(countryCode: string, baseCurrency: string, timeZone: string): Promise<Actor> {
  const userId = `user_${randomBytes(4).toString('hex')}`;
  await t.db.insert(authUser).values({ id: userId, name: 'Owner', email: `${userId}@example.test` });
  const organisationId = await createOrganisation(t.db, userId, {
    name: `Office ${countryCode}`,
    businessType: 'sole_trader',
    countryCode,
    baseCurrency,
    timeZone,
    taxRegistered: true,
    taxNumber: 'TAX-0001',
  });
  return { userId, organisationId };
}

const run = <T>(actor: Actor, fn: Parameters<typeof withOrganisation<T>>[2]) =>
  withOrganisation(t.db, actor, fn);

describe('a new organisation', () => {
  it.each([
    ['GB', 'GBP', 'Europe/London', ['no_tax', 'uk_vat_standard', 'uk_vat_reduced', 'uk_vat_zero']],
    ['GH', 'GHS', 'Africa/Accra', ['no_tax', 'gh_standard', 'gh_zero', 'gh_exempt']],
    ['US', 'USD', 'America/New_York', ['no_tax']],
  ])(
    'in %s starts with prices excluding tax and its standard codes',
    async (country, currency, zone, keys) => {
      const actor = await onboard(country, currency, zone);
      const [org] = await run(actor, (tx) => tx.select().from(organisation));
      expect(org!.pricesIncludeTax).toBe(false);
      const have = (await run(actor, (tx) => listTaxCodes(tx))).map((c) => c.presetKey);
      for (const key of keys) expect(have, key).toContain(key);
    },
  );
});

describe('adding the standard codes again from Settings', () => {
  it('brings back an archived code and leaves an edited one as it is', async () => {
    const actor = await onboard('GB', 'GBP', 'Europe/London');
    const codes = await run(actor, (tx) => listTaxCodes(tx));
    const reduced = codes.find((c) => c.presetKey === 'uk_vat_reduced')!;
    const standard = codes.find((c) => c.presetKey === 'uk_vat_standard')!;
    await run(actor, (tx) => archiveTaxCode(tx, actor, reduced.id));
    await run(actor, (tx) =>
      updateTaxCode(tx, actor, standard.id, {
        label: 'Standard 20%',
        treatment: 'standard',
        components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
        isDefault: true,
      }),
    );
    expect((await run(actor, (tx) => listTaxCodes(tx))).map((c) => c.presetKey)).not.toContain(
      'uk_vat_reduced',
    );

    expect(await run(actor, (tx) => loadPreset(tx, actor, 'GB'))).toBe(1);
    const after = await run(actor, (tx) => listTaxCodes(tx));
    expect(after.find((c) => c.presetKey === 'uk_vat_reduced')?.id).toBe(reduced.id);
    expect(after.find((c) => c.presetKey === 'uk_vat_standard')?.label).toBe('Standard 20%');
    expect(after.filter((c) => c.presetKey === 'uk_vat_reduced')).toHaveLength(1);
  });

  it('a standard code that was edited and then archived comes back at the standard rate', async () => {
    const actor = await onboard('GB', 'GBP', 'Europe/London');
    const standard = (await run(actor, (tx) => listTaxCodes(tx))).find(
      (c) => c.presetKey === 'uk_vat_standard',
    )!;
    await run(actor, (tx) =>
      updateTaxCode(tx, actor, standard.id, {
        label: 'Old rate 17.5%',
        treatment: 'standard',
        components: [{ name: 'VAT', ratePpm: 175_000, compound: false }],
        isDefault: false,
      }),
    );
    await run(actor, (tx) => archiveTaxCode(tx, actor, standard.id));
    expect(await run(actor, (tx) => loadPreset(tx, actor, 'GB'))).toBe(1);
    const all = await run(actor, (tx) => tx.select().from(taxCode));
    const back = all.filter((c) => c.presetKey === 'uk_vat_standard');
    expect(back).toHaveLength(1);
    expect([back[0]!.archivedAt, back[0]!.components[0]!.ratePpm, back[0]!.id === standard.id]).toEqual([
      null,
      200_000,
      false,
    ]);
    // The edited code stays archived as it was, for the documents that used it.
    const old = all.find((c) => c.id === standard.id)!;
    expect([old.label, old.presetKey, old.archivedAt !== null]).toEqual(['Old rate 17.5%', null, true]);
  });

  it('adds nothing when every standard code is there', async () => {
    const actor = await onboard('GH', 'GHS', 'Africa/Accra');
    expect(await run(actor, (tx) => loadPreset(tx, actor, 'GH'))).toBe(0);
  });
});
