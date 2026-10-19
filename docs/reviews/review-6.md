# Invoica: independent review of the web layer (review 6)

Reviewer: Claude, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and commit

This review covers commit `4e2f3d0` (the current HEAD: "docs: review 5 with its resolution; blueprint and handover after phase 2m"). It is about the web layer and everything a signed-in or anonymous person can reach over HTTP, so the money calculations and the database guards covered by reviews 1 to 5 are taken as given and only re-checked where a request reaches them. In order of priority:

1. Authorisation on every server action in `apps/web/src/lib/actions/*.ts` and on the route handlers `files/[id]/route.ts`, `(app)/invoices/[id]/pdf/route.ts`, `(app)/settings/export/route.ts`, `api/jobs/drain/route.ts`, `doc-fonts/[file]/route.ts` and `api/auth/[...all]/route.ts`.
2. Sessions and auth: `apps/web/src/lib/auth.ts`, `session.ts`, `workspace.ts`, the sign-in, sign-up and onboarding pages and actions.
3. Input handling: schema validation, the logo upload, path traversal, HTML injection into the rendered document and the PDF, CSV injection in the export, and email header injection.
4. Headers and framing (`apps/web/next.config.ts`), redirects, server-action exposure and error messages.

The repository is at `4e2f3d0` with nothing later, so the pinned export and HEAD are the same tree. Every probe ran against an export of `4e2f3d0` made with `git archive` at `/home/claude/review/round6/pinned`, built for production (`next build`) and served with `next start` on port 3100 against a fresh database. `node_modules` in the export are copies of the repository's installed packages with the same `@invoica/*` workspace links, so the pinned web app runs its own code against the pinned packages.

Line numbers are for `4e2f3d0`.

## What was run, and how to rerun it

The pinned app was built and served on port 3100 against a fresh database `invoica_review6` (provisioned and migrated from the pinned `packages/db`), with `FILE_STORAGE_DIR` and `MAILBOX_DIR` under `/home/claude/review/round6` and `NODE_ENV=production`. A small HTTP client (`probes/lib.mts`) signs in through Better Auth and calls server actions exactly as the browser does, by encoding the arguments with the app's own React flight encoder and sending the action id from the build's `server-reference-manifest.json`.

| Probe | File | What it does |
| --- | --- | --- |
| Setup | `probes/setup.mts` | Two businesses (Alice/Alpha, Bob/Bravo) each with a client, tax code, item, a draft, two issued invoices, a part payment and a logo; a user with no business (Carol); a user with two businesses (Dan). Writes `state.json`. |
| Tenancy | `probes/tenancy.mts` | Bob calls every route and every action with Alice's ids (client, tax code, item, line, payment, draft, invoice, logo), and exports with the organisation cookie forced to Alice's. Snapshots Alice's data before and after. Output `tenancy.json`. |
| Anonymous, no-org, origin, drain | `probes/anon.mts` | Every route and a set of actions with no session and as a user with no business; server actions from a forged Origin, with a forged `X-Forwarded-Host`, and with no Origin; Better Auth from a forged Origin; the drain route with no, wrong, multibyte and right secret. Output `anon.json`. |
| Rate limit | `probes/ratelimit.mts` | Repeated wrong-password sign-ins and repeated sign-ups, with no `X-Forwarded-For`, with a fresh one each time, and with two-value headers. Output `ratelimit.json`. |
| Sessions and enumeration | `probes/auth.mts` | Cookie flags, sign-in response and timing for a known vs unknown email, sign-up of an existing email, sign-out revocation, a tampered session signature, which Better Auth endpoints answer, short-password sign-up. Output `auth.json`. |
| Injection | `probes/inject.mts` | An invoice whose client name, line title, description, reference, notes and terms carry `<script>` and `onerror` payloads; reads the on-screen HTML and the kept PDF. Output `inject.json`, `inject-screen-slice.txt`. |
| Upload, CSV, email, traversal | `probes/misc.mts` | SVG and HTML logos declared as PNG, an oversize image, a real PNG; CSV export of clients whose names begin with formula characters; a sent email read back from the mailbox, and a `To` with a CRLF; path traversal on the fonts and files routes. Output `misc.json`. |

