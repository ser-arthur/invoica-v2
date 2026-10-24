import { assembleSnapshot, computeDocument, type DocumentSnapshot, type LineStyle, type TaxCode } from '../../../../packages/core/src/index';

const VAT20: TaxCode = {
  label: 'Standard rate',
  treatment: 'standard',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};

type Line = { title: string; description?: string; quantity: number; unitPrice: number; unit?: string; serviceDate?: string };

interface Spec {
  number: string;
  lineStyle: LineStyle;
  seller: Partial<DocumentSnapshot['seller']> & { name: string; brandColour: string };
  buyer: { name: string; contactName?: string; address: [string, string | null, string, string] };
  lines: Line[];
  title: string;
  summary?: string;
  notes?: string;
  terms?: string;
  reference?: string;
  vat?: boolean;
  link?: string;
  issue?: string;
  deposit?: { label: string; amount: number; paidOn: string };
  due?: string;
  supply?: string;
}

export function make(template: string, s: Spec): DocumentSnapshot {
  const vat = !!s.vat;
  const seller: DocumentSnapshot['seller'] = {
    legalName: null,
    businessType: 'sole_trader',
    companyNumber: null,
    email: null,
    phone: null,
    website: null,
    address: { line1: '1 Example Street', line2: null, city: 'Bristol', region: null, postcode: 'BS1 1AA', countryCode: 'GB' },
    taxRegistered: vat,
    taxNumber: vat ? 'GB 000 0000 00' : null,
    logoFileId: null,
    ...s.seller,
  };
  const lines = s.lines.map((l) => ({
    title: l.title,
    description: l.description ?? null,
    quantity: l.quantity,
    unit: l.unit ?? null,
    unitPrice: l.unitPrice,
    serviceDate: l.serviceDate ?? null,
    tax: vat ? VAT20 : null,
  }));
  const totals = computeDocument({ currency: 'GBP', pricesIncludeTax: false, taxLevel: 'line', rounding: 'half-up', lines, paid: s.deposit?.amount ?? 0 });
  return assembleSnapshot({
    kind: 'invoice',
    number: s.number,
    issueDate: s.issue ?? '2026-10-19',
    dueDate: s.due ?? '2026-11-02',
    supplyDate: s.supply ?? s.issue ?? '2026-10-19',
    servicePeriodStart: null,
    servicePeriodEnd: null,
    reference: s.reference ?? null,
    title: s.title,
    summary: s.summary ?? null,
    currency: 'GBP',
    locale: 'en-GB',
    lineStyle: s.lineStyle,
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    seller,
    buyer: {
      name: s.buyer.name,
      contactName: s.buyer.contactName ?? null,
      email: null,
      address: {
        line1: s.buyer.address[0],
        line2: s.buyer.address[1],
        city: s.buyer.address[2],
        region: null,
        postcode: s.buyer.address[3],
        countryCode: 'GB',
      },
      taxNumber: null,
      fields: [],
    },
    lines,
    totals,
    prepayments: s.deposit ? [s.deposit] : [],
    notes: s.notes ?? null,
    terms: s.terms ?? null,
    template,
    options: {},
    paymentDetails: {
      bank: { accountName: seller.legalName ?? seller.name, bankName: 'Example Bank', sortCode: '00-00-00', accountNumber: '00000000' },
      paymentLink: s.link ?? null,
    },
    credits: null,
  });
}

const addr = (line1: string, city: string, postcode: string) => ({
  line1,
  line2: null,
  city,
  region: null,
  postcode,
  countryCode: 'GB',
});

