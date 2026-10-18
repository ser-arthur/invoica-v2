import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the folder holding the document font files. Server only. */
export const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
