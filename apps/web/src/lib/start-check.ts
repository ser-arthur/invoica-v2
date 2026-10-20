import { configProblems } from './config-check';

/** A production server with missing or wrong settings stops, saying what to fix. */
export function stopOnBadSettings() {
  const problems = configProblems(process.env);
  if (problems.length === 0) return;
  console.error(`Invoica cannot start. Fix these settings:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}
