const EVENT = 'invoica:notice';

/**
 * Shows a message at the foot of the screen, for buttons that have no space of their own to say something went
 * wrong (Mark as sent, Archive). The app shell's `Notices` displays it.
 */
export function showNotice(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function onNotice(listener: (message: string) => void) {
  const handle = (e: Event) => listener((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handle);
  return () => window.removeEventListener(EVENT, handle);
}
