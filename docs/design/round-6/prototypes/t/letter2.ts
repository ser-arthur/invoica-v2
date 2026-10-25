import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, para } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Letter, second pass: for coaches, tutors and therapists. Good stationery: the sender's name set like a letterhead,
 * fold marks in the margin, the client's address where a window envelope shows it, the sessions listed by date with
 * dotted leaders, a signed sign-off, and how to pay written as a postscript.
 */
export const letter2: ProtoTemplate = {
  id: 'letter-v2',
  name: 'Letter',
  fonts: ['Newsreader'],
  footer: { font: 'Newsreader', inset: '26mm', color: '#7a7368' },
  css: (v: DocumentView) => `
@page{size:A4;margin:18mm 0 20mm}
@page:first{margin-top:0}
:root{--brand:${v.brandColour};--ink:#24211d;--soft:#6f685d;--rule:#cfc7b9}
body{font-family:'Newsreader',serif;font-size:10.8pt;line-height:1.52;color:var(--ink);font-variant-numeric:oldstyle-nums proportional-nums}
.num,.a,.sum{font-variant-numeric:lining-nums tabular-nums}
.fold{position:absolute;left:9mm;width:5mm;border-top:.5pt solid #b9b1a3}
.wrap{padding:0 26mm}
.lh{padding-top:20mm;display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:start}
.lh .n{font-weight:300;font-size:27pt;line-height:1.05;letter-spacing:-.012em}
.lh .r{width:14mm;border-top:1.2pt solid var(--brand);margin:4mm 0 3mm}
.lh .c{font-size:8.8pt;color:var(--soft);line-height:1.55;font-variant-numeric:lining-nums}
.lh img{height:16mm;width:auto;max-width:48mm;object-fit:contain;display:block}
.mono{width:16mm;height:16mm;border-radius:50%;border:.9pt solid var(--brand);display:grid;place-items:center;font-style:italic;font-size:15pt;color:var(--brand);letter-spacing:.02em}
.addr{display:grid;grid-template-columns:1fr 58mm;gap:10mm;margin-top:10mm;min-height:31mm}
.addr .to{line-height:1.45}
.addr .meta{font-size:9.6pt;text-align:right;line-height:1.6;color:var(--soft)}
.addr .meta b{display:block;font-weight:600;color:var(--ink);font-size:11pt;margin-top:1.4mm}
.dear{margin:5mm 0 3mm}
.body p{margin:0 0 3mm;max-width:150mm}
.items{margin:5mm 0 1mm;max-width:150mm}
.item{display:grid;grid-template-columns:19mm 1fr;align-items:baseline;padding:1.3mm 0;break-inside:avoid}
.item .d{font-style:italic;color:var(--soft);font-size:9.8pt}
.item .row{display:flex;align-items:baseline;gap:2mm}
.item .t small{display:block;color:var(--soft);font-size:9.6pt;font-style:italic}
.item .dots{flex:1 1 auto;border-bottom:1pt dotted #a49b8d;transform:translateY(-1.1mm);min-width:8mm}
.item .a{white-space:nowrap}
.sum{max-width:150mm;margin:1mm 0 0;display:grid;justify-content:end}
.sum .r{display:grid;grid-template-columns:44mm 30mm;padding:.6mm 0;color:var(--soft);text-align:right}
.sum .r span:first-child{text-align:left}
.sum .total{color:var(--ink);font-weight:600;border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm}
table.lines{max-width:150mm;margin:5mm 0 2mm;font-size:10pt}
table.lines th{font-weight:400;font-style:italic;color:var(--soft);text-align:left;border-bottom:.6pt solid var(--ink);padding:0 0 1.4mm}
table.lines th.num{text-align:right}
table.lines td{padding:1.4mm 0;border-bottom:.35pt dotted #a49b8d;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:4mm}
.l-desc{color:var(--soft);font-style:italic;font-size:9.4pt}
.due{margin-top:5mm}
.sign{margin-top:5mm;break-inside:avoid}
.sign .n{font-style:italic;font-size:19pt;line-height:1.2;color:var(--brand);margin-top:1mm}
.ps{margin-top:5mm;max-width:150mm;break-inside:avoid}
.ps em{font-style:italic;color:var(--soft);margin-right:1.5mm}
.small{margin-top:6mm;padding-top:2.4mm;border-top:.4pt solid var(--rule);font-size:8.6pt;color:var(--soft);max-width:150mm;font-variant-numeric:lining-nums}
.small p{margin:0 0 1.2mm}
`,
  body: (v: DocumentView, logo: string | null) => {
    const contact = v.buyer.contact ?? v.buyer.name;
    const dear = contact.split(',')[0]!.trim();
    const initials = v.seller.name
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
    const structured = v.columns.quantity || v.columns.tax;
    const items = structured
      ? linesTable(v)
      : `<div class="items">${v.lines
          .map(
            (l) =>
              `<div class="item"><span class="d">${l.date ? esc(l.date.replace(/ 20\d\d$/, '')) : ''}</span><span class="row"><span class="t">${esc(l.title)}${l.description ? `<small>${para(l.description)}</small>` : ''}</span><span class="dots"></span><span class="a">${esc(l.amount)}</span></span></div>`,
          )
          .join('')}</div>`;
    const sums = v.totals
      .filter((t) => t.kind !== 'note')
      .map((t) => `<div class="r${t.kind === 'total' ? ' total' : ''}"><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`)
      .join('');
    const pay = v.payment.map(
      (p) => `${esc(p.title.charAt(0).toLowerCase() + p.title.slice(1))}: ${p.rows.map((r) => `${esc(r.label.toLowerCase())} ${esc(r.value)}`).join(', ')}`,
    );
    const ps = pay.length || v.paymentLink
      ? `You can pay by ${[...pay, ...(v.paymentLink ? [`online at ${esc(v.paymentLink)}`] : [])].join('; or ')}.`
      : '';
    const isCredit = v.kind === 'credit_note';
    const by = /^Due (\d.*)$/.exec(v.amountDue.dueLine ?? '')?.[1] ?? null;
    return `
<i class="fold" style="top:99mm"></i><i class="fold" style="top:198mm"></i>
<div class="wrap">
<header class="lh">
  <div><div class="n word">${esc(v.seller.name)}</div><div class="r"></div><div class="c">${lines([v.seller.addressLines.join(', '), v.seller.contactLines.join(', ')])}</div></div>
  ${logo ? `<img src="${esc(logo)}" alt="">` : `<div class="mono">${esc(initials)}</div>`}
</header>
<section class="addr">
  <div class="to word">${lines([v.buyer.contact ? v.buyer.contact.split(',')[0]!.trim() : null, v.buyer.name, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div>
  <div class="meta">${esc(v.dates.find((d) => d.label === 'Issued')?.value ?? '')}<b>${esc(v.heading)} ${esc(v.number)}</b>${v.dates
    .filter((d) => d.label !== 'Issued')
    .map((d) => `${esc(d.label)} ${esc(d.value)}`)
    .join('<br>')}</div>
</section>
<p class="dear">Dear ${esc(dear)},</p>
<section class="body">${
      isCredit
        ? `<p>${esc(v.creditNote ?? 'This credit note reduces what you owe.')}</p>`
        : `<p>${v.title ? `This is my invoice for ${esc(v.title.charAt(0).toLowerCase() + v.title.slice(1))}.` : 'This is my invoice for the work below.'}${v.summary ? ` ${para(v.summary)}` : ''}</p>`
    }</section>
${items}
<div class="sum keep">${sums}</div>
${isCredit ? '' : `<section class="body due keep"><p>The ${esc(v.amountDue.label.toLowerCase())} is <strong>${esc(v.amountDue.value)}</strong>${by ? `, and I would be grateful for it by ${esc(by)}` : v.amountDue.dueLine ? `, ${esc(v.amountDue.dueLine.charAt(0).toLowerCase() + v.amountDue.dueLine.slice(1))}` : ''}.</p></section>`}
${v.notes ? `<section class="body"><p>${para(v.notes)}</p></section>` : ''}
<div class="sign">With thanks,<div class="n">${esc(v.seller.name)}</div></div>
${ps ? `<p class="ps"><em>P.S.</em>${ps}</p>` : ''}
<section class="small">${[v.reverseChargeNote, v.sterlingRateNote, v.terms, v.legalLine]
      .filter(Boolean)
      .map((t) => `<p>${para(t)}</p>`)
      .join('')}</section>
</div>
`;
  },
};
