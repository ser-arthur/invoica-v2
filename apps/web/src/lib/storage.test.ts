import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('server-only', () => ({}));

// docs/decisions/0016-hosting-on-vercel.md: kept PDFs and logos in Cloudflare R2 in production, a local folder
// otherwise, behind one interface.

interface Seen {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  body: Buffer;
}

const seen: Seen[] = [];
const objects = new Map<string, Buffer>();
let server: Server;
let endpoint: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method!, url: req.url!, headers: req.headers, body });
      if (req.method === 'PUT') {
        objects.set(req.url!, body);
        res.writeHead(200).end();
      } else if (req.method === 'GET' && objects.has(req.url!)) {
        res.writeHead(200, { 'content-type': 'application/octet-stream' }).end(objects.get(req.url!));
      } else res.writeHead(404).end('<Error><Code>NoSuchKey</Code></Error>');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  endpoint = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function storageWith(settings: Record<string, string | undefined>) {
  vi.resetModules();
  for (const name of [
    'R2_ENDPOINT',
    'R2_BUCKET',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'FILE_STORAGE_DIR',
  ])
    delete process.env[name];
  Object.assign(process.env, settings);
  return import('./storage');
}

describe('file storage', () => {
  it('keeps files in R2 when R2 is set: signed requests, the bucket in the path, read back as written', async () => {
    const storage = await storageWith({
      R2_ENDPOINT: endpoint,
      R2_BUCKET: 'invoica-files',
      R2_ACCESS_KEY_ID: 'key-id-for-tests',
      R2_SECRET_ACCESS_KEY: 'secret-for-tests',
    });
    const bytes = new TextEncoder().encode('%PDF-1.7 a kept invoice');
    const stored = await storage.putObject('org-1', 'documents', 'pdf', bytes);

    expect(stored.storageKey).toMatch(/^org-1\/documents\/[0-9a-f-]{36}\.pdf$/);
    expect(stored.byteSize).toBe(bytes.byteLength);
    expect(stored.sha256).toMatch(/^[0-9a-f]{64}$/);
    const put = seen.at(-1)!;
    expect(put.method).toBe('PUT');
    expect(put.url).toBe(`/invoica-files/${stored.storageKey}`);
    expect(put.headers['content-type']).toBe('application/pdf');
    expect(String(put.headers.authorization)).toMatch(
      /^AWS4-HMAC-SHA256 Credential=key-id-for-tests\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=[^,]+, Signature=[0-9a-f]{64}$/,
    );
    expect(put.headers['x-amz-content-sha256']).toBe(stored.sha256);
    expect(put.body.equals(Buffer.from(bytes))).toBe(true);

    expect(Buffer.from(await storage.getObject(stored.storageKey)).equals(Buffer.from(bytes))).toBe(true);
    expect(seen.at(-1)!.method).toBe('GET');
  });

  it('says so when R2 has no such file, and never asks for a key that leaves the folder', async () => {
    const storage = await storageWith({
      R2_ENDPOINT: endpoint,
      R2_BUCKET: 'invoica-files',
      R2_ACCESS_KEY_ID: 'key-id-for-tests',
      R2_SECRET_ACCESS_KEY: 'secret-for-tests',
    });
    await expect(storage.getObject('org-1/documents/missing.pdf')).rejects.toThrow(/404/);
    const before = seen.length;
    await expect(storage.getObject('org-1/../org-2/documents/a.pdf')).rejects.toThrow('Invalid storage key.');
    expect(seen.length).toBe(before);
  });

  it('keeps files in a local folder when R2 is not set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'invoica-files-'));
    const storage = await storageWith({ FILE_STORAGE_DIR: dir });
    const before = seen.length;
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const stored = await storage.putObject('org-1', 'logos', 'png', bytes);
    expect(Buffer.from(await storage.getObject(stored.storageKey)).equals(Buffer.from(bytes))).toBe(true);
    expect(seen.length).toBe(before);
  });
});
