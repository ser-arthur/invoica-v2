import { describe, expect, it } from 'vitest';
import type { DocumentSnapshot } from '@invoica/core';
import { buildView } from '../src/index';
import { FIXTURES } from './fixtures';

/** The UK VAT fixture's seller with another company number. */
function ukCompany(companyNumber: string): DocumentSnapshot {
  const s = FIXTURES.ukVat!;
  return { ...s, seller: { ...s.seller, businessType: 'limited_company', companyNumber } };
}

describe('where a UK company is registered', () => {
  it('says England and Wales for a number with no prefix', () => {
    expect(buildView(ukCompany('12873405')).seller.companyLine).toMatch(
      /, registered in England and Wales, company number 12873405$/,
    );
  });

  it('says Scotland for an SC number', () => {
    expect(buildView(ukCompany('SC651207')).seller.companyLine).toMatch(
      /, registered in Scotland, company number SC651207$/,
    );
  });

  it('says Northern Ireland for an NI number', () => {
    expect(buildView(ukCompany('NI612345')).seller.companyLine).toMatch(
      /, registered in Northern Ireland, company number NI612345$/,
    );
  });

  it('reads the prefix whatever its case and spacing, and prints the number as it was entered', () => {
    expect(buildView(ukCompany(' sc 651207')).seller.companyLine).toMatch(
      /, registered in Scotland, company number sc 651207$/,
    );
    expect(buildView(ukCompany('ni612345')).seller.companyLine).toMatch(/, registered in Northern Ireland, /);
  });

  it('keeps the country name for a company outside the UK, whatever its number looks like', () => {
    const s = FIXTURES.ghana!;
    const v = buildView({
      ...s,
      seller: { ...s.seller, businessType: 'limited_company', companyNumber: 'SC123456' },
    });
    expect(v.seller.companyLine).toMatch(/, registered in Ghana, company number SC123456$/);
  });
});