How to rerun:

- Start Postgres if needed (the command in the brief), then `cd /home/claude/review/round6/scripts && .../tsx db-setup.mts create` to make `invoica_review6`, and `db-setup.mts drop` to remove it.
- Build once: `cd /home/claude/review/round6/pinned/apps/web && node_modules/.bin/next build`.
- Serve: `/home/claude/review/round6/start-server.sh` (reads `server.env`).
- Run each probe with the pinned tsx: `cd /home/claude/review/round6/probes && /home/claude/review/round6/pinned/apps/web/node_modules/.bin/tsx <probe>.mts`, `setup.mts` first.
- Database sanity: `cd /home/claude/review/round6/pinned/packages/db && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres node node_modules/vitest/vitest.mjs run --no-file-parallelism tenancy schema-drift` (13 passed).

The review database was dropped and the server stopped at the end. The `invoica` and `invoica_demo` databases were not touched. The builder's development server on port 3000 was left running.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 1 | R6-M1 |
| Low | 5 | R6-L1 to R6-L5 |

Tenancy is sound. In the tenancy probe Bob could not read, change or download any of Alice's records through any route or action: every cross-business id gave "Not found" or a domain refusal, Alice's exported data was byte for byte unchanged after twenty attempts, and an organisation cookie forced to Alice's organisation still returned only Bob's data. Row-level security, the composite foreign keys and the per-request membership check in `withOrganisation` all held. An anonymous visitor reached nothing but the landing page, the auth pages, the onboarding redirect and the fonts. The document HTML and the PDF escape every injected value, the PDF renders with JavaScript off and no network, the logo upload sniffs bytes and rejects SVG, the CSV neutralises formulas, email headers are encoded and a CRLF address is refused, and the fonts and files routes refuse traversal. The job drain route needs its secret.

What remains:

- **R6-M1.** The sign-in and sign-up rate limit is keyed on a client IP taken from the `X-Forwarded-For` header, with no trusted-proxy configuration. An attacker who sets the header gets a fresh bucket per value, so online password guessing and repeated sign-ups are not limited; a two-value header collapses everyone onto one shared bucket, which can lock sign-in for all users.
- **R6-L1.** `archiveItem` and `archiveTaxCode` do not check that the row was theirs, so archiving another business's (or a non-existent) id reports success and writes an audit entry naming that id. Nothing of the other business changes.
- **R6-L2.** Sign-up discloses whether an email already has an account.
- **R6-L3.** No Content-Security-Policy, Strict-Transport-Security or Permissions-Policy on any response.
- **R6-L4.** The drain route throws a 500 instead of a clean 401 for an authorization value of the right character length but a different byte length.
- **R6-L5.** Cookie and server-action protection depend on deployment settings the code does not pin: the session cookie's Secure flag follows the scheme of `BETTER_AUTH_URL`, and server actions are accepted when a request carries no Origin header.

---

## Findings

### R6-M1. Brute-force protection on sign-in and sign-up is bypassable through `X-Forwarded-For`

- **Severity:** medium
- **Where:**
  - `apps/web/src/lib/auth.ts:33`: `rateLimit: { enabled: true, window: 60, max: 30 }`, and the absence of any `advanced.ipAddress` configuration in the `betterAuth(...)` options.
  - Better Auth resolves the client IP in `@better-auth/core/dist/utils/ip.mjs` (`getIP`, `getIPFromHeader`): the headers default to `['x-forwarded-for']`, and with no `trustedProxies` a single-value header is trusted as the client IP, while a header with more than one value yields no IP and the request falls back to one shared bucket keyed `no-trusted-ip`.
  - Better Auth applies a stricter rule to `/sign-in`, `/sign-up` and `/change-password` (3 in 10 seconds) keyed on that IP (`rate-limiter/index.mjs`).
