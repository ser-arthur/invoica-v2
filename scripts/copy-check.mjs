// Checks UI text, docs and code comments against the copy rules: no em dashes, none of the banned constructions, no emoji.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['apps', 'packages', 'docs', 'scripts', 'CLAUDE.md', 'README.md'];
const SKIP = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'evidence',
  'round-1',
]);
const EXT = new Set(['.ts', '.tsx', '.md', '.mjs', '.css', '.sql', '.json']);
const RULES = [
  [new RegExp(String.fromCharCode(0x2014)), 'em dash'],
  [new RegExp('\\brather' + ' than\\b', 'i'), 'the banned "rather" construction'],
  [new RegExp('\\bnot' + ' just\\b', 'i'), 'the banned "not" construction'],
  [/\p{Extended_Pictographic}/u, 'emoji'],
];

const files = [];
function walk(p) {
  const s = statSync(p, { throwIfNoEntry: false });
  if (!s) return;
  if (s.isDirectory()) {
    for (const name of readdirSync(p)) if (!SKIP.has(name)) walk(join(p, name));
  } else if (EXT.has(extname(p)) && !p.endsWith('pnpm-lock.yaml') && !p.endsWith('package.json'))
    files.push(p);
}
ROOTS.forEach(walk);

let hits = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [re, name] of RULES) {
      if (re.test(line) && !line.includes('copy-check: allow')) {
        console.log(`FAIL  ${f}:${i + 1} ${name}`);
        hits++;
      }
    }
  });
}
console.log(`copy check: files expected >0, examined ${files.length}, findings ${hits}`);
if (files.length === 0 || hits > 0) {
  console.log('FAIL');
  process.exit(1);
}
console.log('PASS');
