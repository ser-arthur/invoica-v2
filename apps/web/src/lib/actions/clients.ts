'use server';

import { revalidatePath } from 'next/cache';
import { clientVersion, createClient, setClientArchived, updateClient } from '@invoica/db';
import { clientInput, recordVersion } from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { failure, invalid, type ActionResult } from './result';

export async function saveClientAction(
  id: string | null,
  input: unknown,
  base?: unknown,
): Promise<ActionResult<{ id: string; version: string }>> {
  const parsed = clientInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const shown = recordVersion.safeParse(base);
  if (!shown.success) return invalid(shown.error);
  try {
    const saved = await inWorkspace(async (tx, ws) => {
      if (id) return { id, version: await updateClient(tx, ws.actor, id, parsed.data, shown.data) };
      const created = await createClient(tx, ws.actor, parsed.data);
      return { id: created, version: (await clientVersion(tx, created))! };
    });
    revalidatePath('/clients');
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveClientAction(id: string, archived: boolean): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => setClientArchived(tx, ws.actor, id, archived));
    revalidatePath('/clients');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
