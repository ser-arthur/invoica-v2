/**
 * The From of an email sent for a business: "Harrow Studio via Invoica <invoices@…>", at Invoica's own sending
 * address (`from`, the EMAIL_FROM setting). The business's name is kept to one line without angle brackets, and
 * quoted when it has characters that would otherwise split it (a comma reads as a second address).
 */
export function senderFor(businessName: string, from: string): string {
  const address = /<([^<>]+)>\s*$/.exec(from)?.[1] ?? from;
  const name = `${businessName
    .replace(/[\p{Cc}\p{Cf}<>]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()} via Invoica`;
  const display = /[()<>[\]:;@\\,."]/.test(name) ? `"${name.replace(/["\\]/g, '\\$&')}"` : name;
  return `${display} <${address}>`;
}

/**
 * Who an invoice or reminder email comes from (docs/specs/email-status.md, rule 5): the business as it is now, with
 * replies to its email now, or to the one printed on the document when the business has none. The attached PDF is
 * the document as it was issued.
 */
export function messageSender(
  now: { name: string; email: string | null },
  printed: string | null,
  from: string,
): { from: string; replyTo: string | null } {
  return { from: senderFor(now.name, from), replyTo: now.email?.trim() || printed?.trim() || null };
}
