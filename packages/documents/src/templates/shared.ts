import { contrastRatio } from '@invoica/core';
import type { DocumentView } from '../view';

export function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Text with line breaks kept. */
export function para(value: string | null | undefined): string {
  return esc(value).replace(/\n/g, '<br>');
}

export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-kerning:normal;font-variant-numeric:lining-nums tabular-nums;text-rendering:optimizeLegibility;overflow-wrap:anywhere}
p{margin:0}
table{border-collapse:collapse;width:100%}
thead{display:table-header-group}
tr,.keep{break-inside:avoid;page-break-inside:avoid}
.num{text-align:right;white-space:nowrap}
.muted{opacity:.72}
.draft-mark{position:fixed;top:40%;left:0;right:0;text-align:center;font-size:96pt;font-weight:700;opacity:.06;transform:rotate(-24deg);pointer-events:none;letter-spacing:.08em}
.void-mark{position:fixed;top:40%;left:0;right:0;text-align:center;font-size:110pt;font-weight:700;color:#b42318;opacity:.16;transform:rotate(-24deg);pointer-events:none;letter-spacing:.1em;z-index:5}
.word{overflow-wrap:anywhere}
.no{white-space:nowrap}
dd{min-width:0}
`;

/** The lines table, with only the columns this document needs. */
export function linesTable(v: DocumentView, cls = 'lines'): string {
  const c = v.columns;
  const head = [
    c.date ? '<th class="c-date">Date</th>' : '',
    '<th class="c-desc">Description</th>',
    c.quantity ? `<th class="num c-qty">${esc(c.quantityLabel)}</th>` : '',
    c.unitPrice ? `<th class="num c-unit">${esc(c.unitPriceLabel)}</th>` : '',
    c.tax ? `<th class="num c-tax">${esc(c.taxLabel)}</th>` : '',
    '<th class="num c-amt">Amount</th>',
  ].join('');
  const rows = v.lines
    .map(
      (l) =>
        `<tr>${c.date ? `<td class="c-date">${esc(l.date)}</td>` : ''}<td class="c-desc word"><div class="l-title">${esc(l.title)}</div>${
          l.description ? `<div class="l-desc">${para(l.description)}</div>` : ''
        }</td>${c.quantity ? `<td class="num c-qty">${esc(l.quantity)}</td>` : ''}${c.unitPrice ? `<td class="num c-unit">${esc(l.unitPrice)}</td>` : ''}${
          c.tax ? `<td class="num c-tax">${esc(l.tax)}</td>` : ''
        }<td class="num c-amt">${esc(l.amount)}</td></tr>`,
    )
    .join('');
  return `<table class="${cls}"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function totalsBlock(v: DocumentView, cls = 'totals'): string {
  return `<div class="${cls} keep">${v.totals
    .map(
      (t) =>
        `<div class="t-row t-${t.kind}"><span>${esc(t.label)}</span><span class="num">${esc(t.value)}</span></div>`,
    )
    .join('')}</div>`;
}

export function paymentBlock(v: DocumentView, cls = 'pay'): string {
  if (!v.payment.length && !v.paymentLink) return '';
  return `<div class="${cls} keep">${v.payment
    .map(
      (p) =>
        `<div class="p-group"><div class="p-title">${esc(p.title)}</div><dl>${p.rows
          .map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`)
          .join('')}</dl></div>`,
    )
    .join(
      '',
    )}${v.paymentLink ? `<div class="p-group"><div class="p-title">Pay online</div><div class="word">${esc(v.paymentLink)}</div></div>` : ''}</div>`;
}

export function notesBlock(v: DocumentView, cls = 'notes'): string {
  const parts = [
    v.creditNote ? `<p class="n-credit">${esc(v.creditNote)}</p>` : '',
    v.reverseChargeNote ? `<p class="n-rc">${esc(v.reverseChargeNote)}</p>` : '',
    v.sterlingRateNote ? `<p class="n-rc">${esc(v.sterlingRateNote)}</p>` : '',
    v.notes ? `<div><div class="n-title">Notes</div><p>${para(v.notes)}</p></div>` : '',
    v.terms ? `<div><div class="n-title">Terms</div><p>${para(v.terms)}</p></div>` : '',
  ].filter(Boolean);
  return parts.length ? `<div class="${cls} keep">${parts.join('')}</div>` : '';
}

export function lines(arr: (string | null)[]): string {
  return arr
    .filter(Boolean)
    .map((l) => esc(l))
    .join('<br>');
}

/** A string as a CSS string literal. */
export function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ')}"`;
}

/**
 * The running footer on every printed page, drawn by the browser in the page margin (CSS margin boxes,
 * decision 0006), so it uses the document's own font. Screens ignore it.
 */
