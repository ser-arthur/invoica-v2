# Invoica PDF engine spike, round 2

18 October 2026. Throwaway code. The question: which engine should generate the PDF of record on the server, so that an invoice looks as intended on screen, on paper and as a PDF, however long it is.

## Recommendation in brief

Generate the PDF of record with Chromium through Playwright `page.pdf`, printing the invoice's own HTML, with the running footer written as CSS `@page` margin boxes (`@bottom-left`, `@bottom-right`, `counter(page)`, `counter(pages)`). This is candidate **c6**. It passed all 91 automated checks on all nine hard-pack invoices. Of the browser paths, it is the only one whose footer uses the document's web font with no fonts installed on the server, and it rendered each invoice in 152 to 250 ms with a warm browser.

Pin Playwright 1.56.0, which fixes the Chromium build (141.0.7390.37). Chromium has drawn margin boxes only since version 131, so this behaviour belongs to the pinned build, and the hard pack in this folder should run again on every upgrade. Keep **c1b** (Chromium `footerTemplate`, with the template fonts installed as system fonts) as the fallback: it also passed 91 of 91.

## What was run

### Candidates

| Id | Engine and settings | Running footer made by |
|---|---|---|
| c1-footer-template | Playwright 1.56.0, Chromium 141.0.7390.37, `page.pdf` with `preferCSSPageSize`, `printBackground`, `displayHeaderFooter` | Chromium `footerTemplate` asking for Inter, with only the system fonts available |
| c1b-footer-template-installed-font | As c1, with Inter (converted from the same @fontsource files) installed for Chromium through a private fontconfig file | As c1 |
| c2-pagedjs | Chromium with the Paged.js 0.4.3 polyfill (`PagedConfig.auto = false`, then `PagedPolyfill.preview()`), then `page.pdf` with `preferCSSPageSize` | CSS margin boxes, laid out by Paged.js |
| c3-react-pdf | @react-pdf/renderer 4.9.0 with react 18.3.1, no browser. An approximation of the Receipt template (src/receipt-react.js) | A `fixed` view with a `render` prop for page x of y |
| c4-vivliostyle | @vivliostyle/cli 11.3.3 (Vivliostyle.js 2.45.1), `--executable-browser /opt/pw-browsers/chromium`. It installed from npm and ran offline | CSS margin boxes, laid out by Vivliostyle |
| c5-browser-print | The c6 HTML printed with CSS only, as a user's browser would: `printBackground: false` (the print dialog's default), no header or footer template | CSS margin boxes, native Chromium |
| c5b-browser-print-dialog-headers | As c5, plus header and footer templates shaped like the print dialog's "Headers and footers" option (date and title above, URL and n/N below) | Both |
| c6-chromium-margin-boxes | Chromium `page.pdf` with `preferCSSPageSize` and `printBackground`, no header or footer template, no polyfill | CSS margin boxes, native Chromium |

c6 was not on the original list. Since Chromium draws margin boxes natively, candidate 5's HTML printed on the server is a candidate in its own right. c5 and c6 differ only in `printBackground`; the Receipt template has no CSS backgrounds, and their 22 pages are pixel-identical at 80 dpi (compared with Pillow).

### The hard pack

Defined in src/data.js. Every business, client, address and account number is invented; domains use `.example`.

| Id | What it tests | Lines | Currency |
|---|---|---|---|
| d1-one-line | One line | 1 | GBP |
| d2-sixty-lines | 60 lines | 60 | GBP |
| d3-long-text | Seven descriptions of 320 to 348 characters; one holds a URL whose path is an 88-character run of letters and digits with no break opportunity | 9 | GBP |
| d4-long-names | 85-character trading name, 101-character legal name (also in the footer), 133-character client name, five-line addresses for both parties, a 60-character email address | 4 | GBP |
| d5-jpy | Zero-decimal currency, fractional hours rounded to the nearest yen, 10% consumption tax | 4 | JPY |
| d6-kwd | Three-decimal currency, fractional quantities rounded to the nearest fils, no tax | 5 | KWD |
| d7a-boundary-chromium | Totals block at a page break, tuned on Chromium | 33 | GBP |
| d7b-boundary-reactpdf | The same, tuned on react-pdf | 34 | GBP |
| d8-three-page | Timesheet layout (Date, Description, Hours, Rate, Amount), three pages on Chromium | 35 | GBP |

