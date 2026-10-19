import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The development mailbox the server writes to (EMAIL_PROVIDER=file). */
export const MAILBOX = process.env.MAILBOX_DIR ?? join(process.cwd(), '.data/mail');

export interface Email {
  to: string;
  subject: string;
  text: string;
  raw: string;
}

function parse(raw: string): Email {
  const head = raw.split('\r\n\r\n')[0]!;
  const header = (name: string) => new RegExp(`^${name}: (.*)$`, 'm').exec(head)?.[1] ?? '';
  const part =
    /Content-Type: text\/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/.exec(
      raw,
    );
  const text = part ? Buffer.from(part[1]!.replace(/\r\n/g, ''), 'base64').toString('utf8') : '';
  return { to: header('To'), subject: header('Subject'), text, raw };
}

/** Emails to `to` written since `since` (milliseconds), oldest first. */
export function emailsTo(to: string, since: number): Email[] {
  let files: string[];
  try {
    files = readdirSync(MAILBOX);
  } catch {
    return [];
  }
  return files
    .map((f) => join(MAILBOX, f))
    .filter((f) => statSync(f).mtimeMs >= since)
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    .map((f) => parse(readFileSync(f, 'utf8')))
    .filter((e) => e.to === to);
}

/** Waits up to ten seconds for an email to `to` whose subject is `subject`, sent since `since`. */
export async function waitForEmail(to: string, subject: string, since: number): Promise<Email> {
  for (let i = 0; i < 40; i++) {
    const found = emailsTo(to, since).filter((e) => e.subject === subject);
    if (found.length > 0) return found[found.length - 1]!;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email "${subject}" to ${to}.`);
}

/** The first web address in an email's text. */
export function linkIn(email: Email): string {
  const match = /https?:\/\/\S+/.exec(email.text);
  if (!match) throw new Error(`No link in "${email.subject}".`);
  return match[0];
}
