import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { clientInput, itemInput, organisationProfileInput, taxCodeInput } from '@invoica/schemas';
import { getClient, setClientArchived, updateClient } from '../src/clients';
import { createItem, listItems, updateItem } from '../src/items';
import { getOrganisation, setLogo, updateOrganisationProfile } from '../src/organisations';
import { updateReminderSettings } from '../src/reminders';
import { item, taxCode } from '../src/schema';
import { archiveTaxCode, listTaxCodes, updateTaxCode } from '../src/taxes';
import {
  clientVersion,
  clientVersionOf,
  itemVersion,
  itemVersionOf,
  profileVersion,
  profileVersionOf,
  taxCodeVersion,
  taxCodeVersionOf,
} from '../src/versions';
import { createTestDatabase, type TestDatabase } from './helpers';
import { business, draftFor, issued, type Business } from './business';
import { createDraft, deleteDraft, duplicateDocument, updateDraft } from '../src/documents';
import { document } from '../src/schema';

/** docs/specs/changes-elsewhere.md: settings, clients, saved items and tax codes edited from an older page. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

/** "saved", or the code of the refusal. */
async function outcome(save: Promise<unknown>): Promise<string> {
  try {
    await save;
    return 'saved';
  } catch (error) {
    return (error as { code?: string }).code ?? (error as Error).message;
  }
}

describe('settings', () => {
  const profile = async (b: Business, change: Record<string, unknown>) => {
    const org = await b.run((tx) => getOrganisation(tx, b.actor));
    return organisationProfileInput.parse({ ...org, ...change });
  };
  const version = (b: Business) => b.run((tx) => profileVersion(tx, b.actor.organisationId));
  const save = (b: Business, input: Awaited<ReturnType<typeof profile>>, base?: string | null) =>
    b.run((tx) => updateOrganisationProfile(tx, b.actor, input, base));

  it('a save from an older page that would change them is refused, and changes nothing', async () => {
    const b = await business(t, 'Settings Elsewhere Office');
    const laptop = await version(b);
    const laptopForm = await profile(b, { name: 'Renamed On Laptop' });
    // The phone changes the bank details.
    const phone = await version(b);
    expect(phone).toBe(laptop);
    const phoneVersion = await save(
      b,
      await profile(b, { paymentDetails: { bank: { bankName: 'New Bank', accountNumber: '87654321' } } }),
      phone,
    );
    expect(phoneVersion).not.toBe(laptop);
    expect(await outcome(save(b, laptopForm, laptop))).toBe('settings_changed');
    const org = await b.run((tx) => getOrganisation(tx, b.actor));
    expect(org.name).toBe('Settings Elsewhere Office');
    expect(org.paymentDetails).toMatchObject({ bank: { bankName: 'New Bank', accountNumber: '87654321' } });
    // Against the version as it is now, the laptop's form saves (replacing the bank details it holds).
    expect(await outcome(save(b, laptopForm, await version(b)))).toBe('saved');
    expect((await b.run((tx) => getOrganisation(tx, b.actor))).name).toBe('Renamed On Laptop');
  });

  it('a save that changes nothing stored is accepted, and each save answers with the version to send next', async () => {
    const b = await business(t, 'Settings Repeat Office');
    const opened = await version(b);
    const form = await profile(b, { name: 'Same Change Office' });
    const first = await save(b, form, opened);
    // The same save again from the same page, its answer lost: nothing would change, so it is accepted.
    expect(await outcome(save(b, form, opened))).toBe('saved');
    // The page keeps the version each save answers with, so a second change from it is accepted.
    expect(await outcome(save(b, await profile(b, { phone: '0113 496 0000' }), first))).toBe('saved');
  });

  it('reminder settings and the logo, saved elsewhere, never refuse a save of the settings', async () => {
    const b = await business(t, 'Settings Other Forms Office');
    const opened = await version(b);
    const form = await profile(b, { name: 'Other Forms Renamed' });
    await b.run((tx) =>
      updateReminderSettings(tx, b.actor, {
        remindersEnabled: false,
        reminderOffsets: [7],
        reminderWording: {},
      }),
    );
    await b.run((tx) => setLogo(tx, b.actor, null));
    expect(await version(b)).toBe(opened);
    expect(await outcome(save(b, form, opened))).toBe('saved');
  });

  it('a save without a version, from an older client of the app, is applied as before', async () => {
    const b = await business(t, 'Settings Unversioned Office');
    await save(b, await profile(b, { phone: '0113 496 0001' }));
    expect(await outcome(save(b, await profile(b, { name: 'Unversioned Renamed' })))).toBe('saved');
  });
});

