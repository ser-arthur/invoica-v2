# Round 1 template mocks

Six invoice template mocks and one long invoice, rendered to A4 PDF and PNG with Chromium. Design mocks only: the production templates are built after Kobby chooses a direction.

| File | What it does |
| --- | --- |
| `data.js` | Seven invented invoices, one per template plus a 22-line one |
| `core.js` | Totals in whole minor units with half-up rounding, and currency and date formatting |
| `templates.js` | The six templates, each a function from an invoice to a full HTML page |
| `build.js` | Renders every invoice to HTML, PDF and PNG and prints the page count of each |

```
npm install
node build.js
```

`build.js` uses Playwright's own Chromium; set `CHROMIUM_PATH` to use another. PNG output needs `pdftoppm` and `pdfinfo` (poppler). Output goes to `out/`.
