/** Runs once when a server starts. The check lives in its own module so it is only ever built for Node. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const { stopOnBadSettings } = await import('./lib/start-check');
  stopOnBadSettings();
}
