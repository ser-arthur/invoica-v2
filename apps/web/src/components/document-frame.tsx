'use client';

import { useEffect, useRef, useState } from 'react';

/** Shows a rendered document at A4 width, scaled to fit, with its full height. */
export function DocumentFrame({ html }: { html: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.7);
  const [height, setHeight] = useState(1123);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(Math.min(el.clientWidth / 794, 1)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={wrap} className="w-full">
      <div
        className="overflow-hidden rounded-[6px] bg-white shadow-lift ring-1 ring-line"
        style={{ height: height * scale }}
      >
        <iframe
          ref={frame}
          title="Document"
          srcDoc={html}
          sandbox="allow-same-origin"
          className="origin-top-left border-0 bg-white"
          style={{ width: 794, height, transform: `scale(${scale})` }}
          onLoad={() => {
            const doc = frame.current?.contentDocument;
            if (doc) setHeight(Math.max(1123, doc.documentElement.scrollHeight));
          }}
        />
      </div>
    </div>
  );
}
