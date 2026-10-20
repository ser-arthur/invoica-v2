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

  it('counts an empty field and a field stored as nothing as the same, so a field cleared here still follows', () => {
    const loaded = { sortCode: null as string | null, account: '1' };
    // Cleared and saved here: the form holds '', the server keeps null.
    const typed = { sortCode: '', account: '1' };
    const latest = { sortCode: '40-11-22', account: '1' };
    expect(followUntouched(loaded, typed, latest).sortCode).toBe('40-11-22');
  });

  it('goes into details that were missing when the page opened', () => {
    const loaded = { name: 'Studio', bank: undefined as { sortCode?: string; account?: string } | undefined };
    const typed = { name: 'Studio', bank: { sortCode: '40-11-22' } };
    const latest = { name: 'Studio', bank: { account: '87654321' } };
    expect(followUntouched(loaded, typed, latest).bank).toEqual({
      sortCode: '40-11-22',
      account: '87654321',
    });
  });
});
