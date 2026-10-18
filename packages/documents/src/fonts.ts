/** Fonts used by document templates. The files are in packages/documents/fonts under the SIL Open Font Licence. */

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

export type DocumentFont = 'Sora' | 'Onest' | 'Newsreader' | 'Bricolage Grotesque';

interface Face {
  family: DocumentFont;
  file: string;
  style: 'normal' | 'italic';
  weight: string;
  range: string;
}

const FACES: Face[] = [
  { family: 'Sora', file: 'sora-latin-wght-normal.woff2', style: 'normal', weight: '100 800', range: LATIN },
  {
    family: 'Sora',
    file: 'sora-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 800',
    range: LATIN_EXT,
  },
  {
    family: 'Onest',
    file: 'onest-latin-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Onest',
    file: 'onest-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Newsreader',
    file: 'newsreader-latin-wght-normal.woff2',
    style: 'normal',
    weight: '200 800',
    range: LATIN,
  },
  {
    family: 'Newsreader',
    file: 'newsreader-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '200 800',
    range: LATIN_EXT,
  },
  {
    family: 'Newsreader',
    file: 'newsreader-latin-wght-italic.woff2',
    style: 'italic',
    weight: '200 800',
    range: LATIN,
  },
  {
    family: 'Bricolage Grotesque',
    file: 'bricolage-grotesque-latin-wght-normal.woff2',
    style: 'normal',
    weight: '200 800',
    range: LATIN,
  },
  {
    family: 'Bricolage Grotesque',
    file: 'bricolage-grotesque-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '200 800',
    range: LATIN_EXT,
  },
];

export const FONT_FILES: readonly string[] = FACES.map((f) => f.file);

/** @font-face rules for the given families. `url` turns a file name into the URL the renderer can load. */
export function fontFaceCss(families: readonly DocumentFont[], url: (file: string) => string): string {
  return FACES.filter((f) => families.includes(f.family))
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;src:url(${url(f.file)}) format('woff2');unicode-range:${f.range};}`,
    )
    .join('\n');
}
