import {
  assembleSnapshot,
  computeDocument,
  type DocumentSnapshot,
  type LineStyle,
  type LogoGround,
  type TaxCode,
} from '@invoica/core';
import type { TemplateId } from './render';

/**
 * Six templates as they were designed, each made out by its own invented business, for the website's shelf. Every
 * detail looks real and belongs to no one: the VAT numbers fail HMRC's check digits, the account numbers fail the
 * Vocalink modulus check for their sort codes (tables of 17 October 2026), the company numbers are far above any
 * Companies House has issued, and the telephone numbers come from the ranges Ofcom keeps for drama. They carry no
 * email or web address: any real-looking one belongs to somebody.
 */

const VAT20: TaxCode = {
  label: 'Standard rate',
  treatment: 'standard',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};

type Line = { title: string; description?: string; quantity: number; unitPrice: number; unit?: string };

interface Business {
  template: TemplateId;
  forWhom: string;
  logo: string;
  logoGround?: LogoGround;
  number: string;
  lineStyle: LineStyle;
  seller: Partial<DocumentSnapshot['seller']> & {
    name: string;
    brandColour: string;
    address: DocumentSnapshot['seller']['address'];
  };
  bank: { name: string; sortCode: string; accountNumber: string };
  buyer: { name: string; contact?: string; line1: string; city: string; postcode: string };
  title: string;
  summary?: string;
  reference?: string;
  lines: Line[];
  notes?: string;
  terms?: string;
  deposit?: { label: string; amount: number; paidOn: string };
  issue: string;
  due: string;
  supply?: string;
}

const address = (line1: string, city: string, postcode: string) => ({
  line1,
  line2: null,
  city,
  region: null,
  postcode,
  countryCode: 'GB',
});

const svg = (markup: string) => `data:image/svg+xml,${encodeURIComponent(markup)}`;

