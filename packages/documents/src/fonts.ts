/** Fonts used by document templates. The files are in packages/documents/fonts under the SIL Open Font Licence. */

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

export type DocumentFont =
  | 'Sora'
  | 'Onest'
  | 'Newsreader'
  | 'Bricolage Grotesque'
  | 'JetBrains Mono'
  | 'Fraunces'
  | 'Figtree'
  | 'Syne'
  | 'Space Mono'
  | 'Manrope'
  | 'Instrument Serif'
  | 'Instrument Sans'
  | 'Bodoni Moda'
  | 'Jost'
  | 'Geist'
  | 'Geist Mono'
  | 'Funnel Display'
  | 'Inter Tight'
  | 'Mona Sans'
  | 'Archivo'
  | 'Hanken Grotesk'
  | 'IBM Plex Mono'
  | 'Libre Caslon Display'
  | 'Libre Caslon Text'
  | 'Source Sans 3'
  | 'Cormorant'
  | 'Cormorant SC'
  | 'EB Garamond';

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
  {
    family: 'Fraunces',
    file: 'fraunces-latin-full-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Fraunces',
    file: 'fraunces-latin-ext-full-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Fraunces',
    file: 'fraunces-latin-full-italic.woff2',
    style: 'italic',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Fraunces',
    file: 'fraunces-latin-ext-full-italic.woff2',
    style: 'italic',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Figtree',
    file: 'figtree-latin-wght-normal.woff2',
    style: 'normal',
    weight: '300 900',
    range: LATIN,
  },
  {
    family: 'Figtree',
    file: 'figtree-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '300 900',
    range: LATIN_EXT,
  },
  { family: 'Syne', file: 'syne-latin-wght-normal.woff2', style: 'normal', weight: '400 800', range: LATIN },
  {
    family: 'Syne',
    file: 'syne-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '400 800',
    range: LATIN_EXT,
  },
  {
    family: 'Space Mono',
    file: 'space-mono-latin-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Space Mono',
    file: 'space-mono-latin-ext-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Space Mono',
    file: 'space-mono-latin-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN,
  },
  {
    family: 'Space Mono',
    file: 'space-mono-latin-ext-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN_EXT,
  },
  {
    family: 'Manrope',
    file: 'manrope-latin-wght-normal.woff2',
    style: 'normal',
    weight: '200 800',
    range: LATIN,
  },
  {
    family: 'Manrope',
    file: 'manrope-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '200 800',
    range: LATIN_EXT,
  },
  {
    family: 'Instrument Serif',
    file: 'instrument-serif-latin-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Instrument Serif',
    file: 'instrument-serif-latin-ext-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Instrument Serif',
    file: 'instrument-serif-latin-400-italic.woff2',
    style: 'italic',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Instrument Serif',
    file: 'instrument-serif-latin-ext-400-italic.woff2',
    style: 'italic',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Instrument Sans',
    file: 'instrument-sans-latin-standard-normal.woff2',
    style: 'normal',
    weight: '400 700',
    range: LATIN,
  },
  {
    family: 'Instrument Sans',
    file: 'instrument-sans-latin-ext-standard-normal.woff2',
    style: 'normal',
    weight: '400 700',
    range: LATIN_EXT,
  },
  {
    family: 'Bodoni Moda',
    file: 'bodoni-moda-latin-standard-normal.woff2',
    style: 'normal',
    weight: '400 900',
    range: LATIN,
  },
  {
    family: 'Bodoni Moda',
    file: 'bodoni-moda-latin-ext-standard-normal.woff2',
    style: 'normal',
    weight: '400 900',
    range: LATIN_EXT,
  },
  {
    family: 'Bodoni Moda',
    file: 'bodoni-moda-latin-standard-italic.woff2',
    style: 'italic',
    weight: '400 900',
    range: LATIN,
  },
  {
    family: 'Bodoni Moda',
    file: 'bodoni-moda-latin-ext-standard-italic.woff2',
    style: 'italic',
    weight: '400 900',
    range: LATIN_EXT,
  },
  { family: 'Jost', file: 'jost-latin-wght-normal.woff2', style: 'normal', weight: '100 900', range: LATIN },
  {
    family: 'Jost',
    file: 'jost-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  { family: 'Jost', file: 'jost-latin-wght-italic.woff2', style: 'italic', weight: '100 900', range: LATIN },
  {
    family: 'Jost',
    file: 'jost-latin-ext-wght-italic.woff2',
    style: 'italic',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Geist',
    file: 'geist-latin-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Geist',
    file: 'geist-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Geist Mono',
    file: 'geist-mono-latin-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Geist Mono',
    file: 'geist-mono-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Funnel Display',
    file: 'funnel-display-latin-wght-normal.woff2',
    style: 'normal',
    weight: '300 800',
    range: LATIN,
  },
  {
    family: 'Funnel Display',
    file: 'funnel-display-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '300 800',
    range: LATIN_EXT,
  },
  {
    family: 'Inter Tight',
    file: 'inter-tight-latin-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Inter Tight',
    file: 'inter-tight-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Mona Sans',
    file: 'mona-sans-latin-standard-normal.woff2',
    style: 'normal',
    weight: '200 900',
    range: LATIN,
  },
  {
    family: 'Mona Sans',
    file: 'mona-sans-latin-ext-standard-normal.woff2',
    style: 'normal',
    weight: '200 900',
    range: LATIN_EXT,
  },
  {
    family: 'Archivo',
    file: 'archivo-latin-standard-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Archivo',
    file: 'archivo-latin-ext-standard-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'Hanken Grotesk',
    file: 'hanken-grotesk-latin-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN,
  },
  {
    family: 'Hanken Grotesk',
    file: 'hanken-grotesk-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '100 900',
    range: LATIN_EXT,
  },
  {
    family: 'IBM Plex Mono',
    file: 'ibm-plex-mono-latin-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'IBM Plex Mono',
    file: 'ibm-plex-mono-latin-ext-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'IBM Plex Mono',
    file: 'ibm-plex-mono-latin-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN,
  },
  {
    family: 'IBM Plex Mono',
    file: 'ibm-plex-mono-latin-ext-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN_EXT,
  },
  {
    family: 'Libre Caslon Display',
    file: 'libre-caslon-display-latin-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Libre Caslon Display',
    file: 'libre-caslon-display-latin-ext-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Libre Caslon Text',
    file: 'libre-caslon-text-latin-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Libre Caslon Text',
    file: 'libre-caslon-text-latin-ext-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Libre Caslon Text',
    file: 'libre-caslon-text-latin-400-italic.woff2',
    style: 'italic',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Libre Caslon Text',
    file: 'libre-caslon-text-latin-ext-400-italic.woff2',
    style: 'italic',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Libre Caslon Text',
    file: 'libre-caslon-text-latin-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN,
  },
  {
    family: 'Libre Caslon Text',
    file: 'libre-caslon-text-latin-ext-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN_EXT,
  },
  {
    family: 'Source Sans 3',
    file: 'source-sans-3-latin-wght-normal.woff2',
    style: 'normal',
    weight: '200 900',
    range: LATIN,
  },
  {
    family: 'Source Sans 3',
    file: 'source-sans-3-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '200 900',
    range: LATIN_EXT,
  },
  {
    family: 'Cormorant',
    file: 'cormorant-latin-wght-normal.woff2',
    style: 'normal',
    weight: '300 700',
    range: LATIN,
  },
  {
    family: 'Cormorant',
    file: 'cormorant-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '300 700',
    range: LATIN_EXT,
  },
  {
    family: 'Cormorant',
    file: 'cormorant-latin-wght-italic.woff2',
    style: 'italic',
    weight: '300 700',
    range: LATIN,
  },
  {
    family: 'Cormorant',
    file: 'cormorant-latin-ext-wght-italic.woff2',
    style: 'italic',
    weight: '300 700',
    range: LATIN_EXT,
  },
  {
    family: 'Cormorant SC',
    file: 'cormorant-sc-latin-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN,
  },
  {
    family: 'Cormorant SC',
    file: 'cormorant-sc-latin-ext-400-normal.woff2',
    style: 'normal',
    weight: '400',
    range: LATIN_EXT,
  },
  {
    family: 'Cormorant SC',
    file: 'cormorant-sc-latin-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN,
  },
  {
    family: 'Cormorant SC',
    file: 'cormorant-sc-latin-ext-700-normal.woff2',
    style: 'normal',
    weight: '700',
    range: LATIN_EXT,
  },
  {
    family: 'EB Garamond',
    file: 'eb-garamond-latin-wght-normal.woff2',
    style: 'normal',
    weight: '400 800',
    range: LATIN,
  },
  {
    family: 'EB Garamond',
    file: 'eb-garamond-latin-ext-wght-normal.woff2',
    style: 'normal',
    weight: '400 800',
    range: LATIN_EXT,
  },
  {
    family: 'EB Garamond',
    file: 'eb-garamond-latin-wght-italic.woff2',
    style: 'italic',
    weight: '400 800',
    range: LATIN,
  },
  {
    family: 'EB Garamond',
    file: 'eb-garamond-latin-ext-wght-italic.woff2',
    style: 'italic',
    weight: '400 800',
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