export function pageFooterCss(label: string, font: string, color: string, inset = '0'): string {
  const box = `font-family:'${font}',sans-serif;font-size:7.5pt;font-weight:400;color:${color};vertical-align:middle;`;
  return `@page{@bottom-left{content:${cssString(label)};${box}text-align:left;padding-left:${inset}}@bottom-right{content:"Page " counter(page) " of " counter(pages);${box}text-align:right;white-space:nowrap;padding-right:${inset}}}`;
}

/** Of a light and a dark colour, the one that reads better on `ground`. */
export function readable(ground: string, light: string, dark: string): string {
  return contrastRatio(ground, light) >= contrastRatio(ground, dark) ? light : dark;
}

/** The colour of the tile behind a logo set on a colour, from the business's choice; null for none. */
export function logoTile(v: DocumentView): string | null {
  return { none: null, white: '#ffffff', cream: '#f6efe2', black: '#111111' }[v.logoGround];
}

/** The brand colour for text on white: itself when it reads, otherwise taken darker until it does. */
export function onWhite(hex: string, min = 4.5): string {
  const n = Number.parseInt(hex.slice(1), 16);
  for (let keep = 1; keep > 0; keep -= 0.05) {
    const c = (shift: number) =>
      Math.trunc(((n >> shift) & 255) * keep)
        .toString(16)
        .padStart(2, '0');
    const out = `#${c(16)}${c(8)}${c(0)}`;
    if (contrastRatio(out, '#ffffff') >= min) return out;
  }
  return '#000000';
}

/**
 * A font size in points at which `text` fits in `widthMm`, given the face's average advance in ems, between `minPt`
 * and `maxPt`. For display figures that stay on one line, such as a large document number.
 */
export function fitPt(text: string, widthMm: number, em: number, maxPt: number, minPt: number): number {
  const fits = (widthMm * 72) / 25.4 / Math.max(text.length * em, 0.01);
  return Math.trunc(Math.max(minPt, Math.min(maxPt, fits)) * 10) / 10;
}

/** The bytes of a base64 data URL, or null for anything else. */
function dataUrlBytes(url: string): Uint8Array | null {
  const m = /^data:[^;,]*;base64,(.*)$/s.exec(url);
  if (!m) return null;
  try {
    return Uint8Array.from(atob(m[1]!), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Width and height in pixels of a PNG, JPEG or WebP image from its header, or null when it is none of these. */
function imageSize(b: Uint8Array): { width: number; height: number } | null {
  const at = (i: number) => b[i] ?? 0;
  const be = (i: number) => (at(i) << 8) | at(i + 1);
  const tag = (i: number) => String.fromCharCode(at(i), at(i + 1), at(i + 2), at(i + 3));
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && tag(12) === 'IHDR') {
    return { width: ((be(16) << 16) | be(18)) >>> 0, height: ((be(20) << 16) | be(22)) >>> 0 };
  }
  if (at(0) === 0xff && at(1) === 0xd8) {
    let i = 2;
    while (i + 9 < b.length && at(i) === 0xff) {
      const marker = at(i + 1);
      const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (sof) return { width: be(i + 7), height: be(i + 5) };
      i += 2 + be(i + 2);
    }
    return null;
  }
  if (tag(0) === 'RIFF' && tag(8) === 'WEBP') {
    const le24 = (i: number) => at(i) | (at(i + 1) << 8) | (at(i + 2) << 16);
    if (tag(12) === 'VP8X') return { width: le24(24) + 1, height: le24(27) + 1 };
    if (tag(12) === 'VP8L' && at(20) === 0x2f) {
      const bits = (at(21) | (at(22) << 8) | (at(23) << 16) | (at(24) << 24)) >>> 0;
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (tag(12) === 'VP8 ' && at(23) === 0x9d && at(24) === 0x01 && at(25) === 0x2a) {
      return { width: (at(26) | (at(27) << 8)) & 0x3fff, height: (at(28) | (at(29) << 8)) & 0x3fff };
    }
  }
  return null;
}

/** The logo's width over its height, or null with no logo or one whose size cannot be read. */
export function logoRatio(logo: string | null): number | null {
  const bytes = logo ? dataUrlBytes(logo) : null;
  const size = bytes ? imageSize(bytes) : null;
  return size && size.width > 0 && size.height > 0 ? size.width / size.height : null;
}

/** A logo at least this much wider than it is tall is set as a wordmark, outside a round frame. */
export const WIDE_LOGO = 1.4;

/** An inline size in mm for a logo of this ratio filling at most `maxW` by `maxH`; empty when the ratio is unknown. */
export function logoFit(ratio: number | null, maxW: number, maxH: number): string {
  if (ratio === null) return '';
  const w = Math.min(maxW, maxH * ratio);
  return `width:${w.toFixed(2)}mm;height:${(w / ratio).toFixed(2)}mm`;
}