const BUSINESSES: Business[] = [
  {
    template: 'riso',
    forWhom: 'Illustrators, printers, zines and labels',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><mask id="m"><rect width="200" height="200" fill="#fff"/><circle cx="152" cy="66" r="50" fill="#000"/></mask></defs><circle cx="80" cy="112" r="62" fill="#FF48B0"/><circle cx="124" cy="92" r="62" fill="#0078BF" mask="url(#m)" style="mix-blend-mode:multiply"/><path d="M176 150 l4.5 11.5 l11.5 4.5 l-11.5 4.5 l-4.5 11.5 l-4.5 -11.5 l-11.5 -4.5 l11.5 -4.5 z" fill="#0078BF" style="mix-blend-mode:multiply"/><path d="M36 30 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#FF48B0"/></svg>',
    ),
    number: 'OHP-031',
    lineStyle: 'quantity',
    seller: {
      name: 'Odd Hours Press',
      phone: '0141 496 0217',
      address: address('Unit 3, 88 Tobago Street', 'Glasgow', 'G40 2RH'),
      brandColour: '#FF48B0',
    },
    bank: { name: 'Monzo Business', sortCode: '04-00-75', accountNumber: '26813950' },
    buyer: { name: 'Small Fry Records', line1: '2/1, 14 Kent Road', city: 'Glasgow', postcode: 'G3 7EH' },
    title: 'Spring tour posters and zine',
    summary: 'Two-colour risograph, fluorescent pink and blue, on 120gsm recycled stock.',
    lines: [
      {
        title: 'Tour posters, A3',
        description: 'Two colours, one side',
        quantity: 150_000,
        unit: 'prints',
        unitPrice: 240,
      },
      {
        title: 'Tour zine, A5, 24 pages',
        description: 'Two colours throughout, saddle stitched',
        quantity: 80_000,
        unit: 'copies',
        unitPrice: 310,
      },
      { title: 'Masters and set-up', quantity: 1_000, unitPrice: 3_500 },
    ],
    notes: 'Collected 15 October. Spare posters are in the plan chest if you want them.',
    issue: '2026-10-19',
    due: '2026-11-02',
  },
  {
    template: 'marquee',
    forWhom: 'Events, DJs, venues and photographers',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="34" fill="#141414"/><g fill="#F4F1EC"><rect x="34" y="104" width="18" height="62" rx="9"/><rect x="62" y="72" width="18" height="94" rx="9"/><rect x="90" y="40" width="18" height="126" rx="9"/><rect x="118" y="84" width="18" height="82" rx="9"/></g><rect x="146" y="58" width="18" height="108" rx="9" fill="#C5F03C"/></svg>',
    ),
    number: 'NSS-2611',
    lineStyle: 'quantity',
    seller: {
      name: 'Night Shift Sound',
      legalName: 'Night Shift Sound Ltd',
      businessType: 'limited_company',
      companyNumber: '29736158',
      taxRegistered: true,
      taxNumber: 'GB 318 4762 05',
      phone: '0161 496 0745',
      address: address('Arch 9, Store Street', 'Manchester', 'M1 2WD'),
      brandColour: '#C5F03C',
      accentColour: '#1B2559',
    },
    bank: { name: 'Barclays', sortCode: '20-32-06', accountNumber: '31749265' },
    buyer: {
      name: 'Glasshouse Events Ltd',
      contact: 'Accounts',
      line1: 'Floor 2, 50 Swan Street',
      city: 'Manchester',
      postcode: 'M4 5JU',
    },
    title: 'Warehouse launch night',
    summary: 'Saturday 17 October, doors at 8pm, get-out by 3am.',
    reference: 'PO-77812',
    lines: [
      {
        title: 'Main room sound system',
        description: 'Line array, subs and monitors, delivered and rigged',
        quantity: 1_000,
        unitPrice: 95_000,
      },
      {
        title: 'Lighting rig',
        description: 'Moving heads, haze and a desk',
        quantity: 1_000,
        unitPrice: 64_000,
      },
      {
        title: 'Crew',
        description: 'Two technicians, ten hours each',
        quantity: 20_000,
        unit: 'hrs',
        unitPrice: 3_200,
      },
      { title: 'Van and fuel', quantity: 1_000, unitPrice: 8_500 },
    ],
    notes: 'Thanks for having us. See you at the next one.',
    issue: '2026-10-19',
    due: '2026-11-18',
    supply: '2026-10-17',
  },
  {
    template: 'billboard',
    forWhom: 'Studios and agencies who want to be loud',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="128" cy="78" r="52" fill="#FF5A1F"/><path d="M30 150 C 14 150, 10 126, 28 118 C 26 92, 56 80, 74 96 C 82 70, 122 66, 132 96 C 156 90, 172 110, 162 128 C 182 130, 184 150, 166 150 Z" fill="#111111"/></svg>',
    ),
    logoGround: 'cream',
    number: 'OC-0217',
    lineStyle: 'amount',
    seller: {
      name: 'Overcast',
      legalName: 'Overcast Studio Ltd',
      businessType: 'limited_company',
      companyNumber: '29150847',
      taxRegistered: true,
      taxNumber: 'GB 352 0817 46',
      phone: '0161 496 0388',
      address: address('Unit 5, Hope Mill, 113 Pollard Street', 'Manchester', 'M4 7JA'),
      brandColour: '#FF5A1F',
    },
    bank: { name: 'Tide', sortCode: '04-06-05', accountNumber: '38162907' },
    buyer: {
      name: 'Greenhalgh & Daughters Bakery',
      contact: 'Ruth Greenhalgh',
      line1: '24 Market Street',
      city: 'Bury',
      postcode: 'BL9 0BW',
    },
    title: 'Rebrand and website',
    summary: 'Identity, packaging system and a new shop site, launched 12 October.',
    lines: [
      {
        title: 'Brand identity',
        description: 'Strategy, logo, type, colour and guidelines',
        quantity: 1_000,
        unitPrice: 680_000,
      },
      {
        title: 'Packaging system',
        description: 'Bags, boxes and labels for twelve products',
        quantity: 1_000,
        unitPrice: 340_000,
      },
      {
        title: 'Website design and build',
        description: 'Shop, wholesale and story pages',
        quantity: 1_000,
        unitPrice: 520_000,
      },
    ],
    terms: 'Payment within 30 days, please.',
    issue: '2026-10-19',
    due: '2026-11-18',
  },
  {
    template: 'signature',
    forWhom: 'Any business. Invoica’s own.',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="44" fill="#17795a"/><g fill="#F2F7F4"><circle cx="58" cy="146" r="17"/><circle cx="88" cy="118" r="15"/><circle cx="114" cy="92" r="13"/><circle cx="136" cy="68" r="11"/><circle cx="153" cy="47" r="9"/></g></svg>',
    ),
    number: 'LA-0214',
    lineStyle: 'quantity',
    seller: {
      name: 'Larkspur Analytics',
      legalName: 'Larkspur Analytics Ltd',
      businessType: 'limited_company',
      companyNumber: '29481736',
      taxRegistered: true,
      taxNumber: 'GB 318 4472 06',
      phone: '0161 496 0283',
      address: address('Unit 4, 22 Brunswick Street', 'Manchester', 'M1 3EH'),
      brandColour: '#17795a',
    },
    bank: { name: 'The Co-operative Bank', sortCode: '08-93-00', accountNumber: '27461586' },
    buyer: {
      name: 'Ferrow Housing Association',
      contact: 'Priya Nair, Head of Assets',
      line1: '3 Station Approach',
      city: 'Stockport',
      postcode: 'SK1 1YN',
    },
    title: 'Stock condition data, phase two',
    summary:
      'Survey data from 1,240 homes cleaned, joined to repairs history and built into the asset dashboard.',
    reference: 'PO 88173',
    lines: [
      {
        title: 'Data cleaning and matching',
        description: 'Survey returns joined to the repairs log by property',
        quantity: 4_000,
        unit: 'days',
        unitPrice: 62_000,
      },
      {
        title: 'Asset dashboard build',
        description: 'Condition, cost to fix and priority by estate',
        quantity: 3_000,
        unit: 'days',
        unitPrice: 62_000,
      },
      { title: 'Training for the asset team', quantity: 2_000, unit: 'sessions', unitPrice: 45_000 },
      { title: 'Hosting, October to December', quantity: 1_000, unitPrice: 36_000 },
    ],
    terms: 'Payment within 30 days of the invoice date, please.',
    issue: '2026-10-19',
    due: '2026-11-18',
  },
  {
    template: 'atelier',
    forWhom: 'Florists, stylists, interiors and weddings',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#C52A55" stroke-width="4.5" stroke-linecap="round"><path d="M100 186 C 100 140, 96 100, 104 22"/></g><g fill="#C52A55"><path d="M101 150 C 76 150, 58 136, 52 118 C 76 116, 94 128, 101 150 Z"/><path d="M100 120 C 124 120, 142 106, 148 88 C 124 86, 106 98, 100 120 Z"/><path d="M100 92 C 78 90, 64 74, 62 56 C 84 58, 98 72, 100 92 Z"/><path d="M102 64 C 120 62, 134 48, 136 32 C 118 34, 104 46, 102 64 Z"/><ellipse cx="104" cy="22" rx="7" ry="11"/></g></svg>',
    ),
    number: 'WR-0261',
    lineStyle: 'quantity',
    seller: {
      name: 'Wilder & Rose',
      phone: '07700 900537',
      address: address('The Old Dairy, 6 Walcot Yard', 'Bath', 'BA1 5BG'),
      brandColour: '#C52A55',
    },
    bank: { name: 'Santander', sortCode: '09-01-28', accountNumber: '51370248' },
    buyer: { name: 'Amelia Hartley and Tom Reyes', line1: '4 Sion Hill', city: 'Bath', postcode: 'BA1 2UH' },
    title: 'Wedding styling at Prior Park, Saturday 26 September',
    summary:
      'Flowers, tablescapes and candlelight for ninety guests, set on the morning and cleared that night.',
    lines: [
      {
        title: 'Ceremony flowers',
        description: 'Meadow aisle and two urn arrangements',
        quantity: 1_000,
        unitPrice: 78_000,
      },
      {
        title: 'Tablescapes',
        description: 'Linen, low flowers and place names',
        quantity: 12_000,
        unit: 'tables',
        unitPrice: 6_500,
      },
      { title: 'Candles and glassware hire', quantity: 1_000, unitPrice: 24_000 },
      { title: 'Styling consultations', quantity: 2_000, unit: 'meetings', unitPrice: 6_000 },
    ],
    notes: 'Thank you for having us. It was a beautiful day.',
    deposit: { label: 'Deposit paid', amount: 40_000, paidOn: '2026-03-12' },
    issue: '2026-10-19',
    due: '2026-11-02',
  },
  {
    template: 'trade',
    forWhom: 'Builders, roofers, electricians and cleaners',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 6 L194 74 V196 H6 V74 Z" fill="#FFC20E"/><path d="M38 112 L100 66 L162 112" fill="none" stroke="#161616" stroke-width="17"/><path d="M38 152 L100 106 L162 152" fill="none" stroke="#161616" stroke-width="17"/></svg>',
    ),
    number: '2291',
    lineStyle: 'quantity',
    seller: {
      name: 'Kestrel Roofing',
      taxRegistered: true,
      taxNumber: 'GB 402 6619 57',
      phone: '07700 900263',
      address: address('Yard 2, Hall Road', 'Norwich', 'NR4 6DH'),
      brandColour: '#FFC20E',
    },
    bank: { name: 'Nationwide', sortCode: '07-04-36', accountNumber: '19584327' },
    buyer: { name: 'Mrs J. Whitlock', line1: '22 Mill Lane', city: 'Norwich', postcode: 'NR2 4JD' },
    title: 'Roof repairs, 22 Mill Lane',
    summary: 'Front and rear slopes, chimney and gutters. Work finished Thursday 15 October.',
    reference: 'Quote Q-1180',
    lines: [
      {
        title: 'Replace slipped and broken slates',
        description: 'Reclaimed Welsh slate to match',
        quantity: 40_000,
        unit: 'slates',
        unitPrice: 1_400,
      },
      { title: 'Scaffold tower hire', quantity: 3_000, unit: 'days', unitPrice: 6_500 },
      { title: 'Re-point chimney stack', quantity: 1_000, unitPrice: 42_000 },
      { title: 'Clear and re-seal gutters', quantity: 1_000, unitPrice: 9_500 },
    ],
    notes: 'All work guaranteed for ten years. Old slates taken away.',
    issue: '2026-10-16',
    due: '2026-10-30',
    supply: '2026-10-15',
  },
];