Every footer reads "invoice number, legal name" on the left and "Page x of N" on the right.

**Tuning.** src/tune.js renders the boundary invoice with keep-together switched off (`.keep { break-inside: auto }`, or `wrap` on the react-pdf totals view) for 10 to 60 lines and records the counts where "Subtotal" and "Amount due" land on different pages. Chromium: 11, 12, 32 to 34, 54 to 56. react-pdf: 11 to 13, 33 to 35, 55 to 57. It takes the middle of the second group: 33 lines for Chromium and 34 for react-pdf, and both counts fall inside both engines' ranges. The three-page invoice uses 35 lines, the middle of the 25 to 45 range that prints on three pages in Chromium. The same keep-off probe ran for every candidate on both boundary invoices (PDFs in out/probe/). In all eight candidates the totals would have straddled the break, so the keep-together test was exercised everywhere.

### Template and fonts

The round-1 Receipt template, adapted in src/receipt-html.js:

- the footer is either CSS margin boxes or left to the engine's footer template;
- the tax label and payment lines come from the data, so the JPY and KWD invoices read correctly;
- description cells use `overflow-wrap: anywhere`, so the 88-character token wraps inside its column;
- the party and payment blocks use `overflow-wrap: break-word`, and dates do not wrap. An earlier version put `anywhere` on the whole party block, which shrank its grid columns and broke "November" mid-word on the KWD invoice in every HTML engine.

Fonts: Inter 400, 500 and 600 from @fontsource/inter 5.3.0, loaded from the local files through inline `@font-face` rules. Every render awaits `document.fonts.ready`. Pages, fonts and scripts are served over HTTP on 127.0.0.1 (src/server.js). With file paths, Vivliostyle's own server could not reach the font files and the PDF fell back to Liberation Sans; over HTTP it used Inter.

This machine has Inter installed as a system font, and fontconfig maps `sans-serif` to it. That would hide a failed web-font load. Every Chromium candidate therefore runs with fontconfig/no-system-inter.conf, which hides the system Inter (`sans-serif` then resolves to DejaVu Sans). Any Inter in these PDFs came from the page's web fonts, or for c1b from fontconfig/fonts.

### Timing

Render time runs from navigation to PDF bytes: load, fonts ready, Paged.js layout where used, then `page.pdf`. The browser and page are already open. Each document gets one warm-up render, then three timed renders, and the tables report the median. react-pdf times `renderToBuffer` in a warm process. Vivliostyle runs one CLI process per render, which starts its own server and browser, so its times are cold.

Cold start (src/cold-start.js): launching Chromium, rendering d1 and closing took 752, 640 and 728 ms (median 728 ms). react-pdf in a fresh Node process, module loading included, took 1310, 1328 and 1248 ms (median 1310 ms).

The sandbox is shared, so expect about 50 ms of noise: c5 and c6 produce identical pages, yet their medians differ by 52 ms.

### Automated checks

src/check.py uses poppler only. Each check records items expected, items examined and PASS or FAIL; a check that examined nothing fails.

| Check | Items | How |
|---|---|---|
| A4 | pages | `pdfinfo`: every page within 1 pt of 595.28 x 841.89 |
| Head | pages that carry line rows | `pdftotext -bbox`: all heading words on one baseline. Headings on pages without rows are listed separately |
| Lines | invoice lines | Each line's title and the last 40 characters of its description are located in `pdftotext -raw` text (whitespace ignored). A line is split if they fall on different pages. A line not located counts against the check |
| Rows | invoice lines | The row's full text in order (date, title, description, quantity, unit price, amount, formatted by the template's own code) is found on one page. This also checks amounts and currency formatting |
| Totals | totals blocks | "Subtotal" and "Amount due" on one page, with the expected amount due directly after its label |
| Footer | pages | "Page p of N" (N from `pdfinfo`), the invoice number and the legal name on every page |
| FootPos | pages | The word "Page" sits in the bottom 20 mm |
| FootFont | pages | `pdftohtml -xml` gives each text run's font; all text in the bottom 20 mm must use the body font (the font of "Subtotal") |
| Margins | words | Every word lies inside the 18 mm side margins and on the page, 1 pt tolerance |
| Embed | font entries | `pdffonts` lists every font as embedded |
| Token | 1 | The 88-character token reads back unchanged from the text layer |

