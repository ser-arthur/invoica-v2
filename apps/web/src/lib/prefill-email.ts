/**
 * The email address to place in the sign-up form when one arrives in the address bar.
 * Anything that is not one plausible address comes back empty, so the field starts blank.
 */
export function prefillEmail(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return '';
  const email = value.trim();
  if (email.length === 0 || email.length > 254) return '';
  if (/\s/.test(email)) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '';
  const [local, domain] = parts as [string, string];
  if (local.length === 0 || domain.length === 0) return '';
  const dot = domain.indexOf('.');
  if (dot <= 0 || domain.endsWith('.')) return '';
  return email;
}
