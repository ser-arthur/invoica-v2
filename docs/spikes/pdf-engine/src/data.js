// The hard pack: invented invoices that every engine renders. No real people, businesses or account details.
// Line counts for the two boundary documents and the three-page document come from tuned.json, written by tune.js.
'use strict';
const fs = require('fs');
const path = require('path');

const TUNED_PATH = path.join(__dirname, 'tuned.json');
const tuned = fs.existsSync(TUNED_PATH) ? JSON.parse(fs.readFileSync(TUNED_PATH, 'utf8')) : {};

const VAT20 = [{ name: 'VAT', rateBp: 2000 }];

const baseOrg = {
  name: 'Kestrel Row', legalName: 'Kestrel Row Digital Ltd',
  address: ['Unit 9, 31 Tanner Yard', 'Norwich', 'NR3 1AA'],
  email: 'billing@kestrelrow.example', companyNo: '11223344', taxLabel: 'VAT number', taxNo: 'GB 112 2334 45',
  registration: 'registered in England and Wales, company number 11223344. VAT number GB 112 2334 45.',
};
const baseClient = {
  name: 'Fernbrook Garden Supplies Ltd', attention: 'Accounts payable',
  address: ['Fernbrook House, 4 Station Road', 'Ipswich', 'IP1 1AA'],
};
const ukPayment = (org) => ({ heading: 'Pay by bank transfer', lines: [org.legalName, 'Sort code 00-00-00, account 00000000'] });

function base(over) {
  const doc = {
    template: 'receipt', locale: 'en-GB', currency: 'GBP', brand: '#3346D3',
    org: baseOrg, client: baseClient,
    issued: '2026-10-31', supply: '2026-10-31', due: '2026-11-30',
    columns: 'qty',
    ...over,
  };
  doc.payLink = doc.payLink || `pay.kestrelrow.example/i/${doc.number.slice(-4)}`;
  doc.payment = doc.payment || ukPayment(doc.org);
  return doc;
}

// Short rows used to fill the long documents. Each title carries a unique asset or ticket code.
const tasks = ['Laptop set-up and enrolment', 'Monitor and dock installation', 'Mobile device enrolment',
  'Software licence assignment', 'Mailbox migration', 'Shared drive permissions review'];
function shortLines(n, prefix, startCode) {
  return Array.from({ length: n }, (_, i) => ({
    title: `${tasks[i % tasks.length]}, ${prefix}-${startCode + i}`,
    detail: i % 7 === 3 ? `Completed on site at the Ipswich office, ticket ${7400 + startCode + i}` : null,
    qty: [1, 2, 1, 3, 1.5][i % 5],
    unitMinor: [4500, 2750, 6000, 1999, 8250][i % 5],
    taxes: VAT20,
  }));
}

const oneLine = base({
  id: 'd1-one-line', number: 'KR-2026-0101',
  lines: [{ title: 'Website maintenance, October 2026', detail: 'Updates, backups and uptime monitoring', qty: 1, unitMinor: 48000, taxes: VAT20 }],
});

const sixtyLines = base({ id: 'd2-sixty-lines', number: 'KR-2026-0102', lines: shortLines(60, 'KR', 1001) });

