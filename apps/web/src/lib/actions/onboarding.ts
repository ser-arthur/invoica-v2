'use server';

import { cookies } from 'next/headers';
import { createOrganisation } from '@invoica/db';
import { onboardingInput } from '@invoica/schemas';
import { getDb } from '../db';
import { ORG_COOKIE, requireUser } from '../session';
import { failure, invalid, type ActionResult } from './result';

export async function createOrganisationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = onboardingInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const id = await createOrganisation(getDb(), user.id, parsed.data);
    (await cookies()).set(ORG_COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}
