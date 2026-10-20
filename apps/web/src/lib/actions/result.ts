import { DomainError } from '@invoica/core';
import { NotAMemberError } from '@invoica/db';
import { fieldErrors } from '@invoica/schemas';
import type { z } from 'zod';

/** `unreachable` is set in the browser when the call never got an answer (`src/lib/reach.ts`). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string>; unreachable?: true };

export function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, message: 'Check the highlighted fields.', fieldErrors: fieldErrors(error) };
}

/** Turns an error into a message people can act on. Unknown errors are logged without their data. */
export function failure(error: unknown): ActionResult<never> {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  // The session ended (signed out here or on another device): the page and what was typed stay as they are.
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT;') && digest.includes(';/sign-in;')) {
    return {
      ok: false,
      message:
        'You have been signed out, so this was not saved. Sign in again in another tab, then come back here and try again.',
    };
  }
  if (error instanceof NotAMemberError) return { ok: false, message: error.message };
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  if (cause?.code === 'P0001' && cause.message) return { ok: false, message: cause.message };
  console.error('action failed', (error as Error).name, (error as Error).message?.slice(0, 200));
  return { ok: false, message: 'Something went wrong and nothing was saved. Try again.' };
}
