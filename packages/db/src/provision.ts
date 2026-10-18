import pg from 'pg';

export const APP_ROLE = 'invoica_app';
export const OWNER_ROLE = 'invoica_owner';

export interface ProvisionOptions {
  /** A superuser connection to the server, for example postgres://postgres@localhost:5432/postgres. */
  adminUrl: string;
  database: string;
  appPassword: string;
  ownerPassword: string;
}

export interface ProvisionedUrls {
  ownerUrl: string;
  appUrl: string;
}

function withCredentials(adminUrl: string, database: string, user: string, password: string): string {
  const url = new URL(adminUrl);
  url.username = user;
  url.password = password;
  url.pathname = `/${database}`;
  return url.toString();
}

/**
 * Creates the two roles (if missing) and a database owned by the migration role. For development and tests only;
 * production roles are created in the database provider's console.
 */
export async function provisionDatabase(options: ProvisionOptions): Promise<ProvisionedUrls> {
  const { adminUrl, database, appPassword, ownerPassword } = options;
  if (!/^[a-z0-9_]+$/.test(database))
    throw new Error('Database names use lowercase letters, digits and _ only.');
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = async (role: string) =>
      (await admin.query('select 1 from pg_roles where rolname = $1', [role])).rowCount === 1;
    if (!(await exists(OWNER_ROLE))) {
      await admin.query(
        `create role ${OWNER_ROLE} login nosuperuser nobypassrls createdb password '${ownerPassword.replace(/'/g, "''")}'`,
      );
    }
    if (!(await exists(APP_ROLE))) {
      await admin.query(
        `create role ${APP_ROLE} login nosuperuser nobypassrls nocreatedb nocreaterole password '${appPassword.replace(/'/g, "''")}'`,
      );
    }
    await admin.query(`drop database if exists ${database} with (force)`);
    await admin.query(`create database ${database} owner ${OWNER_ROLE}`);
  } finally {
    await admin.end();
  }
  return {
    ownerUrl: withCredentials(adminUrl, database, OWNER_ROLE, ownerPassword),
    appUrl: withCredentials(adminUrl, database, APP_ROLE, appPassword),
  };
}

export async function dropDatabase(adminUrl: string, database: string): Promise<void> {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`drop database if exists ${database} with (force)`);
  } finally {
    await admin.end();
  }
}
