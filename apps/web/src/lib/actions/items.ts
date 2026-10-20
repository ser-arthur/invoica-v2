'use server';

import { revalidatePath } from 'next/cache';
import { archiveItem, createItem, itemVersion, updateItem } from '@invoica/db';
import { itemInput, recordVersion } from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { failure, invalid, type ActionResult } from './result';

export async function saveItemAction(
  id: string | null,
  input: unknown,
  base?: unknown,
): Promise<ActionResult<{ id: string; version: string }>> {
  const parsed = itemInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const shown = recordVersion.safeParse(base);
  if (!shown.success) return invalid(shown.error);
  try {
    const saved = await inWorkspace(async (tx, ws) => {
      if (id) return { id, version: await updateItem(tx, ws.actor, id, parsed.data, shown.data) };
      const created = await createItem(tx, ws.actor, parsed.data);
      return { id: created, version: (await itemVersion(tx, created))! };
    });
    revalidatePath('/items');
    return { ok: true, data: saved };
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
