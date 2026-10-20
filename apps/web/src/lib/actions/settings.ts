'use server';

import { revalidatePath } from 'next/cache';
import {
  archiveTaxCode,
  createTaxCode,
  loadPreset,
  taxCodeVersion,
  updateOrganisationProfile,
  updateReminderSettings,
  updateTaxCode,
} from '@invoica/db';
import {
  organisationProfileInput,
  recordVersion,
  reminderSettingsInput,
  taxCodeInput,
} from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { failure, invalid, type ActionResult } from './result';

/** Saves the settings from a page that showed version `base`, and answers with the version to send next. */
export async function saveProfileAction(
  input: unknown,
  base?: unknown,
): Promise<ActionResult<{ version: string }>> {
  const parsed = organisationProfileInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const shown = recordVersion.safeParse(base);
  if (!shown.success) return invalid(shown.error);
  try {
    const version = await inWorkspace((tx, ws) =>
      updateOrganisationProfile(tx, ws.actor, parsed.data, shown.data),
    );
    revalidatePath('/', 'layout');
    return { ok: true, data: { version } };
  } catch (error) {
    return failure(error);
  }
}

export async function saveTaxCodeAction(
  id: string | null,
  input: unknown,
  base?: unknown,
): Promise<ActionResult<{ id: string; version: string }>> {
  const parsed = taxCodeInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const shown = recordVersion.safeParse(base);
  if (!shown.success) return invalid(shown.error);
  try {
    const saved = await inWorkspace(async (tx, ws) => {
      if (id) return { id, version: await updateTaxCode(tx, ws.actor, id, parsed.data, shown.data) };
      const created = await createTaxCode(tx, ws.actor, parsed.data);
      return { id: created, version: (await taxCodeVersion(tx, created))! };
    });
    revalidatePath('/settings');
    return { ok: true, data: saved };
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

export async function saveReminderSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = reminderSettingsInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await inWorkspace((tx, ws) => updateReminderSettings(tx, ws.actor, parsed.data));
    revalidatePath('/settings');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
