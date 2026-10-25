/**
 * The plans in decision 0005, as the pricing page shows them. Prices are whole pounds for display only;
 * billing, when it is built, keeps its own amounts in minor units.
 */
export interface Feature {
  text: string;
  /** Not built yet: shown as coming soon. */
  soon?: boolean;
}

export interface Plan {
  name: 'Free' | 'Pro' | 'Studio';
  forWhom: string;
  monthly: string;
  yearly: string;
  cta: string;
  features: Feature[];
}

export const PLANS: Plan[] = [
  {
    name: 'Free',
    forWhom: 'For your first few clients.',
    monthly: '£0',
    yearly: '£0',
    cta: 'Start free',
    features: [
      { text: 'Up to 3 active clients' },
      { text: 'Unlimited invoices, credit notes and PDFs' },
      { text: 'The Signature template, in Invoica’s colours' },
      { text: '“Made with Invoica” on your documents' },
      { text: 'One person' },
    ],
  },
  {
    name: 'Pro',
    forWhom: 'For a business that looks like its own.',
    monthly: '£7',
    yearly: '£70',
    cta: 'Start your 30 days free',
    features: [
      { text: 'Unlimited clients' },
      { text: 'All fifteen templates, with your logo and colour' },
      { text: 'No Invoica mark on your documents' },
      { text: 'Reminders that follow up late payers for you' },
      { text: 'Payment links', soon: true },
      { text: 'One person' },
    ],
  },
  {
    name: 'Studio',
    forWhom: 'For several brands, or a small team.',
    monthly: '£15',
    yearly: '£150',
    cta: 'Start with Pro today',
    features: [
      { text: 'Everything in Pro' },
      { text: 'Several brands or businesses', soon: true },
      { text: 'Up to five people', soon: true },
    ],
  },
];

/** On every plan, never limited (decision 0005: producing a correct invoice is never paywalled). */
export const EVERY_PLAN = [
  'Invoices and credit notes, never counted',
  'Numbers in order, with no gaps',
  'PDFs kept exactly as issued',
  'Sending by email from your business',
  'Payments in full or in parts',
  'Refunds recorded properly',
  'Your data, exported whenever you like',
  'No fee on the money your clients pay you',
];
