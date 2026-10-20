'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from './dialog';
import { Button } from './ui';

/**
 * While `dirty`, closing or reloading the tab asks the browser's own question, and a link to another page of the app
 * asks first (docs/specs/unsaved-changes.md). Returns where a link would have gone, and what the dialog's buttons do.
 */
export function useLeaveGuard(dirty: boolean, onLeave?: () => void) {
  const router = useRouter();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  // Set when the person chose to leave, so the page goes without asking again.
  const released = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!released.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (released.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download'))
        return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeavingTo(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return {
    leavingTo,
    stay: () => setLeavingTo(null),
    leave: () => {
      const to = leavingTo;
      released.current = true;
      setLeavingTo(null);
      onLeave?.();
      if (to) router.push(to);
    },
  };
}

/** Asks before leaving a page with changes not saved. */
export function LeaveDialog({
  guard,
  title = 'Leave this page?',
}: {
  guard: ReturnType<typeof useLeaveGuard>;
  title?: string;
}) {
  if (!guard.leavingTo) return null;
  return (
    <Dialog title={title} onClose={guard.stay}>
      <p className="text-muted">It has changes that are not saved. Leaving now loses them.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={guard.leave}>
          Leave without saving
        </Button>
        <Button type="button" onClick={guard.stay} autoFocus>
          Keep editing
        </Button>
      </div>
    </Dialog>
  );
}
