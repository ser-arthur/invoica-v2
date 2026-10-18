import { getFile, withOrganisation } from '@invoica/db';
import { getDb } from '@/lib/db';
import { requireWorkspace } from '@/lib/session';
import { getObject } from '@/lib/storage';
import { isUuid } from '@/lib/ids';

/** Serves a stored file (a logo) to members of the organisation that owns it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response('Not found', { status: 404 });
  const { actor } = await requireWorkspace();
  const file = await withOrganisation(getDb(), actor, (tx) => getFile(tx, id));
  if (!file || file.purpose !== 'logo') return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(await getObject(file.storageKey)), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
