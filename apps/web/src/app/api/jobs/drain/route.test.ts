import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The scheduled drain: jobs and retries run even when queuing the reminders fails. */

const jobs = vi.hoisted(() => ({
  queueReminders: vi.fn<() => Promise<number>>(),
  runJobs: vi.fn<(limit: number) => Promise<{ done: number; failed: number }>>(),
}));
vi.mock('@/lib/jobs', () => jobs);

const SECRET = 'c'.repeat(40);
const call = () =>
  import('./route').then(({ POST }) =>
    POST(
      new Request('http://localhost/api/jobs/drain', {
        method: 'POST',
        headers: { authorization: `Bearer ${SECRET}` },
      }),
    ),
  );

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  jobs.runJobs.mockResolvedValue({ done: 2, failed: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  jobs.queueReminders.mockReset();
  jobs.runJobs.mockReset();
});

describe('the drain route', () => {
  it('queues the reminders, then runs the jobs', async () => {
    jobs.queueReminders.mockResolvedValue(3);
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ done: 2, failed: 0, reminders: 3 });
  });

  it('still runs the jobs when queuing the reminders fails, and says the scan failed', async () => {
    jobs.queueReminders.mockRejectedValue(new Error('time zone "Asia/Calcutta" not recognized'));
    const response = await call();
    expect(jobs.runJobs).toHaveBeenCalledWith(50);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ done: 2, failed: 0, reminders: null });
  });

  it('refuses a request without the secret', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/jobs/drain', { method: 'POST' }));
    expect(response.status).toBe(401);
    expect(jobs.runJobs).not.toHaveBeenCalled();
  });
});
