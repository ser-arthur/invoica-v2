'use server';

import { revalidatePath } from 'next/cache';
import { recordFile, setLogo } from '@invoica/db';
import { putObject } from '../storage';
import { inWorkspace } from '../workspace';
import { requireWorkspace } from '../session';
import { failure, type ActionResult } from './result';

const MAX_LOGO_BYTES = 512 * 1024;

/** The image type from the file's first bytes. The name and declared type are never trusted. */
function sniff(bytes: Uint8Array): { type: string; ext: string } | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47)
    return { type: 'image/png', ext: 'png' };
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (
    b(0) === 0x52 &&
    b(1) === 0x49 &&
    b(2) === 0x46 &&
    b(3) === 0x46 &&
    b(8) === 0x57 &&
    b(9) === 0x45 &&
    b(10) === 0x42 &&
    b(11) === 0x50
  ) {
    return { type: 'image/webp', ext: 'webp' };
  }
  return null;
}

export async function uploadLogoAction(form: FormData): Promise<ActionResult> {
  const file = form.get('logo');
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose an image file.' };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, message: 'Use an image under 512 KB.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return { ok: false, message: 'Use a PNG, JPEG or WebP image.' };
  try {
    const ws = await requireWorkspace();
    const stored = await putObject(ws.actor.organisationId, 'logos', kind.ext, bytes);
    await inWorkspace(async (tx, w) => {
      const id = await recordFile(tx, w.actor, { purpose: 'logo', contentType: kind.type, ...stored });
      await setLogo(tx, w.actor, id);
    });
    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function removeLogoAction(): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => setLogo(tx, ws.actor, null));
    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