/** The six on the website's shelf, in order: the template, the business it is made out by, and who it is for. */
export const SHOWCASE: readonly { template: TemplateId; business: string; forWhom: string; logo: string }[] =
  BUSINESSES.map((b) => ({
    template: b.template,
    business: b.seller.name,
    forWhom: b.forWhom,
    logo: b.logo,
  }));

/**
 * One of the six as an invoice: as designed, or made out by the visitor. A visitor's name replaces the business, its
 * legal details and its VAT (an invoice in someone else's name cannot carry another business's numbers); a visitor's
 * colour replaces the brand colour.
 */
export function showcaseSnapshot(
  template: TemplateId,
  visitor: { name?: string; colour?: string } = {},
): DocumentSnapshot {
  const b = BUSINESSES.find((x) => x.template === template);
  if (!b) throw new Error(`No showcase business for ${template}`);
  return build(b, visitor);
}

/**
 * The invoice the website's story follows: Linden & Rowe Studio's INV-0044 to Meridian Architects LLP, written in
 * How it works' first step, issued in the second and paid in the fifth, in Invoica's own template.
 */
const STORY: Business = {
  template: 'signature',
  forWhom: 'The website’s example studio',
  logo: '',
  number: 'INV-0044',
  lineStyle: 'quantity',
  seller: {
    name: 'Linden & Rowe Studio',
    legalName: 'Linden & Rowe Studio Ltd',
    businessType: 'limited_company',
    companyNumber: '29604417',
    taxRegistered: true,
    taxNumber: 'GB 274 9105 38',
    phone: '0113 496 0571',
    address: address('Studio 5, 40 Water Lane', 'Leeds', 'LS11 5QN'),
    brandColour: '#1D3C5A',
  },
  bank: { name: 'Barclays', sortCode: '20-32-06', accountNumber: '50318274' },
  buyer: {
    name: 'Meridian Architects LLP',
    contact: 'Accounts',
    line1: '14 Canal Wharf',
    city: 'Leeds',
    postcode: 'LS11 5PS',
  },
  title: 'Brand and wayfinding, phase one',
  reference: 'PO-2211',
  lines: [
    {
      title: 'Brand workshop',
      description: 'One day, on site, with the partners',
      quantity: 1_000,
      unitPrice: 95_000,
    },
    {
      title: 'Wayfinding concepts',
      description: 'Three routes for the new office',
      quantity: 1_000,
      unitPrice: 95_000,
    },
  ],
  terms: 'Payment within 14 days of the invoice date, please.',
  issue: '2026-10-20',
  due: '2026-11-03',
};

