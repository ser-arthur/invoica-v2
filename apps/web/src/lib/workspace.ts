import 'server-only';
import { withOrganisation, type Tx } from '@invoica/db';
import { getDb } from './db';
import { requireWorkspace, type Workspace } from './session';

/** Runs `fn` in one transaction scoped to the signed-in user's organisation. */
export async function inWorkspace<T>(fn: (tx: Tx, ws: Workspace) => Promise<T>): Promise<T> {
  const ws = await requireWorkspace();
  return withOrganisation(getDb(), ws.actor, (tx) => fn(tx, ws));
}