The checks ignore the horizontal space between words. That is how the Paged.js numbers that run together (below) passed "Rows"; they were found by eye.

## How to rerun

```sh
cd docs/spikes/pdf-engine
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run fonts   # converts Inter to TTF for c1b and builds the private fontconfig cache
npm run tune    # optional: re-derives src/tuned.json (about 1 minute)
npm run all     # render (about 7 minutes, mostly Vivliostyle), cold start, checks, summary, page images
```

Chromium must be at /opt/pw-browsers/chromium (Playwright build 1194). Nothing downloads a browser. To render some candidates only, name them, then re-check:

```sh
node src/render.js c6-chromium-margin-boxes c3-react-pdf
npm run check
```

The two experiments behind findings quoted below: `node experiments/react-pdf-quirks.js` and `node experiments/pagedjs-selector.js` (the second needs out/html from a render).

## Results

From out/summary.md. Per-document tables with examined counts for every check are in out/results.md; raw values are in out/results.json and out/timings.json.

### Candidate by document

Each cell: page count, then PASS when every check passed, or the checks that failed.

| Candidate | d1 | d2 | d3 | d4 | d5 | d6 | d7a | d7b | d8 |
|---|---|---|---|---|---|---|---|---|---|
| c1-footer-template | 1p FAIL: FootFont | 4p FAIL: FootFont | 2p FAIL: FootFont | 2p FAIL: FootFont | 2p FAIL: FootFont | 2p FAIL: FootFont | 3p FAIL: FootFont | 3p FAIL: FootFont | 3p FAIL: FootFont |
| c1b-footer-template-installed-font | 1p PASS | 4p PASS | 2p PASS | 2p PASS | 2p PASS | 2p PASS | 3p PASS | 3p PASS | 3p PASS |
| c2-pagedjs | 1p PASS | 4p FAIL: Head | 2p FAIL: Head | 2p PASS | 2p PASS | 2p PASS | 3p FAIL: Head | 3p FAIL: Head | 3p FAIL: Head |
| c3-react-pdf | 1p FAIL: Embed | 4p FAIL: Embed | 3p FAIL: Rows, Embed, Token | 2p FAIL: Embed | 2p FAIL: Embed | 2p FAIL: Embed | 3p FAIL: Embed | 3p FAIL: Embed | 3p FAIL: Embed |
| c4-vivliostyle | 1p PASS | 4p PASS | 2p PASS | 2p PASS | 2p PASS | 2p PASS | 3p PASS | 3p FAIL: Margins | 3p FAIL: Margins |
| c5-browser-print | 1p PASS | 4p PASS | 2p PASS | 2p PASS | 2p PASS | 2p PASS | 3p PASS | 3p PASS | 3p PASS |
| c5b-browser-print-dialog-headers | 1p FAIL: FootFont, Margins | 4p FAIL: FootFont, Margins | 2p FAIL: FootFont, Margins | 2p FAIL: FootFont, Margins | 2p FAIL: FootFont, Margins | 2p FAIL: FootFont, Margins | 3p FAIL: FootFont, Margins | 3p FAIL: FootFont, Margins | 3p FAIL: FootFont, Margins |
| c6-chromium-margin-boxes | 1p PASS | 4p PASS | 2p PASS | 2p PASS | 2p PASS | 2p PASS | 3p PASS | 3p PASS | 3p PASS |

### Checks with counts, summed over the nine documents

Each cell: PASS or FAIL, then items examined of items expected; a FAIL names the documents that failed.

