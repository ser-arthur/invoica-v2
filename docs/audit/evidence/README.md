# Audit evidence

The scripts that produced every *measured* figure in `docs/audit.md`, and their output from 18 October 2026. They exercise the current app and change nothing in it. They are the starting point for the characterisation tests.

## What each file does

| File | What it does |
| --- | --- |
| `measure.py` | Imports the app from a copy of the repository, points it at a throwaway database, and drives it through Flask's test client with the same form fields the browser sends. `flows` runs the worked examples W1 to W7, N1, S1, C1 and the cross-account, upload, apostrophe and sign-in checks. `seed` runs the seed data and reads the dashboard and list figures |
| `editor_js.js` | Runs the invoice editor's money code in Node by loading the exact lines from `templates/base.html` (the totals getters, the currency formatter and the submit assignments) |
| `tz_check.py` | Saves one invoice dated 1 October 2026 and prints what was stored and shown, for the database session time zone given in `PGTZ` |
| `flash_check.py` | Saves the same invoice number twice and prints the messages shown to the user |
| `extras_check.py` | One check per mode: server and browser formatting and date display (`formats`); the seed's next number and two edits of a seeded invoice (`seed_paths`); client custom fields after an invoice save (`custom_fields`); how the paid date is stored (`paid_date`); saving a reopened fractional-quantity invoice (`w6_reopen_save`); the full duplicate-number message (`duplicate_message`); signed-in pages on a schema built from the migrations (`migrated_schema`); every page without `SECRET_KEY` (`no_secret_key`). Output in `output/extras.txt` |
| `output/` | The output of each run. The seed's own start-up banner is left out of `seed_postgres.txt` |

## Running them

They need Python 3.13 with the packages in `requirements.txt`, Node 22, and a throwaway PostgreSQL 16. Run them against a copy of the repository with no `.env` in it or above it, and never against a real database: `measure.py` drops and recreates every table, and `seed` wipes everything.

```
cp -r invoica /tmp/invoica-copy
rm -f /tmp/invoica-copy/.env /tmp/invoica-copy/Archive.zip
createdb invoica_audit
createdb invoica_seed
createdb invoica_tz
createdb invoica_flash
python docs/audit/evidence/measure.py flows /tmp/invoica-copy postgresql://localhost/invoica_audit /tmp/flows.json
python docs/audit/evidence/measure.py seed /tmp/invoica-copy postgresql://localhost/invoica_seed /tmp/seed.json
PGTZ=America/New_York python docs/audit/evidence/tz_check.py /tmp/invoica-copy postgresql://localhost/invoica_tz
python docs/audit/evidence/flash_check.py /tmp/invoica-copy postgresql://localhost/invoica_flash
python docs/audit/evidence/extras_check.py formats /tmp/invoica-copy postgresql://localhost/invoica_flash
```

`extras_check.py migrated_schema` needs a database built with `flask db upgrade` from the copy. The modes that save data drop and recreate the tables in the database they are given.

`measure.py` expects `editor_js.js` beside it. The seed figures depend on the date of the run, because the seed dates its invoices relative to today; the outputs here are from 18 October 2026.

## Limits

- The editor's figures come from running its code in Node 22, which uses Chrome's engine. Safari and Firefox were not run.
- The exchange-rate service was replaced with fixed, made-up rates (or with no rates, to show the failure case). No real rates were fetched.
- The PDF service was not called; the PDF is made from the same template as the preview, which was read.
