'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { removeLogoAction, uploadLogoAction } from '@/lib/actions/logo';
import { Button, FormMessage, Panel } from './ui';
import { showNotice } from '@/lib/notice';
import { reach } from '@/lib/reach';

export function LogoUpload({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set('logo', file);
    setMessage(null);
    start(async () => {
      const r = await reach(uploadLogoAction(form));
      if (!r.ok) return setMessage(r.message);
      router.refresh();
    });
  }

  return (
    <Panel id="logo" className="scroll-mt-24">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="text-[16px] font-semibold">Logo</h2>
          <p className="mt-1 text-[14px] text-muted">
            Printed at the top of your invoices. PNG, JPEG or WebP, under 512 KB. A wide logo on a transparent
            background works best.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4">
          {message ? <FormMessage>{message}</FormMessage> : null}
          <div className="flex h-24 w-full max-w-sm items-center justify-center rounded-[12px] border border-dashed border-line-strong bg-white p-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${name} logo`} className="max-h-16 max-w-full object-contain" />
            ) : (
              // The box is white paper in both themes, so its words keep the light theme's muted ink.
              <span className="text-[14px] text-[#56675e]">
                No logo yet. Your business name is printed instead.
              </span>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Logo image file"
            tabIndex={-1}
            id="logo-file"
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              {pending ? 'Uploading' : logoUrl ? 'Replace logo' : 'Upload logo'}
            </Button>
            {logoUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await reach(removeLogoAction());
                    if (!r.ok) return showNotice(r.message);
                    router.refresh();
                  })
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}
