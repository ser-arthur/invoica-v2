'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { archiveClientAction } from '@/lib/actions/clients';
import { Button } from './ui';
import { showNotice } from '@/lib/notice';
import { reach } from '@/lib/reach';

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
          const r = await reach(archiveClientAction(id, !archived));
          if (!r.ok) return showNotice(r.message);
          router.refresh();
        })
      }
    >
      {archived ? 'Restore' : 'Archive'}
    </Button>
  );
}
