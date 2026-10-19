import type { DocumentView } from '../view';
import { esc, para } from './shared';

/** A printed receipt: one narrow column set in a mono face, dashed rules, the total in large type. */
export const ticket = {
  id: 'ticket',
  footer: { font: 'JetBrains Mono', inset: '0' },
  fonts: ['JetBrains Mono', 'Onest'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:12mm 16mm 20mm}
@media screen{body{padding:12mm 16mm 20mm}}
body{font-family:'JetBrains Mono',monospace;font-size:8.4pt;line-height:1.38;color:#141414}
.ticket{width:124mm;margin:0 auto;padding:6mm 8mm 6mm;background:#fff;border:.5pt solid #d0d0d0;border-top:3.4pt solid ${v.brandColour}}
.c{text-align:center}
.name{font-family:'Onest',sans-serif;font-weight:700;font-size:16pt;letter-spacing:-.02em;line-height:1.1}
.name img{max-height:14mm;max-width:70mm}
.dim{color:#666}
.rule{border:none;border-top:1pt dashed #9a9a9a;margin:2.2mm 0}
.kv{display:flex;justify-content:space-between;gap:4mm}
.kv span:last-child{text-align:right}
.it{padding:1mm 0;break-inside:avoid}
.it .t{font-weight:600;overflow-wrap:anywhere}
.it .d{color:#666;overflow-wrap:anywhere}
.big{font-family:'Onest',sans-serif;font-weight:700;font-size:22pt;letter-spacing:-.03em;text-align:center;margin:2mm 0 0}
.stamp{display:inline-block;border:1.2pt solid ${v.brandColour};color:${v.brandColour};padding:.6mm 3mm;border-radius:1.5mm;font-weight:700;letter-spacing:.06em}
.small{font-size:7.6pt;color:#666}
`,
  body: (v: DocumentView, logo: string | null) => {
    const c = v.columns;
    const items = v.lines
      .map((l) => {
        const left = [
          l.date,
          c.quantity ? `${l.quantity} x ${l.unitPrice}` : null,
          c.tax ? `${c.taxLabel} ${l.tax}` : null,
        ]
          .filter(Boolean)
          .join('  ');
        return `<div class="it"><div class="t">${esc(l.title)}</div>${l.description ? `<div class="d">${para(l.description)}</div>` : ''}<div class="kv"><span class="dim">${esc(left)}</span><span>${esc(l.amount)}</span></div></div>`;
      })
      .join('');
    const totals = v.totals
      .map(
        (t) =>
          `<div class="kv${t.kind === 'total' ? '' : ' dim'}"${t.kind === 'total' ? ' style="font-weight:700"' : ''}><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`,
      )
      .join('');
    const pay = v.payment
      .map(
        (p) =>
          `<div class="kv"><span>${esc(p.title)}</span><span></span></div>${p.rows.map((r) => `<div class="kv dim"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('')}`,
      )
      .join('<hr class="rule">');
    return `
<div class="ticket">
  <div class="c"><div class="name">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : esc(v.seller.name)}</div><div class="dim">${esc([...v.seller.addressLines].join(', '))}</div><div class="dim">${esc(v.seller.contactLines.join('  '))}</div>${v.seller.taxLine ? `<div class="dim">${esc(v.seller.taxLine)}</div>` : ''}</div>
  <hr class="rule">
  <div class="c"><span class="stamp">${esc(v.heading.toUpperCase())}</span></div>
  <div class="kv" style="margin-top:2mm"><span>No.</span><span>${esc(v.number)}</span></div>
  ${v.dates.map((d) => `<div class="kv"><span>${esc(d.label)}</span><span>${esc(d.value)}</span></div>`).join('')}
  <hr class="rule">
  <div><span class="dim">${v.kind === 'credit_note' ? 'Credited to' : 'Billed to'}</span><br><strong>${esc(v.buyer.name)}</strong>${[
    v.buyer.contact,
    ...v.buyer.addressLines,
    ...v.buyer.detailLines,
  ]
    .filter(Boolean)
    .map((l) => `<br>${esc(l)}`)
    .join('')}</div>
  ${v.title ? `<hr class="rule"><div><strong>${esc(v.title)}</strong>${v.summary ? `<div class="dim">${para(v.summary)}</div>` : ''}</div>` : ''}
  <hr class="rule">
  ${items}
  <hr class="rule">
  <div class="keep">${totals}
  <hr class="rule">
  <div class="c dim">${esc(v.amountDue.label)}</div>
  <div class="big">${esc(v.amountDue.value)}</div>
  ${v.amountDue.dueLine ? `<div class="c">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
  ${pay ? `<hr class="rule"><div class="keep">${pay}</div>` : ''}
  ${v.paymentLink ? `<hr class="rule"><div class="c">Pay online<br>${esc(v.paymentLink)}</div>` : ''}
  ${
    [v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.notes, v.terms].filter(Boolean).length
      ? `<hr class="rule"><div class="small">${[
          v.creditNote,
          v.reverseChargeNote,
          v.sterlingRateNote,
          v.notes,
          v.terms,
        ]
          .filter(Boolean)
          .map((t) => `<p>${para(t)}</p>`)
          .join('')}</div>`
      : ''
  }
  <hr class="rule">
  <div class="c small">${esc(v.legalLine)}</div>
</div>
`;
  },
};
