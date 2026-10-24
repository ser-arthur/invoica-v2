import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Trade: for builders, roofers, electricians, gardeners, cleaners and mechanics. Set like a job sheet: a band in
 * the brand colour with the phone number large, the customer and the job side by side, heavy rules, and the bank
 * details big enough to type into a banking app.
 */
export const trade: ProtoTemplate = {
  id: 'trade',
  name: 'Trade',
  fonts: ['Archivo'],
  footer: { font: 'Archivo', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:12mm 12mm 17mm}
:root{--brand:${v.brandColour};--on:${v.onBrand};--ink:#161616;--soft:#5a5a5a}
body{font-family:'Archivo',sans-serif;font-size:9.2pt;line-height:1.45;color:var(--ink)}
.cond{font-stretch:68%}
.band{background:var(--brand);color:var(--on);padding:6mm 7mm;display:grid;grid-template-columns:auto 1fr auto;gap:6mm;align-items:center}
.badge{width:21mm;height:21mm}
.badge img{width:100%;height:100%;object-fit:contain}
.badge .mono{width:100%;height:100%;background:var(--ink);color:var(--brand);display:grid;place-items:center;font-weight:900;font-stretch:68%;font-size:30pt}
.name{font-weight:900;font-stretch:66%;font-size:31pt;line-height:.92;letter-spacing:-.005em}
.addr{margin-top:1.5mm;font-size:8.6pt;font-weight:500}
.call{text-align:right}
.call .ph{font-weight:800;font-stretch:72%;font-size:17pt;line-height:1}
.call .em{font-size:8.6pt;font-weight:500;margin-top:.8mm}
.idrow{display:flex;justify-content:space-between;align-items:baseline;margin:5mm 0 4mm;border-bottom:2.4pt solid var(--ink);padding-bottom:2mm}
.idrow .kind{font-weight:900;font-stretch:66%;font-size:24pt;line-height:1}
.idrow .no{font-weight:800;font-stretch:72%;font-size:16pt}
.idrow .no span{font-weight:500;font-size:9pt;font-stretch:100%;color:var(--soft);margin-right:2mm}
.boxes{display:grid;grid-template-columns:1fr 1.25fr;gap:4mm;margin-bottom:6mm}
.box{border:1.4pt solid var(--ink);padding:3.5mm 4mm}
.lab{font-weight:800;font-stretch:72%;font-size:9pt;margin-bottom:1.2mm}
.box .n{font-weight:700}
.extra{color:var(--soft)}
.job h2{font-weight:800;font-stretch:80%;font-size:13pt;line-height:1.15;margin:0 0 1mm}
.job p{color:#333}
.job .dates{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:.4mm 6mm;margin-top:2.5mm;padding-top:2mm;border-top:.6pt solid #cfcfcf}
.job .dates div span{display:block;color:var(--soft);font-size:7.8pt}
.job .dates div b{font-weight:700}
table.lines th{background:var(--ink);color:#fff;font-weight:800;font-stretch:72%;font-size:9pt;text-align:left;padding:2mm 3mm}
table.lines th.num{text-align:right}
table.lines td{padding:2.6mm 3mm;border-bottom:.8pt solid #c9c9c9;vertical-align:top}
table.lines tbody tr:nth-child(even) td{background:#f4f4f2}
.l-title{font-weight:700}.l-desc{color:var(--soft);font-size:8.6pt}
.c-amt{font-weight:700}
.after{display:grid;grid-template-columns:1fr 80mm;gap:8mm;margin-top:5mm;align-items:start;break-inside:avoid}
.totals{padding:0 3mm}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.9mm 0}
.t-total{font-weight:800;border-top:1.4pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:3mm;background:var(--ink);color:#fff;padding:4mm 5mm}
.due .d-label{font-weight:700;font-stretch:72%;font-size:10pt;color:var(--brand)}
.due .d-value{font-weight:900;font-stretch:70%;font-size:34pt;line-height:1;color:var(--brand)}
.due .d-when{font-weight:600;margin-top:1mm}
.bank{border:1.4pt solid var(--ink);padding:4mm}
.bank .big{display:grid;grid-template-columns:auto auto;gap:1mm 7mm;justify-content:start;margin:1.5mm 0 2.5mm}
.bank .big span{display:block;font-size:7.8pt;color:var(--soft)}
.bank .big b{font-weight:800;font-stretch:80%;font-size:15pt;letter-spacing:.02em;line-height:1.1}
.bank dl{display:grid;grid-template-columns:auto 1fr;gap:.3mm 4mm;margin:0;font-size:8.8pt}
.bank dt{color:var(--soft)}.bank dd{margin:0;font-weight:600}
.bank .link{margin-top:2mm;padding-top:2mm;border-top:.6pt solid #cfcfcf}
.notes{margin-top:6mm;display:grid;gap:2mm;font-size:9pt}
.n-title{font-weight:800;font-stretch:72%}
.legal{margin-top:6mm;color:var(--soft);font-size:7.6pt}
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
<div class="idrow"><div class="kind">${esc(v.heading)}</div><div class="no"><span>No.</span>${esc(v.number)}</div></div>
<section class="boxes">
  <div class="box"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Customer'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <div class="box job"><div class="lab">The job</div>${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}<div class="dates">${v.dates.map((d) => `<div><span>${esc(d.label)}</span><b>${esc(d.value)}</b></div>`).join('')}</div></div>
</section>
${linesTable(v)}
<section class="after">
  <div>${bank || v.paymentLink ? `<div class="bank"><div class="lab">Pay by bank transfer</div>${big.length ? `<div class="big">${big.map(([l, x]) => `<div><span>${esc(l)}</span><b>${esc(x)}</b></div>`).join('')}</div>` : ''}<dl>${rest.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>${v.paymentLink ? `<div class="link"><b>Or pay online</b> ${esc(v.paymentLink)}</div>` : ''}</div>` : ''}</div>
  <div>${totalsBlock(v)}<div class="due"><div class="d-label">${esc(v.amountDue.label)}</div><div class="d-value">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div></div>
</section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
