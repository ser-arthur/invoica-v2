import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { AwsClient } from 'aws4fetch';
import { env } from './env';

/**
 * File storage behind one small interface: Cloudflare R2 when R2 is set (production, decision 0016), a local folder
 * otherwise (development and the tests). Kept PDFs and logos are written once under a new random key and never
 * changed.
 */
export interface StoredObject {
  storageKey: string;
  byteSize: number;
  sha256: string;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function checkKey(key: string): string {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) throw new Error('Invalid storage key.');
  return key;
}

function pathFor(key: string): string {
  const root = resolve(env.fileStorageDir);
  const full = resolve(join(root, checkKey(key)));
  if (!full.startsWith(root)) throw new Error('Invalid storage key.');
  return full;
}

let client: AwsClient | null = null;

/** R2's S3 interface: requests signed with the bucket's own access key, the bucket named in the path. */
function r2(key: string) {
  const r2 = env.r2;
  if (!r2) return null;
  client ??= new AwsClient({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const url = `${r2.endpoint.replace(/\/+$/, '')}/${r2.bucket}/${checkKey(key)}`;
  return { client, url };
}

export async function putObject(
  organisationId: string,
  folder: string,
  extension: string,
  bytes: Uint8Array,
): Promise<StoredObject> {
  const storageKey = `${organisationId}/${folder}/${randomUUID()}.${extension}`;
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const remote = r2(storageKey);
  if (remote) {
    const response = await remote.client.fetch(remote.url, {
      method: 'PUT',
      body: new Uint8Array(bytes),
      headers: {
        'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
        'x-amz-content-sha256': sha256,
      },
    });
    if (!response.ok) throw new Error(`File storage refused the file (${response.status}).`);
  } else {
    const full = pathFor(storageKey);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, bytes, { flag: 'wx' });
  }
  return { storageKey, byteSize: bytes.byteLength, sha256 };
}

export async function getObject(storageKey: string): Promise<Uint8Array> {
  const remote = r2(storageKey);
  if (!remote) return new Uint8Array(await readFile(pathFor(storageKey)));
  const response = await remote.client.fetch(remote.url, { method: 'GET' });
  if (!response.ok) throw new Error(`File storage could not return the file (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}
