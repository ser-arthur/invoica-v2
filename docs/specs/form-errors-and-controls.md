# Form errors, and Invoica's own controls

The owner's notes of 29 October 2026, 17:34: the errors on sign in and create account read like console logs (the
sign-in service's own words, such as "[body.email] Invalid email address" and "Invalid origin"); a pass over error
handling across the app; every dropdown and similar control designed for the app instead of the browser's; and the
same for every alert. His answers that evening: on phones a dropdown or a date picker opens as a sheet from the bottom of
the screen; the browser's own "Leave site?" question, asked when a tab with changes not saved is closed or reloaded,
stays (no website can change how it looks), and links inside the app keep asking in the app's own dialog
(`docs/specs/unsaved-changes.md`).

## Errors in plain words

### Sign in, create account and the password pages

- Before anything is sent, the form checks its own fields. Each problem shows under its field, in the danger colour;
  the field is marked invalid (`aria-invalid`, described by its message), the first such field takes focus, and
  nothing is sent until they are right. A field's message goes when the field is changed.
  - Your name, empty: "Enter your name."
  - Email, empty: "Enter your email address." Without an @ and a domain after it: "Enter the whole email address,
    with the @ and the part after it."
  - Password, empty: "Enter your password." On create account and the new password page, shorter than 10 characters:
    "Use at least 10 characters." Longer than 128: "Use 128 characters or fewer."
- What the sign-in service answers is always put into Invoica's words; its own wording never reaches the page.
  - An email and password that do not match, however the service says it: "That email and password do not match an
    account."
  - An address not confirmed yet: "Confirm your email address first. We have sent you a new link."
  - Too many attempts: "Too many attempts. Wait a minute, then try again."
  - The service refusing the email or the password: the message under that field, as above.
  - A link that has expired or been used: the page for an expired link, as before.
  - No answer at all: "Invoica could not be reached, so this may not have been saved. Check your connection, then try
    again." (as everywhere else in the app).
  - Anything else: "Something went wrong at our end. Try again in a moment."

### In the app

- A message the app shows about a record comes from one of three places: the product's own rules (`DomainError`), a
  database guard whose words were written for the people using Invoica (a list kept in
  `apps/web/src/lib/actions/result.ts`), or "Something went wrong and nothing was saved. Try again." Anything else,
  such as a guard written for developers, shows the last and is logged without its data.
- A form that refuses a save marks each field at fault with its message under it, says "Check the highlighted
  fields." above the button, and moves focus to the first field at fault.
- Signing out that fails says so in Invoica's words: "Signing out did not work. Try again."

## Invoica's own controls

### Dropdowns

- Every dropdown in the app (26 of them: country, currency, time zone, business type, client, tax, payment method and
  the rest) is Invoica's own. Closed, it looks like the app's other fields: the chosen option and a chevron.
- On a wide screen it opens as a list under the field (above it, when there is not room below), at least as wide as
  the field, with the chosen option ticked. On a phone (narrower than 640 pixels) it opens as a sheet from the bottom
  of the screen with the field's name as its title, rows at least 44 pixels tall, and a dimmed page behind it.
- Lists of more than 12 options (countries, currencies, time zones, clients) have a search field at the top that
  narrows the list as you type, matching any part of an option's words; "No matches" when nothing does.
- Mouse and touch: a click or tap opens it, a click on an option chooses it and closes it, a click outside closes it
  and changes nothing.
- Keyboard: Enter, Space, Alt+Down and the arrow keys open it; the arrows, Home and End move through the options;
  typing letters jumps to the next option starting with them; Enter chooses; Escape closes it without changing
  anything (inside a dialog, Escape closes the list and not the dialog); Tab chooses nothing and moves on. Focus
  returns to the field when it closes.
- Screen readers: the field is a combobox named by its label, saying the chosen option; the list is a listbox named
  the same, its options saying which is chosen.
- In a form, the chosen value is sent under the field's name as before.

### Dates

