// Applies new migrations as the owner role. Refuses to run if an applied migration has changed.
import { migrate } from '../src/migrate';

const ownerUrl = process.env.DATABASE_OWNER_URL;
if (!ownerUrl) {
  console.error('Set DATABASE_OWNER_URL.');
  process.exit(1);
}
const result = await migrate(ownerUrl);
console.log(
  `Applied: ${result.applied.join(', ') || 'none'}. Already applied: ${result.alreadyApplied.length}.`,
);
