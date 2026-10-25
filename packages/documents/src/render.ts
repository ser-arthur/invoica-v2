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

export const TEMPLATE_LIST: { id: TemplateId; name: string; description: string }[] = [
  {
    id: 'signature',
    name: 'Signature',
    description: 'Quiet and exact, with the amount due in your brand colour.',
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Your colour as a band and your name set large. For studios and agencies.',
  },
  {
    id: 'counsel',
    name: 'Counsel',
    description: 'A centred letterhead in a serif. For firms and practices.',
  },
  {
    id: 'poster',
    name: 'Poster',
    description: 'The amount set as large as a headline, on a strict grid. For designers and studios.',
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description:
      'A ruled margin, a folio number and figures in a mono face. For bookkeepers and consultants.',
  },
  {
    id: 'letter',
    name: 'Letter',
    description: 'Addressed by name and signed off, with dotted leaders. For coaches, tutors and therapists.',
  },
  {
    id: 'ticket',
    name: 'Ticket',
    description: 'A printed receipt in one narrow column. For makers, shops and events.',
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
