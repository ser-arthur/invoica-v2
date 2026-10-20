'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { onNotice } from '@/lib/notice';

/** The latest message from `showNotice`, above the phone tab bar, until it is dismissed or the page changes. */
export function Notices() {
  const [message, setMessage] = useState<string | null>(null);
  const pathname = usePathname();
  useEffect(() => onNotice(setMessage), []);
  useEffect(() => setMessage(null), [pathname]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <div role="alert" className="w-full max-w-md empty:hidden">
        {message ? (
          <div className="pointer-events-auto flex items-start gap-3 rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger shadow-lift">
            <p className="flex-1">{message}</p>
            <button
              type="button"
              onClick={() => setMessage(null)}
              aria-label="Dismiss"
              className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-danger/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
