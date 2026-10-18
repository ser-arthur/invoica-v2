'use server';

import { revalidatePath } from 'next/cache';
import { archiveItem, createItem, updateItem } from '@invoica/db';
import { itemInput } from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { failure, invalid, type ActionResult } from './result';

export async function saveItemAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = itemInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const savedId = await inWorkspace(async (tx, ws) => {
      if (id) {
        await updateItem(tx, ws.actor, id, parsed.data);
        return id;
      }
      return createItem(tx, ws.actor, parsed.data);
    });
    revalidatePath('/items');
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveItemAction(id: string): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => archiveItem(tx, ws.actor, id));
    revalidatePath('/items');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
