/**
 * Where sign-in's limits read the client's address from (review 6, R6-M1). A header a client can set is never
 * trusted on its own: the deployment names either a header its proxy overwrites (`INVOICA_CLIENT_IP_HEADER`) or the
 * proxies whose addresses to skip in `X-Forwarded-For` (`INVOICA_TRUSTED_PROXIES`, comma separated). In production
 * one of the two is required.
 */
export function clientAddressOptions(config: {
  header: string | undefined;
  proxies: string | undefined;
  production: boolean;
}): { ipAddressHeaders?: string[]; trustedProxies?: string[] } {
  const header = config.header?.trim().toLowerCase();
  const proxies = (config.proxies ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (header) return { ipAddressHeaders: [header] };
  if (proxies.length > 0) return { ipAddressHeaders: ['x-forwarded-for'], trustedProxies: proxies };
  if (config.production) {
    throw new Error(
      'Set INVOICA_CLIENT_IP_HEADER or INVOICA_TRUSTED_PROXIES: sign-in limits need the client address from a source the client cannot set.',
    );
  }
  return {};
}

/** Whether a request may run a server action: only from the app's own origin, which browsers always send on a POST. */
export function actionOriginAllowed(method: string, headers: Headers, appUrl: string): boolean {
  if (method !== 'POST' || !headers.has('next-action')) return true;
  return headers.get('origin') === new URL(appUrl).origin;
}