/** The website's story invoice, INV-0044, as Linden & Rowe Studio sends it. */
export function storySnapshot(): DocumentSnapshot {
  return build(STORY);
}

function build(b: Business, visitor: { name?: string; colour?: string } = {}): DocumentSnapshot {
  const template = b.template;
  const name = visitor.name?.trim();
  const own = name
    ? {
        name,
        legalName: null,
        businessType: 'sole_trader' as const,
        companyNumber: null,
        taxRegistered: false,
        taxNumber: null,
        email: null,
        website: null,
      }
    : {};
  const seller: DocumentSnapshot['seller'] = {
    legalName: null,
    businessType: 'sole_trader',
    companyNumber: null,
    email: null,
    phone: null,
    website: null,
    taxRegistered: false,
    taxNumber: null,
    logoFileId: null,
    logoGround: b.logoGround ?? 'white',
    ...b.seller,
    ...own,
    brandColour: visitor.colour ?? b.seller.brandColour,
    // a visitor's colour makes its own second colour
    ...(visitor.colour ? { accentColour: undefined } : {}),
  };
  const tax = seller.taxRegistered ? VAT20 : null;
  const lines = b.lines.map((l) => ({
    title: l.title,
    description: l.description ?? null,
    quantity: l.quantity,
    unit: l.unit ?? null,
    unitPrice: l.unitPrice,
    serviceDate: null,
    tax,
  }));
  const totals = computeDocument({
    currency: 'GBP',
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    lines,
    paid: b.deposit?.amount ?? 0,
  });
  return assembleSnapshot({
    kind: 'invoice',
    number: b.number,
    issueDate: b.issue,
    dueDate: b.due,
    supplyDate: b.supply ?? b.issue,
    servicePeriodStart: null,
    servicePeriodEnd: null,
    reference: b.reference ?? null,
    title: b.title,
    summary: b.summary ?? null,
    currency: 'GBP',
    locale: 'en-GB',
    lineStyle: b.lineStyle,
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    seller,
    buyer: {
      name: b.buyer.name,
      contactName: b.buyer.contact ?? null,
      email: null,
      address: address(b.buyer.line1, b.buyer.city, b.buyer.postcode),
      taxNumber: null,
      fields: [],
    },
    lines,
    totals,
    prepayments: b.deposit ? [b.deposit] : [],
    notes: b.notes ?? null,
    terms: b.terms ?? null,
    template,
    options: {},
    paymentDetails: {
      bank: {
        accountName: seller.legalName ?? seller.name,
        bankName: b.bank.name,
        sortCode: b.bank.sortCode,
        accountNumber: b.bank.accountNumber,
      },
    },
    credits: null,
  });
}
