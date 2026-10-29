/**
 * The footer's links. Pages not written yet are in `planned-pages.ts` and keep their future addresses here;
 * until each is built, its address opens the not-found page with that page's notice.
 */
export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Why Invoica', href: '/#why' },
      { label: 'How it works', href: '/#how' },
      { label: 'Templates', href: '/templates' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Help centre', href: '/help' },
      { label: 'Getting started', href: '/help/getting-started' },
      { label: 'Sign in', href: '/sign-in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];
