# Invoica's lines, each with one job

The owner's question of 30 October 2026, 03:05: the footer said "The business side of your business, in order.", sign
in and create account said "The smarter way to bill, track and get paid." and the hero said "Every invoice, all the way
to paid.", three lines in the three places a visitor reads a tagline. He had also thought of "The back office for
freelancers and small businesses". Agreed at 03:23: each line keeps one job, and the promise is the same wherever a
tagline stands.

## The lines

1. **The promise: "Every invoice, all the way to paid."** The hero's headline, and the line on sign in and create
   account (the wide screen's Night panel), so someone who follows "Create free account" reads the promise they have
   just read. "The smarter way to bill, track and get paid.", the first Invoica's line, is retired: "the smarter way"
   says nothing only Invoica can say.
2. **What it is, and for whom: "Invoicing for freelancers and small businesses."** Plain, for someone meeting Invoica
   for the first time: in the footer under the logo, and leading the description search engines and link previews
   show.
3. **A section heading: "The business side of your business, in order."** Why Invoica's heading only, above the file
   of three folders. It leaves the footer, so it no longer stands as a second tagline.

"The back office for freelancers and small businesses" is kept for later: "back office" promises bookkeeping, expenses
and bank feeds, which v1 leaves out (decision 0003). Its plain naming of who Invoica is for is line 2.

## Acceptance criteria

End-to-end in `apps/web/e2e/website.spec.ts`.

1. Sign in and create account show "Every invoice, all the way to paid." on the wide screen's panel, and "The smarter
   way" is on no page.
2. The footer says "Invoicing for freelancers and small businesses." and not "The business side of your business, in
   order.", which the home page shows once, as Why Invoica's heading.
3. The page description begins "Invoicing for freelancers and small businesses."
