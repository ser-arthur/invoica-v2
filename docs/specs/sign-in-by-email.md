# Email verification and password reset

Status: approved 19 October 2026 (open question 16 of session 1). Closes review 6, R6-L2: sign-up no longer says whether an address already has an account.

## What a person sees

- **Creating an account.** After "Create account", the page says a link has been sent to the address given and offers to send it again. Nothing else happens until the link is opened. The link confirms the address and opens the sign-in page, which says so; signing in with the password chosen at sign-up opens onboarding. It works for 24 hours.
- **An address that already has an account.** Sign-up shows exactly the same page. The owner of the address receives an email saying an account already exists, with links to sign in and to reset the password.
- **Signing in before confirming.** The correct password is not enough: the page says the email address needs confirming and that a new link has been sent.
- **A link that has expired or been used.** The page says so and offers to send a new one.
- **Forgotten password.** "Forgot your password?" on the sign-in page leads to a form for an email address. Whatever address is given, the page says that if an account uses it, a link has been sent. The link opens a page to choose a new password; it works for one hour and once only. Changing the password signs the account out everywhere and emails the owner to say it changed. The sign-in page then says the password has changed.

## Rules

1. An account can sign in only once its email address is confirmed (Better Auth `requireEmailVerification`). Demo accounts are created confirmed. Opening the link confirms the address and signs nobody in (`autoSignInAfterVerification` off): whoever opens it still needs the password, so someone who signs up with another person's address never gets that person signed in to an account whose password they did not choose.
2. Sign-up answers the same way for a new address and an existing one, and takes about as long.
3. A reset request answers the same way for any address, and sends an email only to an address with an account.
4. Every email is sent after the response, so the time a request takes does not depend on whether an email was sent. A send that fails is retried twice; after that the person can ask again. This includes a new confirmation link, whose route waits for its sender: the sender hands the email on and returns at once (`sendLater`).
5. Reset links last one hour and work once; confirmation links last 24 hours. A reset ends every session of the account.
6. Requests that send email are limited per address of the requester: three a minute for resets and new links, three every ten seconds for sign-up and sign-in (Better Auth's defaults).
7. The name given at sign-up is optional, one line, at most 100 characters, with no control or invisible characters other than the zero-width non-joiner and joiner that Persian, Sinhala and other scripts use inside words; it is checked before the address is looked up, so the answer is the same for new and existing addresses. The confirmation email does not use it ("Hello,"): whoever signed up chose it, and the address is not confirmed yet. No sign-in email uses it: the reset, existing-account and password-changed emails greet no one by name either, since confirming the address does not show who chose the name (`apps/web/src/lib/auth-emails.test.ts`, `sign-up-name.test.ts`).

## Acceptance criteria

Each is an end-to-end test against the development mailbox (`apps/web/e2e/sign-in-by-email.spec.ts`), with the email texts checked by a unit test.

1. Sign-up shows "Check your email"; the dashboard is not reachable; the link from the email confirms the address and opens sign-in ("Your email address is confirmed. Sign in to continue."), and signing in opens onboarding.
2. Signing up again with the same address shows the same page and sends "You already have an Invoica account" to that address; no second account is made.
3. Signing in before confirming says the address needs confirming and sends a new link.
4. A used or broken confirmation link says the link has expired or been used, and a new one can be sent from that page.
5. A reset request for an unknown address shows the same message as for a known one and sends nothing.
6. A reset link sets a new password; the old password no longer works and the new one does; the link does not work a second time; the owner receives "Your Invoica password was changed".
7. A name over two lines is refused alike for a new address and an existing one; the confirmation email greets no one by name.
8. When someone signs up with another person's address and that person opens the link, the address is confirmed and nobody is signed in.
