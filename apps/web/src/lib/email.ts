import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface OutgoingEmail {
  from: string;
  replyTo: string | null;
  to: string;
  subject: string;
  text: string;
  attachments: { filename: string; contentType: string; content: Uint8Array }[];
}

/** Sends email. One provider is used at a time, chosen by EMAIL_PROVIDER. */
export interface EmailAdapter {
  send(email: OutgoingEmail): Promise<{ id: string }>;
}

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64').replace(/.{76}/g, '$&\r\n');
const header = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;

/** Development mailbox: writes each email as an .eml file that any mail app can open. Nothing is sent. */
export function fileMailbox(dir: string): EmailAdapter {
  return {
    async send(email) {
      const id = randomUUID();
      const boundary = `invoica-${id}`;
      const parts = [
        `From: ${header(email.from)}`,
        ...(email.replyTo ? [`Reply-To: ${email.replyTo}`] : []),
        `To: ${email.to}`,
        `Subject: ${header(email.subject)}`,
        `Message-ID: <${id}@invoica.local>`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64(new TextEncoder().encode(email.text)),
        ...email.attachments.flatMap((a) => [
          `--${boundary}`,
          `Content-Type: ${a.contentType}; name="${a.filename}"`,
          `Content-Disposition: attachment; filename="${a.filename}"`,
          'Content-Transfer-Encoding: base64',
          '',
          b64(a.content),
        ]),
        `--${boundary}--`,
        '',
      ];
      const folder = resolve(dir);
      await mkdir(folder, { recursive: true });
      await writeFile(
        join(folder, `${new Date().toISOString().replace(/[:.]/g, '-')}-${id}.eml`),
        parts.join('\r\n'),
      );
      return { id };
    },
  };
}

export function getEmailAdapter(): EmailAdapter {
  const provider = process.env.EMAIL_PROVIDER ?? 'file';
  if (provider === 'file') return fileMailbox(process.env.MAILBOX_DIR ?? '.data/mail');
  throw new Error(`Email provider ${provider} is not set up yet. Choose one in decision 0008.`);
}

export const EMAIL_FROM = () => process.env.EMAIL_FROM ?? 'Invoica <invoices@invoica.local>';