| Candidate | A4 | Head | Lines | Rows | Totals | Footer | FootPos | FootFont | Margins | Embed | Token |
|---|---|---|---|---|---|---|---|---|---|---|---|
| c1-footer-template | PASS 22/22 | PASS 17/17 | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | FAIL 22/22 (all nine) | PASS 3671/3671 | PASS 81/81 | PASS 1/1 |
| c1b-footer-template-installed-font | PASS 22/22 | PASS 17/17 | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | PASS 22/22 | PASS 3671/3671 | PASS 81/81 | PASS 1/1 |
| c2-pagedjs | PASS 22/22 | FAIL 17/17 (d2, d3, d7a, d7b, d8) | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | PASS 22/22 | PASS 3619/3619 | PASS 72/72 | PASS 1/1 |
| c3-react-pdf | PASS 23/23 | PASS 17/17 | PASS 185/185 | FAIL 185/185 (d3) | PASS 9/9 | PASS 23/23 | PASS 23/23 | PASS 23/23 | PASS 3680/3680 | FAIL 36/36 (all nine) | FAIL 1/1 (d3) |
| c4-vivliostyle | PASS 22/22 | PASS 17/17 | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | PASS 22/22 | FAIL 3671/3671 (d7b, d8) | PASS 72/72 | PASS 1/1 |
| c5-browser-print | PASS 22/22 | PASS 17/17 | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | PASS 22/22 | PASS 3671/3671 | PASS 72/72 | PASS 1/1 |
| c5b-browser-print-dialog-headers | PASS 22/22 | PASS 17/17 | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | FAIL 22/22 (all nine) | FAIL 3803/3803 (all nine) | PASS 81/81 | PASS 1/1 |
| c6-chromium-margin-boxes | PASS 22/22 | PASS 17/17 | PASS 185/185 | PASS 185/185 | PASS 9/9 | PASS 22/22 | PASS 22/22 | PASS 22/22 | PASS 3671/3671 | PASS 72/72 | PASS 1/1 |

### Speed, size and pages

| Candidate | Checks passed | Documents with every check passed | Render ms: median of per-document medians (range) | File size KB (range) |
|---|---|---|---|---|
| c1-footer-template | 82 of 91 | 0 of 9 | 174 (139 to 212) | 54 to 66 |
| c1b-footer-template-installed-font | 91 of 91 | 9 of 9 | 155 (117 to 185) | 52 to 63 |
| c2-pagedjs | 86 of 91 | 4 of 9 | 415 (339 to 615) | 48 to 59 |
| c3-react-pdf | 80 of 91 | 0 of 9 | 491 (352 to 787) | 21 to 31 |
| c4-vivliostyle | 89 of 91 | 7 of 9 | 6058 (4568 to 7507), cold | 43 to 71 |
| c5-browser-print | 91 of 91 | 9 of 9 | 144 (134 to 171) | 48 to 59 |
| c5b-browser-print-dialog-headers | 73 of 91 | 0 of 9 | 207 (175 to 254) | 55 to 67 |
| c6-chromium-margin-boxes | 91 of 91 | 9 of 9 | 196 (152 to 250) | 48 to 59 |

Page counts for d1 to d8 were 1, 4, 2, 2, 2, 2, 3, 3, 3 in every candidate, except that react-pdf printed d3 on three pages. The four Chromium paths without Paged.js (c1, c1b, c5, c6) all sit between 117 and 250 ms per invoice. The differences between them are within the noise described above.

Fonts (pdffonts): every Chromium-based PDF embeds subsets of Inter Regular, Medium and SemiBold. c1 and c5b also embed DejaVu Sans, used by their footer or header templates. react-pdf embeds the same three Inter subsets and lists Helvetica, not embedded.

## Visual findings

Pages were rasterised at 80 dpi (src/sheets.py writes them to work/png and one contact sheet per candidate and document to work/sheets). out/png holds the representative images named below.

**c6 and c5 (native margin boxes).** I looked at d2, d3, d4, d5, d6, d7a and d8. Headings repeat on every page that has rows. On d7a the totals block moves whole to page 3, leaving space at the foot of page 2 (out/png/c6-d7a-boundary-totals-moved-whole.png). The three-page timesheet reads cleanly (out/png/c6-d8-three-page.png). The 101-character legal name wraps to two lines in the footer and "Page 1 of 2" stays on one line. The 88-character token wraps inside its column with nothing inserted. JPY prints as JP¥1,687,443 and KWD as KWD 1,844.408, matching the totals computed in src/core.js.

**c1 and c1b (footer template).** c1's footer prints in DejaVu Sans, visibly wider than the Inter body text (out/png/footers-d4-long-names.png). With Inter installed for fontconfig (c1b), the footer matches the body. One template trap, found and fixed during the spike: Chromium darkened the #8a8a8a footer text to #363636 until the footer template itself set `print-color-adjust: exact`. The main document already set it.