// An 88-character run of letters and digits: no line-break opportunity anywhere inside it.
const TOKEN = 'Q3HandoverPack2026RevisedScheduleOfWorksAndSnaggingListForUnitsTwelveToTwentyFourFinalV7';
const URL_LINE = `https://share.kestrelrow.example/d/${TOKEN}`;
const longText = base({
  id: 'd3-long-text', number: 'KR-2026-0103',
  lines: [
    { title: 'Discovery and requirements, phase one', detail: 'Stakeholder interviews with the operations, finance and customer service teams across both sites, a written summary of current processes, a gap analysis against the new stock control requirements, and a prioritised list of changes with effort estimates agreed at the steering meeting on 9 October, ending with sign-off from the finance lead.', qty: 1, unitMinor: 240000, taxes: VAT20 },
    { title: 'Stock control integration build', detail: 'Two-way synchronisation between the online shop and the warehouse system, covering products, variants, stock levels and reserved stock, with retry handling for failed updates, a nightly reconciliation report emailed to the warehouse manager, and documentation of every field mapping for the internal team to maintain afterwards.', qty: 6, unit: 'days', unitMinor: 62500, taxes: VAT20 },
    { title: 'Handover pack and recorded walkthrough', detail: `Recorded walkthrough of the integration, admin guide and troubleshooting notes. The full pack, including the schedule of works and the snagging list, is at ${URL_LINE} and stays available until 31 January 2027 for your team to download.`, qty: 1, unitMinor: 85000, taxes: VAT20 },
    { title: 'Supplier price list importer', detail: 'An importer for the three supplier price lists that arrive by email each week as spreadsheets in different layouts, with column mapping that the purchasing team can change without a developer, validation that flags missing cost prices and unit mismatches, and a summary of changed prices before anything is written to the catalogue.', qty: 4, unit: 'days', unitMinor: 62500, taxes: VAT20 },
    { title: 'Returns portal for trade customers', detail: 'A returns request form for trade account holders that checks the order number and purchase date against the returns policy, issues a returns authorisation number and a printable label, notifies the warehouse, and records the reason codes so the monthly quality review can see which products come back most often and why.', qty: 5, unit: 'days', unitMinor: 62500, taxes: VAT20 },
    { title: 'Performance work on the product listing pages', detail: 'Profiling of the slowest category pages on mobile, image resizing at upload, lazy loading below the fold, removal of two unused tracking scripts after agreement with marketing, and a caching rule for category pages that cut the median load time on a mid-range phone from 4.8 seconds to 1.9 seconds in the final test run.', qty: 3, unit: 'days', unitMinor: 62500, taxes: VAT20 },
    { title: 'Accessibility review and fixes', detail: 'Keyboard and screen reader testing of checkout, account and returns pages against WCAG 2.2 level AA, with fixes for focus order, form labels, colour contrast on sale badges and error messages that were announced too late, followed by a retest and a short written statement the business can publish on its accessibility page.', qty: 2, unit: 'days', unitMinor: 62500, taxes: VAT20 },
    { title: 'Training for the customer service team', detail: 'Two remote sessions of ninety minutes for the customer service team on the returns portal, order lookups and the new stock reports, with a recording of each session, a one-page quick reference for the shared drive, and answers to the follow-up questions collected in the week after training closed.', qty: 1, unitMinor: 72000, taxes: VAT20 },
    { title: 'Hosting and monitoring, November 2026', detail: 'Managed hosting for the integration services, uptime monitoring every minute, error alerts to the support rota, monthly security patching and a written incident summary for any outage longer than fifteen minutes during the month of November.', qty: 1, unitMinor: 18000, taxes: VAT20 },
  ],
});

const longOrg = {
  name: 'Aldermoor, Pennick and Strathcarron Architectural Conservation and Heritage Surveying',
  legalName: 'Aldermoor, Pennick and Strathcarron Architectural Conservation and Heritage Surveying Consultancy LLP',
  address: ['Second Floor, The Old Corn Exchange Building', '17 to 19 Wheelwright Lane', 'Little Pennick Trading Estate', 'Market Harrowby, North Yorkshire', 'YO62 9ZZ'],
  email: 'accounts@aldermoor-pennick-strathcarron-conservation.example', companyNo: 'OC998877', taxLabel: 'VAT number', taxNo: 'GB 998 8776 65',
  registration: 'a limited liability partnership registered in England and Wales, number OC998877. VAT number GB 998 8776 65.',
};
const longNames = base({
  id: 'd4-long-names', number: 'APS-CONS-2026-00417', org: longOrg,
  client: {
    name: 'The Trustees of the Upper Thornwick and Saltmarsh Valley Rural Community Transport and Wellbeing Charitable Incorporated Organisation',
    attention: 'For the attention of the Treasurer and the Finance and General Purposes Sub-Committee',
    address: ['Unit 3B, Riverside Enterprise Centre', 'Saltmarsh Quay Road', 'Upper Thornwick', 'East Riding of Yorkshire', 'HU99 1ZZ'],
  },
  payLink: 'pay.aldermoor-pennick-strathcarron-conservation.example/i/00417',
  lines: [
    { title: 'Condition survey of the former chapel and schoolroom', detail: 'Measured survey, photographic record and condition report for the grant application', qty: 1, unitMinor: 385000, taxes: VAT20 },
    { title: 'Statement of significance', detail: 'Historic building assessment for the listed building consent application', qty: 1, unitMinor: 140000, taxes: VAT20 },
    { title: 'Site visits during roof repairs', detail: 'Inspection visits with written notes to the contractor', qty: 4, unit: 'visits', unitMinor: 32500, taxes: VAT20 },
    { title: 'Mileage', detail: 'Market Harrowby to Upper Thornwick and back, four visits', qty: 344, unit: 'miles', unitMinor: 45, taxes: VAT20 },
  ],
});

