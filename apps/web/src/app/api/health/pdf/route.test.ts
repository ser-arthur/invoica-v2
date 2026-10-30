import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * docs/spikes/pdf-on-vercel.md: after a deployment, one call shows whether the host can make a PDF, and how long it
 * took. Only with the CRON_SECRET bearer token, since each call starts a browser.
 */

const pdf = vi.hoisted(() => ({
  chromiumLaunch: vi.fn(async () => ({ executablePath: '/opt/chromium' })),
}));
const renderer = vi.hoisted(() => ({
  renderPdf: vi.fn(async () => new TextEncoder().encode('%PDF-1.7 sample')),
  LAUNCH_ARGS: [],
}));
vi.mock('@/lib/pdf', () => pdf);
vi.mock('@invoica/pdf', () => renderer);

const SECRET = 'd'.repeat(40);

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
});
afterEach(() => vi.clearAllMocks());

describe('the PDF health check', () => {
  it('makes one PDF of the sample invoice and says how long it took', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/health/pdf', { headers: { authorization: `Bearer ${SECRET}` } }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok', bytes: 15 });
    expect(typeof body.ms).toBe('number');
    expect(renderer.renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({ number: expect.any(String) }),
      expect.objectContaining({ executablePath: '/opt/chromium' }),
    );
  });

  it('answers 503 when no PDF can be made, without the error’s details', async () => {
    renderer.renderPdf.mockRejectedValueOnce(new Error('spawn /opt/chromium ENOENT'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/health/pdf', { headers: { authorization: `Bearer ${SECRET}` } }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });

  it('refuses a call without the secret, and starts no browser', async () => {
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/health/pdf'));
    expect(response.status).toBe(401);
    expect(renderer.renderPdf).not.toHaveBeenCalled();
  });
});
