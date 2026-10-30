# 0015: The app draws its own dropdowns, dates, colours, checkboxes and radio buttons

## Context

The app used the browser's own select, date and colour inputs, and its checkboxes and radio buttons. Each browser draws
them its own way: the date field showed "mm/dd/yyyy" in a US browser, the colour input opened the operating system's
picker, and an open select's list ignored the app's type, colours and Night. The owner asked on 29 October (17:34) for
every dropdown and similar control to be the app's own, and chose that on a phone a dropdown or a calendar opens as a
sheet from the foot of the screen (`docs/specs/form-errors-and-controls.md`).

## Decision

- `apps/web/src/components/controls/` holds the app's own controls: `Select` (a dropdown written like a select, with
  `<option>` children and a change whose `target.value` is the choice, so pages read it as before), `DateField`
  (typed or chosen from a month calendar; the value is always a calendar date or empty), `ColourField` (a square, a
  strip, the website's eight colours and the code), and `Popup`, the panel they open.
- The panel is shown in the browser's top layer with the Popover API, so a dialog that scrolls does not cut it off, and
  it stays in the document where it is written, so a dialog counts it as inside for Tab and Escape. Below 640 pixels
  wide it is a sheet from the foot of the screen.
- They follow the WAI-ARIA patterns: a select-only combobox with a listbox (with a search field for lists longer than
  twelve), a date picker dialog with a grid, and sliders for the colour picker. Focus returns to the field when they
  close, and Escape inside a dialog closes the panel first.
- Checkboxes and radio buttons stay real inputs, drawn by the app's base stylesheet (`globals.css`); the website,
  marked `data-site`, draws its own.
- Two things stay the browser's or the computer's: the question asked when a tab with changes not saved is closed or
  reloaded (no site can change it), and the window for choosing a logo file.

## Consequences

- The end-to-end tests choose in a dropdown as a person does, through `choose()` and `optionsOf()` in
  `apps/web/e2e/helpers.ts`, and read a dropdown's or a date's value from its `data-value`.
- `apps/web/e2e/controls.spec.ts` checks that no page of the app holds a control the browser draws.
- A new dropdown is written with `Select` from `components/ui.tsx`, and a new date with `DateField`; a plain `select`
  or `input type="date"` fails that test.
