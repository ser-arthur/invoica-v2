import { describe, expect, it } from 'vitest';
import { secondColour } from '@invoica/core';
import { buildView } from '../src/index';
import { FIXTURES } from './fixtures';

/** Acceptance criterion 8: docs/specs/invoice-templates.md. */

describe('the second colour and the logo’s ground in the view', () => {
  it('come from the snapshot when it has them', () => {
    const s = FIXTURES.ukVat!;
    const v = buildView({ ...s, seller: { ...s.seller, accentColour: '#2b0b3f', logoGround: 'cream' } });
    expect([v.accentColour, v.logoGround]).toEqual(['#2b0b3f', 'cream']);
  });

  it('a snapshot issued before them has the second colour worked out and a white ground', () => {
    const s = FIXTURES.ukVat!;
    const {
      accentColour: _a,
      logoGround: _g,
      ...older
    } = { ...s.seller, accentColour: undefined, logoGround: undefined };
    const v = buildView({ ...s, seller: older });
    expect([v.accentColour, v.logoGround]).toEqual([secondColour(s.seller.brandColour), 'white']);
  });
});