- Every date field (issue date, due date, supply date and period, a line's date, a payment's and a refund's date) is
  Invoica's own. It shows the date as "31 Dec 2026".
- A calendar button in the field opens a month calendar (a sheet on a phone) on the chosen date's month, or today's,
  with the chosen day marked, today outlined, and days outside the allowed range (a payment cannot be dated later
  than today) shown faint and refused. Previous and next month buttons; "Today" when today is allowed.
- Keyboard in the calendar: arrows move a day or a week, Page Up and Page Down a month, Home and End the start and end
  of the week; Enter chooses; Escape closes it without changing anything.
- A date can also be typed: "31/12/2026", "31 Dec 2026", "31 December 2026" and "2026-12-31" are all read as the 31st
  of December 2026. Something that is not a date marks the field invalid and says "Enter a date, like 31/12/2026."
- The value sent and saved is the calendar date (`YYYY-MM-DD`), as before.

### Colours

- The brand colour and the second colour in Settings are Invoica's own picker: a swatch and the colour's code; it
  opens a panel (a sheet on a phone) with a square for shade and brightness, a strip for hue, the website's eight
  colours, and the code to type. Arrow keys move the square's and the strip's markers.

### Checkboxes and radio buttons

- Drawn by the app: a rounded box or a circle in the field border colour, filled with the brand colour and a white
  tick or dot when chosen, with the app's focus ring. They stay real checkboxes and radio buttons, so forms, keyboards
  and screen readers use them as before.

### What stays the browser's or the computer's

- The "Leave site?" question when a tab with changes not saved is closed or reloaded (above).
- The window for choosing a logo file is the computer's own; the button that opens it is the app's.
- The app shows no `alert`, `confirm` or `prompt` box anywhere; every question is the app's own dialog.
- No browser validation bubbles ("Please fill out this field"): every form checks its own fields and says what is
  wrong in its own words.

## Acceptance criteria

End-to-end in `apps/web/e2e/form-errors.spec.ts` and `apps/web/e2e/controls.spec.ts`, unit in `apps/web`.

1. Create account sent empty shows "Enter your name.", "Enter your email address." and "Enter your password." under
   their fields, marks them invalid, moves focus to Your name, and sends nothing to the sign-in service.
2. Create account with "not-an-email" and a 5 character password shows the email and the password messages under
   their fields and sends nothing; no message on the page contains "[body." or the service's own wording.
3. Sign in sent empty shows the email and password messages and sends nothing; a wrong password shows "That email and
   password do not match an account."
4. An answer the form does not know (the service refusing the page's origin, or failing) shows "Something went wrong
   at our end. Try again in a moment." and never the service's words; on forgot password and on the new password page
   as well.
5. Forgot password with "not-an-email" shows the email message under the field and sends nothing.
6. Unit: every answer of the sign-in service maps to Invoica's words, and an unknown one to the general sentence;
   the service's message is never returned. A database guard's words reach the page only when they are on the list.
7. No page of the app (dashboard, invoices, a new invoice, an invoice with its payment, credit and refund dialogs
   open, clients, a new client, items, settings, onboarding) holds a `select`, an `input` of type `date` or `color`,
   or a checkbox or radio button drawn by the browser.
8. Bill to opens with a click and lists the clients; choosing one fills the invoice's client. With the keyboard:
   focus, Down opens, typing jumps, Enter chooses; Escape closes and leaves the value; focus returns to the field.
9. Country in Settings: typing "gha" in the search leaves Ghana alone in the list; choosing it saves Ghana.
10. On a phone the dropdown opens as a sheet at the bottom of the screen, the full width, titled with the field's
    name; a tap outside closes it.
11. A due date chosen in the calendar shows as "31 Dec 2026" and is saved as `2026-12-31`; arrows move the day; Escape
    closes it; a typed "31/12/2026" is read the same; a payment cannot be dated after today.
12. The brand colour chosen from the picker's swatches, or typed as a code, changes the colour and is saved.
13. The automated accessibility checks pass with a dropdown, the calendar and the colour picker open, in light and
    in Night.
14. Inside a dialog, Escape closes an open dropdown and leaves the dialog open.
