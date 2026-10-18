import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { env } from './env';

/** File storage behind one small interface. Local disk in development; object storage in production. */
export interface StoredObject {
  storageKey: string;
  byteSize: number;
  sha256: string;
}

function pathFor(key: string): string {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) throw new Error('Invalid storage key.');
  const root = resolve(env.fileStorageDir);
  const full = resolve(join(root, key));
  if (!full.startsWith(root)) throw new Error('Invalid storage key.');
  return full;
}

export async function putObject(
  organisationId: string,
  folder: string,
  extension: string,
  bytes: Uint8Array,
): Promise<StoredObject> {
  const storageKey = `${organisationId}/${folder}/${randomUUID()}.${extension}`;
  const full = pathFor(storageKey);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, bytes, { flag: 'wx' });
  return { storageKey, byteSize: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function getObject(storageKey: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(pathFor(storageKey)));
}
