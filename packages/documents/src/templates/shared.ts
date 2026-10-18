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
body{margin:0;font-kerning:normal;font-variant-numeric:lining-nums tabular-nums;text-rendering:optimizeLegibility}
p{margin:0}
table{border-collapse:collapse;width:100%}
thead{display:table-header-group}
tr,.keep{break-inside:avoid;page-break-inside:avoid}
.num{text-align:right;white-space:nowrap}
.muted{opacity:.72}
.draft-mark{position:fixed;top:40%;left:0;right:0;text-align:center;font-size:96pt;font-weight:700;opacity:.06;transform:rotate(-24deg);pointer-events:none;letter-spacing:.08em}
.word{overflow-wrap:anywhere}
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
