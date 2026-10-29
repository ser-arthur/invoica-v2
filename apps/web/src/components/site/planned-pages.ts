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
    href: '/privacy',
    heading: 'The Privacy page is being written.',
    about: 'It will hold Invoica’s privacy notice.',
  },
  {
    href: '/terms',
    heading: 'The Terms page is being written.',
    about: 'It will hold the terms for using Invoica.',
  },
];

/** The planned page at an address, if there is one. Addresses match exactly, apart from a closing slash. */
export function plannedPage(path: string | null | undefined): PlannedPage | undefined {
  if (!path) return undefined;
  const address = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return PLANNED_PAGES.find((page) => page.href === address);
}
