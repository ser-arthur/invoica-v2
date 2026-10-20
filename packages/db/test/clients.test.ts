import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clientInput } from '@invoica/schemas';
import { createClient } from '../src/clients';
import { client } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { business } from './business';

/** A new client saved again after a lost answer, or twice at once, is one client. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const input = (name: string, idempotencyKey?: string) =>
  clientInput.parse({
    name,
    email: 'accounts@client.example',
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });

describe('a new client with a request key', () => {
  it('saved twice with the same key is one client', async () => {
    const b = await business(t, 'Key Client Office');
    const first = await b.run((tx) => createClient(tx, b.actor, input('Willow Barn Ltd', 'client-key-0001')));
    const again = await b.run((tx) => createClient(tx, b.actor, input('Willow Barn Ltd', 'client-key-0001')));
    expect(again).toBe(first);
    const rows = await b.run((tx) => tx.select().from(client));
    expect(rows.filter((r) => r.name === 'Willow Barn Ltd')).toHaveLength(1);
  });

  it('saved twice at the same moment is one client', async () => {
    const b = await business(t, 'Race Client Office');
    const ids = await Promise.allSettled([
      b.run((tx) => createClient(tx, b.actor, input('Cedar Yard Ltd', 'client-race-0001'))),
      b.run((tx) => createClient(tx, b.actor, input('Cedar Yard Ltd', 'client-race-0001'))),
    ]);
    const done = ids
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<string>).value);
    expect(new Set(done).size).toBe(1);
    const rows = await b.run((tx) => tx.select().from(client));
    expect(rows.filter((r) => r.name === 'Cedar Yard Ltd')).toHaveLength(1);
  });

  it('other keys, no key, and the same key in another business are separate clients', async () => {
    const a = await business(t, 'Separate Office A');
    const b = await business(t, 'Separate Office B');
    const one = await a.run((tx) => createClient(tx, a.actor, input('Alder Ltd', 'client-sep-0001')));
    const two = await a.run((tx) => createClient(tx, a.actor, input('Alder Ltd', 'client-sep-0002')));
    const three = await a.run((tx) => createClient(tx, a.actor, input('Alder Ltd')));
    const other = await b.run((tx) => createClient(tx, b.actor, input('Alder Ltd', 'client-sep-0001')));
    expect(new Set([one, two, three, other]).size).toBe(4);
  });
});
