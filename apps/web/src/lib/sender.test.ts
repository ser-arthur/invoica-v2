import { describe, expect, it } from 'vitest';
import { messageSender, senderFor } from './sender';

/** The From of an invoice or reminder: the business's name, "via Invoica", and Invoica's sending address. */

const FROM = 'Invoica <invoices@send.invoica.example>';

describe('senderFor', () => {
  it('names the business before Invoica’s address', () => {
    expect(senderFor('Harrow Studio', FROM)).toBe(
      'Harrow Studio via Invoica <invoices@send.invoica.example>',
    );
  });

  it('quotes a name with a comma or other special characters, so it reads as one name', () => {
    expect(senderFor('Mensah, Owusu & Co.', FROM)).toBe(
      '"Mensah, Owusu & Co. via Invoica" <invoices@send.invoica.example>',
    );
    expect(senderFor('Ama "the Studio" Ltd', FROM)).toBe(
      '"Ama \\"the Studio\\" Ltd via Invoica" <invoices@send.invoica.example>',
    );
    expect(senderFor('Back\\slash (UK)', FROM)).toBe(
      '"Back\\\\slash (UK) via Invoica" <invoices@send.invoica.example>',
    );
  });

  it('a name cannot add a line, an address or another sender', () => {
    const from = senderFor('Evil <ceo@bank.example>\r\nBcc: all@example.com', FROM);
    expect(from).not.toMatch(/[\r\n]/);
    expect(from.endsWith(' <invoices@send.invoica.example>')).toBe(true);
    expect(from.match(/</g)).toHaveLength(1);
  });
});

/** docs/specs/email-status.md, rule 5: who an invoice or reminder email comes from, and where replies go. */
describe('messageSender', () => {
  it('names the business as it is now, with replies to its email now', () => {
    expect(
      messageSender(
        { name: 'Second Name Studio', email: 'new-desk@studio.example' },
        'old@studio.example',
        FROM,
      ),
    ).toEqual({
      from: 'Second Name Studio via Invoica <invoices@send.invoica.example>',
      replyTo: 'new-desk@studio.example',
    });
  });

  it('sends replies to the email printed on the document when the business has none now, and nowhere with neither', () => {
    expect(messageSender({ name: 'Studio', email: null }, 'printed@studio.example', FROM).replyTo).toBe(
      'printed@studio.example',
    );
    expect(messageSender({ name: 'Studio', email: '  ' }, 'printed@studio.example', FROM).replyTo).toBe(
      'printed@studio.example',
    );
    expect(messageSender({ name: 'Studio', email: null }, null, FROM).replyTo).toBeNull();
  });
});
