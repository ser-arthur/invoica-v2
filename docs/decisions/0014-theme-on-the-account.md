# 0014: The theme is saved on the account, and each device keeps a copy

## Context

Light, Dark or System was kept in a cookie, `invoica_theme`, on the device it was chosen on. The owner asked that a
theme chosen in the account carries to the person's other devices (27 October). The sign-in pages, which show before
anyone is known, follow the device's theme too (`docs/specs/website-showcase.md`, E and F).

## Decision

The account holds the choice in a new table, `user_preference`, one row per person, keyed by the person's id and removed
with their account. It is the first table that belongs to a person and to no organisation, so its row rule is by
person: row-level security forced, one policy, `own_preference`, that lets a transaction see and write a row only
when its `user_id` is the transaction's `app.user_id` (set from the verified session by `withUser`). The app may select,
insert and update it; nothing deletes a row except the account's removal.

The cookie stays, as the device's copy. Choosing a theme writes both. A signed-in page takes the account's theme, and
when the device's copy differs, the app brings the copy up to date, so the sign-in pages on that device follow the
person's choice after signing out. A device never signed in keeps Light.

## Consequences

- The sign-in pages never look anything up: before sign-in, only the device's copy is known.
- `packages/db/test/tenancy.test.ts` lists the table, its policy and its grants, so any change to them is reviewed.
- Further personal settings (not a business's) belong in `user_preference` as more columns, under the same rule.
