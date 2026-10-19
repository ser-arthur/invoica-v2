// Creates the local roles and the `invoica` database, then applies every migration. Development only.
import { migrate } from '../src/migrate';
import { provisionDatabase } from '../src/provision';

const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) {
  console.error(
    'Set DATABASE_ADMIN_URL to a superuser connection, for example postgres://postgres@localhost:5432/postgres',
  );
  process.exit(1);
}
const database = process.env.DATABASE_NAME ?? 'invoica';
const urls = await provisionDatabase({
  adminUrl,
  database,
  appPassword: 'invoica_app',
  ownerPassword: 'invoica_owner',
  workerPassword: 'invoica_worker',
});
const result = await migrate(urls.ownerUrl);
console.log(`Database ${database} ready. Applied: ${result.applied.join(', ') || 'none'}.`);
console.log(`DATABASE_URL=${urls.appUrl}`);
console.log(`DATABASE_OWNER_URL=${urls.ownerUrl}`);
console.log(`DATABASE_WORKER_URL=${urls.workerUrl}`);
