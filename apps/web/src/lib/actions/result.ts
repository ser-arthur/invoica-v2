import { DomainError } from '@invoica/core';
import { NotAMemberError } from '@invoica/db';
import { fieldErrors } from '@invoica/schemas';
import type { z } from 'zod';

/**
 * `unreachable` is set in the browser when the call never got an answer (`src/lib/reach.ts`), and `signedOut` when the
 * session had ended, so the page keeps what was typed and does not reload itself (which would leave for sign-in).
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string>;
      unreachable?: true;
      signedOut?: true;
      /** The rule that refused it, for a refusal the page handles in its own way. */
      code?: string;
    };

/**
 * The database's guards whose words were written for the people using Invoica, and what the page says for each. The
 * app checks these rules before the database does, so a guard is met only when two changes cross; any other guard is
 * the app's own mistake and shows the general message.
 */
const GUARD_WORDS = new Map<string, string>([
  ['An issued document cannot be changed', 'This has been issued, so it can no longer be changed.'],
  ['Lines of an issued document cannot be changed', 'This has been issued, so it can no longer be changed.'],
  ['An issued document cannot be deleted', 'This has been issued, so it cannot be deleted.'],
  ['A recorded payment cannot be changed', 'A recorded payment cannot be changed.'],
  ['The payment is more than the balance due', 'The payment is more than the balance due.'],
  ['Payments can only be recorded on issued invoices', 'Payments can only be recorded on issued invoices.'],
  ['A payment cannot be dated after today.', 'A payment cannot be dated after today.'],
  ['A refund cannot be dated after today.', 'A refund cannot be dated after today.'],
  [
    'A refund cannot be dated before the latest payment on the invoice',
    'A refund cannot be dated before the latest payment on the invoice.',
  ],
  ['Refunds cannot be more than the payments received', 'Refunds cannot be more than the payments received.'],
  [
    'A credit note cannot be more than the balance still owed',
    'A credit note cannot be more than the balance still owed.',
  ],
  [
    'A credit note cannot credit more of a line than was invoiced',
    'A credit note cannot credit more of a line than was invoiced.',
  ],
  [
    'A credit note cannot credit more tax than the invoice charged',
    'A credit note cannot credit more tax than the invoice charged.',
  ],
  [
    'Credit notes can only be issued against issued invoices',
    'Credit notes can only be issued against issued invoices.',
  ],
  ['A credit note cannot be voided', 'A credit note cannot be voided.'],
  [
    'A document with payments recorded cannot be voided',
    'An invoice with payments recorded cannot be voided.',
  ],
  ['An invoice with credit notes cannot be voided', 'An invoice with credit notes cannot be voided.'],
  [
    'This payment cannot be removed: the refunds on the invoice would be more than the payments left',
    'This payment cannot be removed: the refunds on the invoice would be more than the payments left.',
  ],
  ['A file in use cannot be deleted', 'This file is in use, so it cannot be deleted.'],
  ['Choose a time zone from the list.', 'Choose a time zone from the list.'],
]);

const GENERAL = 'Something went wrong and nothing was saved. Try again.';

export function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, message: 'Check the highlighted fields.', fieldErrors: fieldErrors(error) };
}

/** Turns an error into a message people can act on. Unknown errors are logged without their data. */
export function failure(error: unknown): ActionResult<never> {
  if (error instanceof DomainError) return { ok: false, message: error.message, code: error.code };
  // The session ended (signed out here or on another device): the page and what was typed stay as they are.
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT;') && digest.includes(';/sign-in;')) {
    return {
      ok: false,
      signedOut: true,
      message:
        'You have been signed out, so this was not saved. Sign in again in another tab, then come back here and try again.',
    };
  }
  if (error instanceof NotAMemberError) return { ok: false, message: error.message };
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  const words = cause?.code === 'P0001' && cause.message ? GUARD_WORDS.get(cause.message) : undefined;
  if (words) return { ok: false, message: words };
  console.error(
    'action failed',
    (error as Error).name,
    cause?.code === 'P0001'
      ? `guard: ${cause.message?.slice(0, 120)}`
      : (error as Error).message?.slice(0, 200),
  );
  return { ok: false, message: GENERAL };
}
