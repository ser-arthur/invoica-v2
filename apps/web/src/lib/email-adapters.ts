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
  /** Makes a repeated send of the same email a no-op at the provider, for 24 hours. */
  idempotencyKey?: string;
}

/** Sends email. One provider is used at a time, chosen by EMAIL_PROVIDER. */
export interface EmailAdapter {
  name: string;
  send(email: OutgoingEmail): Promise<{ id: string }>;
}

/** A send that failed. `retry` says whether sending the same email again later can succeed. */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

const base64Lines = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64').replace(/.{76}/g, '$&\r\n');
const header = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;

/** Development mailbox: writes each email as an .eml file that any mail app can open. Nothing is sent. */
export function fileMailbox(dir: string): EmailAdapter {
  return {
    name: 'file',
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
        base64Lines(new TextEncoder().encode(email.text)),
        ...email.attachments.flatMap((a) => [
          `--${boundary}`,
          `Content-Type: ${a.contentType}; name="${a.filename}"`,
          `Content-Disposition: attachment; filename="${a.filename}"`,
          'Content-Transfer-Encoding: base64',
          '',
          base64Lines(a.content),
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

const RESEND_URL = 'https://api.resend.com/emails';

/** Resend's errors worth sending again unchanged: rate limits, its own failures and a concurrent repeat. */
function resendRetries(status: number, name: string) {
  if (status === 429 || status >= 500) return true;
  return status === 409 && (name === 'concurrent_idempotent_requests' || name === 'resource_locked');
}

/** Sends through Resend's HTTP API (decision 0008). */
export function resendAdapter(options: {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}): EmailAdapter {
  const send = options.fetch ?? globalThis.fetch;
  return {
    name: 'resend',
    async send(email) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      };
      if (email.idempotencyKey) headers['Idempotency-Key'] = email.idempotencyKey;
      const body = {
        from: email.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        attachments: email.attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString('base64'),
          content_type: a.contentType,
        })),
      };
      let response: Response;
      try {
        response = await send(RESEND_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
        });
      } catch (error) {
        throw new EmailSendError(`Resend could not be reached: ${(error as Error).message}`, true);
      }
      const reply = (await response.json().catch(() => ({}))) as {
        id?: unknown;
        name?: unknown;
        message?: unknown;
      };
      if (!response.ok) {
        const name = typeof reply.name === 'string' ? reply.name : 'unknown_error';
        const message = typeof reply.message === 'string' ? reply.message : response.statusText;
        throw new EmailSendError(
          `Resend refused the email (${response.status} ${name}): ${message}`,
          resendRetries(response.status, name),
        );
      }
      if (typeof reply.id !== 'string' || reply.id === '') {
        throw new EmailSendError('Resend accepted the email but returned no id.', true);
      }
      return { id: reply.id };
    },
  };
}

/**
 * The adapter the environment names. Without EMAIL_PROVIDER, the development mailbox; in production EMAIL_PROVIDER
 * must be set, so an unconfigured server never marks invoices as sent after writing them to a file.
 */
export function emailAdapterFor(env: Record<string, string | undefined>): EmailAdapter {
  if (!env.EMAIL_PROVIDER && env.NODE_ENV === 'production') {
    throw new Error('Email is not set up: set EMAIL_PROVIDER (resend) and RESEND_API_KEY.');
  }
  const provider = env.EMAIL_PROVIDER || 'file';
  if (provider === 'file') return fileMailbox(env.MAILBOX_DIR || '.data/mail');
  if (provider === 'resend') {
    if (!env.RESEND_API_KEY) throw new Error('EMAIL_PROVIDER is resend, but RESEND_API_KEY is not set.');
    return resendAdapter({ apiKey: env.RESEND_API_KEY });
  }
  throw new Error(`Email provider ${provider} is not supported. Use file or resend (decision 0008).`);
}
