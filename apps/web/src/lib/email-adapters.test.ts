import { describe, expect, it } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EmailSendError,
  emailAdapterFor,
  fileMailbox,
  resendAdapter,
  type OutgoingEmail,
} from './email-adapters';

const email: OutgoingEmail = {
  from: 'Northwind Studio via Invoica <invoices@send.example.com>',
  replyTo: 'accounts@northwind.example',
  to: 'client@example.com',
  subject: 'Invoice INV-0001 from Northwind Studio',
  text: 'Please find the invoice attached.',
  attachments: [
    { filename: 'INV-0001.pdf', contentType: 'application/pdf', content: new Uint8Array([37, 80, 68, 70]) },
  ],
  idempotencyKey: 'outbox:5b0e2f0a-1111-4c6e-9d1f-0a2b3c4d5e6f',
};

interface Call {
  url: string;
  init: RequestInit;
}

function stubFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

const failure = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the send to fail.');
};

describe('the development mailbox', () => {
  it('refuses an address at the reserved domain .invalid, for good, as a provider refuses one that cannot exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'invoica-mailbox-'));
    const box = fileMailbox(dir);
    const error = await box.send({ ...email, to: 'accounts@studio.invalid' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retry).toBe(false);
    expect(await readdir(dir)).toEqual([]);
    await box.send(email);
    expect(await readdir(dir)).toHaveLength(1);
  });
});

describe('Resend', () => {
  it('posts the email to Resend with the key, the idempotency key and the PDF in base64', async () => {
    const { calls, fetch } = stubFetch(200, { id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' });
    const sent = await resendAdapter({ apiKey: 're_test_key', fetch }).send(email);
    expect(sent).toEqual({ id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call!.url).toBe('https://api.resend.com/emails');
    expect(call!.init.method).toBe('POST');
    const headers = new Headers(call!.init.headers);
    expect(headers.get('authorization')).toBe('Bearer re_test_key');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('idempotency-key')).toBe(email.idempotencyKey);
    expect(JSON.parse(String(call!.init.body))).toEqual({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      reply_to: email.replyTo,
      attachments: [{ filename: 'INV-0001.pdf', content: 'JVBERg==', content_type: 'application/pdf' }],
    });
  });

  it('leaves out reply_to and the idempotency key when there are none', async () => {
    const { calls, fetch } = stubFetch(200, { id: 'abc' });
    await resendAdapter({ apiKey: 're_test_key', fetch }).send({
      ...email,
      replyTo: null,
      idempotencyKey: undefined,
    });
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body).not.toHaveProperty('reply_to');
    expect(new Headers(calls[0]!.init.headers).has('idempotency-key')).toBe(false);
  });

  it.each([
    [429, 'rate_limit_exceeded', true],
    [500, 'application_error', true],
    [503, 'service_unavailable', true],
    [409, 'concurrent_idempotent_requests', true],
    [400, 'validation_error', false],
    [401, 'validation_error', false],
    [403, 'validation_error', false],
    [409, 'invalid_idempotent_request', false],
    [422, 'missing_required_field', false],
  ])('a %i %s is retried: %s', async (status, name, retry) => {
    const { fetch } = stubFetch(status, {
      statusCode: status,
      name,
      message: 'The from address is not verified.',
    });
    const error = await failure(resendAdapter({ apiKey: 're_secret_value', fetch }).send(email));
    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retry).toBe(retry);
    expect((error as Error).message).toContain(name);
    expect((error as Error).message).toContain('The from address is not verified.');
    expect((error as Error).message).not.toContain('re_secret_value');
  });

  it('a reply without an id is an error worth retrying', async () => {
    const { fetch } = stubFetch(200, {});
    const error = await failure(resendAdapter({ apiKey: 're_test_key', fetch }).send(email));
    expect((error as EmailSendError).retry).toBe(true);
  });

  it('a network failure is retried', async () => {
    const fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof globalThis.fetch;
    const error = await failure(resendAdapter({ apiKey: 're_test_key', fetch }).send(email));
    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retry).toBe(true);
  });
});

describe('choosing the provider', () => {
  it('uses the development mailbox by default', () => {
    expect(emailAdapterFor({}).name).toBe('file');
  });

  it('uses Resend when EMAIL_PROVIDER is resend and a key is set', () => {
    expect(emailAdapterFor({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test_key' }).name).toBe('resend');
  });

  it('in production, needs the provider named, so no email is written to a file by mistake', () => {
    expect(() => emailAdapterFor({ NODE_ENV: 'production' })).toThrow(/EMAIL_PROVIDER/);
    expect(emailAdapterFor({ NODE_ENV: 'production', EMAIL_PROVIDER: 'file' }).name).toBe('file');
  });

  it('refuses Resend without a key, and an unknown provider, with a clear message', () => {
    expect(() => emailAdapterFor({ EMAIL_PROVIDER: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(() => emailAdapterFor({ EMAIL_PROVIDER: 'postmark' })).toThrow(/postmark/);
  });
});
