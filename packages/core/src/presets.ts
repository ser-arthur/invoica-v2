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

export const TAX_PRESETS: TaxPreset[] = [];

export function presetFor(country: string): TaxPreset | undefined {
  return TAX_PRESETS.find((p) => p.country === country);
}
