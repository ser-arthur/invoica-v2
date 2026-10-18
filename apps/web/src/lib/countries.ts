/** Countries offered at sign-up, with the currency and time zone they start with. Everything can be changed later. */
export const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timeZone: 'Europe/London' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', timeZone: 'Africa/Accra' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timeZone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timeZone: 'Africa/Nairobi' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timeZone: 'Africa/Johannesburg' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', timeZone: 'Europe/Dublin' },
  { code: 'FR', name: 'France', currency: 'EUR', timeZone: 'Europe/Paris' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timeZone: 'Europe/Berlin' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timeZone: 'Europe/Amsterdam' },
  { code: 'US', name: 'United States', currency: 'USD', timeZone: 'America/New_York' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timeZone: 'America/Toronto' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timeZone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timeZone: 'Pacific/Auckland' },
  { code: 'IN', name: 'India', currency: 'INR', timeZone: 'Asia/Kolkata' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timeZone: 'Asia/Dubai' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timeZone: 'Asia/Singapore' },
] as const;

export function countryName(code: string | null | undefined): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code ?? '';
}

export const TIME_ZONES = [...new Set(COUNTRIES.map((c) => c.timeZone))].sort();
