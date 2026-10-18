// Fictional businesses and clients for the template mocks. No real people, companies or account details.
'use strict';

const VAT20 = [{ name: 'VAT', rateBp: 2000 }];

const counsel = {
  template: 'counsel', locale: 'en-GB', currency: 'GBP', brand: '#6E1F2B',
  title: 'Tax invoice',
  org: {
    name: 'Harrow & Vale', legalName: 'Harrow & Vale Accountants Ltd',
    strap: 'Chartered accountants and tax advisers',
    address: ['14 Fennel Street', 'Reading', 'RG1 2AB'], phone: '0118 496 0000', email: 'accounts@harrowvale.example',
    companyNo: '01234567', vatNo: 'GB 123 4567 89',
  },
  client: { name: 'Northfield Dental Practice Ltd', attention: 'For the attention of Dr S. Ellison', address: ['2 Mill Lane', 'Wokingham', 'RG40 1AA'] },
  number: 'HV-2026-0418', issued: '2026-09-30', supply: '2026-09-30', due: '2026-10-30', reference: 'Year end 31 March 2026',
  columns: 'vat',
  showNoTaxBand: 'Outside the scope of VAT',
  lines: [
    { title: 'Statutory accounts for the year ended 31 March 2026', detail: 'Preparation, review and filing at Companies House', qty: 1, unitMinor: 145000, taxes: VAT20 },
    { title: 'Corporation tax return (CT600)', detail: 'Computation, return and submission to HMRC', qty: 1, unitMinor: 38500, taxes: VAT20 },
    { title: 'Payroll bureau, April to September 2026', detail: 'Monthly payroll for nine employees, RTI submissions and payslips', qty: 6, unit: 'months', unitMinor: 6500, taxes: VAT20 },
    { title: 'Confirmation statement', detail: 'Preparation and filing', qty: 1, unitMinor: 6000, taxes: VAT20 },
    { title: 'Companies House filing fee, paid on your behalf', detail: 'Disbursement', qty: 1, unitMinor: 3400, taxes: [] },
  ],
  payment: { method: 'Bank transfer', accountName: 'Harrow & Vale Accountants Ltd', sortCode: '00-00-00', account: '00000000' },
  terms: 'Payment is due within 30 days of the invoice date.',
};

const receipt = {
  template: 'receipt', locale: 'en-GB', currency: 'GBP', brand: '#3346D3',
  org: {
    name: 'Northlane', legalName: 'Northlane Software Ltd', address: ['Unit 4, 22 Canal Wharf', 'Leeds', 'LS11 5AA'],
    email: 'billing@northlane.example', companyNo: '09876543', vatNo: 'GB 987 6543 21',
  },
  client: { name: 'Orchard & Co Logistics Ltd', attention: 'Accounts payable', address: ['Building 7, Eastgate Park', 'Bristol', 'BS2 0AA'], email: 'ap@orchardco.example' },
  number: 'INV-2026-0142', issued: '2026-10-31', supply: '2026-10-31', due: '2026-11-30',
  payLink: 'pay.northlane.example/i/0142',
  columns: 'qty',
  lines: [
    { title: 'Northlane Teams, annual plan', detail: '1 November 2026 to 31 October 2027', qty: 12, unit: 'seats', unitMinor: 18000, taxes: VAT20 },
    { title: 'Additional seats, prorated', detail: 'From 14 October to 31 October 2026', qty: 3, unit: 'seats', unitMinor: 825, taxes: VAT20 },
    { title: 'Onboarding workshop', detail: 'Remote, half day, up to 15 people', qty: 1, unitMinor: 45000, taxes: VAT20 },
  ],
  payment: { method: 'Bank transfer', accountName: 'Northlane Software Ltd', sortCode: '00-00-00', account: '00000000' },
};