- **What goes wrong:** the only control against online password guessing and sign-up flooding is this per-IP limit, and the IP is taken from a request header that the client controls. There is no account lockout, no captcha and no email verification required before sign-in.
  - **Unlimited guessing (probe L2, L3).** Ten wrong-password sign-ins for `alice@example.test`, each with a new `X-Forwarded-For`, all returned 401 (never 429). Sixty such attempts: 60 of 60 reached the password check. With no header at all, the fourth attempt within ten seconds was refused (401, 401, 401, then 429), which shows the limit works only while the key is constant.
  - **Sign-up flooding (probe L7).** Six sign-ups each with a new `X-Forwarded-For` all succeeded (six accounts), past the 3-in-10-seconds rule.
  - **Shared-bucket lock for everyone (probe L6).** A header with two values (`192.0.2.60, 10.0.0.1`), as a proxy that appends the client address would produce when the client already sent one, resolves to no IP and the shared `no-trusted-ip` bucket. Four such sign-ins returned 401, 401, 401, 429, and then a different person signing in correctly, also with a two-value header, was refused with 429. So one person sending forged headers can fill the single shared bucket and deny sign-in to others.
  - The same header also sets the stored session `ip_address` (`auth_session.ip_address`), so that column reflects whatever the client sent.
  - Which path applies depends on the deployment, which the code does not pin. Reached directly, a single forged header gives unlimited guessing. Behind a proxy that appends `X-Forwarded-For`, a forged value makes the header multi-valued and collapses everyone onto the shared bucket, a sign-in denial of service. A proxy that overwrites the header to a single trusted value is the only safe case, and the code does not require or document it.
