# The theme, saved on the account

A person chooses Light, Dark or System under Appearance in the app. Until now the choice was remembered by the device
it was made on only, so a second device, or the same person signing in on a new laptop, opened in Light. The owner
asked on 27 October (13:01) that a theme chosen in the account carries to every device, and said yes to this design at
14:22.

## What the person sees

Dark chosen on a laptop. On a phone that has never been signed in, the sign-in page is the light one (E,
`docs/specs/website-showcase.md`), as it is for any visitor. Signing in there opens the app in Night, and from then on
the phone remembers it: after signing out, its sign-in page is Night (F). Changing the theme on the phone carries back
to the laptop the next time a page of the app opens there.

## Rules

1. Choosing Light, Dark or System under Appearance saves the choice on the account, and on this device at once.
2. The app opens in the account's theme on any device the person signs in on, and that device remembers it, so its
   sign-in pages follow it after signing out.
3. Opening the app on a device that remembers an older choice (one changed on another device since) shows the account's,
   and the device remembers the account's from then on.
4. System means each device follows its own setting: dark on a device set to dark, light on one set to light.
5. A device that has never been signed in on shows the light sign-in. An account that has never chosen a theme leaves
   each device as it is.
6. The theme belongs to the person, not to a business: it is the same in every business they belong to, and no one else
   can see or change it. The database holds it in a place of its own, `user_preference`, with a row rule of its own: a
   row is seen and written only by the person it belongs to (`docs/decisions/0014-theme-on-the-account.md`).
7. Removing a person's account removes the theme saved with it.
8. A lookup of the account's theme that fails does not stop a page: it shows the device's theme.

## Acceptance criteria

Database tests in `packages/db/test/preferences.test.ts`; end to end in `apps/web/e2e/theme-on-the-account.spec.ts`.

1. A person's saved theme reads back, a new person has none, and saving again replaces it.
2. Another person can neither read a person's theme nor change it, and no one can write a row for someone else.
3. The database refuses a theme other than light, dark and system.
4. Removing the person removes their theme.
5. `packages/db/test/tenancy.test.ts` names the new place, its row rule and what the app may do with it.
6. Dark chosen on one device; a second device shows the light sign-in; signing in there opens the app in Night; after
   signing out, its sign-in page is Night.
7. A theme changed on the second device shows on the first when a page of the app next opens there, and the first then
   remembers it.
8. System on the account is dark on a device set to dark and light on one set to light.
