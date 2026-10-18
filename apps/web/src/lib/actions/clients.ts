'use server';

import { revalidatePath } from 'next/cache';
import { createClient, setClientArchived, updateClient } from '@invoica/db';
import { clientInput } from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { failure, invalid, type ActionResult } from './result';

export async function saveClientAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clientInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const savedId = await inWorkspace(async (tx, ws) => {
      if (id) {
        await updateClient(tx, ws.actor, id, parsed.data);
        return id;
      }
      return createClient(tx, ws.actor, parsed.data);
    });
    revalidatePath('/clients');
    return { ok: true, data: { id: savedId } };
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