**c2 (Paged.js).** I looked at d3, d4 and d7a.
- The table heading prints on page 1 only (out/png/c2-pagedjs-d7a-no-heading-on-page-2.png).
- Paged.js rewrites the template's `table.lines td + td` rule into an attribute selector with lower specificity, so the `padding: 2.8mm 0` shorthand wins and the 6 mm column gutters disappear. On d3 the quantity, unit price and amount run together: "1£2,400.00£2,400.00" (out/png/c2-pagedjs-d3-numbers-run-together.png, out/png/c2-pagedjs-d4-collapsed-columns.png; experiments/pagedjs-selector.js shows the rewritten rule and the 0 px padding).
- Next to a long legal name, "Page 1 of 2" wraps onto two lines, because the margin box ignores `white-space: nowrap`.
- A page that starts with the totals block keeps the block's top margin, so it starts about 5 mm lower than in Chromium.

**c3 (react-pdf).** I looked at d3, d6, d7b and d8 (and d4 during development), and zoomed into the d8 amounts.
- The token cannot be broken without changing it (experiments/react-pdf-quirks.js). Breaking at any character inserts a visible hyphen into the URL ("Revised-Sched-uleOf", out/png/c3-react-pdf-d3-hyphenated-token-and-orphan-page.png). With hyphenation off, the token runs to 595.9 pt, past the page edge. With zero-width spaces, the line is squeezed to fit. The same breaking inserts a hyphen into the KWD client's email address ("examp-le").
- d3 takes three pages, and the third holds only the legal line.
- The approximation needed hand work that the HTML gets from CSS:
  - column widths estimated from string lengths, because react-pdf has no automatic table layout;
  - `flexBasis: 0` wrappers, because long names otherwise overlapped "Invoice" and the page counter;
  - the footer positioned with `top`, because with `bottom` it is not drawn at all when the page sets `lineHeight`;
  - tabular figures restated with `fontFeatureSettings`, because without them "£27,930.00" read at a glance as "£27930.00".
- Files are the smallest: 21 to 31 KB.
- pdffonts lists an unembedded Helvetica in every file. pdfkit registers it as a default resource, and pdftohtml shows no text drawn with it.

**c4 (Vivliostyle).** I looked at d3 and d8. By eye it matches c6. The right edge of the amount column sits 1.0 to 1.75 pt (0.35 to 0.6 mm) past the margin on the longer tables, which is why Margins fails on d7b and d8. Each invoice takes about 5 to 7 s, because every CLI run starts a server and a browser.

**c5b (dialog headers simulated).** A date and the page title print above the letterhead, and the URL and "1/1" below the footer. On d4 the URL line collides with the second line of the margin-box footer (out/png/c5b-dialog-headers-d1.png, out/png/footers-d4-long-names.png).

**Shared template finding.** On d5 (JPY), the last page holds only the one-line legal paragraph, in every engine. The template should keep that paragraph with the payment block, for example by moving it inside the kept `.other` section. Not tested.

I did not look by eye at the remaining candidate and document pairs; for those, the automated checks are the evidence. I compared the footer strip of d4 page 1 at 200 dpi for all eight candidates (out/png/footers-d4-long-names.png).

## Recommendation, reasons and trade-offs

Use **c6**: Playwright 1.56.0 `page.pdf({ preferCSSPageSize: true, printBackground: true })` on the invoice HTML, with the footer as CSS margin boxes.

Reasons:
1. **Correct on the whole hard pack.** 91 of 91 checks: headings repeat, no line splits, the totals stay whole at both tuned boundaries, every row and amount reads back as computed, and the footer is right on every page.
2. **One template language.** The footer lives in the same CSS as the invoice and uses the document's own web fonts. Nothing has to be installed on the server for it, and there is no second template string, as c1 and c1b need.
3. **The same HTML serves the screen, the server PDF and Chrome's own print.** c5 printed pixel-identical pages.
4. **Fast enough.** 152 to 250 ms per invoice warm; 728 ms median from a cold launch.
5. **Fewest moving parts.** There is no polyfill rewriting CSS (c2), no second layout engine (c4) and no parallel template in another language (c3).

