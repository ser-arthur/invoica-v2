import { describe, expect, it } from 'vitest';
import { followUntouched } from './follow-untouched';

/** docs/specs/changes-elsewhere.md, rule 8: after a refusal, a field not typed in shows the record as it is now. */
describe('followUntouched', () => {
  const loaded = {
    name: 'Studio',
    phone: null as string | null,
    bank: { sortCode: '40-00-00', account: '1' },
  };

  it('takes the latest value of each field the person has not changed, and keeps what they typed', () => {
    const typed = { ...loaded, phone: '0113 496 0100' };
    const latest = { ...loaded, name: 'Studio Ltd', bank: { sortCode: '40-11-22', account: '2' } };
    expect(followUntouched(loaded, typed, latest)).toEqual({
      name: 'Studio Ltd',
      phone: '0113 496 0100',
      bank: { sortCode: '40-11-22', account: '2' },
    });
  });

  it('goes into nested details, so one bank field typed keeps the others that changed elsewhere', () => {
    const typed = { ...loaded, bank: { ...loaded.bank, account: '3' } };
    const latest = { ...loaded, bank: { sortCode: '40-11-22', account: '2' } };
    expect(followUntouched(loaded, typed, latest).bank).toEqual({ sortCode: '40-11-22', account: '3' });
  });

  it('keeps what was typed where the same field also changed elsewhere', () => {
    const typed = { ...loaded, name: 'Mine' };
    const latest = { ...loaded, name: 'Theirs' };
    expect(followUntouched(loaded, typed, latest).name).toBe('Mine');
  });
});
