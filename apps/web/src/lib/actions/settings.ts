'use server';

import { revalidatePath } from 'next/cache';
import {
  archiveTaxCode,
  createTaxCode,
  loadPreset,
  updateOrganisationProfile,
  updateTaxCode,
} from '@invoica/db';
import { organisationProfileInput, taxCodeInput } from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { failure, invalid, type ActionResult } from './result';

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = organisationProfileInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await inWorkspace((tx, ws) => updateOrganisationProfile(tx, ws.actor, parsed.data));
    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function saveTaxCodeAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = taxCodeInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const savedId = await inWorkspace(async (tx, ws) => {
      if (id) {
        await updateTaxCode(tx, ws.actor, id, parsed.data);
        return id;
      }
      return createTaxCode(tx, ws.actor, parsed.data);
    });
    revalidatePath('/settings');
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveTaxCodeAction(id: string): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => archiveTaxCode(tx, ws.actor, id));
    revalidatePath('/settings');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function loadPresetAction(country: string): Promise<ActionResult<{ added: number }>> {
  try {
    const added = await inWorkspace((tx, ws) => loadPreset(tx, ws.actor, country));
    revalidatePath('/settings');
    return { ok: true, data: { added } };
  } catch (error) {
    return failure(error);
  }
}
