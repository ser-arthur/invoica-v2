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
  bank: { name: string; sort: string; account: string; accountName?: string };
  buyer: { name: string; contactName?: string; address: [string, string | null, string, string] };
  lines: Line[];
  title: string;
  summary?: string;
  notes?: string;
  terms?: string;
  reference?: string;
  vat?: string;
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
    address: { line1: '', line2: null, city: '', region: null, postcode: '', countryCode: 'GB' },
    taxRegistered: vat,
    taxNumber: s.vat ?? null,
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
      bank: {
        accountName: s.bank.accountName ?? seller.legalName ?? seller.name,
        bankName: s.bank.name,
        sortCode: s.bank.sort,
        accountNumber: s.bank.account,
      },
      paymentLink: s.link ?? null,
    },
    credits: null,
  });
}

const addr = (line1: string, city: string, postcode: string, line2: string | null = null) => ({
  line1,
  line2,
  city,
  region: null,
  postcode,
  countryCode: 'GB',
});

/**
 * One invented business per template. The details look real, but every business, person, number and address is
 * made up; the telephone numbers come from the ranges Ofcom keeps for drama, which are never given to anyone.
 */
const B: Record<string, (template: string) => DocumentSnapshot> = {
  sticker: (t) =>
    make(t, {
      number: 'CK-0112',
      lineStyle: 'quantity',
      seller: {
        name: 'Crumb & Kettle',
        email: 'hello@crumbandkettle.co.uk',
        phone: '0113 496 0382',
        website: 'crumbandkettle.co.uk',
        address: addr('4 Tanner Row', 'Leeds', 'LS1 6HY'),
        brandColour: '#E8436F',
      },
      bank: { name: 'Starling Bank', sort: '60-83-71', account: '24816357' },
      buyer: { name: 'Harbour Street Studios', contactName: 'Priya Shah, office manager', address: ['21 Harbour Street', null, 'Leeds', 'LS2 7AW'] },
      title: 'Office breakfast, Friday 16 October',
      summary: 'Breakfast for the studio’s all-hands, delivered and set up by 8.30.',
      lines: [
        { title: 'Brunch platters', description: 'Seasonal fruit, granola pots, mini frittatas', quantity: 2000, unitPrice: 8_600 },
        { title: 'Cinnamon knots', description: 'By the dozen', quantity: 6000, unitPrice: 1_800 },
        { title: 'Oat flat white flasks', description: 'Each serves ten', quantity: 3000, unitPrice: 2_200 },
        { title: 'Delivery and set-up', quantity: 1000, unitPrice: 1_500 },
      ],
      notes: 'Thanks a bunch! Plates and flasks back whenever suits.',
      link: 'paypal.me/crumbandkettle',
    }),
  riso: (t) =>
    make(t, {
      number: 'OHP-031',
      lineStyle: 'quantity',
      seller: {
        name: 'Odd Hours Press',
        email: 'print@oddhourspress.co.uk',
        phone: '0141 496 0217',
        website: 'oddhourspress.co.uk',
        address: addr('Unit 3, 88 Tobago Street', 'Glasgow', 'G40 2RH'),
        brandColour: '#FF48B0',
      },
      bank: { name: 'Monzo Business', sort: '04-00-75', account: '31907264' },
      buyer: { name: 'Small Fry Records', address: ['2/1, 14 Kent Road', null, 'Glasgow', 'G3 7EH'] },
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
      vat: 'GB 318 4762 05',
      seller: {
        name: 'Night Shift Sound',
        legalName: 'Night Shift Sound Ltd',
        businessType: 'limited_company',
        companyNumber: '12873405',
        email: 'bookings@nightshiftsound.com',
        phone: '0161 496 0745',
        website: 'nightshiftsound.com',
        address: addr('Arch 9, Store Street', 'Manchester', 'M1 2WD'),
        brandColour: '#FF4F1F',
      },
      bank: { name: 'Barclays', sort: '20-32-06', account: '53880491' },
      buyer: { name: 'Glasshouse Events Ltd', contactName: 'Accounts', address: ['Floor 2, 50 Swan Street', null, 'Manchester', 'M4 5JU'] },
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
      number: 'WR-0261',
      lineStyle: 'quantity',
      seller: {
        name: 'Wilder & Rose',
        email: 'hello@wilderandrose.co.uk',
        phone: '07700 900537',
        website: 'wilderandrose.co.uk',
        address: addr('The Old Dairy, 6 Walcot Yard', 'Bath', 'BA1 5BG'),
        brandColour: '#C52A55',
      },
      bank: { name: 'Metro Bank', sort: '23-05-80', account: '41827369' },
      buyer: { name: 'Amelia Hartley and Tom Reyes', address: ['4 Sion Hill', null, 'Bath', 'BA1 2UH'] },
      title: 'Wedding styling at Prior Park, Saturday 26 September',
      summary: 'Flowers, tablescapes and candlelight for ninety guests, set on the morning and cleared that night.',
      lines: [
        { title: 'Ceremony flowers', description: 'Meadow aisle and two urn arrangements', quantity: 1000, unitPrice: 78_000 },
        { title: 'Tablescapes', description: 'Linen, low flowers and place names', quantity: 12_000, unit: 'tables', unitPrice: 6_500 },
        { title: 'Candles and glassware hire', quantity: 1000, unitPrice: 24_000 },
        { title: 'Styling consultations', quantity: 2000, unit: 'meetings', unitPrice: 6_000 },
      ],
      notes: 'Thank you for having us. It was a beautiful day.',
      deposit: { label: 'Deposit paid', amount: 40_000, paidOn: '2026-03-12' },
    }),
  bloom: (t) =>
    make(t, {
      number: 'ML-0458',
      lineStyle: 'quantity',
      seller: {
        name: 'Marigold Lane',
        email: 'hello@marigoldlaneflowers.co.uk',
        phone: '07700 900418',
        website: 'marigoldlaneflowers.co.uk',
        address: addr('3 Montpellier Mews', 'Harrogate', 'HG1 2TQ'),
        brandColour: '#A4485E',
      },
      bank: { name: 'Lloyds Bank', sort: '30-94-57', account: '17254630' },
      buyer: { name: 'Isla Pemberton and Joe Achebe', address: ['17 Valley Drive', null, 'Harrogate', 'HG2 0JS'] },
      title: 'Wedding flowers, Saturday 12 September',
      summary: 'Garden roses, sweet peas and trailing jasmine, from the ceremony through to dinner.',
      lines: [
        { title: 'Bridal bouquet', description: 'Garden roses, sweet peas, jasmine', quantity: 1000, unitPrice: 18_000 },
        { title: 'Bridesmaids’ posies', quantity: 4000, unitPrice: 5_500 },
        { title: 'Ceremony arch', description: 'Installed on the morning and cleared that night', quantity: 1000, unitPrice: 65_000 },
        { title: 'Table centres', description: 'Low urns, twelve tables', quantity: 12_000, unitPrice: 4_200 },
      ],
      notes: 'It was a joy to make these for you both.',
      deposit: { label: 'Deposit paid', amount: 30_000, paidOn: '2026-06-04' },
    }),
  olive: (t) =>
    make(t, {
      number: 'FF-2026-17',
      lineStyle: 'quantity',
      seller: {
        name: 'Fern & Fable',
        email: 'studio@fernandfable.co.uk',
        phone: '07700 900216',
        website: 'fernandfable.co.uk',
        address: addr('The Coach House, 9 Lansdown Road', 'Cheltenham', 'GL50 2JA'),
        brandColour: '#56603A',
      },
      bank: { name: 'NatWest', sort: '60-12-44', account: '70318822' },
      buyer: { name: 'Amara Okoye and Sam Whitfield', address: ['42 Cavendish Avenue', null, 'Cheltenham', 'GL52 6LU'] },
      title: 'Your wedding at Hollow Lane Barn',
      summary: 'Styling and coordination for Saturday 3 October, ninety guests.',
      lines: [
        { title: 'Wedding day coordination', description: 'From set-up at 8am to the last song', quantity: 1000, unitPrice: 95_000 },
        { title: 'Ceremony styling', description: 'Aisle, arch and seating, with hire', quantity: 1000, unitPrice: 62_000 },
        { title: 'Tablescapes for ninety', description: 'Linen, candles, glassware and place names', quantity: 1000, unitPrice: 84_000 },
        { title: 'Planning meetings', quantity: 4000, unit: 'meetings', unitPrice: 7_500 },
      ],
      notes: 'Thank you for trusting us with your day. It was beautiful.',
      deposit: { label: 'Booking fee paid', amount: 50_000, paidOn: '2026-02-14' },
    }),
  editorial: (t) =>
    make(t, {
      number: 'MI-0093',
      lineStyle: 'amount',
      vat: 'GB 471 2286 19',
      seller: {
        name: 'Maison Ivy',
        legalName: 'Maison Ivy Interiors Ltd',
        businessType: 'limited_company',
        companyNumber: '14096318',
        email: 'studio@maisonivy.co.uk',
        phone: '020 7946 0571',
        website: 'maisonivy.co.uk',
        address: addr('Studio 2, 18 Portobello Mews', 'London', 'W11 2QB'),
        brandColour: '#3E4A3D',
      },
      bank: { name: 'HSBC UK', sort: '40-11-62', account: '61043287' },
      buyer: { name: 'Clara and Theo Lindqvist', address: ['7 Elgin Crescent', null, 'London', 'W11 2JA'] },
      title: 'Drawing room and library',
      summary: 'Concept, sourcing and installation, completed 9 October.',
      lines: [
        { title: 'Design concept', description: 'Two rooms, moodboards, plans and a lighting scheme', quantity: 1000, unitPrice: 280_000 },
        { title: 'Sourcing and procurement', description: 'Furniture, lighting, textiles and art', quantity: 1000, unitPrice: 165_000 },
        { title: 'Installation and styling', description: 'Two days on site', quantity: 1000, unitPrice: 90_000 },
      ],
      terms: 'Payment within 14 days of the invoice date.',
      due: '2026-11-02',
    }),
  mark: (t) =>
    make(t, {
      number: 'PX-1043',
      lineStyle: 'hours',
      vat: 'GB 287 9104 33',
      seller: {
        name: 'Parallax Labs',
        legalName: 'Parallax Labs Ltd',
        businessType: 'limited_company',
        companyNumber: '13958207',
        email: 'billing@parallaxlabs.io',
        phone: '0117 496 0629',
        website: 'parallaxlabs.io',
        address: addr('Floor 3, 1 Temple Quay', 'Bristol', 'BS1 6DZ'),
        brandColour: '#2E55F5',
      },
      bank: { name: 'Tide', sort: '04-06-05', account: '21573984' },
      buyer: { name: 'Fernhill Health Ltd', contactName: 'Finance team', address: ['8 Queen Square', null, 'Bristol', 'BS1 4NT'] },
      title: 'Patient app prototype, phase one',
      reference: 'FH-PO-2209',
      lines: [
        { title: 'Design sprint', description: 'Discovery, journeys and the clickable flow', quantity: 32_000, unitPrice: 9_500 },
        { title: 'Prototype build', description: 'React Native, test build on both stores', quantity: 24_000, unitPrice: 9_500 },
        { title: 'Usability sessions', description: 'Six patients, recorded and written up', quantity: 6_000, unitPrice: 12_000 },
      ],
      link: 'buy.stripe.com/7sI5kq3Hx0gP',
      issue: '2026-10-19',
      due: '2026-11-18',
    }),
  billboard: (t) =>
    make(t, {
      number: 'OC-0217',
      lineStyle: 'amount',
      vat: 'GB 352 0817 46',
      seller: {
        name: 'Overcast',
        legalName: 'Overcast Studio Ltd',
        businessType: 'limited_company',
        companyNumber: '11604952',
        email: 'accounts@overcast.studio',
        phone: '0161 496 0388',
        website: 'overcast.studio',
        address: addr('Unit 5, Hope Mill, 113 Pollard Street', 'Manchester', 'M4 7JA'),
        brandColour: '#FF5A1F',
      },
      bank: { name: 'Starling Bank', sort: '60-83-71', account: '40928113' },
      buyer: { name: 'Greenhalgh & Daughters Bakery', contactName: 'Ruth Greenhalgh', address: ['24 Market Street', null, 'Bury', 'BL9 0BW'] },
      title: 'Rebrand and website',
      summary: 'Identity, packaging system and a new shop site, launched 12 October.',
      lines: [
        { title: 'Brand identity', description: 'Strategy, logo, type, colour and guidelines', quantity: 1000, unitPrice: 680_000 },
        { title: 'Packaging system', description: 'Bags, boxes and labels for twelve products', quantity: 1000, unitPrice: 340_000 },
        { title: 'Website design and build', description: 'Shop, wholesale and story pages', quantity: 1000, unitPrice: 520_000 },
      ],
      terms: 'Payment within 30 days, please.',
      issue: '2026-10-19',
      due: '2026-11-18',
    }),
  grid: (t) =>
    make(t, {
      number: '2026-047',
      lineStyle: 'amount',
      vat: 'GB 196 3350 82',
      seller: {
        name: 'Hollis Lane Architects',
        legalName: 'Hollis Lane Architects Ltd',
        businessType: 'limited_company',
        companyNumber: '10482271',
        email: 'studio@hollislane.co.uk',
        phone: '020 7946 0815',
        website: 'hollislane.co.uk',
        address: addr('Studio 4, 12 Cremer Street', 'London', 'E2 8HD'),
        brandColour: '#951D30',
      },
      bank: { name: 'HSBC UK', sort: '40-02-50', account: '88174206' },
      buyer: { name: 'Ana and Tom Okafor', address: ['14 Elm Row', null, 'London', 'N16 7QS'] },
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
  trade: (t) =>
    make(t, {
      number: '2291',
      lineStyle: 'quantity',
      vat: 'GB 402 6619 57',
      seller: {
        name: 'Kestrel Roofing',
        email: 'jobs@kestrelroofing.co.uk',
        phone: '07700 900263',
        website: 'kestrelroofing.co.uk',
        address: addr('Yard 2, Hall Road', 'Norwich', 'NR4 6DH'),
        brandColour: '#FFC20E',
      },
      bank: { name: 'NatWest', sort: '60-04-29', account: '48319205' },
      buyer: { name: 'Mrs J. Whitlock', address: ['22 Mill Lane', null, 'Norwich', 'NR2 4JD'] },
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
      vat: 'GB 263 5508 71',
      seller: {
        name: 'Ashdown Kerr',
        legalName: 'Ashdown Kerr & Co Ltd',
        businessType: 'limited_company',
        companyNumber: 'SC704318',
        email: 'accounts@ashdownkerr.co.uk',
        phone: '0131 496 0158',
        website: 'ashdownkerr.co.uk',
        address: addr('9 Albyn Place', 'Edinburgh', 'EH2 4NG'),
        brandColour: '#16233F',
      },
      bank: { name: 'Royal Bank of Scotland', sort: '83-91-26', account: '10457738' },
      buyer: { name: 'Thistlewood Joinery Ltd', contactName: 'Morag Thistlewood, Director', address: ['Unit 7, Bankhead Drive', null, 'Edinburgh', 'EH11 4EQ'] },
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
      vat: 'GB 254 9371 08',
      seller: {
        name: 'Thistle & Oak',
        legalName: 'Thistle & Oak Distillers Ltd',
        businessType: 'limited_company',
        companyNumber: 'SC651207',
        email: 'trade@thistleandoak.co.uk',
        phone: '0131 496 0742',
        website: 'thistleandoak.co.uk',
        address: addr('The Still House, Tay Road', 'Dunkeld', 'PH8 0BW'),
        brandColour: '#1E4636',
      },
      bank: { name: 'Bank of Scotland', sort: '80-22-60', account: '06639214' },
      buyer: { name: 'The Bramble Bar', contactName: 'Calum Reid', address: ['16 Queen Street', null, 'Edinburgh', 'EH2 1JE'] },
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
        email: 'nia@penrosebookkeeping.co.uk',
        phone: '029 2018 0346',
        website: 'penrosebookkeeping.co.uk',
        address: addr('Office 5, 3 Mount Stuart Square', 'Cardiff', 'CF10 5EE'),
        brandColour: '#0E6A73',
      },
      bank: { name: 'Santander', sort: '09-01-28', account: '35718066' },
      buyer: { name: 'Bryn Coffee Co.', contactName: 'Rhys Morgan', address: ['41 Wellfield Road', null, 'Cardiff', 'CF24 3PA'] },
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

/** Template id to its business; variants of a template share their business. */
export const BUSINESSES: Record<string, (template: string) => DocumentSnapshot> = new Proxy(B, {
  get: (target, id: string) => target[id] ?? target[id.replace(/-[a-z0-9]+$/, '')],
});
