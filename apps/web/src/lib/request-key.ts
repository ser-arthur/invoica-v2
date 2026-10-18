/** A fresh key for one request, so the server can recognise a repeat of exactly that request. */
export function requestKey(): string {
  return crypto.randomUUID();
}
