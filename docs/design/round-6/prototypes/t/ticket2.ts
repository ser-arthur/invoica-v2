import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, para } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Ticket, second pass: for makers, shops, repairers and events. A till roll torn from the printer, laid on the page:
 * one narrow white column with torn edges, set in a mono face, the total on a band of the shop's colour, and a
 * remittance stub below a perforation with everything needed to pay.
 */
export const ticket2: ProtoTemplate = {
  id: 'ticket-v2',
  name: 'Ticket',
  fonts: ['JetBrains Mono', 'Onest'],
  footer: { font: 'JetBrains Mono', inset: '0', color: '#7d7a72' },
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 16mm 18mm;background:#ECEAE4}
:root{--brand:${v.brandColour};--on:${v.onBrand};--ink:#161514;--soft:#6c6963;--ground:#ECEAE4;--paper:#ffffff}
body{font-family:'JetBrains Mono',monospace;font-size:8.2pt;line-height:1.4;color:var(--ink);font-variant-numeric:tabular-nums}
.roll{position:relative;width:108mm;margin:4mm auto 0;background:var(--paper);padding:7mm 7mm 0}
.roll::before,.roll::after{content:'';position:absolute;left:0;right:0;height:2mm;background-size:3.2mm 2mm;background-repeat:repeat-x}
.roll::before{top:-2mm;background-image:linear-gradient(to bottom right,transparent 50%,var(--paper) 50%),linear-gradient(to bottom left,transparent 50%,var(--paper) 50%)}
.roll::after{bottom:-2mm;background-image:linear-gradient(to top right,transparent 50%,var(--paper) 50%),linear-gradient(to top left,transparent 50%,var(--paper) 50%)}
.c{text-align:center}
.logo{display:block;margin:0 auto 2.2mm;height:13mm;width:auto;max-width:60mm;object-fit:contain}
.name{font-family:'Onest',sans-serif;font-weight:700;font-size:14pt;letter-spacing:-.02em;line-height:1.15}
.dim{color:var(--soft)}
.hdr .dim{font-size:7.8pt;margin-top:.6mm}
.cut{border:none;border-top:1pt dashed #b3afa7;margin:2.4mm 0}
.kind{display:inline-block;margin:1mm 0 2mm;border:1.1pt solid var(--brand);color:var(--brand);border-radius:1.4mm;padding:.5mm 2.6mm;font-weight:700}
.kv{display:flex;justify-content:space-between;gap:4mm}
.kv span:last-child{text-align:right}
.it{padding:.8mm 0;break-inside:avoid}
.it .t{font-weight:700;overflow-wrap:anywhere}
.it .d{color:var(--soft);overflow-wrap:anywhere}
.total{font-weight:700;margin-top:.6mm;padding-top:1.2mm;border-top:1pt solid var(--ink)}
.due{margin:3mm -7mm 0;background:var(--brand);color:var(--on);padding:3.4mm 7mm 3.8mm;display:flex;justify-content:space-between;align-items:flex-end;gap:4mm;break-inside:avoid}
.due .k{font-weight:700}
.due .w{font-size:7.8pt;margin-top:.4mm}
.due .amt{font-family:'Onest',sans-serif;font-weight:800;font-size:21pt;letter-spacing:-.03em;line-height:1;white-space:nowrap}
.thanks{text-align:center;margin:3.4mm 0 0}
.small{font-size:7.4pt;color:var(--soft);text-align:center;margin:3mm 0 0;padding-bottom:5mm}
.small p{margin:0 0 1mm}
.perf{position:relative;margin:0 -7mm;height:0;border-top:1.1pt dashed #9b978f}
.perf::before,.perf::after{content:'';position:absolute;top:-2.6mm;width:5.2mm;height:5.2mm;border-radius:50%;background:var(--ground)}
.perf::before{left:-2.6mm}.perf::after{right:-2.6mm}
.stub{position:relative;padding:5mm 0 6mm;break-inside:avoid}
.stub{display:grid;grid-template-columns:40mm 1fr;gap:6mm;align-items:start}
.stub .lab{color:var(--soft);font-size:7.6pt}
.stub .big{font-family:'Onest',sans-serif;font-weight:800;font-size:15pt;letter-spacing:-.02em;line-height:1.1;margin:1mm 0 .6mm}
.stub .ref{margin-top:1.2mm;padding-top:1.2mm;border-top:.5pt solid #e2dfd8}
`,
  body: (v: DocumentView, logo: string | null) => {
    const c = v.columns;
    const items = v.lines
      .map((l) => {
        const left = [l.date, c.quantity ? `${l.quantity} x ${l.unitPrice}` : null, c.tax ? `${c.taxLabel} ${l.tax}` : null]
          .filter(Boolean)
          .join('  ');
        return `<div class="it"><div class="t">${esc(l.title)}</div>${l.description ? `<div class="d">${para(l.description)}</div>` : ''}<div class="kv"><span class="dim">${esc(left)}</span><span>${esc(l.amount)}</span></div></div>`;
      })
      .join('');
    const lead = v.totals.filter((t) => t.kind !== 'total' && t.kind !== 'payment' && t.kind !== 'note');
    const total = v.totals.find((t) => t.kind === 'total');
    const after = v.totals.filter((t) => t.kind === 'payment' || t.kind === 'note');
    const bank = v.payment[0];
    const rest = v.payment.slice(1);
    const notes = [v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms].filter(Boolean);
    return `
<div class="roll">
  <div class="c hdr">${logo ? `<img class="logo" src="${esc(logo)}" alt="">` : ''}<div class="name word">${esc(v.seller.name)}</div><div class="dim">${esc(v.seller.addressLines.join(', '))}</div><div class="dim">${esc(v.seller.contactLines.join('  '))}</div>${v.seller.taxLine ? `<div class="dim">${esc(v.seller.taxLine)}</div>` : ''}</div>
  <hr class="cut">
  <div class="c"><span class="kind">${esc(v.heading)} ${esc(v.number)}</span></div>
  ${v.dates.map((d) => `<div class="kv"><span>${esc(d.label)}</span><span>${esc(d.value)}</span></div>`).join('')}
  <hr class="cut">
  <div><span class="dim">${v.kind === 'credit_note' ? 'Credited to' : 'Sold to'}</span><br><strong class="word">${esc(v.buyer.name)}</strong>${[v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines]
    .filter(Boolean)
    .map((l) => `<br>${esc(l)}`)
    .join('')}</div>
  ${v.title ? `<hr class="cut"><div><strong>${esc(v.title)}</strong>${v.summary ? `<div class="dim">${para(v.summary)}</div>` : ''}</div>` : ''}
  <hr class="cut">
  ${items}
  <hr class="cut">
  <div class="keep">${lead.map((t) => `<div class="kv dim"><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`).join('')}
  ${total ? `<div class="kv total"><span>${esc(total.label)}</span><span>${esc(total.value)}</span></div>` : ''}${after.map((t) => `<div class="kv dim"><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`).join('')}
  <div class="due"><div><div class="k">${esc(v.amountDue.label)}</div>${v.amountDue.dueLine ? `<div class="w">${esc(v.amountDue.dueLine)}</div>` : ''}</div><div class="amt">${esc(v.amountDue.value)}</div></div></div>
  ${v.notes ? `<div class="thanks word">${para(v.notes)}</div>` : ''}
  <div class="small">${[...notes, v.legalLine].map((t) => `<p>${para(t)}</p>`).join('')}</div>
  ${
    bank || v.paymentLink
      ? `<div class="perf"></div>
  <div class="stub">
    <div><div class="lab word">Pay ${esc(v.seller.name)}</div><div class="big">${esc(v.amountDue.value)}</div>${v.dates.find((d) => d.label === 'Due') ? `<div>by ${esc(v.dates.find((d) => d.label === 'Due')!.value)}</div>` : ''}</div>
    <div>${bank ? `<div class="lab">${esc(bank.title)}</div>${bank.rows.filter((r) => r.label !== 'Reference' && !(r.label === 'Account name' && r.value === v.seller.name)).map((r) => `<div class="kv"><span class="dim">${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('')}` : ''}
    ${rest.map((p) => `<div class="lab" style="margin-top:1.6mm">${esc(p.title)}</div>${p.rows.map((r) => `<div class="kv"><span class="dim">${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('')}`).join('')}
    ${v.paymentLink ? `<div class="kv" style="margin-top:1.6mm"><span class="dim">Online</span><span class="word">${esc(v.paymentLink)}</span></div>` : ''}
    <div class="kv ref"><span>Reference</span><strong>${esc(v.number)}</strong></div></div>
  </div>`
      : ''
  }
</div>
`;
  },
};