const longEntries = [
  ['2026-10-01', 'Kick-off and requirements review'], ['2026-10-02', 'Data model review with finance team'],
  ['2026-10-05', 'Warehouse feed mapping'], ['2026-10-06', 'Warehouse feed mapping'],
  ['2026-10-07', 'Carrier rate import, first pass'], ['2026-10-08', 'Carrier rate import, edge cases'],
  ['2026-10-09', 'Sandbox environment set-up'], ['2026-10-12', 'Order routing rules workshop'],
  ['2026-10-13', 'Order routing rules configuration'], ['2026-10-14', 'Returns workflow design'],
  ['2026-10-15', 'Returns workflow configuration'], ['2026-10-16', 'User acceptance test plan'],
  ['2026-10-19', 'User acceptance testing, day 1'], ['2026-10-20', 'User acceptance testing, day 2'],
  ['2026-10-21', 'Fixes from acceptance testing'], ['2026-10-22', 'Reporting dashboards set-up'],
  ['2026-10-23', 'Reporting dashboards review with operations'], ['2026-10-26', 'Training session, warehouse leads'],
  ['2026-10-27', 'Training session, customer service'], ['2026-10-28', 'Cut-over rehearsal'],
  ['2026-10-29', 'Cut-over and go-live support'], ['2026-10-30', 'Go-live support and handover notes'],
];
const receiptLong = {
  ...receipt,
  number: 'INV-2026-0151', issued: '2026-10-31', supply: '2026-10-31', due: '2026-11-30', payLink: 'pay.northlane.example/i/0151',
  columns: 'hours',
  lines: longEntries.map(([d, t], i) => ({ date: d, title: t, detail: i % 5 === 0 ? 'Includes written summary shared with your project lead' : null, qty: [6, 7.5, 8, 6.5, 7][i % 5], unit: 'hours', unitMinor: 9500, taxes: VAT20 })),
};

const studio = {
  template: 'studio', locale: 'en-GB', currency: 'GBP', brand: '#F2B705',
  org: { name: 'Field Office', legalName: 'Field Office (Nadia Clarke)', address: ['Studio 3, 40 Rope Walk', 'Bristol', 'BS1 6AA'], email: 'hello@fieldoffice.example', web: 'fieldoffice.example' },
  client: { name: 'Riverside Food Hall', attention: 'Priya Shah, Operations Director', address: ['The Old Bus Depot', 'Bath', 'BA1 1AA'] },
  number: '0098', issued: '2026-10-31', supply: '2026-10-24', due: '2026-11-14',
  project: 'Brand identity and launch toolkit',
  summary: 'A new identity for the food hall’s opening in November: name lock-up, colour and type, signage for twelve traders, and everything the team needs to launch on their own.',
  columns: 'amount',
  lines: [
    { title: 'Discovery and positioning workshop', detail: 'Two sessions with the founders and three traders', qty: 1, unitMinor: 65000, taxes: [] },
    { title: 'Identity design', detail: 'Wordmark, colour palette, type system and illustration style', qty: 1, unitMinor: 180000, taxes: [] },
    { title: 'Signage and wayfinding', detail: 'Twelve trader boards, entrance sign and floor graphics', qty: 1, unitMinor: 95000, taxes: [] },
    { title: 'Launch toolkit', detail: 'Menus, posters and social templates the team can edit', qty: 1, unitMinor: 120000, taxes: [] },
    { title: 'Brand guidelines', detail: 'A 24-page guide, delivered as a PDF and a shared file', qty: 1, unitMinor: 40000, taxes: [] },
  ],
  payments: [{ label: 'Deposit received 3 October 2026', amountMinor: 150000 }],
  payment: { method: 'Bank transfer', accountName: 'N. Clarke t/a Field Office', sortCode: '00-00-00', account: '00000000' },
  note: 'Not registered for VAT.',
};

const folio = {
  template: 'folio', locale: 'en-GB', currency: 'GBP', brand: '#2B2340',
  org: { name: 'Mara Linden', strap: 'Career and leadership coaching', address: ['Hebden Bridge', 'West Yorkshire'], email: 'mara@lindencoaching.example', phone: '07700 900000' },
  client: { name: 'Joanna Price', address: ['Manchester'], email: 'joanna.price@example.com' },
  number: 'ML-031', issued: '2026-10-20', supply: '2026-10-16', due: '2026-11-03',
  columns: 'hours',
  lines: [
    { title: 'Career transition coaching', detail: 'Six sessions of 90 minutes, 4 September to 16 October', qty: 9, unit: 'hours', unitMinor: 7000, taxes: [] },
    { title: 'CV and LinkedIn review', detail: 'Written feedback and a follow-up call', qty: 1, unitMinor: 12000, taxes: [], amountOnly: true },
  ],
  discount: { label: 'Returning client discount', amountMinor: 7500 },
  payment: { method: 'Bank transfer', accountName: 'Mara Linden', sortCode: '00-00-00', account: '00000000' },
  note: 'Thank you for six thoughtful sessions. Good luck with the new role.',
};

