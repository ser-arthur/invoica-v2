import {
  assembleSnapshot,
  computeDocument,
  type DocumentSnapshot,
  type LineStyle,
  type LogoGround,
  type TaxCode,
} from '@invoica/core';
import { TEMPLATE_LIST, type TemplateId } from './render';

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

type Line = {
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  /** For a dated line: the day of the work. */
  date?: string;
};

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

/**
 * The other ten in the range, each made out by an invented business of its own kind (the owner's notes of 27 October,
 * 13:46: a bakery on Sticker, an architects' practice in maroon and black on Grid, a bike shop in orange on Ticket).
 * The same rules hold: no detail belongs to anyone.
 */
const MORE: Business[] = [
  {
    template: 'sticker',
    forWhom: 'Cafés, bakers, makers and classes',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" fill="#E8436F"/><circle cx="100" cy="100" r="70" fill="#FFF3E6"/><path d="M100.0,100.0 L100.3,100.0 L100.5,100.1 L100.8,100.2 L101.0,100.4 L101.2,100.6 L101.4,100.8 L101.5,101.1 L101.6,101.4 L101.7,101.7 L101.7,102.0 L101.6,102.4 L101.5,102.8 L101.4,103.1 L101.2,103.5 L101.0,103.8 L100.6,104.2 L100.3,104.5 L99.9,104.7 L99.4,105.0 L99.0,105.2 L98.4,105.3 L97.9,105.4 L97.3,105.4 L96.7,105.4 L96.1,105.3 L95.4,105.1 L94.8,104.9 L94.2,104.5 L93.6,104.2 L93.0,103.7 L92.5,103.2 L92.0,102.6 L91.5,101.9 L91.1,101.2 L90.8,100.4 L90.5,99.6 L90.3,98.7 L90.2,97.8 L90.2,96.9 L90.3,95.9 L90.5,94.9 L90.7,94.0 L91.1,93.0 L91.5,92.1 L92.1,91.1 L92.8,90.3 L93.5,89.4 L94.4,88.7 L95.3,88.0 L96.3,87.4 L97.4,86.8 L98.5,86.4 L99.7,86.0 L101.0,85.8 L102.3,85.7 L103.6,85.7 L104.9,85.8 L106.3,86.1 L107.6,86.4 L108.9,86.9 L110.2,87.6 L111.5,88.3 L112.6,89.2 L113.8,90.2 L114.8,91.4 L115.7,92.6 L116.6,93.9 L117.3,95.3 L117.9,96.8 L118.4,98.4 L118.7,100.1 L118.9,101.7 L118.9,103.4 L118.8,105.2 L118.5,106.9 L118.1,108.6 L117.5,110.3 L116.7,112.0 L115.8,113.6 L114.7,115.1 L113.5,116.6 L112.1,117.9 L110.6,119.1 L109.0,120.2 L107.2,121.2 L105.4,122.0 L103.5,122.7 L101.5,123.2 L99.4,123.5 L97.3,123.6 L95.2,123.5 L93.0,123.2 L90.9,122.8 L88.8,122.1 L86.8,121.3 L84.8,120.2 L82.9,119.0 L81.1,117.6 L79.4,116.0 L77.8,114.3 L76.4,112.4 L75.2,110.3 L74.1,108.2 L73.2,105.9 L72.5,103.5 L72.1,101.1 L71.8,98.6 L71.8,96.1 L72.0,93.6 L72.4,91.0 L73.1,88.5 L74.0,86.1 L75.1,83.7 L76.4,81.4 L78.0,79.2 L79.7,77.1 L81.7,75.2 L83.8,73.5 L86.1,71.9 L88.5,70.5 L91.1,69.4 L93.8,68.4 L96.6,67.8 L99.4,67.3 L102.4,67.1 L105.3,67.2 L108.2,67.5 L111.2,68.2 L114.0,69.0 L116.9,70.2 L119.6,71.5 L122.2,73.2 L124.7,75.1 L127.0,77.2 L129.1,79.5 L131.0,82.0 L132.7,84.7 L134.2,87.6 L135.4,90.6 L136.4,93.7 L137.0,96.9 L137.4,100.2 L137.5,103.5 L137.3,106.9 L136.8,110.2 L136.0,113.6 L134.9,116.8 L133.5,120.0 L131.8,123.0 L129.9,125.9 L127.7,128.6 L125.2,131.2 L122.5,133.5 L119.6,135.6 L116.4,137.4 L113.2,139.0 L109.7,140.2 L106.2,141.2 L102.5,141.8 L98.8,142.2 L95.0,142.2 L91.3,141.8 L87.5,141.1 L83.9,140.1 L80.3,138.8 L76.8,137.1 L73.4,135.1 L70.2,132.8 L67.3,130.2 L64.5,127.4 L62.0,124.3 L59.8,120.9 L57.8,117.4 L56.2,113.7 L54.9,109.8 L54.0,105.8 L53.4,101.7 L53.1,97.6 L53.3,93.4 L53.8,89.3 L54.7,85.1 L55.9,81.1 L57.5,77.1 L59.5,73.3 L61.8,69.7 L64.4,66.2 L67.4,63.0 L70.6,60.1 L74.1,57.4 L77.9,55.0 L81.9,53.0 L86.0,51.4 L90.3,50.0 L94.8,49.1 L99.3,48.6 L103.8,48.5 L108.4,48.8 L113.0,49.4 L117.5,50.5 L121.9,52.0 L126.2,53.9 L130.3,56.2 L134.2,58.9 L137.9,61.9 L141.3,65.2 L144.5,68.8 L147.3,72.8 L149.7,76.9 L151.8,81.3 L153.5,85.9 L154.8,90.7 L155.7,95.5 L156.2,100.5 L156.2,105.5 L155.7,110.5 L154.8,115.4 L153.5,120.3 L151.7,125.1 L149.5,129.7 L146.9,134.1" fill="none" stroke="#3A2320" stroke-width="10" stroke-linecap="round"/></svg>',
    ),
    number: 'CK-0112',
    lineStyle: 'quantity',
    seller: {
      name: 'Crumb & Kettle',
      phone: '0113 496 0382',
      address: address('4 Tanner Row', 'Leeds', 'LS1 6HY'),
      brandColour: '#E8436F',
    },
    bank: { name: 'Monzo Business', sortCode: '04-00-75', accountNumber: '24816357' },
    buyer: {
      name: 'Harbour Street Studios',
      contact: 'Priya Shah, office manager',
      line1: '21 Harbour Street',
      city: 'Leeds',
      postcode: 'LS2 7AW',
    },
    title: 'Office breakfast, Friday 16 October',
    summary: 'Breakfast for the studio’s all-hands, delivered and set up by 8.30.',
    lines: [
      {
        title: 'Brunch platters',
        description: 'Seasonal fruit, granola pots, mini frittatas',
        quantity: 2_000,
        unitPrice: 8_600,
      },
      { title: 'Cinnamon knots', description: 'By the dozen', quantity: 6_000, unitPrice: 1_800 },
      { title: 'Oat flat white flasks', description: 'Each serves ten', quantity: 3_000, unitPrice: 2_200 },
      { title: 'Delivery and set-up', quantity: 1_000, unitPrice: 1_500 },
    ],
    notes: 'Thanks a bunch! Plates and flasks back whenever suits.',
    issue: '2026-10-16',
    due: '2026-10-30',
  },
  {
    template: 'bloom',
    forWhom: 'Florists and cake makers',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 208"><ellipse cx="100" cy="104" rx="70" ry="94" fill="none" stroke="#A4485E" stroke-width="2.4"/><ellipse cx="100" cy="104" rx="63" ry="87" fill="none" stroke="#A4485E" stroke-width="0.9"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(0 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(30 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(60 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(90 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(120 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(150 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(180 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(210 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(240 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(270 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(300 100 61)" fill="#A4485E"/><ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate(330 100 61)" fill="#A4485E"/><circle cx="100" cy="61" r="5" fill="#E9A23B"/><path d="M77.96787109375 136.6 70.88787109375001 91.0H76.64787109375L82.7059375 128.19806640625L103.6266015625 91.0H103.8239453125L78.16521484375001 136.6ZM57.175000000000004 136.0V135.81232421875H66.34720703125001V136.0ZM61.423398437500005 136.0 70.77953125 91.18767578125H66.17500000000001V91.0H71.0407421875L61.614941406250004 136.0ZM89.9407421875 136.0V135.81232421875H104.6407421875V136.0ZM94.1407421875 136.0 103.7407421875 91.0H113.0407421875V91.18767578125H109.2007421875L99.84074218750001 136.0Z M110.005 136.0 120.445 91.0H126.14499999999998L115.70499999999998 136.0ZM104.90499999999999 136.0V135.81232421875H125.30499999999999Q130.015 135.81232421875 132.78033203125 134.073759765625Q135.54566406249998 132.3351953125 137.021962890625 129.32259765625Q138.49826171874997 126.31 139.36826171874998 122.5H139.55787109374998L136.43787109375 136.0ZM115.04499999999999 91.18767578125V91.0H131.545V91.18767578125Z" fill="#A4485E"/><path d="M74 156 C 88 149, 112 149, 126 156" fill="none" stroke="#A4485E" stroke-width="1.4" stroke-linecap="round"/></svg>',
    ),
    number: 'ML-0458',
    lineStyle: 'quantity',
    seller: {
      name: 'Marigold Lane',
      phone: '07700 900652',
      address: address('3 Montpellier Mews', 'Harrogate', 'HG1 2TQ'),
      brandColour: '#A4485E',
    },
    bank: { name: 'Santander', sortCode: '09-01-28', accountNumber: '17254630' },
    buyer: {
      name: 'Isla Pemberton and Joe Achebe',
      line1: '17 Valley Drive',
      city: 'Harrogate',
      postcode: 'HG2 0JS',
    },
    title: 'Wedding flowers, Saturday 12 September',
    summary: 'Garden roses, sweet peas and trailing jasmine, from the ceremony through to dinner.',
    lines: [
      {
        title: 'Bridal bouquet',
        description: 'Garden roses, sweet peas, jasmine',
        quantity: 1_000,
        unitPrice: 18_000,
      },
      { title: 'Bridesmaids’ posies', quantity: 4_000, unitPrice: 5_500 },
      {
        title: 'Ceremony arch',
        description: 'Installed on the morning and cleared that night',
        quantity: 1_000,
        unitPrice: 65_000,
      },
      { title: 'Table centres', description: 'Low urns, twelve tables', quantity: 12_000, unitPrice: 4_200 },
    ],
    notes: 'It was a joy to make these for you both.',
    deposit: { label: 'Deposit paid', amount: 30_000, paidOn: '2026-06-04' },
    issue: '2026-09-14',
    due: '2026-09-28',
  },
  {
    template: 'mark',
    forWhom: 'Studios, agencies and developers',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M58 20 H112 L84 180 H30 Z" fill="#2E55F5"/><path d="M128 20 H182 L154 180 H100 Z" fill="#2E55F5" opacity=".45"/></svg>',
    ),
    number: 'PX-1043',
    lineStyle: 'hours',
    seller: {
      name: 'Parallax Labs',
      legalName: 'Parallax Labs Ltd',
      businessType: 'limited_company',
      companyNumber: '29581207',
      taxRegistered: true,
      taxNumber: 'GB 287 9104 33',
      phone: '0117 496 0629',
      address: address('Floor 3, 1 Temple Quay', 'Bristol', 'BS1 6DZ'),
      brandColour: '#2E55F5',
    },
    bank: { name: 'Tide', sortCode: '04-06-05', accountNumber: '21573984' },
    buyer: {
      name: 'Fernhill Health Ltd',
      contact: 'Finance team',
      line1: '8 Queen Square',
      city: 'Bristol',
      postcode: 'BS1 4NT',
    },
    title: 'Patient app prototype, phase one',
    reference: 'FH-PO-2209',
    lines: [
      {
        title: 'Design sprint',
        description: 'Discovery, journeys and the clickable flow',
        quantity: 32_000,
        unitPrice: 9_500,
      },
      {
        title: 'Prototype build',
        description: 'React Native, test build on both stores',
        quantity: 24_000,
        unitPrice: 9_500,
      },
      {
        title: 'Usability sessions',
        description: 'Six patients, recorded and written up',
        quantity: 6_000,
        unitPrice: 12_000,
      },
    ],
    issue: '2026-10-19',
    due: '2026-11-18',
  },
  {
    template: 'grid',
    forWhom: 'Architects, designers and photographers',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#141414"/><g fill="none" stroke="#FFFFFF" stroke-opacity=".28" stroke-width="3"><path d="M66.7 0 V200 M133.3 0 V200 M0 66.7 H200 M0 133.3 H200"/></g><rect x="68.2" y="68.2" width="63.6" height="63.6" fill="#951D30"/></svg>',
    ),
    number: '2026-047',
    lineStyle: 'amount',
    seller: {
      name: 'Hollis Lane Architects',
      legalName: 'Hollis Lane Architects Ltd',
      businessType: 'limited_company',
      companyNumber: '29610482',
      taxRegistered: true,
      taxNumber: 'GB 196 3350 82',
      phone: '020 7946 0815',
      address: address('Studio 4, 12 Cremer Street', 'London', 'E2 8HD'),
      brandColour: '#951D30',
    },
    bank: { name: 'Barclays', sortCode: '20-32-06', accountNumber: '88174206' },
    buyer: { name: 'Ana and Tom Okafor', line1: '14 Elm Row', city: 'London', postcode: 'N16 7QS' },
    title: 'Rear extension, 14 Elm Row',
    summary: 'Stage two and the planning application.',
    lines: [
      {
        title: 'Measured survey',
        description: 'Ground and first floors, rear elevation',
        quantity: 1_000,
        unitPrice: 95_000,
      },
      {
        title: 'Concept design',
        description: 'Three options, one developed with you',
        quantity: 1_000,
        unitPrice: 380_000,
      },
      {
        title: 'Planning drawings',
        description: 'Fourteen sheets and the design statement',
        quantity: 1_000,
        unitPrice: 240_000,
      },
    ],
    terms: 'Payment within 30 days of the invoice date.',
    issue: '2026-10-19',
    due: '2026-11-18',
  },
  {
    template: 'statement',
    forWhom: 'Bookkeepers, contractors and engineers',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M94 12 A 88 88 0 0 0 94 188 Z" fill="#0E6A73"/><path d="M106 12 A 88 88 0 0 1 106 188 Z" fill="#0E6A73" opacity=".45"/><rect x="20" y="96" width="160" height="8" fill="#FFFFFF"/></svg>',
    ),
    number: 'PB-0092',
    lineStyle: 'quantity',
    seller: {
      name: 'Penrose Bookkeeping',
      phone: '029 2018 0346',
      address: address('Office 5, 3 Mount Stuart Square', 'Cardiff', 'CF10 5EE'),
      brandColour: '#0E6A73',
    },
    bank: { name: 'Santander', sortCode: '09-01-28', accountNumber: '35718066' },
    buyer: {
      name: 'Bryn Coffee Co.',
      contact: 'Rhys Morgan',
      line1: '41 Wellfield Road',
      city: 'Cardiff',
      postcode: 'CF24 3PA',
    },
    title: 'September services',
    lines: [
      {
        title: 'Monthly bookkeeping, September',
        description: 'Bank feeds, receipts and reconciliation',
        quantity: 1_000,
        unitPrice: 24_000,
      },
      { title: 'VAT return, quarter to 30 September', quantity: 1_000, unitPrice: 12_000 },
      { title: 'Payroll', quantity: 4_000, unit: 'staff', unitPrice: 1_200 },
      {
        title: 'Management accounts pack',
        description: 'Profit and loss, cash flow and a short note',
        quantity: 1_000,
        unitPrice: 9_000,
      },
    ],
    terms: 'Payment within 14 days, please.',
    issue: '2026-10-05',
    due: '2026-10-19',
    supply: '2026-09-30',
  },
  {
    template: 'practice',
    forWhom: 'Accountants, solicitors and clinics',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="none" stroke="#16233F" stroke-width="2.2"/><circle cx="100" cy="100" r="87" fill="none" stroke="#16233F" stroke-width=".8"/><path d="M78.51499999999999 127.312V128.0H57.445V127.312L64.497 126.452L56.413 104.436H35.601L28.463 123.44200000000001Q28.119 124.388 28.119 124.99Q28.119 125.936 28.678 126.32300000000001Q29.237000000000002 126.71 30.698999999999998 126.882L35.945 127.312V128.0H17.627000000000002V127.312L22.443 126.882Q24.593 126.71 25.496000000000002 126.02199999999999Q26.399 125.334 27.087 123.44200000000001L48.157 67.284H49.705L71.377 126.452ZM55.897 103.06 46.265 76.83000000000001H45.921L36.117 103.06Z M180.997 127.312V128.0H168.183L144.877 97.212L140.061 102.71600000000001V126.624L147.543 127.312V128.0H126.387V127.312L133.439 126.624V70.036L126.387 69.34800000000001V68.66H147.543V69.34800000000001L140.061 70.036V101.168L163.453 74.164Q164.829 72.53 164.829 71.498Q164.829 70.638 163.496 70.208Q162.163 69.778 158.121 69.34800000000001V68.66H175.665V69.34800000000001Q170.677 70.208 168.914 70.982Q167.151 71.756 165.173 73.992L149.435 92.05199999999999L174.289 124.56Q175.751 126.194 176.998 126.753Q178.245 127.312 180.653 127.312Z" fill="#16233F"/><path d="M119.27499999999999 103.788Q119.27499999999999 100.19200000000001 117.04299999999999 98.177Q114.81099999999999 96.162 111.029 96.162Q109.107 96.162 107.402 96.78200000000001Q105.697 97.402 104.674 98.394Q103.651 99.386 103.651 100.378Q103.651 101.246 104.209 101.618Q104.767 101.99 105.883 102.3Q107.185 102.672 107.836 103.168Q108.487 103.664 108.487 104.842Q108.487 106.02 107.49499999999999 106.702Q106.50299999999999 107.384 105.139 107.384Q103.40299999999999 107.384 101.97699999999999 106.02000000000001Q100.55099999999999 104.656 100.55099999999999 102.3Q100.55099999999999 99.572 101.853 97.867Q103.155 96.162 106.596 94.922Q110.03699999999999 93.682 116.67099999999999 92.566Q121.13499999999999 91.822 123.832 91.047Q126.529 90.27199999999999 128.203 88.62899999999999Q129.877 86.98599999999999 129.877 84.134Q129.877 82.02600000000001 128.792 80.879Q127.707 79.732 126.095 79.732Q125.103 79.732 124.38999999999999 80.166Q123.67699999999999 80.6 122.809 81.406Q121.941 82.212 121.321 82.584Q120.701 82.956 119.833 82.956Q118.71699999999998 82.956 118.06599999999999 82.305Q117.41499999999999 81.654 117.41499999999999 80.53800000000001Q117.41499999999999 78.43 119.523 77.035Q121.631 75.64 124.669 75.64Q128.141 75.64 130.187 77.531Q132.233 79.422 132.233 83.08Q132.233 88.598 128.73000000000002 91.791Q125.227 94.98400000000001 118.407 96.1L118.345 96.348Q120.453 97.21600000000001 121.631 99.44800000000001Q122.809 101.68 122.809 104.718Q122.809 110.174 119.306 114.731Q115.803 119.288 109.88199999999999 121.95400000000001Q103.96099999999998 124.62 97.017 124.62Q91.127 124.62 86.57 122.605Q82.01299999999999 120.59 79.502 116.963Q76.991 113.336 76.991 108.624Q76.991 104.22200000000001 79.037 100.781Q81.083 97.34 84.865 95.232Q84.121 94.178 83.687 92.69Q83.253 91.202 83.253 89.652Q83.253 86.738 84.741 84.16499999999999Q86.229 81.592 88.709 80.07300000000001Q91.189 78.554 94.041 78.554Q96.211 78.554 98.102 79.453Q99.993 80.352 101.078 81.87100000000001Q102.163 83.39 102.163 85.188Q102.163 86.924 101.202 87.97800000000001Q100.24099999999999 89.03200000000001 98.691 89.03200000000001Q96.955 89.03200000000001 96.459 88.102Q95.963 87.172 95.839 85.25Q95.71499999999999 83.26599999999999 95.15699999999998 82.274Q94.59899999999999 81.28200000000001 92.67699999999999 81.28200000000001Q90.87899999999999 81.28200000000001 89.329 82.33600000000001Q87.779 83.39 86.84899999999999 85.15700000000001Q85.919 86.924 85.919 89.03200000000001Q85.919 90.396 86.198 91.667Q86.47699999999999 92.938 87.035 93.806Q88.70899999999999 93.124 90.56899999999999 93.124Q92.30499999999999 93.124 93.38999999999999 93.93Q94.475 94.736 94.475 95.976Q94.475 97.34 93.514 98.208Q92.553 99.076 91.00299999999999 99.076Q89.887 99.076 88.554 98.54899999999999Q87.22099999999999 98.02199999999999 86.167 97.154Q83.93499999999999 98.02199999999999 82.47799999999998 100.40899999999999Q81.02099999999999 102.79599999999999 81.02099999999999 105.77199999999999Q81.02099999999999 109.492 83.34599999999999 112.406Q85.67099999999999 115.32 89.76299999999999 116.93199999999999Q93.85499999999999 118.544 99.06299999999999 118.544Q104.70499999999998 118.544 109.35499999999999 116.59100000000001Q114.005 114.638 116.63999999999999 111.259Q119.27499999999999 107.88 119.27499999999999 103.788Z" fill="#B08D57"/></svg>',
    ),
    number: 'AK/26/0318',
    lineStyle: 'amount',
    seller: {
      name: 'Ashdown Kerr',
      legalName: 'Ashdown Kerr & Co Ltd',
      businessType: 'limited_company',
      companyNumber: 'SC990318',
      taxRegistered: true,
      taxNumber: 'GB 263 5508 71',
      phone: '0131 496 0158',
      address: address('9 Albyn Place', 'Edinburgh', 'EH2 4NG'),
      brandColour: '#16233F',
    },
    bank: { name: 'The Co-operative Bank', sortCode: '08-93-00', accountNumber: '10457738' },
    buyer: {
      name: 'Muirhouse Joinery Ltd',
      contact: 'Morag Muir, Director',
      line1: 'Unit 7, Bankhead Drive',
      city: 'Edinburgh',
      postcode: 'EH11 4EQ',
    },
    title: 'Fees for the quarter to 30 September',
    lines: [
      {
        title: 'Year-end accounts to 30 June 2026',
        description: 'Statutory accounts and filing at Companies House',
        quantity: 1_000,
        unitPrice: 145_000,
      },
      { title: 'Corporation tax return', quantity: 1_000, unitPrice: 38_000 },
      {
        title: 'Payroll, July to September',
        description: 'Six employees, monthly runs and filings',
        quantity: 1_000,
        unitPrice: 22_500,
      },
      {
        title: 'Advice on the new van purchase',
        description: 'Call and written note, 4 September',
        quantity: 1_000,
        unitPrice: 21_000,
      },
    ],
    terms: 'Our fees are due within 30 days of the invoice date.',
    issue: '2026-10-01',
    due: '2026-10-31',
    supply: '2026-09-30',
  },
  {
    template: 'heritage',
    forWhom: 'Distillers, barbers, tailors and wine merchants',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="#1E4636"><path d="M100 196 C 98 160, 98 132, 100 112 L104 112 C 104 132, 104 160, 106 196 Z"/><path d="M100 170 C 76 168, 58 150, 50 128 C 64 132, 70 126, 74 136 C 80 128, 86 136, 88 142 C 94 140, 98 152, 100 170 Z"/><path d="M106 156 C 130 154, 148 136, 156 114 C 142 118, 136 112, 132 122 C 126 114, 120 122, 118 128 C 112 126, 108 138, 106 156 Z"/><path d="M72 92 C 72 74, 86 66, 103 66 C 120 66, 134 74, 134 92 C 134 104, 122 114, 103 114 C 84 114, 72 104, 72 92 Z"/></g><g stroke="#FFFFFF" stroke-width="2.4" opacity=".75"><path d="M80 80 L126 104 M80 104 L126 80 M90 70 L116 110 M116 70 L90 110"/></g><g fill="none" stroke="#1E4636" stroke-width="5" stroke-linecap="round"><path d="M84 68 L72 22 M94 66 L88 14 M103 65 L103 10 M112 66 L118 14 M122 68 L134 22 M77 74 L58 38 M129 74 L148 38"/></g></svg>',
    ),
    number: '0418',
    lineStyle: 'quantity',
    seller: {
      name: 'Thistle & Oak',
      legalName: 'Thistle & Oak Distillers Ltd',
      businessType: 'limited_company',
      companyNumber: 'SC990651',
      taxRegistered: true,
      taxNumber: 'GB 254 9371 08',
      phone: '0131 496 0742',
      address: address('The Still House, Tay Road', 'Dunkeld', 'PH8 0BW'),
      brandColour: '#1E4636',
    },
    bank: { name: 'Barclays', sortCode: '20-32-06', accountNumber: '06639214' },
    buyer: {
      name: 'The Bramble Bar',
      contact: 'Calum Reid',
      line1: '16 Queen Street',
      city: 'Edinburgh',
      postcode: 'EH2 1JE',
    },
    title: 'Trade order for the winter list',
    lines: [
      { title: 'Highland Dry Gin, 70cl', quantity: 24_000, unit: 'bottles', unitPrice: 2_150 },
      { title: 'Smoked Oak Gin, 70cl', quantity: 12_000, unit: 'bottles', unitPrice: 2_400 },
      { title: 'Gift tins', quantity: 12_000, unit: 'tins', unitPrice: 450 },
      { title: 'Delivery by pallet', quantity: 1_000, unitPrice: 1_200 },
    ],
    notes: 'With our thanks. Slàinte.',
    issue: '2026-10-19',
    due: '2026-11-18',
  },
  {
    template: 'letter',
    forWhom: 'Coaches, tutors and therapists',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="#6B2D5C" stroke-width="7"/><path d="M46 142 C 78 142, 70 96, 104 96 C 136 96, 128 58, 152 58" fill="none" stroke="#6B2D5C" stroke-width="9" stroke-linecap="round"/><circle cx="152" cy="58" r="11" fill="#6B2D5C"/></svg>',
    ),
    number: 'JP-026',
    lineStyle: 'dated',
    seller: {
      name: 'Joanna Pryce',
      phone: '07700 900418',
      address: address('Flat 2, 17 Clarendon Road', 'Leeds', 'LS2 9NZ'),
      brandColour: '#6B2D5C',
    },
    bank: { name: 'Monzo Business', sortCode: '04-00-75', accountNumber: '61843270' },
    buyer: {
      name: 'Aire Valley Freight Ltd',
      contact: 'Daniel Okafor',
      line1: '4 Canal Wharf',
      city: 'Leeds',
      postcode: 'LS11 5PS',
    },
    title: 'Coaching in September and October',
    summary:
      'Three sessions on leading the depot teams through the move, and the profile we talked through on 10 October.',
    lines: [
      { title: 'Coaching session, 90 minutes', quantity: 1_000, unitPrice: 28_000, date: '2026-09-12' },
      { title: 'Coaching session, 90 minutes', quantity: 1_000, unitPrice: 28_000, date: '2026-09-26' },
      { title: 'Leadership profile and debrief', quantity: 1_000, unitPrice: 35_000, date: '2026-10-10' },
      { title: 'Coaching session, 90 minutes', quantity: 1_000, unitPrice: 28_000, date: '2026-10-17' },
    ],
    issue: '2026-10-19',
    due: '2026-11-02',
  },
  {
    template: 'ticket',
    forWhom: 'Makers, shops, repairers and events',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="#D9482B"><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(0.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(22.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(45.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(67.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(90.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(112.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(135.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(157.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(180.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(202.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(225.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(247.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(270.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(292.5 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(315.0 100 100)"/><rect x="92" y="6" width="16" height="26" rx="4" transform="rotate(337.5 100 100)"/></g><circle cx="100" cy="100" r="74" fill="#D9482B"/><circle cx="100" cy="100" r="46" fill="#fff"/><circle cx="100" cy="100" r="14" fill="#D9482B"/></svg>',
    ),
    number: 'HCW-2291',
    lineStyle: 'quantity',
    seller: {
      name: 'Hartley Cycle Works',
      taxRegistered: true,
      taxNumber: 'GB 274 6610 39',
      phone: '01632 960482',
      address: address('14 Mill Lane', 'Hebden Bridge', 'HX7 8AB'),
      brandColour: '#D9482B',
    },
    bank: { name: 'Nationwide', sortCode: '07-04-36', accountNumber: '61873302' },
    buyer: { name: 'Mel Townsend', line1: '3 Birchcliffe Road', city: 'Hebden Bridge', postcode: 'HX7 8DB' },
    title: 'Service and parts',
    lines: [
      {
        title: 'Full service',
        description: 'Gravel bike, frame no. GR-4410',
        quantity: 1_000,
        unitPrice: 7_000,
      },
      { title: 'Chain, 11 speed', quantity: 1_000, unitPrice: 2_750 },
      { title: 'Cassette, 11 to 34', quantity: 1_000, unitPrice: 4_000 },
      { title: 'Brake pads, pair', quantity: 2_000, unitPrice: 1_150 },
      { title: 'Inner tube, 700 x 40', quantity: 2_000, unitPrice: 625 },
    ],
    notes: 'Ride safe. Bring it back for a free check after 100 miles.',
    issue: '2026-10-19',
    due: '2026-10-26',
  },
  {
    template: 'monochrome',
    forWhom: 'Anyone who wants no colour at all',
    logo: svg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="#2B2B2B"/><path d="M100 8 A92 92 0 0 1 192 100 H100 Z M100 192 A92 92 0 0 1 8 100 H100 Z" fill="#FFFFFF"/><circle cx="100" cy="100" r="92" fill="none" stroke="#2B2B2B" stroke-width="6"/></svg>',
    ),
    number: 'FM-1187',
    lineStyle: 'amount',
    seller: {
      name: 'Fenwick Marsh',
      legalName: 'Fenwick Marsh Surveyors Ltd',
      businessType: 'limited_company',
      companyNumber: '29704516',
      taxRegistered: true,
      taxNumber: 'GB 318 2296 54',
      phone: '0113 496 0915',
      address: address('22 Park Square East', 'Leeds', 'LS1 2NE'),
      brandColour: '#2B2B2B',
    },
    bank: { name: 'Tide', sortCode: '04-06-05', accountNumber: '47209135' },
    buyer: {
      name: 'Harewood Homes Ltd',
      contact: 'Lettings office',
      line1: 'Unit 9, Kirkstall Forge',
      city: 'Leeds',
      postcode: 'LS5 3BF',
    },
    title: 'Building survey, 7 Grove Terrace',
    lines: [
      {
        title: 'Level 3 building survey',
        description: 'Four-bedroom Victorian terrace, with photographs',
        quantity: 1_000,
        unitPrice: 85_000,
      },
      { title: 'Damp and timber report', quantity: 1_000, unitPrice: 32_000 },
      {
        title: 'Measured floor plans',
        description: 'Three floors, drawn to scale',
        quantity: 1_000,
        unitPrice: 24_000,
      },
    ],
    terms: 'Payment within 14 days of the invoice date.',
    issue: '2026-10-19',
    due: '2026-11-02',
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
 * Every template in the picker, in its order, with the invented business that makes it out: the six on the shelf and
 * the ten more, for the website's whole range.
 */
export const RANGE: readonly { template: TemplateId; business: string; forWhom: string; logo: string }[] =
  TEMPLATE_LIST.map((t) => {
    const b = [...BUSINESSES, ...MORE].find((x) => x.template === t.id);
    if (!b) throw new Error(`No showcase business for ${t.id}`);
    return { template: b.template, business: b.seller.name, forWhom: b.forWhom, logo: b.logo };
  });

/**
 * One of the range as an invoice: as designed, or made out by the visitor. A visitor's name replaces the business, its
 * legal details and its VAT (an invoice in someone else's name cannot carry another business's numbers); a visitor's
 * colour replaces the brand colour.
 */
export function showcaseSnapshot(
  template: TemplateId,
  visitor: { name?: string; colour?: string } = {},
): DocumentSnapshot {
  const b = [...BUSINESSES, ...MORE].find((x) => x.template === template);
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
    serviceDate: l.date ?? null,
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
