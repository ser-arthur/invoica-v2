# 0001. Rewrite strategy

- **Status:** Accepted, 18 October 2026 (Kobby): a re-architecture from scratch that keeps the product's intent; no tests against the old app.
- **Depends on:** the answer to "current users and data" (foundation section 1). Kobby confirmed on 18 October 2026 that the live app has no real users or records, so the simple cut-over below applies.
- **Evidence:** `docs/audit.md`.

## Context

The foundation offers two strategies: replace the current app in place, part by part (Fowler's strangler fig), or start a fresh repository and port the behaviour across, protected by characterisation tests.

What the audit found that bears on the choice:

1. **The app is small.** One 2,128-line Flask module with 21 view functions behind 23 routes, six tables and 23 templates. Its behaviour fits in one document (`docs/audit.md`, section 3), and every money rule there has a worked example.
2. **The problems sit in the shared data model.** Money is floating point, quantities are integers, the user is the tenant, issued invoices are mutable, statuses mean different things on different pages, and dates are naive timestamps. Every screen reads these tables. A strangler fig works by putting a stable seam in front of the old system and moving parts behind it one at a time; here the only seam is the database, and the database is the part that has to change. Running old and new side by side would mean keeping two schemas in step, one with floats and one with integer minor units, and converting between them on every write.
3. **There is no safety net for refactoring in place.** No tests, no CI, no type checks.
4. **The stack is likely to change** (`0002-stack.md`). If it does, no code carries over, so the advantage of replacing in place, reusing what works, mostly disappears.
5. **The live app has three critical defects** (I-C1 to I-C3) and live credentials in the project folder (I-C4). With no real users the exposure is small; the old app is retired at cut-over and its keys revoked then.
6. **No real users or records exist** (Kobby, 18 October 2026). Nothing has to move across, so the cut-over is a redirect.

## Options considered

**A. Replace in place, part by part.** Keep the Flask app live and replace one area at a time behind the same domain. Strengths: something is always shipped; users never face a single switch. Weaknesses here: every area depends on the same tables, so the first part replaced forces the schema change on everything else, or forces a sync layer between two money representations; the result stays tied to the old structure longest; and with no tests, each step risks breaking behaviour nobody wrote down.

**B. Fresh repository, behaviour ported across.** Build the new product cleanly, with the characterisation tests as the contract for what must survive or change on purpose. Strengths: the money, tenancy and document rules are right from the first table; one schema; clean structure from day one. Weaknesses: a stretch where the new build is not live, and a risk of losing edge cases on the way. The foundation says this is only safe with the characterisation tests in place.

**C. Fix the current app in place and keep its stack.** Repair the defects, add tests, migrate floats to integers, add organisations. Cheapest in the short run. It keeps a stack that fails the foundation's "typed end to end" requirement and puts business rules in browser templates, which is how the four disagreeing totals calculations arose (I-H2). Worth it only as containment while B is built.

## Decision

**B, a fresh repository with behaviour ported across,** run like this:

1. **The audit's worked examples become the new core's first tests.** With no users and no data to carry, executable tests against the old Flask app would pin behaviour that is almost all being changed on purpose. Each worked example in `docs/audit.md` section 3 is written instead as a test of the new core, with the new expected result, and a note of the old result wherever the two differ. This replaces the foundation's separate characterisation-test step (Kobby agreed, 18 October 2026).
2. **Freeze the current app.** No new features and no fixes: it has no real users. Revoke its keys and take it down at cut-over, or sooner if convenient.
3. **Ship the new build to a staging address from the first slice.** Foundations (auth, organisations, tenancy, audit log, the core money package) go live on staging first, behind feature flags, so each slice can be clicked through. This shortens the stretch with nothing to see.
4. **Use the audit as the parity list.** Every row in the audit's screens table and section 3 is marked carry, change or drop when v1 is scoped. v1 is done when every carried row has a passing test in the new build.
5. **Cut over once.** Point the domain at the new app, revoke the old app's keys, and archive the old repository read-only. No data import is needed.

## Consequences

- The new build starts with the foundation's rules (integer money, immutable documents, database-enforced tenancy) in its first migration, and no sync layer is ever written.
- The worked examples carry the old behaviour into the new build as tests, so nothing the audit found is lost.
- The old app needs no attention until it is switched off.
- The risk of a long stretch with nothing shipped is real. Staging from the first slice and a v1 cut down to the core loop (foundation section 10, steps 1 and 2) keep it short.
- Edge cases not in the audit could still be lost. Anything found later is added to the audit's section 3 and given a test before it is ported.

## What would change this

Nothing foreseeable: the case for replacing in place rested on existing users, and there are none.
