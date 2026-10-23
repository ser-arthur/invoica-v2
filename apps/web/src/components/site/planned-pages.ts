/**
 * Pages the website will have that are not written yet. The footer links to each; until a page is built, its
 * address answers 404 with the page's own notice (docs/specs/not-found-page.md). Take a page off this list
 * when it is built.
 */
export interface PlannedPage {
  href: string;
  heading: string;
  /** One line on what the page will hold. */
  about: string;
}

export const PLANNED_PAGES: PlannedPage[] = [
  {
    href: '/about',
    heading: 'The About page is being written.',
    about: 'It will tell you who makes Invoica, and why.',
  },
  {
    href: '/contact',
    heading: 'The Contact page is being written.',
    about: 'It will list the ways to reach the people behind Invoica.',
  },
  {
    href: '/help',
    heading: 'The help centre is being written.',
    about: 'It will answer common questions, one step at a time.',
  },
  {
    href: '/help/getting-started',
    heading: 'The getting started guide is being written.',
    about: 'It will take you from a new account to your first invoice sent.',
  },
  {
    href: '/privacy',
    heading: 'The Privacy page is being written.',
    about: 'It will hold Invoica’s privacy notice.',
  },
  {
    href: '/terms',
    heading: 'The Terms page is being written.',
    about: 'It will hold the terms for using Invoica.',
  },
  {
    href: '/cookies',
    heading: 'The Cookies page is being written.',
    about: 'It will explain the cookies Invoica uses.',
  },
];

/** The planned page at an address, if there is one. Addresses match exactly, apart from a closing slash. */
export function plannedPage(path: string | null | undefined): PlannedPage | undefined {
  if (!path) return undefined;
  const address = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return PLANNED_PAGES.find((page) => page.href === address);
}
