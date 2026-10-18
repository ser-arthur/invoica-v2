// Runs the invoice editor's money getters and submit expressions, lifted
// verbatim from templates/base.html, against a JSON state read from argv.
// Usage: node editor_js.js <path-to-base.html> '<json state>'
const fs = require('fs');
const basePath = process.argv[2];
const state = JSON.parse(process.argv[3]);
const lines = fs.readFileSync(basePath, 'utf8').split('\n');
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const getters = slice(993, 1017);       // currencySymbol, subtotal, vatAmount, totalWithVat
const formatter = slice(1179, 1185);    // formatCurrency
const submit = slice(1324, 1327)        // hidden-field assignments on submit
  .replace(/document\.getElementById\('([a-z_]+)'\)\.value = /g, "out['$1'] = ");

const objSrc = `({ ${getters}\n ${formatter} })`;
const obj = eval(objSrc);
Object.assign(obj, state);

const out = {};
new Function('out', submit).call(obj, out);

const result = {
  subtotal: obj.subtotal,
  vatAmount: obj.vatAmount,
  totalWithVat: obj.totalWithVat,
  shown: {
    subtotal: obj.formatCurrency(obj.subtotal),
    vat: obj.formatCurrency(obj.vatAmount),
    total: obj.formatCurrency(obj.totalWithVat),
    vatLabel: `Tax (${obj.vatRate}%)`,
  },
  submitted: out,
};
process.stdout.write(JSON.stringify(result));
