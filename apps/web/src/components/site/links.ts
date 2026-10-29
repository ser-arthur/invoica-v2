/**
 * The footer's links (docs/specs/website-footer.md): the product's, then the small print's. Pages not written yet are
 * in `planned-pages.ts` and keep their future addresses here; until each is built, its address opens the not-found
 * page with that page's notice.
 */
export interface FooterLink {
  label: string;
  href: string;
}

export const FOOTER_LINKS: FooterLink[] = [
  { label: 'Why Invoica', href: '/#why' },
  { label: 'How it works', href: '/#how' },
  { label: 'Templates', href: '/templates' },
  { label: 'Pricing', href: '/pricing' },
];

export const FOOTER_SMALL_PRINT: FooterLink[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

/** The business's own email, the one address the website shows. */
export const BUSINESS_EMAIL = 'hello@getinvoica.com';

/** Who is behind Invoica: a sole trader, whose trading name it is, so the footer names him. */
export const TRADER = 'Kobby S. Arthur';