Trade-offs and risks:
- The behaviour depends on the pinned Chromium build. Margin boxes are recent in Chromium (version 131 onwards). Pin Playwright and run this hard pack and checker as a regression test on every upgrade.
- The server needs Chromium. Memory, image size and concurrency were not measured. Plan for a warm browser or pool, because a cold launch adds about 0.6 s.
- Files are 48 to 59 KB, about twice react-pdf's size, because Chromium embeds three font subsets. That is acceptable for email.
- Fallback if margin boxes regress: c1b. It costs every template font installed in the server image, plus a separate footer template with its own colour setting. c1 without installed fonts is not acceptable, because the footer prints in a different font.
- Paged.js, react-pdf and Vivliostyle each failed something that matters for invoices: repeated headings and column spacing (Paged.js), unaltered text and fidelity to the screen template (react-pdf), and speed (Vivliostyle, about 30 times slower than c6).

## The user's own browser print

**Finding.** Printing the same HTML from Chromium with CSS only (c5) gave a PDF pixel-identical to c6: footer with page x of N in Inter, repeated headings, rows and totals whole. Turning backgrounds off made no difference for this template. As a convenience copy, it is good in Chromium-based browsers. It should stay a convenience copy, for three reasons:
- When the print dialog's "Headers and footers" box is ticked, Chrome adds its own date, title, URL and page number. Chrome's documentation says it does this even when the page has its own margin content ([Chrome for Developers, "Add content to the margins of web pages when printed using CSS"](https://developer.chrome.com/blog/print-margins)). The c5b simulation shows the result: extra text, and a collision with a long footer.
- Only Chromium 141 was available here. The same page says margin content works from Chrome 131. I could not confirm margin-box support in Firefox or Safari; there, the footer may not print at all.
- The user's paper size, margins and scaling choices in the dialog were not tested.

**What it would take to offer it.**
1. A print route that serves the invoice HTML on its own (no app navigation), with `@page` size, margins and margin boxes, and `print-color-adjust: exact`.
2. A "Print" button that waits for `document.fonts.ready` before calling `window.print()`.
3. A separate "Download PDF" action that serves the server-made PDF of record. That file is the one to email or archive.
4. A short note beside the print button suggesting "Headers and footers" be unticked, because the page cannot switch it off.
5. A check in Firefox and Safari before promising a footer there.

## Not checked

- Real print dialogs in Chrome, Edge, Firefox or Safari. c5 and c5b are `page.pdf` simulations of the dialog.
- Firefox and Safari support for margin boxes.
- Physical printing and printer scaling.
- PDF/A, tagged PDF and accessibility.
- Server memory, concurrency and container image size.
- Scripts outside the Latin range: only the Inter latin subsets were exercised.
- The other five round-1 templates. Only Receipt went through the engines. Studio uses `@page { margin: 0 }` with an absolutely positioned footer and would need reworking for margin boxes.
- Warm timing for Vivliostyle (embedding @vivliostyle/core in a warm page was not tried).
- Paged.js with a repeating-table-header handler, or with templates written to avoid sibling selectors.
- The template fix for the orphaned legal line.

## Files

- package.json, package-lock.json: exact versions; `npm run` scripts listed above.
- src/data.js: the hard pack. src/tuned.json: tuned line counts with the evidence.
- src/core.js: totals and formatting (from round 1). src/receipt-html.js: the HTML template. src/receipt-react.js: the react-pdf approximation.
- src/server.js, src/engines.js, src/render.js, src/tune.js, src/cold-start.js: rendering.
- src/check.py, src/summary.py, src/sheets.py: checks, summary, page images.
- fontconfig/: the private fontconfig files and the converted Inter used by c1b.
- experiments/: react-pdf-quirks.js and pagedjs-selector.js, with their PDFs in experiments/out/.
- out/<candidate>/<document>.pdf: all 72 PDFs. out/probe/: keep-together-off probes. out/html/: the rendered HTML.
- out/results.md, out/results.json, out/summary.md, out/timings.json, out/cold-start.json, out/run-log.json, out/expect.json.
- out/png/: representative images named above.
- decision-0006-pdf-engine.md: draft decision record.
