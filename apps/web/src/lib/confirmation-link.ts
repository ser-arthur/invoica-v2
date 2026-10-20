/** The link in a confirmation email: the page that asks for the account's password before confirming the address. */
export function confirmationUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, '')}/confirm-email?token=${encodeURIComponent(token)}`;
}

const BETTER_AUTH_CONFIRM = /^\/api\/auth\/verify-email\/?$/;

/**
 * Better Auth's own confirmation link, which would confirm the address on opening, goes to the page that asks for
 * the password, with its token. Every other request is left alone (`null`).
 */
export function legacyConfirmationRedirect(url: URL): string | null {
  if (!BETTER_AUTH_CONFIRM.test(url.pathname)) return null;
  const token = url.searchParams.get('token');
  return token ? `/confirm-email?token=${encodeURIComponent(token)}` : '/confirm-email';
}