describe('a client', () => {
  const form = async (b: Business, change: Record<string, unknown>) => {
    const found = (await b.run((tx) => getClient(tx, b.clientId)))!;
    const { idempotencyKey: _key, ...stored } = found.client;
    return clientInput.parse({
      ...stored,
      fields: found.fields.map((f) => ({
        label: f.label,
        value: f.value,
        showOnDocuments: f.showOnDocuments,
      })),
      ...change,
    });
  };
  const version = async (b: Business) => (await b.run((tx) => clientVersion(tx, b.clientId)))!;
  const save = (b: Business, input: Awaited<ReturnType<typeof form>>, base?: string | null) =>
    b.run((tx) => updateClient(tx, b.actor, b.clientId, input, base));

  it('a save from an older page is refused once the email or an extra field changed elsewhere', async () => {
    const b = await business(t, 'Client Elsewhere Office');
    const opened = await version(b);
    const laptop = await form(b, { notes: 'Pays on the first of the month.' });
    await save(b, await form(b, { email: 'new-accounts@northlane.example' }), opened);
    expect(await outcome(save(b, laptop, opened))).toBe('client_changed');
    expect((await b.run((tx) => getClient(tx, b.clientId)))!.client.email).toBe(
      'new-accounts@northlane.example',
    );

    const fresh = await version(b);
    await save(b, await form(b, { fields: [{ label: 'PO', value: '4471', showOnDocuments: true }] }), fresh);
    expect(await version(b)).not.toBe(fresh);
    expect(await outcome(save(b, await form(b, { fields: [] }), fresh))).toBe('client_changed');
  });

  it('archiving elsewhere never refuses it, and a save that changes nothing is accepted', async () => {
    const b = await business(t, 'Client Archive Office');
    const opened = await version(b);
    const laptop = await form(b, { phone: '0161 496 0000' });
    await b.run((tx) => setClientArchived(tx, b.actor, b.clientId, true));
    expect(await version(b)).toBe(opened);
    const next = await save(b, laptop, opened);
    expect(await outcome(save(b, laptop, opened))).toBe('saved');
    expect(await outcome(save(b, await form(b, { phone: '0161 496 0001' }), next))).toBe('saved');
  });
});

describe('a saved item', () => {
  it('a save from an older page is refused once its price changed elsewhere', async () => {
    const b = await business(t, 'Item Elsewhere Office');
    const id = await b.run((tx) =>
      createItem(tx, b.actor, itemInput.parse({ name: 'Site visit', unitPrice: 9000 })),
    );
    const opened = (await b.run((tx) => itemVersion(tx, id)))!;
    await b.run((tx) =>
      updateItem(tx, b.actor, id, itemInput.parse({ name: 'Site visit', unitPrice: 12_000 }), opened),
    );
    expect(
      await outcome(
        b.run((tx) =>
          updateItem(
            tx,
            b.actor,
            id,
            itemInput.parse({ name: 'Site visit (half day)', unitPrice: 9000 }),
            opened,
          ),
        ),
      ),
    ).toBe('item_changed');
    const [kept] = await b.run((tx) => tx.select().from(item).where(eq(item.id, id)));
    expect([kept!.name, kept!.unitPrice]).toEqual(['Site visit', 12_000]);
  });
});

describe('a tax code', () => {
  const code = (b: Business, id: string) =>
    b.run(async (tx) => (await tx.select().from(taxCode).where(eq(taxCode.id, id)))[0]!);
  const asForm = (row: Awaited<ReturnType<typeof code>>, change: Record<string, unknown>) => {
    const { idempotencyKey: _key, ...stored } = row;
    return taxCodeInput.parse({ ...stored, ...change });
  };

  it('a save from an older page is refused once its rate changed elsewhere', async () => {
    const b = await business(t, 'Tax Elsewhere Office');
    const id = b.codes.zero;
    const opened = (await b.run((tx) => taxCodeVersion(tx, id)))!;
    const laptop = asForm(await code(b, id), { label: 'Zero rate' });
    await b.run(async (tx) =>
      updateTaxCode(
        tx,
        b.actor,
        id,
        asForm(await code(b, id), { components: [{ name: 'VAT', ratePpm: 50_000, compound: false }] }),
        opened,
      ),
    );
    expect(await outcome(b.run((tx) => updateTaxCode(tx, b.actor, id, laptop, opened)))).toBe(
      'tax_code_changed',
    );
    expect((await code(b, id)).components).toEqual([{ name: 'VAT', ratePpm: 50_000, compound: false }]);
  });

  it('another code made the default elsewhere refuses a page that still shows this one as the default', async () => {
    const b = await business(t, 'Tax Default Office');
    const standard = b.codes.vat20;
    const opened = (await b.run((tx) => taxCodeVersion(tx, standard)))!;
    const laptop = asForm(await code(b, standard), { label: 'Standard 20%' });
    await b.run(async (tx) =>
      updateTaxCode(tx, b.actor, b.codes.zero, asForm(await code(b, b.codes.zero), { isDefault: true })),
    );
    expect(await outcome(b.run((tx) => updateTaxCode(tx, b.actor, standard, laptop, opened)))).toBe(
      'tax_code_changed',
    );
    expect((await code(b, b.codes.zero)).isDefault).toBe(true);
  });
});

