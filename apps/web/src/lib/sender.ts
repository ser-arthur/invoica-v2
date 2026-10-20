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
