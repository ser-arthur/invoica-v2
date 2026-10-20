/**
 * The settings a production server needs, checked once when it starts (`src/instrumentation.ts`), so a missing or
 * wrong one stops the server with a list of what to fix, instead of failing later in front of a customer. Messages
 * name each setting and never repeat its value.
 */
export function configProblems(env: Record<string, string | undefined>): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];
  // A production build served at localhost is someone testing it on their own machine: http and the development
  // mailbox are allowed there, and nowhere else.
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(env.BETTER_AUTH_URL ?? '');
  const need = (name: string, ok: (value: string) => boolean, what: string) => {
    const value = env[name];
    if (!value) problems.push(`${name} is not set: ${what}.`);
    else if (!ok(value)) problems.push(`${name} is not right: ${what}.`);
  };
  const postgres = (v: string) => /^postgres(ql)?:\/\//.test(v);
  need('DATABASE_URL', postgres, 'a postgres:// address for the invoica_app role');
  need('DATABASE_WORKER_URL', postgres, 'a postgres:// address for the invoica_worker role');
  need('BETTER_AUTH_SECRET', (v) => v.length >= 32, 'at least 32 random characters');
  need('BETTER_AUTH_URL', (v) => local || /^https:\/\/[^/]+/.test(v), 'the app’s https:// address');
  need('CRON_SECRET', (v) => /^[A-Za-z0-9]{32,}$/.test(v), 'at least 32 letters and digits');
  need(
    'EMAIL_PROVIDER',
    (v) => v === 'resend' || (local && v === 'file'),
    'resend (the development mailbox sends nothing, so it is not allowed in production)',
  );
  if (env.EMAIL_PROVIDER === 'resend') need('RESEND_API_KEY', () => true, 'the Resend API key');
  need(
    'EMAIL_FROM',
    (v) => /^[^<>]+ <[^<>@\s]+@[^<>@\s]+>$/.test(v),
    'a sender such as "Invoica <invoices@send.yourdomain>"',
  );
  need('FILE_STORAGE_DIR', (v) => v.startsWith('/'), 'an absolute path to a kept, backed-up folder');
  if (!env.INVOICA_CLIENT_IP_HEADER && !env.INVOICA_TRUSTED_PROXIES) {
    problems.push(
      'INVOICA_CLIENT_IP_HEADER is not set: the header the proxy in front sets to the visitor’s address (cf-connecting-ip behind Cloudflare), or INVOICA_TRUSTED_PROXIES.',
    );
  }
  return problems;
}
