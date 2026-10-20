import 'server-only';
import { after } from 'next/server';
import type { AuthEmail } from './auth-emails';
import { EMAIL_FROM, getEmailAdapter } from './email';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends one sign-in email, trying three times when the provider's failure may pass. Errors are logged: the person
 * can always ask for the email again.
 */
export async function sendAuthEmail(to: string, email: AuthEmail): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await getEmailAdapter().send({
        from: EMAIL_FROM(),
        replyTo: null,
        to,
        subject: email.subject,
        text: email.text,
        attachments: [],
      });
      return;
    } catch (error) {
      const retry = (error as { retry?: unknown }).retry !== false;
      if (!retry || attempt === 3) {
        console.error(`Sign-in email "${email.subject}" could not be sent: ${(error as Error).message}`);
        return;
      }
      await pause(attempt * 1000);
    }
  }
}

/**
 * Sends a sign-in email after the response, and returns at once. Better Auth's route for a new confirmation link
 * waits for its sender, so that sender must not wait for the provider (docs/specs/sign-in-by-email.md, rule 4).
 */
export function sendLater(to: string, email: AuthEmail): void {
  inBackground(sendAuthEmail(to, email));
}

/** Runs work after the response is sent, so a request takes as long whether or not it sends an email. */
export function inBackground(work: Promise<unknown>) {
  try {
    after(work);
  } catch {
    // Outside a request (a script or a test), the work simply runs on.
    void work;
  }
}
