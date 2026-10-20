# Email verification and password reset

Status: approved 19 October 2026 (open question 16 of session 1). Closes review 6, R6-L2: sign-up no longer says whether an address already has an account.

## What a person sees

- **Creating an account.** After "Create account", the page says a link has been sent to the address given and offers to send it again. Nothing else happens until the link is opened. The link opens a page that names the address and asks for the password chosen at sign-up; the right password confirms the address, signs in and opens onboarding. A wrong one says "That is not the password for this account." and confirms nothing. The link works for 24 hours.
- **An address that already has an account.** Sign-up shows exactly the same page. The owner of the address receives an email saying an account already exists, with links to sign in and to reset the password.
- **Signing in before confirming.** The correct password is not enough: the page says the email address needs confirming and that a new link has been sent.
- **A link that has expired or is broken.** The page says so and offers to send a new one. A link opened again once the address is confirmed opens sign-in, which says the address is confirmed (or the app, when already signed in).
- **Forgotten password.** "Forgot your password?" on the sign-in page leads to a form for an email address. Whatever address is given, the page says that if an account uses it, a link has been sent. The link opens a page to choose a new password; it works for one hour and once only. Changing the password signs the account out everywhere and emails the owner to say it changed. The sign-in page then says the password has changed.

## Rules

1. An account can sign in only once its email address is confirmed (Better Auth `requireEmailVerification`). Demo accounts are created confirmed. The address is confirmed only by someone who opens the link and gives the account's password (`/api/auth/confirm-email`, in `apps/web/src/lib/auth-confirm.ts`), which then signs them in. Once the address is confirmed, the link signs nobody in, whatever password comes with it (sign-in does that), and the page goes on to sign-in. So someone who signs up with another person's address cannot have it confirmed by that person's click, and the account stays unusable. Opening the link confirms nothing by itself. Better Auth's own route that confirms on opening is switched off, and its links, in the form sent before, open the same page that asks for the password. The page sends no referrer, since its address carries the link's token. Asking for the password at confirmation has the same limit as sign-in, three tries every ten seconds per address of the requester, and is refused from another site as sign-in is.
2. Sign-up answers the same way for a new address and an existing one, and takes about as long.
3. A reset request answers the same way for any address, and sends an email only to an address with an account.
4. Every email is sent after the response, so the time a request takes does not depend on whether an email was sent. A send that fails is retried twice; after that the person can ask again. This includes a new confirmation link, whose route waits for its sender: the sender hands the email on and returns at once (`sendLater`).
5. Reset links last one hour and work once; confirmation links last 24 hours. A reset ends every session of the account.
6. Requests that send email are limited per address of the requester: three a minute for resets and new links, three every ten seconds for sign-up and sign-in (Better Auth's defaults).
7. The name given at sign-up is optional, one line, at most 100 characters, with no control or invisible characters other than the zero-width non-joiner and joiner that Persian, Sinhala and other scripts use inside words; it is checked before the address is looked up, so the answer is the same for new and existing addresses. The confirmation email does not use it ("Hello,"): whoever signed up chose it, and the address is not confirmed yet. No sign-in email uses it: the reset, existing-account and password-changed emails greet no one by name either, since confirming the address does not show who chose the name (`apps/web/src/lib/auth-emails.test.ts`, `sign-up-name.test.ts`).
8. A form's button stays unavailable until the page's script has started, here and on every form in the app, so the browser never sends a form by itself: it would put what was typed, a password included, in the page's address.

## Acceptance criteria

Each is an end-to-end test against the development mailbox (`apps/web/e2e/sign-in-by-email.spec.ts`), with the email texts checked by a unit test.

1. Sign-up shows "Check your email"; the dashboard is not reachable; the link from the email asks for the password, and the right one confirms the address and opens onboarding.
2. Signing up again with the same address shows the same page and sends "You already have an Invoica account" to that address; no second account is made.
3. Signing in before confirming says the address needs confirming and sends a new link.
4. A broken confirmation link says the link has expired or been used, asks for no password, and a new one can be sent from that page. Opened again once the address is confirmed, the link opens the app when signed in and sign-in ("Your email address is confirmed. Sign in to continue.") when not, and the link with the right password is refused (`ALREADY_CONFIRMED`) and signs nobody in.
5. A reset request for an unknown address shows the same message as for a known one and sends nothing.
6. A reset link sets a new password; the old password no longer works and the new one does; the link does not work a second time; the owner receives "Your Invoica password was changed".
7. A name over two lines is refused alike for a new address and an existing one; the confirmation email greets no one by name.
8. When someone signs up with another person's address and that person opens the link, it asks for a password they do not know; a guess and the link in its earlier form confirm nothing, nobody is signed in, and the person who signed up still cannot sign in.
9. A wrong password on the confirmation page says so and confirms nothing; the right one then confirms and signs in.
10. Confirming with the password from another site is refused; a token changed by hand is refused as a broken link; a fourth try within ten seconds from one address waits, even with the right password; none of it confirms the address.
11. With the page's script not running, the sign-in button is unavailable and pressing Enter sends nothing.
12. The owner of an address someone else signed up with takes the account over: signing up again sends the existing-account email, a reset sets the owner's own password, signing in sends a new link which that password confirms, and the other person's password no longer works.
13. The confirmation page sends no referrer.
14. Confirmed in another tab while the page is open, the page goes on to sign-in when its form is sent.

The links and the tokens themselves (an expired token, one signed with another secret, one that would change an address): `apps/web/src/lib/confirmation-link.test.ts`.