describe('a tax code archived elsewhere', () => {
  it('cannot be changed or made the default from a page opened before', async () => {
    const b = await business(t, 'Tax Archived Office');
    const row = (await b.run((tx) => tx.select().from(taxCode).where(eq(taxCode.id, b.codes.zero))))[0]!;
    const opened = (await b.run((tx) => taxCodeVersion(tx, b.codes.zero)))!;
    const { idempotencyKey: _key, ...stored } = row;
    await b.run((tx) => archiveTaxCode(tx, b.actor, b.codes.zero));
    expect(
      await outcome(
        b.run((tx) =>
          updateTaxCode(
            tx,
            b.actor,
            b.codes.zero,
            taxCodeInput.parse({ ...stored, isDefault: true }),
            opened,
          ),
        ),
      ),
    ).toBe('tax_code_archived');
    const codes = await b.run((tx) => tx.select().from(taxCode));
    expect(codes.find((c) => c.id === b.codes.vat20)!.isDefault).toBe(true);
    expect(codes.find((c) => c.id === b.codes.zero)!.isDefault).toBe(false);
  });
});

describe('the version a page shows', () => {
  it('is the version a save checks, for each of the four', async () => {
    const b = await business(t, 'Version Page Office');
    const itemId = await b.run((tx) =>
      createItem(tx, b.actor, itemInput.parse({ name: 'Workshop', unitPrice: 30_000 })),
    );
    await b.run(async (tx) => {
      const found = (await getClient(tx, b.clientId))!;
      await updateClient(
        tx,
        b.actor,
        b.clientId,
        clientInput.parse({
          name: found.client.name,
          email: found.client.email,
          fields: [
            { label: 'PO', value: '1', showOnDocuments: true },
            { label: 'Ref', value: 'A', showOnDocuments: false },
          ],
        }),
      );
    });
    await b.run(async (tx) => {
      expect(profileVersionOf(await getOrganisation(tx, b.actor))).toBe(
        await profileVersion(tx, b.actor.organisationId),
      );
      const found = (await getClient(tx, b.clientId))!;
      expect(clientVersionOf(found.client, found.fields)).toBe(await clientVersion(tx, b.clientId));
      const [listed] = (await listItems(tx)).filter((i) => i.id === itemId);
      expect(itemVersionOf(listed!)).toBe(await itemVersion(tx, itemId));
      for (const code of await listTaxCodes(tx))
        expect(taxCodeVersionOf(code)).toBe(await taxCodeVersion(tx, code.id));
    });
  });
});

describe('a draft deleted elsewhere', () => {
  it('a save from the page still open says so, with its own code, so the page can save what was typed as a new draft', async () => {
    const b = await business(t, 'Deleted Draft Office');
    const draft = draftFor(b, [{ quantity: 1000, unitPrice: 30_000, code: b.codes.vat20 }]);
    const id = await b.run((tx) => createDraft(tx, b.actor, draft));
    await b.run((tx) => deleteDraft(tx, b.actor, id));
    expect(await outcome(b.run((tx) => updateDraft(tx, b.actor, id, draft)))).toBe('draft_deleted');
  });
});

describe('a copy of an invoice made after a tax rate changed', () => {
  it('is priced with the rate as it is now, as any draft made now is', async () => {
    const b = await business(t, 'Copy Rate Office');
    // £100.00 at 20%: £120.00.
    const source = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    const row = (await b.run((tx) => tx.select().from(taxCode).where(eq(taxCode.id, b.codes.vat20))))[0]!;
    const { idempotencyKey: _key, ...stored } = row;
    await b.run((tx) =>
      updateTaxCode(
        tx,
        b.actor,
        b.codes.vat20,
        taxCodeInput.parse({ ...stored, components: [{ name: 'VAT', ratePpm: 175_000, compound: false }] }),
      ),
    );
    const copy = await b.run((tx) => duplicateDocument(tx, b.actor, source));
    const [made] = await b.run((tx) => tx.select().from(document).where(eq(document.id, copy)));
    expect([made!.taxTotal, made!.total]).toEqual([1750, 11_750]);
  });
});
