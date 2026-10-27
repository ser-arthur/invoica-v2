import { describe, expect, it } from 'vitest';
import { RANGE, sampleSnapshot, showcaseSnapshot, storySnapshot } from '../src/index';

/**
 * Every invented business shown in public looks real and can belong to no one (docs/specs/website-showcase.md,
 * criterion 9).
 */

/** HMRC's check for a 9-digit GB VAT number: valid under the original scheme (97) or the newer one (9755). */
function vatPasses(number: string): boolean {
  const d = number.replace(/^GB/, '').replace(/\s/g, '').split('').map(Number);
  const sum = [8, 7, 6, 5, 4, 3, 2].reduce((t, w, i) => t + w * d[i]!, 0);
  const check = d[7]! * 10 + d[8]!;
  return (sum + check) % 97 === 0 || (sum + 55 + check) % 97 === 0;
}

/**
 * The lines of Vocalink's modulus weight table (valacdos, valid from 17 October 2026) for the sort codes the samples
 * use: the method and the fourteen weights over the sort code's six digits and the account number's eight.
 */
const VALACDOS: Record<string, [method: 'MOD10' | 'MOD11' | 'DBLAL', weights: number[]][]> = {
  '089300': [['MOD10', [0, 0, 0, 0, 0, 0, 7, 1, 3, 7, 1, 3, 7, 1]]],
  '040605': [['DBLAL', [1, 3, 4, 3, 9, 3, 1, 7, 5, 5, 4, 5, 2, 4]]],
  '090128': [['MOD10', [0, 0, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1]]],
  '203206': [
    ['MOD11', [0, 0, 0, 0, 0, 0, 0, 7, 6, 5, 4, 3, 2, 1]],
    ['DBLAL', [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1]],
  ],
  '070436': [['MOD11', [0, 0, 7, 6, 5, 8, 9, 4, 5, 6, 7, 8, 9, -1]]],
  '040075': [['MOD11', [0, 0, 0, 0, 0, 0, 8, 7, 6, 5, 4, 3, 2, 1]]],
};

/** Whether the account passes every check its sort code has; a sort code with no recorded weights is unknown. */
function modulusPasses(sortCode: string, account: string): boolean | 'unknown' {
  const code = sortCode.replace(/-/g, '');
  const checks = VALACDOS[code];
  if (!checks) return 'unknown';
  const digits = `${code}${account}`.split('').map(Number);
  return checks.every(([method, weights]) => {
    const products = digits.map((d, i) => d * weights[i]!);
    if (method === 'DBLAL') {
      const total = products.reduce(
        (t, p) =>
          t +
          Math.abs(p)
            .toString()
            .split('')
            .map(Number)
            .reduce((a, b) => a + b, 0),
        0,
      );
      return total % 10 === 0;
    }
    const total = products.reduce((t, p) => t + p, 0);
    return total % (method === 'MOD11' ? 11 : 10) === 0;
  });
}

const PUBLIC = [
  ...RANGE.map((s) => showcaseSnapshot(s.template)),
  sampleSnapshot({ template: 'signature' }),
  // the website's own story: Linden & Rowe Studio's INV-0044 to Meridian Architects LLP
  storySnapshot(),
];

describe('sample details in public belong to no one', () => {
  it('the check rules are right: a known valid VAT number and account number pass', () => {
    expect(vatPasses('GB 980 7806 84')).toBe(true);
    expect(modulusPasses('08-93-00', '27461583')).toBe(true);
  });

  it.each(PUBLIC.map((s) => [s.seller.name, s] as const))('%s', (_name, s) => {
    if (s.seller.taxNumber) expect(vatPasses(s.seller.taxNumber), s.seller.taxNumber).toBe(false);
    const company = s.seller.companyNumber;
    if (company) {
      const n = /^SC(\d{6})$/.exec(company);
      if (n) expect(Number(n[1])).toBeGreaterThanOrEqual(990_000);
      else expect(Number(company)).toBeGreaterThanOrEqual(29_000_000);
    }
    const bank = s.payment.bank!;
    expect(modulusPasses(bank.sortCode!, bank.accountNumber!), `${bank.sortCode} ${bank.accountNumber}`).toBe(
      false,
    );
    expect(bank.bankName).not.toMatch(/example/i);
    // Any real-looking email or web address belongs to someone, so none is shown.
    expect(s.seller.email, 'no email address').toBeNull();
    expect(s.seller.website, 'no web address').toBeNull();
  });
});
