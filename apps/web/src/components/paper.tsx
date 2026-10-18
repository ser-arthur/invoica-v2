/** A rendered document shown as a sheet of paper at a fixed width. Server-rendered; no script needed. */
export function Paper({
  html,
  width,
  title,
  className,
}: {
  html: string;
  width: number;
  title: string;
  className?: string;
}) {
  const scale = width / 794;
  return (
    <div className={className} style={{ width, height: 1123 * scale }}>
      <div className="h-full overflow-hidden rounded-[4px] bg-white shadow-[0_1px_0_rgb(19_32_26/0.05),0_24px_48px_-24px_rgb(19_32_26/0.35)] ring-1 ring-black/5">
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none origin-top-left border-0 bg-white"
          style={{ width: 794, height: 1123, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
