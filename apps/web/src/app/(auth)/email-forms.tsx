'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { authAnswer, authWords, checkAuthFields } from '@/lib/auth-messages';
import { reachAuth } from '@/lib/reach';
import { useHydrated } from '@/lib/use-hydrated';
import { Button, Field, FormMessage, Input, inlineLinkClass } from '@/components/ui';
import { useFieldErrors } from './use-field-errors';

const linkClass = inlineLinkClass;

/** Asks for an email address and sends it a reset link; answers alike whether or not an account uses it. */
export function ForgotPasswordForm() {
  const ready = useHydrated();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fields = useFieldErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const email = String(new FormData(formElement).get('email') ?? '').trim();
    if (fields.show(checkAuthFields('email', { email }), formElement)) return;
    setPending(true);
    const result = await reachAuth(authClient.requestPasswordReset({ email, redirectTo: '/reset-password' }));
    setPending(false);
    if (result.error) {
      const answer = authAnswer(result.error);
      if ('field' in answer) fields.show({ [answer.field]: answer.message }, formElement);
      else setError(answer.form);
      return;
    }
    setSentTo(email);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          Reset your password
        </h1>
        <p className="mt-2 text-muted">We will email you a link to choose a new one.</p>
      </div>
      {sentTo ? (
        <FormMessage tone="info">
          If an account uses {sentTo}, a link to reset its password is on its way. It works for one hour.
        </FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Field label="Email" htmlFor="email" error={fields.errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" {...fields.input('email')} />
      </Field>
      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? 'One moment' : 'Send a reset link'}
      </Button>
      <p className="text-sm text-muted">
        Remembered it?{' '}
        <Link href="/sign-in" className={linkClass}>
          Sign in
        </Link>
      </p>
    </form>
  );
}

/** Sets a new password with the token from a reset link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const fields = useFieldErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const newPassword = String(new FormData(formElement).get('password') ?? '');
    if (fields.show(checkAuthFields('new-password', { password: newPassword }), formElement)) return;
    setPending(true);
    const result = await reachAuth(authClient.resetPassword({ newPassword, token }));
    setPending(false);
    if (result.error) {
      if (result.error.code === 'INVALID_TOKEN' || result.error.code === 'TOKEN_EXPIRED') {
        setExpired(true);
        return;
      }
      const answer = authAnswer(result.error);
      if ('field' in answer) fields.show({ [answer.field]: answer.message }, formElement);
      else setError(answer.form);
      return;
    }
    router.push('/sign-in?reset=done');
  }

  if (expired) return <LinkExpired kind="reset" />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          Choose a new password
        </h1>
        <p className="mt-2 text-muted">Changing it signs your account out on every device.</p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Field
        label="New password"
        htmlFor="password"
        hint="At least 10 characters."
        error={fields.errors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          {...fields.input('password')}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? 'One moment' : 'Change password'}
      </Button>
    </form>
  );
}

/** Sends a new confirmation link; answers alike for any address. */
export function ResendConfirmationForm() {
  const ready = useHydrated();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fields = useFieldErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const email = String(new FormData(formElement).get('email') ?? '').trim();
    if (fields.show(checkAuthFields('email', { email }), formElement)) return;
    setPending(true);
    const result = await reachAuth(authClient.sendVerificationEmail({ email }));
    setPending(false);
    if (result.error) {
      const answer = authAnswer(result.error);
      if ('field' in answer) fields.show({ [answer.field]: answer.message }, formElement);
      else setError(answer.form);
      return;
    }
    setSentTo(email);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {sentTo ? (
        <FormMessage tone="info">If {sentTo} needs confirming, a new link is on its way.</FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Field label="Email" htmlFor="email" error={fields.errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" {...fields.input('email')} />
      </Field>
      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? 'One moment' : 'Send a new link'}
      </Button>
    </form>
  );
}

/** Confirms the address with the account's password, which also signs in, then opens onboarding. */
export function ConfirmEmailForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const fields = useFieldErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const password = String(new FormData(formElement).get('password') ?? '');
    if (!password) {
      fields.show({ password: 'Enter the password you chose for this account.' }, formElement);
      return;
    }
    setPending(true);
    const result = await reachAuth(
      authClient.$fetch<{ status: boolean }>('/confirm-email', { method: 'POST', body: { token, password } }),
    );
    if (result.error) {
      setPending(false);
      const code = 'code' in result.error ? result.error.code : undefined;
      if (code === 'ALREADY_CONFIRMED') router.push('/sign-in?confirmed=1');
      else if (code === 'INVALID_TOKEN') setExpired(true);
      else if (code === 'INVALID_PASSWORD')
        fields.show({ password: 'That is not the password for this account.' }, formElement);
      else setError(authWords(result.error));
      return;
    }
    router.push('/onboarding');
    router.refresh();
  }

  if (expired) return <LinkExpired kind="confirm" />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          Confirm your email
        </h1>
        <p className="mt-2 text-muted">
          Enter the password you chose for <span className="font-medium wrap-anywhere text-ink">{email}</span>{' '}
          to confirm it and sign in.
        </p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <Field
        label="Password"
        htmlFor="password"
        error={fields.errors.password}
        keepHint
        hint={
          <Link href="/forgot-password" className={linkClass}>
            Forgot your password?
          </Link>
        }
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          {...fields.input('password')}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? 'One moment' : 'Confirm and sign in'}
      </Button>
      <p className="text-sm text-muted">
        If you did not create this account, close this page: nobody can use it until the address is confirmed.
      </p>
    </form>
  );
}

/** A confirmation or reset link that no longer works. */
export function LinkExpired({ kind }: { kind: 'reset' | 'confirm' }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          This link has expired or has been used
        </h1>
        <p className="mt-2 text-muted">
          {kind === 'reset'
            ? 'Reset links work once, for one hour. Ask for a new one.'
            : 'Confirmation links work for 24 hours. Enter your email to get a new one.'}
        </p>
      </div>
      {kind === 'reset' ? (
        <Link href="/forgot-password" className={linkClass}>
          Ask for a new reset link
        </Link>
      ) : (
        <ResendConfirmationForm />
      )}
    </div>
  );
}
