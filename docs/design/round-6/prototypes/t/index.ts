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
import { signature2 } from './signature2';
import { letter2 } from './letter2';
import { ticket2 } from './ticket2';

export const TEMPLATES = {
  'signature-v2': signature2,
  'signature-v2-indigo': { ...signature2, id: 'signature-v2-indigo', brand: '#3A3FB8' },
  'ticket-v2-teal': { ...ticket2, id: 'ticket-v2-teal', brand: '#0F6E70' },
  'letter-v2': letter2,
  'ticket-v2': ticket2,
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
