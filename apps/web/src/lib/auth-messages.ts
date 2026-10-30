import { UNREACHABLE } from './reach';

/**
 * What sign in, create account and the password pages say, in Invoica's words
 * (docs/specs/form-errors-and-controls.md). The sign-in service's own wording never reaches the page.
 */
export const AUTH_WORDS = {
  name: 'Enter your name.',
  emailEmpty: 'Enter your email address.',
  emailShape: 'Enter the whole email address, with the @ and the part after it.',
  passwordEmpty: 'Enter your password.',
  passwordShort: 'Use at least 10 characters.',
  passwordLong: 'Use 128 characters or fewer.',
  mismatch: 'That email and password do not match an account.',
  notConfirmed: 'Confirm your email address first. We have sent you a new link.',
  tooMany: 'Too many attempts. Wait a minute, then try again.',
  general: 'Something went wrong at our end. Try again in a moment.',
} as const;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export type AuthField = 'name' | 'email' | 'password';
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

/** Which form is being checked: a new password is held to the length rules; signing in only needs one. */
export type AuthFormKind = 'sign-in' | 'sign-up' | 'email' | 'new-password';

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** The form's own check before anything is sent. Only the fields the form has are checked. */
export function checkAuthFields(
  kind: AuthFormKind,
  fields: { name?: string; email?: string; password?: string },
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (kind === 'sign-up' && !fields.name?.trim()) errors.name = AUTH_WORDS.name;
  if (kind !== 'new-password') {
    const email = fields.email?.trim() ?? '';
    if (!email) errors.email = AUTH_WORDS.emailEmpty;
    else if (!EMAIL.test(email)) errors.email = AUTH_WORDS.emailShape;
  }
  if (kind !== 'email') {
    const password = fields.password ?? '';
    if (!password) errors.password = AUTH_WORDS.passwordEmpty;
    else if (kind !== 'sign-in' && password.length < PASSWORD_MIN) errors.password = AUTH_WORDS.passwordShort;
    else if (kind !== 'sign-in' && password.length > PASSWORD_MAX) errors.password = AUTH_WORDS.passwordLong;
  }
  return errors;
}

export type AuthAnswer = { form: string } | { field: 'email' | 'password'; message: string };

const MISMATCH = new Set([
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_PASSWORD',
  'USER_NOT_FOUND',
  'CREDENTIAL_ACCOUNT_NOT_FOUND',
]);

/** Turns the sign-in service's answer into what the form says, and where. */
export function authAnswer(error: { status?: number; code?: string; message?: string }): AuthAnswer {
  const { status, code, message } = error;
  if (code === 'UNREACHABLE') return { form: UNREACHABLE };
  if (status === 429) return { form: AUTH_WORDS.tooMany };
  if (code === 'EMAIL_NOT_VERIFIED') return { form: AUTH_WORDS.notConfirmed };
  if ((code && MISMATCH.has(code)) || (!code && status === 401)) return { form: AUTH_WORDS.mismatch };
  if (code === 'INVALID_EMAIL') return { field: 'email', message: AUTH_WORDS.emailShape };
  if (code === 'PASSWORD_TOO_SHORT') return { field: 'password', message: AUTH_WORDS.passwordShort };
  if (code === 'PASSWORD_TOO_LONG') return { field: 'password', message: AUTH_WORDS.passwordLong };
  if (code === 'VALIDATION_ERROR' && message?.startsWith('[body.email]'))
    return { field: 'email', message: AUTH_WORDS.emailShape };
  return { form: AUTH_WORDS.general };
}

/** What a form says about an answer, for a form that shows every answer above its fields. */
export function authWords(error: { status?: number; code?: string; message?: string }): string {
  const answer = authAnswer(error);
  return 'form' in answer ? answer.form : answer.message;
}
