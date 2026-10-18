'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { archiveClientAction } from '@/lib/actions/clients';
import { Button } from './ui';

export function ArchiveClientButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await archiveClientAction(id, !archived);
          router.refresh();
        })
      }
    >
      {archived ? 'Restore' : 'Archive'}
    </Button>
  );
}