const source = {
  template: 'source', locale: 'en-GB', currency: 'GBP', brand: '#2F54EB',
  org: { name: 'Ridgeway Labs', person: 'Tomasz Nowak', strap: 'Independent software engineer', address: ['Oxford'], email: 'tomasz@ridgewaylabs.example', web: 'ridgewaylabs.example' },
  client: { name: 'Blue Harbour Analytics Ltd', attention: 'Engineering, attn. Leah Morgan', address: ['3rd floor, 9 Quay Street', 'Cardiff', 'CF10 1AA'] },
  number: 'RL-2026-019', issued: '2026-10-19', periodFrom: '2026-09-28', periodTo: '2026-10-16', due: '2026-11-02', reference: 'PO 7781',
  columns: 'hours',
  lines: [
    { title: 'Week 40: payment provider integration', detail: 'Webhooks, retries and idempotency keys; staging sign-off', qty: 14.5, unit: 'hours', unitMinor: 5500, taxes: [] },
    { title: 'Week 41: data pipeline fixes', detail: 'Late-arriving events, backfill job and alerting', qty: 11, unit: 'hours', unitMinor: 5500, taxes: [] },
    { title: 'Week 42: reporting performance', detail: 'Query plans, two new indexes, p95 from 4.1 s to 0.6 s', qty: 9.25, unit: 'hours', unitMinor: 5500, taxes: [] },
    { title: 'Staging server, October', detail: 'Recharged at cost, receipt attached', qty: 1, unitMinor: 4800, taxes: [], amountOnly: true },
  ],
  payment: { method: 'Bank transfer', accountName: 'Tomasz Nowak', sortCode: '00-00-00', account: '00000000' },
  note: 'Not registered for VAT. Time log with daily entries attached.',
};

const plain = {
  template: 'plain', locale: 'en-GH', currency: 'GHS', brand: '#1B6B3A',
  title: 'Invoice',
  sampleTaxNote: 'Sample tax rates for layout only',
  org: { name: 'Asante Building Supplies', address: ['Plot 12, Suame Magazine Road', 'Kumasi, Ashanti Region'], phone: '+233 20 000 0000', email: 'sales@asantesupplies.example', tin: 'C0000000000' },
  client: { name: 'Osei & Sons Construction', attention: 'Site office, East Legon project', address: ['Accra, Greater Accra Region'], tin: 'C0000000001' },
  number: 'ABS-1207', issued: '2026-10-15', supply: '2026-10-14', due: '2026-10-29',
  columns: 'qty',
  lines: [
    { title: 'Portland cement, 50 kg bag', qty: 120, unit: 'bags', unitMinor: 9500, taxes: [{ name: 'VAT', rateBp: 1500 }, { name: 'Levy', rateBp: 500 }] },
    { title: 'Iron rods, 12 mm, 9 m length', qty: 60, unit: 'lengths', unitMinor: 14000, taxes: [{ name: 'VAT', rateBp: 1500 }, { name: 'Levy', rateBp: 500 }] },
    { title: 'Aluminium roofing sheets, 0.45 mm', qty: 80, unit: 'sheets', unitMinor: 21000, taxes: [{ name: 'VAT', rateBp: 1500 }, { name: 'Levy', rateBp: 500 }] },
    { title: 'Delivery to site, East Legon', qty: 1, unitMinor: 150000, taxes: [{ name: 'VAT', rateBp: 1500 }, { name: 'Levy', rateBp: 500 }] },
  ],
  payment: { method: 'Mobile money or bank transfer', momo: 'MTN MoMo 024 000 0000 (Asante Building Supplies)', bank: 'Sample Bank Ghana, Kumasi, account 0000000000' },
  terms: 'Payment due within 14 days. Goods remain our property until paid in full.',
};

module.exports = { counsel, receipt, receiptLong, studio, folio, source, plain };