/** One invented business per template: its own trade, details and colour. All names and numbers are made up. */
export const BUSINESSES: Record<string, (template: string) => DocumentSnapshot> = {
  sticker: (t) =>
    make(t, {
      number: 'CK-0112',
      lineStyle: 'quantity',
      seller: {
        name: 'Crumb & Kettle',
        email: 'hello@crumbandkettle.example',
        phone: '0113 000 0000',
        address: addr('4 Tanner Row', 'Leeds', 'LS1 0AA'),
        brandColour: '#E8436F',
      },
      buyer: { name: 'Harbour Street Studios', contactName: 'Priya, office manager', address: ['21 Harbour Street', null, 'Leeds', 'LS2 0BB'] },
      title: 'Office breakfast, Friday 16 October',
      summary: 'Breakfast for the studio’s all-hands, delivered and set up by 8.30.',
      lines: [
        { title: 'Brunch platters', description: 'Seasonal fruit, granola pots, mini frittatas', quantity: 2000, unitPrice: 8_600 },
        { title: 'Cinnamon knots', description: 'By the dozen', quantity: 6000, unitPrice: 1_800 },
        { title: 'Oat flat white flasks', description: 'Each serves ten', quantity: 3000, unitPrice: 2_200 },
        { title: 'Delivery and set-up', quantity: 1000, unitPrice: 1_500 },
      ],
      notes: 'Thanks a bunch! Plates and flasks back whenever suits.',
      link: 'pay.example/crumbandkettle/CK-0112',
    }),
  riso: (t) =>
    make(t, {
      number: 'OHP-031',
      lineStyle: 'quantity',
      seller: {
        name: 'Odd Hours Press',
        email: 'print@oddhours.example',
        website: 'oddhours.example',
        address: addr('Unit 3, 88 Tobago Street', 'Glasgow', 'G40 0AA'),
        brandColour: '#FF48B0',
      },
      buyer: { name: 'Small Fry Records', address: ['2/1, 14 Kent Road', null, 'Glasgow', 'G3 0AA'] },
      title: 'Spring tour posters and zine',
      summary: 'Two-colour risograph, fluorescent pink and blue, on 120gsm recycled stock.',
      lines: [
        { title: 'Tour posters, A3', description: 'Two colours, one side', quantity: 150_000, unit: 'prints', unitPrice: 240 },
        { title: 'Tour zine, A5, 24 pages', description: 'Two colours throughout, saddle stitched', quantity: 80_000, unit: 'copies', unitPrice: 310 },
        { title: 'Masters and set-up', quantity: 1000, unitPrice: 3_500 },
      ],
      notes: 'Collected 15 October. Spare posters are in the plan chest if you want them.',
    }),
  marquee: (t) =>
    make(t, {
      number: 'NSS-2611',
      lineStyle: 'quantity',
      vat: true,
      seller: {
        name: 'Night Shift Sound',
        legalName: 'Night Shift Sound Ltd',
        businessType: 'limited_company',
        companyNumber: '00000000',
        email: 'bookings@nightshiftsound.example',
        phone: '0161 000 0000',
        address: addr('Arch 9, Store Street', 'Manchester', 'M1 0AA'),
        brandColour: '#FF4F1F',
      },
      buyer: { name: 'Glasshouse Events Ltd', contactName: 'Accounts', address: ['Floor 2, 50 Swan Street', null, 'Manchester', 'M4 0BB'] },
      title: 'Warehouse launch night',
      summary: 'Saturday 17 October, doors at 8pm, get-out by 3am.',
      reference: 'PO-77812',
      lines: [
        { title: 'Main room sound system', description: 'Line array, subs and monitors, delivered and rigged', quantity: 1000, unitPrice: 95_000 },
        { title: 'Lighting rig', description: 'Moving heads, haze and a desk', quantity: 1000, unitPrice: 64_000 },
        { title: 'Crew', description: 'Two technicians, ten hours each', quantity: 20_000, unit: 'hrs', unitPrice: 3_200 },
        { title: 'Van and fuel', quantity: 1000, unitPrice: 8_500 },
      ],
      notes: 'Thanks for having us. See you at the next one.',
      issue: '2026-10-19',
      due: '2026-11-18',
      supply: '2026-10-17',
    }),
  atelier: (t) =>
    make(t, {
      number: 'WR-0458',
      lineStyle: 'quantity',
      seller: {
        name: 'Wilder & Rose',
        email: 'studio@wilderandrose.example',
        website: 'wilderandrose.example',
        address: addr('The Old Dairy, 6 Walcot Yard', 'Bath', 'BA1 0AA'),
        brandColour: '#2F4A3A',
      },
      buyer: { name: 'Isla Pemberton and Joe Achebe', address: ['17 Lansdown Crescent', null, 'Bath', 'BA1 0BB'] },
      title: 'Wedding flowers, Saturday 12 September',
      summary: 'Garden roses, sweet peas and trailing jasmine, from the ceremony through to dinner.',
      lines: [
        { title: 'Bridal bouquet', description: 'Garden roses, sweet peas, jasmine', quantity: 1000, unitPrice: 18_000 },
        { title: 'Bridesmaids’ posies', quantity: 4000, unitPrice: 5_500 },
        { title: 'Ceremony arch', description: 'Installed on the morning and cleared that night', quantity: 1000, unitPrice: 65_000 },
        { title: 'Table centres', description: 'Low urns, twelve tables', quantity: 12_000, unitPrice: 4_200 },
      ],
      notes: 'It was a joy to make these for you both. Thank you for having us.',
      deposit: { label: 'Deposit paid', amount: 30_000, paidOn: '2026-06-04' },
    }),
  grid: (t) =>
    make(t, {
      number: '2026-047',
      lineStyle: 'amount',
      vat: true,
      seller: {
        name: 'Hollis Lane Architects',
        legalName: 'Hollis Lane Architects Ltd',
        businessType: 'limited_company',
        companyNumber: '00000000',
        email: 'studio@hollislane.example',
        phone: '020 0000 0000',
        address: addr('Studio 4, 12 Cremer Street', 'London', 'E2 0AA'),
        brandColour: '#E2231A',
      },
      buyer: { name: 'Ana and Tom Okafor', address: ['14 Elm Row', null, 'London', 'N16 0BB'] },
      title: 'Rear extension, 14 Elm Row',
      summary: 'Stage two and the planning application.',
      lines: [
        { title: 'Measured survey', description: 'Ground and first floors, rear elevation', quantity: 1000, unitPrice: 95_000 },
        { title: 'Concept design', description: 'Three options, one developed with you', quantity: 1000, unitPrice: 380_000 },
        { title: 'Planning drawings', description: 'Fourteen sheets and the design statement', quantity: 1000, unitPrice: 240_000 },
      ],
      terms: 'Payment within 30 days of the invoice date.',
      issue: '2026-10-19',
      due: '2026-11-18',
    }),
  mark: (t) =>
    make(t, {
      number: 'PX-1043',
      lineStyle: 'hours',
      vat: true,
      seller: {
        name: 'Parallax Labs',
        legalName: 'Parallax Labs Ltd',
        businessType: 'limited_company',
        companyNumber: '00000000',
        email: 'billing@parallaxlabs.example',
        website: 'parallaxlabs.example',
        address: addr('Floor 3, 1 Temple Quay', 'Bristol', 'BS1 0AA'),
        brandColour: '#2E55F5',
      },
      buyer: { name: 'Fernhill Health Ltd', contactName: 'Finance team', address: ['8 Queen Square', null, 'Bristol', 'BS1 0BB'] },
      title: 'Patient app prototype, phase one',
      reference: 'FH-PO-2209',
      lines: [
        { title: 'Design sprint', description: 'Discovery, journeys and the clickable flow', quantity: 32_000, unitPrice: 9_500 },
        { title: 'Prototype build', description: 'React Native, test build on both stores', quantity: 24_000, unitPrice: 9_500 },
        { title: 'Usability sessions', description: 'Six patients, recorded and written up', quantity: 6_000, unitPrice: 12_000 },
      ],
      link: 'pay.example/parallax/PX-1043',
      issue: '2026-10-19',
      due: '2026-11-18',
    }),
  trade: (t) =>
    make(t, {
      number: '2291',
      lineStyle: 'quantity',
      vat: true,
      seller: {
        name: 'Kestrel Roofing',
        email: 'jobs@kestrelroofing.example',
        phone: '07700 900000',
        address: addr('Yard 2, Hall Road', 'Norwich', 'NR4 0AA'),
        brandColour: '#FFC20E',
      },
      buyer: { name: 'Mrs J. Whitlock', address: ['22 Mill Lane', null, 'Norwich', 'NR2 0BB'] },
      title: 'Roof repairs, 22 Mill Lane',
      summary: 'Front and rear slopes, chimney and gutters. Work finished Thursday 15 October.',
      reference: 'Quote Q-1180',
      lines: [
        { title: 'Replace slipped and broken slates', description: 'Reclaimed Welsh slate to match', quantity: 40_000, unit: 'slates', unitPrice: 1_400 },
        { title: 'Scaffold tower hire', quantity: 3_000, unit: 'days', unitPrice: 6_500 },
        { title: 'Re-point chimney stack', quantity: 1000, unitPrice: 42_000 },
        { title: 'Clear and re-seal gutters', quantity: 1000, unitPrice: 9_500 },
      ],
      notes: 'All work guaranteed for ten years. Old slates taken away.',
      issue: '2026-10-16',
      due: '2026-10-30',
      supply: '2026-10-15',
    }),
  practice: (t) =>
    make(t, {
      number: 'AK/26/0318',
      lineStyle: 'amount',
      vat: true,
      seller: {
        name: 'Ashdown Kerr',
        legalName: 'Ashdown Kerr & Co Ltd',
        businessType: 'limited_company',
        companyNumber: 'SC000000',
        email: 'accounts@ashdownkerr.example',
        phone: '0131 000 0000',
        website: 'ashdownkerr.example',
        address: addr('9 Albyn Place', 'Edinburgh', 'EH2 0AA'),
        brandColour: '#1D2B4F',
      },
      buyer: { name: 'Thistlewood Joinery Ltd', contactName: 'Morag Thistlewood, Director', address: ['Unit 7, Bankhead Drive', null, 'Edinburgh', 'EH11 0BB'] },
      title: 'Fees for the quarter to 30 September',
      lines: [
        { title: 'Year-end accounts to 30 June 2026', description: 'Statutory accounts and filing at Companies House', quantity: 1000, unitPrice: 145_000 },
        { title: 'Corporation tax return', quantity: 1000, unitPrice: 38_000 },
        { title: 'Payroll, July to September', description: 'Six employees, monthly runs and filings', quantity: 1000, unitPrice: 22_500 },
        { title: 'Advice on the new van purchase', description: 'Call and written note, 4 September', quantity: 1000, unitPrice: 21_000 },
      ],
      terms: 'Our fees are due within 30 days of the invoice date.',
      issue: '2026-10-01',
      due: '2026-10-31',
      supply: '2026-09-30',
    }),
  heritage: (t) =>
    make(t, {
      number: '0418',
      lineStyle: 'quantity',
      vat: true,
      seller: {
        name: 'Thistle & Oak',
        legalName: 'Thistle & Oak Distillers Ltd',
        businessType: 'limited_company',
        companyNumber: 'SC000000',
        email: 'trade@thistleandoak.example',
        phone: '01350 000000',
        address: addr('The Still House, Tay Road', 'Dunkeld', 'PH8 0AA'),
        brandColour: '#1E4636',
      },
      buyer: { name: 'The Bramble Bar', contactName: 'Calum Reid', address: ['16 Queen Street', null, 'Edinburgh', 'EH2 0BB'] },
      title: 'Trade order for the winter list',
      lines: [
        { title: 'Highland Dry Gin, 70cl', quantity: 24_000, unit: 'bottles', unitPrice: 2_150 },
        { title: 'Smoked Oak Gin, 70cl', quantity: 12_000, unit: 'bottles', unitPrice: 2_400 },
        { title: 'Gift tins', quantity: 12_000, unit: 'tins', unitPrice: 450 },
        { title: 'Delivery by pallet', quantity: 1000, unitPrice: 1_200 },
      ],
      notes: 'With our thanks. Slàinte.',
      issue: '2026-10-19',
      due: '2026-11-18',
    }),
  statement: (t) =>
    make(t, {
      number: 'PB-0092',
      lineStyle: 'quantity',
      seller: {
        name: 'Penrose Bookkeeping',
        email: 'nia@penrosebooks.example',
        phone: '029 0000 0000',
        address: addr('Office 5, 3 Mount Stuart Square', 'Cardiff', 'CF10 0AA'),
        brandColour: '#0E6A73',
      },
      buyer: { name: 'Bryn Coffee Co.', address: ['41 Wellfield Road', null, 'Cardiff', 'CF24 0BB'] },
      title: 'September services',
      lines: [
        { title: 'Monthly bookkeeping, September', description: 'Bank feeds, receipts and reconciliation', quantity: 1000, unitPrice: 24_000 },
        { title: 'VAT return, quarter to 30 September', quantity: 1000, unitPrice: 12_000 },
        { title: 'Payroll', quantity: 4_000, unit: 'staff', unitPrice: 1_200 },
        { title: 'Management accounts pack', description: 'Profit and loss, cash flow and a short note', quantity: 1000, unitPrice: 9_000 },
      ],
      terms: 'Payment within 14 days, please.',
      issue: '2026-10-05',
      due: '2026-10-19',
      supply: '2026-09-30',
    }),
};
