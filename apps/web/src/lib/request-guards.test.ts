import { describe, expect, it } from 'vitest';
import { actionOriginAllowed, clientAddressOptions } from './request-guards';

describe('clientAddressOptions (review 6, R6-M1)', () => {
  it('takes the client address only from the header or proxies the deployment names', () => {
    expect(clientAddressOptions({ header: 'x-real-ip', proxies: undefined, production: true })).toEqual({
      ipAddressHeaders: ['x-real-ip'],
    });
    expect(
      clientAddressOptions({ header: undefined, proxies: '10.0.0.0/8, 192.168.1.4', production: true }),
    ).toEqual({
      ipAddressHeaders: ['x-forwarded-for'],
      trustedProxies: ['10.0.0.0/8', '192.168.1.4'],
    });
  });

  it('refuses to run in production without either, and leaves development as it is', () => {
    expect(() => clientAddressOptions({ header: undefined, proxies: undefined, production: true })).toThrow(
      /INVOICA_CLIENT_IP_HEADER or INVOICA_TRUSTED_PROXIES/,
    );
    expect(clientAddressOptions({ header: undefined, proxies: undefined, production: false })).toEqual({});
  });
});

describe('actionOriginAllowed (review 6, R6-L5)', () => {
  const app = 'https://app.invoica.example';
  const headers = (entries: Record<string, string>) => new Headers(entries);

  it('lets a server action through only from the app’s own origin', () => {
    expect(actionOriginAllowed('POST', headers({ 'next-action': 'x', origin: app }), app)).toBe(true);
    expect(
      actionOriginAllowed('POST', headers({ 'next-action': 'x', origin: 'https://evil.example' }), app),
    ).toBe(false);
    expect(actionOriginAllowed('POST', headers({ 'next-action': 'x' }), app)).toBe(false);
  });

  it('leaves every other request alone', () => {
    expect(actionOriginAllowed('GET', headers({}), app)).toBe(true);
    expect(actionOriginAllowed('POST', headers({}), app)).toBe(true);
  });
});
