// An approximation of the Receipt template in @react-pdf/renderer, written with React.createElement (no build step).
// Rows never split (wrap=false). The table heading row is fixed inside the table, so it repeats on each page the table
// spans. The footer is fixed and absolutely positioned in the bottom margin, with page x of y from the render prop.
'use strict';
const path = require('path');
const React = require('react');
const { Document, Page, View, Text, Svg, Rect, Path, Link, Font, renderToBuffer } = require('@react-pdf/renderer');
const { totals, money, date, qty, rate } = require('./core');
const { footerText } = require('./receipt-html');

const h = React.createElement;
const FILES = path.join(__dirname, '..', 'node_modules/@fontsource/inter/files');

Font.register({
  family: 'Inter',
  fonts: [400, 500, 600].map((w) => ({ src: path.join(FILES, `inter-latin-${w}-normal.woff`), fontWeight: w })),
});

// Breaks words longer than 30 characters at any character, which matches overflow-wrap: anywhere in the HTML.
// Shorter words are returned whole, so no hyphenation happens.
Font.registerHyphenationCallback((word) => (word.length > 30 ? Array.from(word) : [word]));

const C = { text: '#3D3D3D', ink: '#000', muted: '#767676', rule: '#E3E3E3', rowRule: '#EFEFEF', legal: '#9A9A9A' };
const mm = (n) => `${n}mm`;
// Tabular figures, as the HTML template's font-variant-numeric: tabular-nums on amounts, dates and totals.
const TNUM = ['tnum', 'lnum'];

// Column widths approximate HTML auto table layout: wide enough for the longest value plus the 6 mm gutter.
function colWidth(strings, minMm) {
  const longest = Math.max(...strings.map((s) => s.length));
  return Math.max(minMm, longest * 2.1 + 6);
}

