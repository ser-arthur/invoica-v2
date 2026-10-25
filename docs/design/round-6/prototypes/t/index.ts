import { sticker } from './sticker';
import { riso } from './riso';
import { marqueeA, marqueeB, marqueeC, marqueeTangerine, marqueeLime, marqueeViolet } from './marquee';
import { mark } from './mark';
import { grid } from './grid';
import { trade } from './trade';
import { practice } from './practice';
import { heritage, heritageLabel } from './heritage';
import { statement } from './statement';
import { bloom } from './bloom';
import { atelierRose, atelierEmerald, atelierCobalt } from './atelier';
import { olive } from './olive';
import { editorial } from './editorial';
import { billboard, billboardNone, billboardCream, billboardBlack } from './billboard';

export const TEMPLATES = {
  sticker,
  'atelier-rose': atelierRose,
  'atelier-emerald': atelierEmerald,
  'atelier-cobalt': atelierCobalt,
  bloom,
  olive,
  editorial,
  riso,
  'marquee-a': marqueeA,
  'marquee-b': marqueeB,
  'marquee-c': marqueeC,
  'marquee-tangerine': marqueeTangerine,
  'marquee-lime': marqueeLime,
  'marquee-violet': marqueeViolet,
  mark,
  billboard,
  'billboard-none': billboardNone,
  'billboard-cream': billboardCream,
  'billboard-black': billboardBlack,
  grid,
  trade,
  statement,
  practice,
  heritage,
  'heritage-label': heritageLabel,
};
