/** The turned corner of Signature's Night head: 18mm of the page's 210mm, square. */
const TURN = 18 / 210;

/**
 * A rendered document shown as a sheet of paper at a fixed width. Server-rendered; no script needed. `turned` cuts the
 * sheet away past a Night head's turned corner, so what lies behind the sheet shows there in place of the page's white,
 * with its shadow following the cut.
 */
export function Paper({
  html,
  width,
  title,
  className,
  turned = false,
}: {
  html: string;
  width: number;
  title: string;
  className?: string;
  turned?: boolean;
}) {
  const scale = width / 794;
  const corner = Number((TURN * width).toFixed(1));
  return (
    <div
      className={className}
      style={{
        width,
        height: 1123 * scale,
        filter: turned
          ? 'drop-shadow(0 0 0.6px rgb(0 0 0 / 0.12)) drop-shadow(0 16px 18px rgb(19 32 26 / 0.2))'
          : undefined,
      }}
    >
      <div
        className={
          turned
            ? 'h-full overflow-hidden rounded-[4px] bg-white'
            : 'h-full overflow-hidden rounded-[4px] bg-white shadow-[0_1px_0_rgb(19_32_26/0.05),0_24px_48px_-24px_rgb(19_32_26/0.35)] ring-1 ring-black/5'
        }
        style={
          turned
            ? { clipPath: `polygon(0 0, calc(100% - ${corner}px) 0, 100% ${corner}px, 100% 100%, 0 100%)` }
            : undefined
        }
        data-turned={turned ? '' : undefined}
      >
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
