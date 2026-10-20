import { describe, expect, it } from 'vitest';
import { configProblems } from './config-check';

/** A production server refuses to start with settings that would fail later, and says what to fix. */

const good = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://invoica_app:secret@db.example:5432/invoica',
  DATABASE_WORKER_URL: 'postgres://invoica_worker:secret@db.example:5432/invoica',
  BETTER_AUTH_SECRET: 'a'.repeat(48),
  BETTER_AUTH_URL: 'https://app.invoica.example',
  CRON_SECRET: 'b'.repeat(40),
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_live_key',
  EMAIL_FROM: 'Invoica <invoices@send.invoica.example>',
  FILE_STORAGE_DIR: '/var/lib/invoica/files',
  INVOICA_CLIENT_IP_HEADER: 'cf-connecting-ip',
};

describe('settings a production server checks at start', () => {
  it('a complete set passes', () => {
    expect(configProblems(good)).toEqual([]);
  });

  it('development needs none of it', () => {
    expect(configProblems({ NODE_ENV: 'development' })).toEqual([]);
  });

  it.each([
    ['DATABASE_URL', { DATABASE_URL: undefined }],
    ['DATABASE_WORKER_URL', { DATABASE_WORKER_URL: '' }],
    ['BETTER_AUTH_SECRET', { BETTER_AUTH_SECRET: 'short' }],
    ['BETTER_AUTH_URL', { BETTER_AUTH_URL: 'http://app.invoica.example' }],
    ['CRON_SECRET', { CRON_SECRET: 'not-letters-and-digits-only-but-long-enough' }],
    ['CRON_SECRET', { CRON_SECRET: 'short1' }],
    ['EMAIL_PROVIDER', { EMAIL_PROVIDER: undefined }],
    ['RESEND_API_KEY', { RESEND_API_KEY: undefined }],
    ['EMAIL_FROM', { EMAIL_FROM: 'invoices@send.invoica.example' }],
    ['FILE_STORAGE_DIR', { FILE_STORAGE_DIR: 'relative/files' }],
    ['INVOICA_CLIENT_IP_HEADER', { INVOICA_CLIENT_IP_HEADER: undefined }],
  ])('names %s when it is missing or wrong', (name, change) => {
    const problems = configProblems({ ...good, ...change });
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain(name);
  });

  it('accepts the proxies list in place of the client address header', () => {
    expect(
      configProblems({ ...good, INVOICA_CLIENT_IP_HEADER: undefined, INVOICA_TRUSTED_PROXIES: '10.0.0.0/8' }),
    ).toEqual([]);
  });

  it('refuses the development mailbox, which sends nothing', () => {
    expect(configProblems({ ...good, EMAIL_PROVIDER: 'file' })[0]).toContain('EMAIL_PROVIDER');
  });

  it('a production build run on this machine, at localhost, may use http and the development mailbox', () => {
    expect(
      configProblems({
        ...good,
        BETTER_AUTH_URL: 'http://localhost:3100',
        EMAIL_PROVIDER: 'file',
        RESEND_API_KEY: undefined,
      }),
    ).toEqual([]);
    expect(
      configProblems({ ...good, BETTER_AUTH_URL: 'http://app.example', EMAIL_PROVIDER: 'file' }),
    ).toHaveLength(2);
  });

  it('never repeats a secret in its message', () => {
    const problems = configProblems({ ...good, BETTER_AUTH_SECRET: 'tiny-secret-value' });
    expect(problems.join(' ')).not.toContain('tiny-secret-value');
  });
});