function InvoiceDoc({ doc, keepOff = false }) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const hours = doc.columns === 'hours';
  const cols = hours
    ? [
      { key: 'date', label: 'Date', w: mm(22), get: (l) => date(doc, l.date, 'short'), color: C.muted },
      { key: 'desc', label: 'Description', flex: 1 },
      { key: 'qty', label: 'Hours', num: true, w: mm(colWidth(t.lines.map((l) => qty(l.qty)), 16)), get: (l) => qty(l.qty) },
      { key: 'unit', label: 'Rate', num: true, w: mm(colWidth(t.lines.map((l) => m.fmt(l.unitMinor)), 18)), get: (l) => m.fmt(l.unitMinor) },
      { key: 'amt', label: 'Amount', num: true, w: mm(colWidth(t.lines.map((l) => m.fmt(l.amountMinor)), 20)), get: (l) => m.fmt(l.amountMinor) },
    ]
    : [
      { key: 'desc', label: 'Description', flex: 1 },
      { key: 'qty', label: 'Qty', num: true, w: mm(colWidth(t.lines.map((l) => qty(l.qty)), 12)), get: (l) => qty(l.qty) },
      { key: 'unit', label: 'Unit price', num: true, w: mm(colWidth(t.lines.map((l) => m.fmt(l.unitMinor)), 22)), get: (l) => m.fmt(l.unitMinor) },
      { key: 'amt', label: 'Amount', num: true, w: mm(colWidth(t.lines.map((l) => m.fmt(l.amountMinor)), 20)), get: (l) => m.fmt(l.amountMinor) },
    ];
  const cellStyle = (col, i) => ({
    width: col.w, flexGrow: col.flex || 0, flexShrink: col.flex ? 1 : 0, flexBasis: col.flex ? 0 : undefined, paddingLeft: i === 0 ? 0 : mm(6),
    textAlign: col.num ? 'right' : 'left',
  });

  const headRow = h(View, { fixed: true, style: { flexDirection: 'row', borderBottom: `0.5pt solid ${C.rule}`, paddingBottom: mm(2.4) } },
    cols.map((col, i) => h(Text, { key: col.key, style: { ...cellStyle(col, i), color: C.muted, fontWeight: 500 } }, col.label)));

  const bodyRow = (l, idx) => h(View, { key: idx, wrap: false, style: { flexDirection: 'row', paddingVertical: mm(2.8), borderBottom: `0.5pt solid ${C.rowRule}` } },
    cols.map((col, i) => (col.key === 'desc'
      ? h(View, { key: col.key, style: cellStyle(col, i) },
        h(Text, { style: { color: C.ink } }, l.title),
        l.detail ? h(Text, { style: { color: C.muted, marginTop: mm(0.4) } }, l.detail) : null)
      : h(Text, { key: col.key, style: { ...cellStyle(col, i), color: col.color || C.ink, fontFeatureSettings: TNUM } }, col.get(l)))));

  const sumRow = (label, value, style = {}, labelColor = C.ink) => h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: mm(1.3), ...style } },
    h(Text, { style: { color: labelColor } }, label), h(Text, { style: { color: C.ink, fontFeatureSettings: TNUM } }, value));

  const pair = (k, v) => h(View, { style: { flexDirection: 'row', marginBottom: mm(0.8) } },
    h(Text, { style: { width: mm(20), color: C.muted } }, k), h(Text, { style: { flex: 1, color: C.ink, fontFeatureSettings: TNUM } }, v));

  const mark = h(Svg, { width: 13.5, height: 13.5, viewBox: '0 0 18 18' },
    h(Rect, { width: 18, height: 18, rx: 4.5, fill: doc.brand }),
    h(Path, { d: 'M5 13V5l8 8V5', stroke: '#fff', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));

  return h(Document, { title: doc.number, author: o.legalName },
    h(Page, { size: 'A4', style: { fontFamily: 'Inter', fontSize: 8.8, lineHeight: 1.5, color: C.text, paddingTop: mm(18), paddingHorizontal: mm(18), paddingBottom: mm(20) } },
      h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: mm(14) } },
        // Text in a flex row overlaps its neighbour unless its box has flexBasis 0, so the long-text boxes are wrapped in Views.
        h(View, { style: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexShrink: 1, flexBasis: 0, marginRight: mm(8) } }, mark,
          h(View, { style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, marginLeft: mm(2.4) } },
            h(Text, { style: { fontWeight: 600, fontSize: 12, color: C.ink, letterSpacing: -0.12 } }, o.name))),
        h(View, { style: { alignItems: 'flex-end' } },
          h(Text, { style: { fontSize: 12, fontWeight: 600, color: C.ink } }, 'Invoice'),
          h(Text, { style: { color: C.muted, marginTop: mm(0.6) } }, doc.number))),
      h(Text, { style: { fontSize: 25, lineHeight: 1.12, letterSpacing: -0.55, color: C.ink, fontWeight: 600, marginBottom: mm(3) } },
        `${m.fmt(t.due)} `, h(Text, { style: { color: C.muted, fontWeight: 500 } }, `due ${date(doc, doc.due)}`)),
      h(View, { style: { flexDirection: 'row' } },
        h(Link, { src: '#', style: { color: doc.brand, fontWeight: 500, textDecoration: 'none', borderBottom: `0.8pt solid ${doc.brand}` } }, `Pay online at ${doc.payLink}`)),
      h(View, { style: { flexDirection: 'row', marginTop: mm(12), marginBottom: mm(10), paddingTop: mm(6), borderTop: `0.5pt solid ${C.rule}` } },
        h(View, { style: { flex: 1 } }, h(Text, { style: { color: C.muted, marginBottom: mm(1.2) } }, 'From'),
          h(Text, { style: { color: C.ink, fontWeight: 500 } }, o.legalName), h(Text, null, [...o.address, o.email].join('\n'))),
        h(View, { style: { flex: 1, marginLeft: mm(8) } }, h(Text, { style: { color: C.muted, marginBottom: mm(1.2) } }, 'Bill to'),
          h(Text, { style: { color: C.ink, fontWeight: 500 } }, c.name), h(Text, null, [c.attention, ...c.address].join('\n'))),
        h(View, { style: { flex: 1, marginLeft: mm(8) } },
          pair('Issued', date(doc, doc.issued)), pair('Supply date', date(doc, doc.supply)), pair('Due', date(doc, doc.due)),
          o.taxNo ? pair(o.taxLabel, o.taxNo) : null)),
      h(View, null, headRow, t.lines.map(bodyRow)),
      h(View, { wrap: keepOff, style: { width: mm(78), marginTop: mm(6), marginLeft: 'auto' } },
        sumRow('Subtotal', m.fmt(t.subtotal), {}, C.muted),
        t.taxes.map((x, i) => h(View, { key: i }, sumRow(`${x.name} ${rate(x.rateBp)}`, m.fmt(x.taxMinor), {}, C.muted))),
        sumRow('Total', m.fmt(t.total), { borderTop: `0.5pt solid ${C.rule}`, marginTop: mm(1), paddingTop: mm(2.4) }),
        h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: mm(1.3) } },
          h(Text, { style: { color: C.ink, fontWeight: 600, fontSize: 10.5 } }, 'Amount due'),
          h(Text, { style: { color: C.ink, fontWeight: 600, fontSize: 10.5, fontFeatureSettings: TNUM } }, m.fmt(t.due)))),
      h(View, { wrap: false, style: { flexDirection: 'row', marginTop: mm(14), paddingTop: mm(6), borderTop: `0.5pt solid ${C.rule}` } },
        h(View, { style: { flex: 1 } }, h(Text, { style: { color: C.ink, fontWeight: 500, marginBottom: mm(1.2) } }, doc.payment.heading),
          h(Text, null, [...doc.payment.lines, `Reference ${doc.number}`].join('\n'))),
        h(View, { style: { flex: 1, marginLeft: mm(8) } }, h(Text, { style: { color: C.ink, fontWeight: 500, marginBottom: mm(1.2) } }, 'Questions about this invoice'),
          h(Text, null, o.email))),
      h(Text, { style: { marginTop: mm(10), color: C.legal, fontSize: 7.6 } }, `${o.legalName}, ${o.registration}`),
      // Positioned with top: with bottom, the footer is not drawn at all while the page sets lineHeight (seen in 4.9.0).
      h(View, { fixed: true, style: { position: 'absolute', left: mm(18), right: mm(18), top: mm(283), flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: '#8a8a8a' } },
        h(View, { style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, marginRight: mm(6) } }, h(Text, null, footerText(doc))),
        h(Text, { style: { width: mm(24), textAlign: 'right' }, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` }))));
}

function render(doc, opts = {}) {
  return renderToBuffer(h(InvoiceDoc, { doc, keepOff: !!opts.keepOff }));
}

module.exports = { render };
