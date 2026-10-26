import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@invoica/core';
import { renderDocumentHtml } from '../src/index';
import { FIXTURES } from './fixtures';

/** The colour the last rule for `selector` that sets one gives it, with a custom property looked up in `:root`. */
function colourOf(html: string, selector: string): string {
  const rules = html.matchAll(new RegExp(`(?:^|[}\\n])${selector.replace('.', '\\.')}\\{([^}]*)\\}`, 'g'));
  const values = [...rules].map((m) => /(?:^|;)color:([^;]+)/.exec(m[1] ?? '')?.[1]?.trim()).filter(Boolean);
  const value = values.at(-1) ?? '';
  const prop = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return prop ? (new RegExp(`${prop}:(#[0-9a-fA-F]{6})`).exec(html)?.[1] ?? '') : value;
}

describe('large type in the brand colour reads on white with a pale brand colour', () => {
  const pale = '#f2d33b';
  const s = FIXTURES.ukVat!;
  it.each([['riso', '.no']])('%s %s', (template, selector) => {
    const html = renderDocumentHtml(
      { ...s, template, seller: { ...s.seller, brandColour: pale } },
      { fontUrl: (f) => f },
    );
    const colour = colourOf(html, selector);
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastRatio(colour, '#ffffff')).toBeGreaterThanOrEqual(3);
  });
});
