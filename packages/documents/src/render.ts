import type { DocumentSnapshot } from '@invoica/core';
import { fontFaceCss } from './fonts';
import { BASE_CSS, esc, pageFooterCss } from './templates/shared';
import { signature } from './templates/signature';
import { studio } from './templates/studio';
import { counsel } from './templates/counsel';
import { ledger } from './templates/ledger';
import { poster } from './templates/poster';
import { letter } from './templates/letter';
import { ticket } from './templates/ticket';
import { sticker } from './templates/sticker';
import { riso } from './templates/riso';
import { marquee } from './templates/marquee';
import { atelier } from './templates/atelier';
import { bloom } from './templates/bloom';
import { mark } from './templates/mark';
import { billboard } from './templates/billboard';
import { grid } from './templates/grid';
import { trade } from './templates/trade';
import { statement } from './templates/statement';
import { practice } from './templates/practice';
import { heritage } from './templates/heritage';
import { buildView } from './view';

/**
 * Every template a document can be in. Studio, Counsel, Ledger and Poster have left the picker; documents issued with
 * them still render as they were.
 */
export const TEMPLATES = {
  signature,
  studio,
  counsel,
  ledger,
  poster,
  letter,
  ticket,
  sticker,
  riso,
  marquee,
  atelier,
  bloom,
  mark,
  billboard,
  grid,
  trade,
  statement,
  practice,
  heritage,
} as const;
export type TemplateId = keyof typeof TEMPLATES;

/** The four that have left the picker, by name, for a draft or a setting still on one of them. */
export const RETIRED_TEMPLATES: { id: TemplateId; name: string }[] = [
  { id: 'studio', name: 'Studio' },
  { id: 'counsel', name: 'Counsel' },
  { id: 'ledger', name: 'Ledger' },
  { id: 'poster', name: 'Poster' },
];

/** How a template feels, for the picker's filter. */
export type TemplateFeel = 'playful' | 'in between' | 'grounded';
/** The kinds of business the picker filters by. */
export type BusinessKind = 'food' | 'creative' | 'events' | 'trades' | 'professional' | 'shops';
export const BUSINESS_KINDS: { id: BusinessKind; name: string }[] = [
  { id: 'food', name: 'Food and drink' },
  { id: 'creative', name: 'Creative' },
  { id: 'events', name: 'Events and weddings' },
  { id: 'trades', name: 'Trades' },
  { id: 'professional', name: 'Professional services' },
  { id: 'shops', name: 'Shops and makers' },
];

/** The templates offered in the picker and the editor, in order. */
export const TEMPLATE_LIST: {
  id: TemplateId;
  name: string;
  description: string;
  feel: TemplateFeel;
  kinds: BusinessKind[];
}[] = [
  {
    id: 'signature',
    name: 'Signature',
    description: 'The amount due first, on a slip of your colour with its corner turned.',
    feel: 'in between',
    kinds: ['professional', 'creative', 'trades'],
  },
  {
    id: 'sticker',
    name: 'Sticker',
    description: 'Soft, round type and your logo as a sticker. For cafés, bakers, makers and classes.',
    feel: 'playful',
    kinds: ['food', 'shops'],
  },
  {
    id: 'riso',
    name: 'Riso',
    description: 'Printed in two inks, with halftone dots. For illustrators, printers, zines and labels.',
    feel: 'playful',
    kinds: ['creative', 'shops'],
  },
  {
    id: 'marquee',
    name: 'Marquee',
    description:
      'The job billed like a gig poster, the amount on a ticket. For events, DJs, venues and photographers.',
    feel: 'playful',
    kinds: ['events', 'creative'],
  },
  {
    id: 'atelier',
    name: 'Atelier',
    description: 'A centred letterhead in a fine serif. For florists, stylists, interiors and weddings.',
    feel: 'in between',
    kinds: ['events', 'creative', 'shops'],
  },
  {
    id: 'bloom',
    name: 'Bloom',
    description: 'A blush band with wild roses drawn in fine line. For florists and cake makers.',
    feel: 'in between',
    kinds: ['food', 'events', 'shops'],
  },
  {
    id: 'mark',
    name: 'Mark',
    description: 'Your logo large and a clean grid. For studios, agencies and developers.',
    feel: 'in between',
    kinds: ['creative', 'professional'],
  },
  {
    id: 'billboard',
    name: 'Billboard',
    description: 'Your name filling a block of your colour. For studios and agencies who want to be loud.',
    feel: 'playful',
    kinds: ['creative'],
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'Six columns, the number set wide. For architects, designers and photographers.',
    feel: 'in between',
    kinds: ['creative', 'professional'],
  },
  {
    id: 'trade',
    name: 'Trade',
    description:
      'Your phone number up top and bank details big enough to type. For builders, roofers and cleaners.',
    feel: 'grounded',
    kinds: ['trades'],
  },
  {
    id: 'statement',
    name: 'Statement',
    description: 'How much, by when and where to pay, first. For bookkeepers, contractors and engineers.',
    feel: 'grounded',
    kinds: ['professional'],
  },
  {
    id: 'practice',
    name: 'Practice',
    description:
      'A letterhead with a fine gold line, set out as a letter. For accountants, solicitors and clinics.',
    feel: 'grounded',
    kinds: ['professional'],
  },
  {
    id: 'heritage',
    name: 'Heritage',
    description:
      'A ruled frame and your name arched like a label. For distillers, tailors and wine merchants.',
    feel: 'grounded',
    kinds: ['food', 'shops'],
  },
  {
    id: 'letter',
    name: 'Letter',
    description: 'Addressed by name and signed off, with dotted leaders. For coaches, tutors and therapists.',
    feel: 'in between',
    kinds: ['professional'],
  },
  {
    id: 'ticket',
    name: 'Ticket',
    description: 'A printed receipt in one narrow column. For makers, shops and events.',
    feel: 'playful',
    kinds: ['shops', 'events', 'food'],
  },
];

export function templateFor(id: string) {
  return TEMPLATES[id as TemplateId] ?? TEMPLATES.signature;
}

export interface RenderOptions {
  /** Turns a font file name into a URL the renderer can load: a web path in the browser, a data URL for PDFs. */
  fontUrl: (file: string) => string;
  logoUrl?: string | null;
  draft?: boolean;
  /** Marks a voided document across the page. For the screen only: the kept PDF stays as it was issued. */
  voided?: boolean;
}

/** A complete HTML page for a document snapshot. The editor preview and the PDF both come from this. */
export function renderDocumentHtml(snapshot: DocumentSnapshot, options: RenderOptions): string {
  const view = buildView(snapshot, { draft: options.draft });
  const template = templateFor(snapshot.template);
  const footer = pageFooterCss(
    `${view.heading} ${view.number}`,
    template.footer.font,
    'color' in template.footer ? template.footer.color : '#6b746f',
    template.footer.inset,
  );
  const css = `${fontFaceCss(template.fonts, options.fontUrl)}\n${BASE_CSS}\n${template.css(view)}\n${footer}`;
  const title = `${view.heading} ${view.number}`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${
    options.draft
      ? '<div class="draft-mark" aria-hidden="true">DRAFT</div>'
      : options.voided
        ? '<div class="void-mark" aria-hidden="true">VOID</div>'
        : ''
  }${template.body(view, options.logoUrl ?? null)}${
    snapshot.madeWithInvoica ? '<p class="made-with">Made with Invoica</p>' : ''
  }</body></html>`;
}
