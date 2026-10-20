import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False in the server's HTML and until the page's script has taken over, then true. A form whose submit button
 * waits for it cannot be sent by the browser itself, which would put what was typed, a password included, in the
 * address.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
