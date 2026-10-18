import { describe, expect, it } from 'vitest';
import { formatDocumentNumber, validatePrefix } from '../src/numbering';

describe('document numbers', () => {
  it('pads the sequence after the prefix', () => {
    expect(formatDocumentNumber({ prefix: 'INV-', padding: 4 }, 1)).toBe('INV-0001');
    expect(formatDocumentNumber({ prefix: 'INV-', padding: 4 }, 12345)).toBe('INV-12345');
    expect(formatDocumentNumber({ prefix: '', padding: 1 }, 7)).toBe('7');
    expect(formatDocumentNumber({ prefix: '2026/', padding: 3 }, 7)).toBe('2026/007');
  });

  it('refuses sequences below 1 and unsafe prefixes', () => {
    expect(() => formatDocumentNumber({ prefix: 'INV-', padding: 4 }, 0)).toThrow();
    expect(validatePrefix('INV <script>')).not.toBeNull();
    expect(validatePrefix('ACME-INV-2026-X')).not.toBeNull();
    expect(validatePrefix('INV-')).toBeNull();
  });
});
