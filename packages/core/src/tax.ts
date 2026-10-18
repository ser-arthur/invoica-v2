import { DomainError } from './errors';
import { divRound, toSafeNumber, assertMinor, type RoundingMode } from './money';

/** Tax rates are stored in parts per million: 20% is 200000, 17.5% is 175000, 2.5% is 25000. */
export const RATE_SCALE = 1_000_000;

/** What kind of supply a tax code describes. The UK names are used; other markets map onto them. */
export type TaxTreatment =
  'standard' | 'reduced' | 'zero' | 'exempt' | 'outside_scope' | 'reverse_charge' | 'custom';

export const TAX_TREATMENTS: readonly TaxTreatment[] = [
  'standard',
  'reduced',
  'zero',
  'exempt',
  'outside_scope',
  'reverse_charge',
  'custom',
];

export interface TaxComponent {
  /** The tax's real name as printed, for example "VAT" or "NHIL". */
  name: string;
  ratePpm: number;
  /** A compound tax is charged on the amount plus every component listed before it. */
  compound: boolean;
}

/** What a line is taxed with: one or more components, applied in order. A code with no components charges no tax. */
export interface TaxCode {
  label: string;
  treatment: TaxTreatment;
  components: TaxComponent[];
}

export function assertTaxCode(code: TaxCode): void {
  for (const c of code.components) {
    assertMinor(c.ratePpm, 'tax rate');
    if (c.ratePpm < 0 || c.ratePpm > RATE_SCALE) {
      throw new DomainError('tax_rate_out_of_range', `Tax rate for ${c.name} must be between 0% and 100%.`);
    }
    if (!c.name.trim()) throw new DomainError('tax_name_missing', 'Every tax needs a name.');
  }
}

/** A stable key for grouping lines that are taxed the same way. */
export function taxCodeKey(code: TaxCode | null): string {
  if (!code) return 'none';
  return JSON.stringify([
    code.treatment,
    code.label,
    code.components.map((c) => [c.name, c.ratePpm, c.compound]),
  ]);
}

/** Reads a percentage typed by a person ("20", "17.5", "2.5%") into parts per million. Null when invalid. */
export function parseRate(input: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{0,4}))?\s*%?$/.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]) * 10_000 + Number((match[2] ?? '').padEnd(4, '0'));
  return value <= RATE_SCALE ? value : null;
}

/** Writes a rate as a percentage with only the decimals it needs: 175000 is "17.5%". */
export function formatRate(ratePpm: number): string {
  const whole = Math.trunc(ratePpm / 10_000);
  const fraction = (ratePpm % 10_000).toString().padStart(4, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}%`;
}

/** A label such as "VAT 20%" or "VAT 15% + NHIL 2.5%". Codes with no components use their own label. */
export function describeTaxCode(code: TaxCode): string {
  if (code.components.length === 0) return code.label;
  return code.components.map((c) => `${c.name} ${formatRate(c.ratePpm)}`).join(' + ');
}

export interface ComponentAmount {
  component: TaxComponent;
  /** The amount this component was charged on. */
  base: number;
  amount: number;
}

/** Taxes added on top of a net amount, applied in order. Each component is rounded once. */
export function taxesOnNet(
  net: number,
  components: readonly TaxComponent[],
  mode: RoundingMode,
): ComponentAmount[] {
  assertMinor(net, 'net');
  const out: ComponentAmount[] = [];
  let charged = 0;
  for (const component of components) {
    const base = component.compound ? net + charged : net;
    const amount = toSafeNumber(
      divRound(BigInt(base) * BigInt(component.ratePpm), BigInt(RATE_SCALE), mode),
      'tax',
    );
    out.push({ component, base, amount });
    charged += amount;
  }
  return out;
}

/** A non-negative exact fraction. */
interface Fraction {
  num: bigint;
  den: bigint;
}

const frac = (num: bigint, den: bigint): Fraction => ({ num, den });
const addF = (a: Fraction, b: Fraction): Fraction => frac(a.num * b.den + b.num * a.den, a.den * b.den);
const mulRate = (a: Fraction, ratePpm: number): Fraction =>
  frac(a.num * BigInt(ratePpm), a.den * BigInt(RATE_SCALE));

/** The exact multiplier from net to gross for a set of components, as a fraction. */
function grossMultiplier(components: readonly TaxComponent[]): Fraction {
  let factors = frac(0n, 1n);
  for (const c of components) {
    const base = c.compound ? addF(frac(1n, 1n), factors) : frac(1n, 1n);
    factors = addF(factors, mulRate(base, c.ratePpm));
  }
  return addF(frac(1n, 1n), factors);
}

/** Each component's exact tax on an exact net, applied in order. */
export function exactTaxes(net: Fraction, components: readonly TaxComponent[]): Fraction[] {
  const out: Fraction[] = [];
  let charged = frac(0n, 1n);
  for (const c of components) {
    const base = c.compound ? addF(net, charged) : net;
    const amount = mulRate(base, c.ratePpm);
    out.push(amount);
    charged = addF(charged, amount);
  }
  return out;
}

/** The exact net inside a tax-inclusive amount. */
export function exactNetOfGross(gross: number, components: readonly TaxComponent[]): Fraction {
  const m = grossMultiplier(components);
  return frac(BigInt(gross) * m.den, m.num);
}

export type { Fraction };

/**
 * Splits a tax-inclusive amount into its net part and each component's tax. Each tax is worked out exactly
 * on the exact net and rounded once, so every printed tax matches its rate; the net takes what is left,
 * so the net plus the taxes equal the gross exactly.
 */
export function splitGross(
  gross: number,
  components: readonly TaxComponent[],
  mode: RoundingMode,
): { net: number; taxes: ComponentAmount[] } {
  assertMinor(gross, 'gross');
  const exactNet = exactNetOfGross(gross, components);
  const exact = exactTaxes(exactNet, components);
  const amounts = exact.map((f) => toSafeNumber(divRound(f.num, f.den, mode), 'tax'));
  const net = gross - amounts.reduce((a, b) => a + b, 0);
  let charged = 0;
  const taxes = components.map((component, i) => {
    const base = component.compound ? net + charged : net;
    charged += amounts[i]!;
    return { component, base, amount: amounts[i]! };
  });
  return { net, taxes };
}