const jpyOrg = {
  name: 'Hoshino Localisation', legalName: 'Hoshino Localisation Studio KK',
  address: ['5F Kitahama Building', '2-1 Kitahama, Chuo-ku', 'Osaka 541-0000', 'Japan'],
  email: 'invoices@hoshino-l10n.example', taxLabel: 'Registration number', taxNo: 'T0000000000000',
  registration: 'Osaka, registration number T0000000000000.',
};
const jpy = base({
  id: 'd5-jpy', number: 'HLS-2026-118', currency: 'JPY', org: jpyOrg,
  client: { name: 'Sakuragawa Games Co., Ltd.', attention: 'Production accounts', address: ['3-4 Jingumae, Shibuya-ku', 'Tokyo 150-0000', 'Japan'] },
  payLink: 'pay.hoshino-l10n.example/i/118',
  payment: { heading: 'Pay by bank transfer', lines: ['Hoshino Localisation Studio KK', 'Sample Bank, Kitahama branch, ordinary account 0000000'] },
  lines: [
    { title: 'English localisation, main script', detail: '182,400 characters, translation and first edit', qty: 1, unitMinor: 1250000, taxes: [{ name: 'Consumption tax', rateBp: 1000 }] },
    { title: 'Linguistic quality testing', detail: 'In-build testing on two platforms', qty: 12.5, unit: 'hours', unitMinor: 8250, taxes: [{ name: 'Consumption tax', rateBp: 1000 }] },
    { title: 'Voice-over script adaptation', detail: 'Lip-sync timing for 46 cutscenes', qty: 3, unit: 'days', unitMinor: 45000, taxes: [{ name: 'Consumption tax', rateBp: 1000 }] },
    { title: 'Terminology review call', detail: 'Rounded to the nearest yen', qty: 7.25, unit: 'hours', unitMinor: 6333, taxes: [{ name: 'Consumption tax', rateBp: 1000 }] },
  ],
});

const kwdOrg = {
  name: 'Al Rimal Facilities', legalName: 'Al Rimal Facilities Consultancy WLL',
  address: ['Office 14, Tower 2, Sample Business Park', 'Sharq', 'Kuwait City', 'Kuwait'],
  email: 'accounts@alrimal-facilities.example', taxLabel: 'Commercial registration', taxNo: 'CR 000000',
  registration: 'Kuwait City, commercial registration CR 000000.',
};
const kwd = base({
  id: 'd6-kwd', number: 'ARF-26-0907', currency: 'KWD', org: kwdOrg,
  client: { name: 'Gulf Lantern Hospitality Co.', attention: 'Finance department', address: ['Block 5, Street 12', 'Salmiya', 'Kuwait'] },
  payLink: 'pay.alrimal-facilities.example/i/0907',
  payment: { heading: 'Pay by bank transfer', lines: ['Al Rimal Facilities Consultancy WLL', 'Sample Bank of Kuwait, IBAN KW00 SAMP 0000 0000 0000 0000 0000 00'] },
  lines: [
    { title: 'Planned maintenance audit', detail: 'Two hotels, 214 assets inspected', qty: 1.5, unit: 'days', unitMinor: 87250, taxes: [] },
    { title: 'Chiller performance tests', detail: 'Per unit, three units', qty: 3, unit: 'units', unitMinor: 12125, taxes: [] },
    { title: 'Energy report and recommendations', detail: 'Written report and presentation', qty: 0.75, unit: 'days', unitMinor: 240000, taxes: [] },
    { title: 'Facilities management contract review', detail: 'Fixed fee', qty: 1, unitMinor: 1450500, taxes: [] },
    { title: 'Spare parts survey', detail: 'Rounded to the nearest fils', qty: 2.333, unit: 'hours', unitMinor: 19999, taxes: [] },
  ],
});

const makeBoundaryChromium = (n) => base({ id: 'd7a-boundary-chromium', number: 'KR-2026-0107', lines: shortLines(n, 'BC', 2001) });
const makeBoundaryReactPdf = (n) => base({ id: 'd7b-boundary-reactpdf', number: 'KR-2026-0108', lines: shortLines(n, 'BR', 3001) });
const boundaryChromium = makeBoundaryChromium(tuned.boundaryChromium || 26);
const boundaryReactPdf = makeBoundaryReactPdf(tuned.boundaryReactPdf || 26);

// A timesheet invoice in the Date / Hours / Rate layout, one row per working day.
function workingDays(fromIso, count) {
  const out = [];
  const d = new Date(`${fromIso}T00:00:00Z`);
  while (out.length < count) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
const timesheetTasks = ['Sprint planning and estimates', 'Checkout service changes', 'Code review and pairing',
  'Payment webhook handling', 'Test fixes and release notes', 'Database migration rehearsal', 'Incident follow-up actions'];
const makeThreePage = (n) => base({
  id: 'd8-three-page', number: 'KR-2026-0109', columns: 'hours',
  lines: workingDays('2026-07-01', n).map((iso, i) => ({
    date: iso,
    // Zero-padded day numbers keep every title unique as text ("day 01" is not part of "day 15").
    title: `${timesheetTasks[i % timesheetTasks.length]}, day ${String(i + 1).padStart(2, '0')}`,
    detail: i % 3 === 0 ? `Notes for day ${String(i + 1).padStart(2, '0')} shared in the project channel` : null,
    qty: [6, 7.5, 8, 6.5, 7][i % 5], unit: 'hours', unitMinor: 9500, taxes: VAT20,
  })),
});
const threePage = makeThreePage(tuned.threePage || 44);

const docs = [oneLine, sixtyLines, longText, longNames, jpy, kwd, boundaryChromium, boundaryReactPdf, threePage];

module.exports = { docs, TOKEN, URL_LINE, makeBoundaryChromium, makeBoundaryReactPdf, makeThreePage };
