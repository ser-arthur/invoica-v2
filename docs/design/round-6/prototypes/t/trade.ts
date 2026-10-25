import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Trade: for builders, roofers, electricians, gardeners, cleaners and mechanics. Set like a well-kept van: a charcoal
 * band with the name bold and the phone number in the brand colour, one weight of rule throughout, and the bank
 * details big enough to type straight into a banking app.
 */
export const trade: ProtoTemplate = {
  id: 'trade',
  name: 'Trade',
  fonts: ['Archivo'],
  footer: { font: 'Archivo', inset: '14mm', color: '#6a6a66' },
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 0 18mm}
@page:first{margin-top:0}
:root{--brand:${v.brandColour};--coal:#1D1F22;--ink:#1D1F22;--soft:#64655f;--rule:#d5d3cc;--panel:#F3F2EE;--w:.75pt}
body{font-family:'Archivo',sans-serif;font-size:9pt;line-height:1.5;color:var(--ink);font-variant-numeric:lining-nums proportional-nums}
.wide{font-stretch:100%}
.band{background:var(--coal);color:#fff;padding:10mm 14mm 9mm;display:grid;grid-template-columns:auto 1fr auto;gap:6mm;align-items:center;border-bottom:2mm solid var(--brand)}
.badge{width:18mm;height:18mm}
.badge img{width:100%;height:100%;object-fit:contain}
.badge .mono{width:100%;height:100%;background:var(--brand);color:var(--coal);display:grid;place-items:center;font-weight:800;font-stretch:100%;font-size:22pt}
.name{font-weight:800;font-stretch:100%;font-size:22pt;line-height:1;letter-spacing:-.02em}
.addr{margin-top:1.8mm;font-size:8.4pt;color:#c9c8c2}
.call{text-align:right}
.call .ph{font-weight:800;font-stretch:100%;font-size:16pt;line-height:1;color:var(--brand)}
.call .em{font-size:8.4pt;color:#c9c8c2;margin-top:1mm}
.wrap{padding:0 14mm}
.idrow{margin:9mm 0 6mm}
.kind{font-weight:800;font-stretch:100%;font-size:22pt;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.kind span{font-weight:400;color:var(--soft);margin-left:2.5mm}
.dates{display:grid;grid-template-columns:auto auto;gap:.6mm 5mm;margin:0;align-content:start}
.dates dt{color:var(--soft);white-space:nowrap}.dates dd{margin:0;font-weight:600;text-align:right;white-space:nowrap}
.lab{font-size:7.4pt;font-weight:600;font-stretch:100%;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);margin-bottom:1.6mm}
.pair{display:grid;grid-template-columns:.9fr 1.5fr auto;gap:9mm;border-top:var(--w) solid var(--ink);padding-top:3.5mm;margin-bottom:8mm}
.pair .n{font-weight:600}
.extra{color:var(--soft)}
.job h2{font-weight:700;font-stretch:100%;font-size:12pt;line-height:1.2;margin:0 0 1mm}
.job p{color:#3a3b38}
table.lines th{font-size:7.4pt;font-weight:600;font-stretch:100%;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);text-align:left;padding:0 0 2.2mm;border-bottom:var(--w) solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:3mm 0;border-bottom:var(--w) solid var(--rule);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:6mm}
.l-title{font-weight:600}.l-desc{color:var(--soft);font-size:8.6pt}
.c-amt{font-weight:600}
.after{display:grid;grid-template-columns:1fr 78mm;gap:10mm;margin-top:6mm;align-items:start;break-inside:avoid}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{font-weight:700;border-top:var(--w) solid var(--ink);margin-top:1.2mm;padding-top:2mm}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:4mm;background:var(--brand);color:var(--coal);padding:5mm 6mm 5.5mm}
.due .d-label{font-size:7.4pt;font-weight:700;font-stretch:100%;letter-spacing:.06em;text-transform:uppercase}
.due .d-value{font-weight:800;font-stretch:100%;font-size:30pt;line-height:1;letter-spacing:-.025em;margin-top:2mm;white-space:nowrap}
.due .d-when{font-weight:500;margin-top:1.6mm}
.bank{background:var(--panel);padding:5mm 6mm}
.bank .big{display:grid;grid-template-columns:auto auto;gap:1mm 9mm;justify-content:start;margin:1mm 0 3.5mm}
.bank .big span{display:block;font-size:7.6pt;color:var(--soft)}
.bank .big b{font-weight:700;font-stretch:100%;font-size:15pt;letter-spacing:.01em;line-height:1.15}
.bank dl{display:grid;grid-template-columns:auto 1fr;gap:.3mm 5mm;margin:0;font-size:8.6pt}
.bank dt{color:var(--soft)}.bank dd{margin:0;font-weight:500}
.bank .link{margin-top:3mm;padding-top:2.5mm;border-top:var(--w) solid var(--rule);font-size:8.6pt}
.word2{margin-top:7mm;display:flex;gap:3mm;align-items:baseline;font-weight:500}
.word2 i{flex:none;width:2.4mm;height:2.4mm;background:var(--brand);border-radius:50%;transform:translateY(-.2mm)}
.small{margin-top:2mm;color:var(--soft);font-size:8.6pt}
.legal{margin-top:7mm;padding-top:2.5mm;border-top:var(--w) solid var(--rule);color:var(--soft);font-size:7.6pt}
`,
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment.find((p) => p.title === 'Bank transfer');
    const row = (l: string) => bank?.rows.find((r) => r.label === l)?.value ?? null;
    const big = [
      ['Sort code', row('Sort code')],
      ['Account number', row('Account number')],
    ].filter((r): r is [string, string] => !!r[1]);
    const rest = bank?.rows.filter((r) => r.label !== 'Sort code' && r.label !== 'Account number') ?? [];
    const phone = v.seller.contactLines.find((l) => /^[+\d][\d\s]+$/.test(l));
    const others = v.seller.contactLines.filter((l) => l !== phone);
    return `
<header class="band">
  <div class="badge">${logo ? `<img src="${esc(logo)}" alt="">` : `<div class="mono">${esc(v.seller.name.slice(0, 1))}</div>`}</div>
  <div><div class="name word">${esc(v.seller.name)}</div><div class="addr">${esc(v.seller.addressLines.join(', '))}</div></div>
  <div class="call">${phone ? `<div class="ph">${esc(phone)}</div>` : ''}${others.map((o) => `<div class="em">${esc(o)}</div>`).join('')}</div>
</header>
<div class="wrap">
<div class="idrow"><div class="kind">${esc(v.heading)}<span>${esc(v.number)}</span></div></div>
<section class="pair">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Customer'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <div class="job"><div class="lab">The job</div>${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</div>
  <div><div class="lab">Dates</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${linesTable(v)}
<section class="after">
  <div>${bank || v.paymentLink ? `<div class="bank"><div class="lab">Pay by bank transfer</div>${big.length ? `<div class="big">${big.map(([l, x]) => `<div><span>${esc(l)}</span><b>${esc(x)}</b></div>`).join('')}</div>` : ''}<dl>${rest.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>${v.paymentLink ? `<div class="link">Or pay online at ${esc(v.paymentLink)}</div>` : ''}</div>` : ''}</div>
  <div>${totalsBlock(v)}<div class="due"><div class="d-label">${esc(v.amountDue.label)}</div><div class="d-value">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div></div>
</section>
${v.notes ? `<p class="word2"><i></i><span>${para(v.notes)}</span></p>` : ''}
${[v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms].filter(Boolean).map((x) => `<p class="small">${para(x)}</p>`).join('')}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
</div>
`;
  },
};
