function read(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`The environment variable ${name} is not set. See .env.example.`);
  return value;
}

/** Read lazily, so building the app does not need secrets. */
export const env = {
  get databaseUrl() {
    return read('DATABASE_URL');
  },
  /** The worker role, which only claims and finishes background jobs. */
  get workerDatabaseUrl() {
    return read('DATABASE_WORKER_URL');
  },
  get authSecret() {
    return read('BETTER_AUTH_SECRET');
  },
  get authUrl() {
    return read('BETTER_AUTH_URL');
  },
  get fileStorageDir() {
    return process.env.FILE_STORAGE_DIR ?? '.data/files';
  },
  get chromiumPath() {
    return process.env.CHROMIUM_PATH || undefined;
  },
  /** Cookies carry Secure in production, whatever scheme BETTER_AUTH_URL names. */
  get secureCookies() {
    return process.env.NODE_ENV === 'production';
  },
  get clientIpHeader() {
    return process.env.INVOICA_CLIENT_IP_HEADER || undefined;
  },
  get trustedProxies() {
    return process.env.INVOICA_TRUSTED_PROXIES || undefined;
  },
};
