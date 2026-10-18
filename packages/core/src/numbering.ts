import { DomainError } from './errors';

export type DocumentKind = 'invoice' | 'credit_note';

export interface NumberingRule {
  /** Printed before the sequence, for example "INV-". Letters, digits, "-", "/" and "." only. */
  prefix: string;
  /** Minimum digits; the sequence is padded with zeros. */
  padding: number;
}

export const DEFAULT_NUMBERING: Record<DocumentKind, NumberingRule> = {
  invoice: { prefix: 'INV-', padding: 4 },
  credit_note: { prefix: 'CN-', padding: 4 },
};

export function validatePrefix(prefix: string): string | null {
  if (prefix.length > 12) return 'A prefix can be at most 12 characters.';
  if (!/^[A-Za-z0-9\-/.]*$/.test(prefix)) return 'A prefix can use letters, digits, "-", "/" and "." only.';
  return null;
}

/** The number printed on a document. Sequences start at 1 and are assigned at issue, without gaps. */
export function formatDocumentNumber(rule: NumberingRule, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new DomainError('sequence_invalid', 'A document sequence starts at 1.');
  }
  const problem = validatePrefix(rule.prefix);
  if (problem) throw new DomainError('prefix_invalid', problem);
  if (!Number.isInteger(rule.padding) || rule.padding < 1 || rule.padding > 8) {
    throw new DomainError('padding_invalid', 'Padding must be between 1 and 8 digits.');
  }
  return `${rule.prefix}${String(sequence).padStart(rule.padding, '0')}`;
}