- **How confirmed:** run, `probes/ratelimit.json`. The server logged "Rate limiting could not determine a client IP and is falling back to a single shared per-path bucket" during L3, confirming the fallback.
- **Suggested fix:** set `advanced.ipAddress` in `auth.ts` for the chosen deployment: either `trustedProxies` (the proxy's addresses, so the real client IP is resolved from the chain) or a single trusted `ipAddressHeaders` that only the proxy can set, and ensure the proxy overwrites it and never appends to it. Consider a per-account attempt counter in addition, so the limit does not depend only on a network address.

### R6-L1. Archiving an item or tax code does not confirm it was the caller's, and still reports success

- **Severity:** low (no data crosses businesses)
- **Where:**
  - `packages/db/src/items.ts:36-38` (`archiveItem`): `update ... where id = ?` with no row-count check, then `audit(...)`.
  - `packages/db/src/taxes.ts:79-81` (`archiveTaxCode`): the same shape.
  - Reached by `apps/web/src/lib/actions/items.ts:89` (`archiveItemAction`) and `settings.ts:259` (`archiveTaxCodeAction`).
- **What goes wrong:** `updateItem`, `updateClient`, `updateTaxCode` and `setClientArchived` all read the affected row count and throw "not found" when it is zero. The two archive functions do not. Under row-level security the `UPDATE` of another business's id matches no row, so nothing of that business changes, but the action returns `ok: true` and `audit(...)` writes an entry in the caller's own organisation naming the foreign entity id.
  - **Reproduction (probe A4, A6).** As Bob, `archiveItemAction(<Alice's item id>)` and `archiveTaxCodeAction(<Alice's tax code id>)` both returned `{ ok: true }`. Alice's exported data was unchanged (her item and tax code still active). Bob's own audit log gained `item.archived item <Alice's id>` and `tax_code.archived tax_code <Alice's id>`.
  - The effect is a misleading confirmation and an audit-log entry that references an id the organisation does not own. The same silent success happens for a non-existent or already-archived id in the caller's own organisation.
- **How confirmed:** run, `probes/tenancy.json` ("A4", "A6", "A records changed": [], "B audit rows naming A ids").
- **Suggested fix:** return the affected row from both archive functions and throw "not found" when none, as the sibling update functions already do, so the audit entry and the success are written only for a row that was actually archived.

### R6-L2. Sign-up reveals whether an email already has an account

- **Severity:** low
- **Where:** `apps/web/src/lib/auth.ts:24` (`emailAndPassword` with the default sign-up behaviour); the message is surfaced to the person at `apps/web/src/app/(auth)/auth-form.tsx:30-34` (any error other than 401/`INVALID_EMAIL_OR_PASSWORD` is shown verbatim).
- **What goes wrong:** sign-in gives one message for both a wrong password and an unknown email, which is correct (probe S2: both return "Invalid email or password", 401, with no useful timing difference, 146 ms against 168 ms median over six tries). Sign-up does not: registering an address that already exists returns 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, "User already exists. Use another email." (probe S3), against a 200 for a new address. Anyone can therefore test whether a given email has an Invoica account. Email verification is not built (blueprint open question 16), so there is no other barrier.
- **How confirmed:** run, `probes/auth.json` ("S2 ...", "S3 sign-up existing email").
- **Suggested fix:** decide whether account existence is meant to be discoverable. If not, return the same acknowledgement for an existing and a new address at sign-up and complete the flow by email, which also needs the verification step in question 16.

### R6-L3. No Content-Security-Policy, HSTS or Permissions-Policy

- **Severity:** low (defence in depth)
- **Where:** `apps/web/next.config.ts:8-18` sets `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options` on every response, and nothing else.
- **What goes wrong:** there is no `Content-Security-Policy`, so if a cross-site scripting hole ever reached a rendered page there is no second layer to contain it; no `Strict-Transport-Security`, so a first visit over HTTP is not pinned to HTTPS; and no `Permissions-Policy` to switch off browser features the app does not use. Output escaping is sound today (see "Checked and found sound"), so this is a hardening gap and not an active hole. The app pages do not need inline script beyond one static theme toggle (`apps/web/src/app/layout.tsx:24`), so a strict policy is within reach; the document preview is an isolated `srcDoc` iframe and would need `frame-src`/`sandbox` consideration.
- **How confirmed:** by reading, and the response headers seen on every probe (only the three headers above, plus Next.js defaults).
- **Suggested fix:** add a Content-Security-Policy (script-src self plus a nonce for the one inline script, object-src none, base-uri none, frame-ancestors self), `Strict-Transport-Security` once HTTPS is in place, and a minimal `Permissions-Policy`. Confirm the document iframe and the fonts still load under it.

### R6-L4. The drain route throws 500 instead of 401 for a right-length multibyte secret

- **Severity:** low
- **Where:** `apps/web/src/app/api/jobs/drain/route.ts:7-11`: `given.length !== secret.length` compares string (character) lengths, then `timingSafeEqual(Buffer.from(given), Buffer.from(secret))`.
- **What goes wrong:** `timingSafeEqual` throws when its two buffers differ in byte length. A value whose character length equals the secret's but whose UTF-8 byte length differs (multibyte characters) passes the first check and reaches `timingSafeEqual` with unequal buffers, which throws, so the request fails with an uncaught 500 where a 401 was intended.
  - **Reproduction (probe J3).** `Authorization: Bearer <é repeated secret.length times>` returned 500. A no header, a wrong secret of the right length, and the right secret returned 401, 401 and 200 as intended (probes J1, J2, J6). The route still denies access, so this is a robustness defect, not an access-control one.
- **How confirmed:** run, `probes/anon.json` ("J1" to "J6").
- **Suggested fix:** compare byte buffers throughout: build `Buffer.from(given)` and `Buffer.from(secret)`, check their lengths are equal, and only then call `timingSafeEqual`, inside a try/catch that returns 401 on any error.

### R6-L5. Cookie and server-action protection depend on deployment settings the code does not pin

- **Severity:** low
- **Where:**
  - `apps/web/src/lib/auth.ts:13` (`baseURL: env.authUrl`): Better Auth sets the session cookie's `Secure` flag from the scheme of `BETTER_AUTH_URL`. There is no `advanced.useSecureCookies: true`.
  - `apps/web/src/lib/actions/preferences.ts:11`: the `invoica_theme` cookie is set without `httpOnly`.
  - Server actions rely on Next.js's built-in Origin/Host check; `next.config.ts` sets no `serverActions.allowedOrigins`.
- **What goes wrong:**
  - The session cookie (`better-auth.session_token`) is `HttpOnly; SameSite=Lax` but carries `Secure` only when `BETTER_AUTH_URL` is an `https` URL (probe S1 showed no `Secure` under the local `http` base). A production deployment that sets an `http` base, or terminates TLS at a proxy while the app believes it is on `http`, would issue the session cookie without `Secure`. The `invoica_org` cookie gates `Secure` on `NODE_ENV === 'production'` (`onboarding.ts:20`, `preferences.ts:23`), not on the scheme, so the two can disagree.
  - The Next.js Origin check is effective against a forged origin: an action sent with `Origin: https://evil.example` was refused with an opaque 500 error digest (probe X1), and Better Auth refused a forged origin with 403 `INVALID_ORIGIN` (probes X4, X5). But an action sent with no `Origin` header at all was accepted and created a record (probe X2). Browsers send `Origin` on cross-site POST, so this is not browser-exploitable, and the request still needs the session cookie; it is a weaker-than-necessary posture and no hole. (A forged `Origin` combined with a matching forged `X-Forwarded-Host` was accepted, probe X3, but a browser cannot set `X-Forwarded-Host`, and a correctly configured proxy overwrites it.)
- **How confirmed:** run, `probes/auth.json` ("S1"), `probes/anon.json` ("X1" to "X6"); the cookie-flag logic by reading Better Auth and the two actions.
- **Suggested fix:** set `advanced.useSecureCookies: true` (or guarantee an `https` `BETTER_AUTH_URL`) in production and align the `invoica_org` cookie's `Secure` with it; add `httpOnly` to the theme cookie for consistency; and set `serverActions.allowedOrigins` to the app's own host so the origin check does not depend on the header being present.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **Cross-business access, every route (run).** As Bob, Alice's invoice page, invoice PDF, logo file, client page, client edit page and draft edit page all returned 404 and leaked none of Alice's text. Forcing the `invoica_org` cookie to Alice's organisation still returned Bob's own organisation from the JSON export, the dashboard and the clients, payments and invoices CSV (probes R1 to R9). `requireWorkspace` only ever chooses an organisation the user is a member of (`session.ts:152-156`), with a fallback to the first, so a forged cookie cannot select a foreign organisation.
- **Cross-business access, every action (run).** As Bob, twenty actions carrying Alice's ids (save/archive client, item, tax code; save, issue, delete, duplicate a draft; mark sent; void; record and remove a payment; credit whole; credit Bob's invoice with Alice's line; send) each returned a domain refusal or "Not found", and Alice's exported records were unchanged afterwards (probe A1 to A20, "A records changed": []). Foreign client, tax code, item and line ids in draft and credit inputs were refused by the resolver, the composite foreign keys or the credit ledger. The exceptions are R6-L1, which change nothing of the other business.
- **Anonymous and no-organisation access (run).** An anonymous visitor was redirected to `/sign-in` for every app page, route and export, and reached only the landing page, the auth pages and the fonts; the invoice PDF, logo, export and settings routes were redirected and not served (probe N-anon). A signed-in user with no organisation was redirected to `/onboarding` everywhere (probe N-noorg). Anonymous server-action calls failed or redirected to `/sign-in`; `createOrganisationAction` without a session redirected to `/sign-in` (probe N-anon actions).
- **The job drain route (run).** No header and a wrong secret of the right length both returned 401; the right secret returned 200; a GET returned 405 (probes J1, J2, J5, J6). The comparison is constant-time for equal byte lengths. R6-L4 is the multibyte edge.
- **HTML and PDF injection (run).** An invoice whose client name, contact, address, reference, title, summary, notes, terms, line title and line description all carried `<script>` and `img onerror` payloads rendered with every value escaped: the on-screen `srcDoc` contained `&lt;script&gt;` and no live `<script>bad()`, the preview iframe is `sandbox="allow-same-origin"` with no `allow-scripts`, and the kept PDF contained neither a literal `<script>` nor the "PWNED" marker the payload would have set (probe H, `inject.json`). The PDF renderer runs with `javaScriptEnabled: false` and aborts every request that is not a `data:` URL (`packages/pdf/src/index.ts:59-64`), so document text cannot reach the network or the file system during rendering. Template values go through `esc()` (escapes `& < > " '`); the brand colour is constrained by a CHECK and the readable-text colour is computed, not taken from input.
- **Logo upload (run).** The type is decided from the first bytes (`actions/logo.ts:110-128`); an SVG and an HTML file both declared `image/png` were refused, a 600 KB image was refused (512 KB cap), and a real PNG was accepted and served as `image/png` with `X-Content-Type-Options: nosniff` (probe M1 to M4b). SVG is never an accepted type, so a scripted SVG logo cannot be stored. `stored_file` is immutable, so the served content type cannot later be changed (review 1 L2 fix).
- **CSV injection (run).** A client named `=cmd|calc!A1`, a contact `@SUM(1)` and a name `-5+cell` each exported with a leading apostrophe (`csvCell`, `csv.ts:5`), while plain negative numbers keep their sign (probe M5).
- **Email headers (run).** A sent invoice wrote a well-formed `.eml`: the `From` display name is the seller name with `<`, `>` and `"` stripped, the `Subject` with unicode is RFC 2047 base64 encoded, and the `To` is the schema-validated address. A `To` containing a CRLF was refused by the schema before sending (probe M6, M7). The address, subject and message are validated by `sendDocumentInput`.
- **Path traversal (run).** The fonts route serves only names in `FONT_FILES` and returned 404 for `..%2f` and `%2e%2e%2f` paths; the files route returned 404 for a non-UUID id, a traversal path and another business's logo id (probe M8, M9). Storage keys are generated on the server and checked against the storage root (`storage.ts:145-151`).
- **Sessions (run).** Sign-out cleared the cookies and a later request redirected to `/sign-in`; a session token with the right id and a wrong signature was rejected and redirected to `/sign-in` (probe S4, S5). The session cookie is `HttpOnly; SameSite=Lax`. Minimum password length 10 is enforced at sign-up (probe S7). `delete-user` and `admin/*` endpoints are not enabled (404).
- **Input validation (read, run).** Every body-taking action validates with `@invoica/schemas` before any work; the plain-id actions (archive, mark sent, delete, duplicate, remove payment, switch organisation, set theme) reach only parametrised queries under row-level security, and route params are checked with `isUuid` before use. `switchOrganisationAction` checks membership before setting the cookie; `setThemeAction` checks the value against an allowlist.
- **Error messages (read, run).** Unknown errors are logged server-side and returned as "Something went wrong and nothing was saved. Try again." (`actions/result.ts:14-20`); only `DomainError`, `NotAMemberError` and Postgres `P0001` messages, which are written for people, reach the client. The forged-origin action returned an opaque Next.js error digest, not a stack trace. No stack traces or internal identifiers were seen in any response body.
- **Framing and content type (run).** Every response carried `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff`; the PDF and logo responses set `Cache-Control: private`.

## Not checked

- The money and credit-ledger calculations, the immutability triggers and the numbering guards, which reviews 1 to 5 cover; this review only exercised them through HTTP requests.
- Browser DOM behaviour beyond the server-rendered `srcDoc` string: nothing was driven in a real browser, and the React client halves of the forms were not run (Playwright was available but not used).
- The production email and object-storage adapters (neither is built; the dev file mailbox and local disk were used).
- The outbox worker's cross-organisation claim functions, which are the known and accepted design behind `CRON_SECRET` (review 1 L3, blueprint open question 7).
- `pnpm check` (format, copy rules, lint, types) beyond the production build, which passed, and the typecheck Next ran during it.
- Password reset and email verification, which are not built (blueprint open question 16).
- The `invoica` and `invoica_demo` databases, which were not touched.
- Load and concurrency at scale, and any statement timeout or connection limit in production.

## Files produced by this review

All in `/home/claude/review/round6/`:

- `review-6.md` (this report);
- `pinned/` (an export of `4e2f3d0` with copied `node_modules` and the production build);
- `server.env`, `start-server.sh`, `build.out`, `server.log`;
- `scripts/db-setup.mts` (provision and drop the review database);
- `probes/lib.mts` (the HTTP and server-action client) and the probes `setup.mts`, `tenancy.mts`, `anon.mts`, `ratelimit.mts`, `auth.mts`, `inject.mts`, `misc.mts`, with their `.json` outputs and `tenancy.out`, `anon.out`, `ratelimit.out`, `inject-screen-slice.txt`;
- `files/` and `mail/` (the app's file storage and dev mailbox during the probes).

---

## Resolution (builder, 19 October 2026)

Three findings sit in sign-in and session handling, which CLAUDE.md lists under "Ask first" (changing auth). Their fixes are prepared on the branch `fix/auth-hardening`, which is in the repository bundle and not merged into `main`; Kobby decides. The others are fixed on `main`, tests first where a test could fail first: the three tests in `packages/db/test/review-6.test.ts` and the test for the drain route's secret check (`apps/web/src/lib/secret.test.ts`) failed before their changes.

| Finding | Fix |
| --- | --- |
| R6-M1 | On `fix/auth-hardening`, for approval: the client address is taken only from a header named by the deployment (`INVOICA_CLIENT_IP_HEADER`, which the proxy must overwrite) or through the proxies it lists (`INVOICA_TRUSTED_PROXIES`), and the production server refuses to start with neither, so the sign-in limit cannot be sidestepped with a forged header. The choice depends on the hosting, which is still open (decision 0008). |
| R6-L1 | Archiving an item or a tax code archives only one of your own that is not archived yet; otherwise it is refused and nothing is written to the audit log. |
| R6-L2 | Not changed: hiding whether an email has an account needs sign-up to finish by email, which waits on email verification (open question 16). Added to the questions. |
| R6-L3 | Every page now carries a Content-Security-Policy with a fresh nonce (`apps/web/src/proxy.ts`): scripts only from the app itself, carrying the nonce; no plugins; no framing by other sites; forms post only to the app. The root layout's theme script carries the nonce. Also a Permissions-Policy, and Strict-Transport-Security in production. Checked on the development server and a production build: no violations on the main pages, the document preview and the dialogs, and the theme script still runs. An end-to-end test checks the headers and that the nonce changes on every request. |
| R6-L4 | The drain route compares the secret as bytes, in constant time, and answers 401 to any wrong value, multibyte included. |
| R6-L5 | The theme cookie is now `HttpOnly`, and `Secure` in production. On `fix/auth-hardening`, for approval: the session cookie is always `Secure` in production, the organisation cookie follows the same rule, and server actions accept only the app's own origin. |

Checks after the fixes on `main`: core 184, database 89, documents 11, PDF 64, schemas 4, web unit 10 (362 run, 362 passed, 0 failed, 0 skipped); end to end 31 passed and 3 skipped by design; lint, types, format and copy rules clean; production build clean.
