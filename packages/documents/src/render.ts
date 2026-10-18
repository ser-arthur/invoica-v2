import type { DocumentSnapshot } from '@invoica/core';
import { fontFaceCss } from './fonts';
import { BASE_CSS, esc, pageFooterCss } from './templates/shared';
import { signature } from './templates/signature';
import { studio } from './templates/studio';
import { counsel } from './templates/counsel';
import { buildView } from './view';

export const TEMPLATES = { signature, studio, counsel } as const;
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
];

export function templateFor(id: string) {
  return TEMPLATES[id as TemplateId] ?? TEMPLATES.signature;
}

export interface RenderOptions {
  /** Turns a font file name into a URL the renderer can load: a web path in the browser, a data URL for PDFs. */
  fontUrl: (file: string) => string;
  logoUrl?: string | null;
  draft?: boolean;
}

/** A complete HTML page for a document snapshot. The editor preview and the PDF both come from this. */
export function renderDocumentHtml(snapshot: DocumentSnapshot, options: RenderOptions): string {
  const view = buildView(snapshot, { draft: options.draft });
  const template = templateFor(snapshot.template);
  const footer = pageFooterCss(
    `${view.heading} ${view.number}`,
    template.footer.font,
    '#6b746f',
    template.footer.inset,
  );
  const css = `${fontFaceCss(template.fonts, options.fontUrl)}\n${BASE_CSS}\n${template.css(view)}\n${footer}`;
  const title = `${view.heading} ${view.number}`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${
    options.draft ? '<div class="draft-mark" aria-hidden="true">DRAFT</div>' : ''
  }${template.body(view, options.logoUrl ?? null)}</body></html>`;
}
