import { unstable_isUnrecognizedActionError as isUnrecognizedAction } from 'next/navigation';
import type { ActionResult } from './actions/result';

export const UNREACHABLE =
  'Invoica could not be reached, so this may not have been saved. Check your connection, then try again.';

/** The server is a newer version than the page, so the page's actions are unknown to it until it is reloaded. */
export const UPDATED = 'Invoica has been updated. Copy anything you typed, then reload the page.';

/**
 * Waits for a server action and turns a call that fails on the way (the connection drops, the answer is lost, or a
 * new version of the app replaced the one this page came from) into a message. The page and everything typed in it
 * stay as they are, so trying again is one click. Everything that creates a record carries a request key (payments,
 * credit notes, emails, reminders, new drafts, clients, items and tax codes, and copies), so trying one again after a
 * lost answer records it once.
 */
export async function reach<T>(call: Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await call;
    if (result && typeof result === 'object' && 'ok' in result) return result;
  } catch (error) {
    if (isUnrecognizedAction(error)) return { ok: false, message: UPDATED };
    // Otherwise reported below: a failed call and an empty answer mean the same to the person waiting.
  }
  return { ok: false, message: UNREACHABLE, unreachable: true };
}

/**
 * The same for the sign-in client, whose calls answer `{ data, error }`: a call that fails on the way answers an
 * error with the message above, so the form says what happened and can be sent again.
 */
export async function reachAuth<T extends { error: unknown }>(
  call: Promise<T>,
): Promise<T | { data: null; error: { status: 0; code: string; message: string } }> {
  try {
    return await call;
  } catch {
    return { data: null, error: { status: 0, code: 'UNREACHABLE', message: UNREACHABLE } };
  }
}
