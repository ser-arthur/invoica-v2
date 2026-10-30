/**
 * After a form refuses a save, moves focus to the first field marked invalid once the page has drawn the marks: in
 * the open dialog when there is one, otherwise in the page, (docs/specs/form-errors-and-controls.md). The field is
 * brought to the middle of the screen, clear of the sticky header.
 */
export function focusFirstInvalid() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const scope =
        document.querySelector('[role="dialog"][aria-modal="true"]') ?? document.querySelector('main');
      // A field marked invalid, or the first control of a part marked as needing attention (a line of an invoice).
      const field = scope?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid] :is(input, textarea, select, button[role="combobox"])',
      );
      if (!field) return;
      field.focus({ preventScroll: true });
      field.scrollIntoView({ block: 'center' });
    }),
  );
}
