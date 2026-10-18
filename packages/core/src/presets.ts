import type { TaxCode } from './tax';

export interface TaxPresetCode extends TaxCode {
  /** Stable identifier within the preset, used when an organisation loads it. */
  key: string;
  description: string;
}

export interface TaxPreset {
  country: string;
  name: string;
  codes: TaxPresetCode[];
  /** Official sources the figures were checked against, with the date checked. */
  sources: { title: string; url: string; checked: string }[];
}

/** Codes every organisation starts with, whatever its country: one for supplies with no tax. */
export const NO_TAX: TaxPresetCode = {
  key: 'no_tax',
  label: 'No tax',
  treatment: 'outside_scope',
  components: [],
  description: 'For businesses that are not registered for tax, or supplies outside its scope.',
};

const vat = (ratePpm: number) => [{ name: 'VAT', ratePpm, compound: false }];

/**
 * Tax presets researched from official sources (docs/specs/tax-uk.md and docs/specs/tax-ghana.md).
 * Every figure here must be rechecked against its source before it is changed.
 */
export const TAX_PRESETS: TaxPreset[] = [
  {
    country: 'GB',
    name: 'United Kingdom VAT',
    codes: [
      {
        key: 'uk_vat_standard',
        label: 'Standard rate',
        treatment: 'standard',
        components: vat(200_000),
        description: 'VAT at 20%, for most goods and services.',
      },
      {
        key: 'uk_vat_reduced',
        label: 'Reduced rate',
        treatment: 'reduced',
        components: vat(50_000),
        description: 'VAT at 5%, for example domestic fuel and power.',
      },
      {
        key: 'uk_vat_zero',
        label: 'Zero-rated',
        treatment: 'zero',
        components: vat(0),
        description: 'VAT at 0%. Shown with its own total, as a VAT invoice requires.',
      },
      {
        key: 'uk_vat_exempt',
        label: 'Exempt',
        treatment: 'exempt',
        components: [],
        description: 'Exempt from VAT, for example many financial and insurance services.',
      },
      {
        key: 'uk_vat_outside_scope',
        label: 'Outside the scope of UK VAT',
        treatment: 'outside_scope',
        components: [],
        description: 'For example most services to business customers outside the UK.',
      },
      {
        key: 'uk_vat_drc_standard',
        label: 'Reverse charge: VAT 20%',
        treatment: 'reverse_charge',
        components: vat(200_000),
        description:
          'Construction services under the domestic reverse charge. The VAT is shown but the customer pays it to HMRC.',
      },
      {
        key: 'uk_vat_drc_reduced',
        label: 'Reverse charge: VAT 5%',
        treatment: 'reverse_charge',
        components: vat(50_000),
        description: 'Reduced-rate construction services under the domestic reverse charge.',
      },
    ],
    sources: [
      { title: 'GOV.UK, VAT rates', url: 'https://www.gov.uk/vat-rates', checked: '2026-10-18' },
      {
        title: 'GOV.UK, VAT Notice 700, paragraph 17.5',
        url: 'https://www.gov.uk/guidance/vat-guide-notice-700',
        checked: '2026-10-18',
      },
      {
        title: 'GOV.UK, Record keeping for VAT (Notice 700/21), section 4',
        url: 'https://www.gov.uk/guidance/record-keeping-for-vat-notice-70021',
        checked: '2026-10-18',
      },
    ],
  },
  {
    country: 'GH',
    name: 'Ghana VAT and levies (from 1 January 2026)',
    codes: [
      {
        key: 'gh_standard',
        label: 'Standard rate',
        treatment: 'standard',
        components: [
          { name: 'NHIL', ratePpm: 25_000, compound: false },
          { name: 'GETFund Levy', ratePpm: 25_000, compound: false },
          { name: 'VAT', ratePpm: 150_000, compound: false },
        ],
        description: 'NHIL 2.5%, GETFund Levy 2.5% and VAT 15%, each on the value before tax: 20% in all.',
      },
      {
        key: 'gh_zero',
        label: 'Zero-rated',
        treatment: 'zero',
        components: vat(0),
        description: 'VAT, NHIL and GETFund Levy at 0%.',
      },
      {
        key: 'gh_exempt',
        label: 'Exempt',
        treatment: 'exempt',
        components: [],
        description: 'No VAT, NHIL or GETFund Levy.',
      },
    ],
    sources: [
      {
        title: 'Ghana Revenue Authority, VAT changes from 1 January 2026',
        url: 'https://gra.gov.gh',
        checked: '2026-10-18',
      },
    ],
  },
];

/** Where tax is rounded by default in each country, from its rules (decision 0007). */
export const ROUNDING_DEFAULTS: Record<
  string,
  { taxLevel: 'document' | 'line'; rounding: 'half-up' | 'half-even' | 'down' }
> = {
  GB: { taxLevel: 'line', rounding: 'half-up' },
  GH: { taxLevel: 'document', rounding: 'half-up' },
};

export function roundingDefaultFor(country: string) {
  return ROUNDING_DEFAULTS[country] ?? { taxLevel: 'line' as const, rounding: 'half-up' as const };
}

export function presetFor(country: string): TaxPreset | undefined {
  return TAX_PRESETS.find((p) => p.country === country);
}

export type RoundingChoice = { taxLevel: 'document' | 'line'; rounding: 'half-up' | 'half-even' | 'down' };

/**
 * The rounding choices a business in this country may make (decision 0007). UK: VAT per line to the nearest
 * penny, or on the invoice total rounded down (VAT Notice 700, 17.5). Elsewhere every combination is allowed.
 */
export function allowedRounding(country: string): RoundingChoice[] {
  if (country === 'GB') {
    return [
      { taxLevel: 'line', rounding: 'half-up' },
      { taxLevel: 'document', rounding: 'down' },
    ];
  }
  const all: RoundingChoice[] = [];
  for (const taxLevel of ['line', 'document'] as const)
    for (const rounding of ['half-up', 'half-even', 'down'] as const) all.push({ taxLevel, rounding });
  return [
    roundingDefaultFor(country),
    ...all.filter(
      (c) =>
        !(
          c.taxLevel === roundingDefaultFor(country).taxLevel &&
          c.rounding === roundingDefaultFor(country).rounding
        ),
    ),
  ];
}
