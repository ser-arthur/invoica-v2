# 0006. PDF engine

- **Status:** Proposed, 18 October 2026. Built this way in `packages/pdf` and `packages/documents` so the product works; Kobby to approve.

## Context

Invoica's one job in v1 is to produce a correct, professional invoice that looks as intended on screen, on paper and as a PDF, however long it is. The server generates the PDF of record: the file that is emailed, downloaded and archived.

Round 1 rendered HTML templates to A4 with Playwright Chromium. It found that the table heading repeats on each page and that `break-inside: avoid` keeps rows and the totals block together. It also found that Chromium's `footerTemplate` cannot use the document's web fonts and falls back to a system font, and that fixed-position content in the page margin created an extra page.

Round 2 (docs/spikes/pdf-engine) ran nine invented invoices through eight engine set-ups. The invoices cover one line, 60 lines, 300-character descriptions with an 88-character unbroken token, very long names with five-line addresses, JPY, KWD, two invoices tuned so the totals block falls at a page break, and a three-page timesheet. Every footer had to show "Page x of N", the invoice number and the legal name. Automated checks used poppler only, and the pages were also rasterised and reviewed by eye. Full results are in the spike's README.md, results.md and summary.md (the rendered PDFs were not kept in the repository).

The forces: one template should serve the screen, paper and the PDF; the footer must be correct on every page and in the document's own font; long invoices must not split rows or the totals; currencies with 0 and 3 decimals must print exactly; generation must be fast enough to run on request; and the team should maintain one template language.

## Options considered

1. **Chromium `page.pdf` with `footerTemplate`** (Playwright 1.56.0, Chromium 141.0.7390.37). Correct pagination on all nine invoices, but the footer printed in DejaVu Sans because footer templates only see system fonts (82 of 91 checks). With Inter installed as a system font through fontconfig, it passed 91 of 91 at a median of 155 ms per invoice. Costs: every template font installed in the server image, a separate footer template string, and `print-color-adjust: exact` set inside that template to stop Chromium darkening its grey text.
2. **Chromium with the Paged.js polyfill** (pagedjs 0.4.3). Footer in the document's font, but the table heading did not repeat after page 1 on five invoices (86 of 91). It also rewrote the template's `td + td` rule with lower specificity, so CSS that works on screen lost its column gutters in print and amounts ran together. Median 415 ms.
3. **@react-pdf/renderer** (4.9.0 with react 18.3.1), no browser. Smallest files (21 to 31 KB) and correct pagination. But it is a second template in a second language, and it could not break the 88-character token without altering it: it inserted a visible hyphen into a URL and into an email address. It also lists an unembedded Helvetica in every file (80 of 91). The port needed hand-computed column widths, flex workarounds, a footer positioned by `top` (with `bottom` it is not drawn when the page sets a line height) and restated tabular figures. Median 491 ms.
4. **Vivliostyle CLI** (@vivliostyle/cli 11.3.3, Vivliostyle.js 2.45.1) with the local Chromium. It installed from npm and ran offline. Output matched Chromium by eye (89 of 91; the amount column ran 0.35 to 0.6 mm past the margin on two invoices), but each invoice took 4.6 to 7.5 s because the CLI starts a server and a browser per run.
5. **CSS-only print with native `@page` margin boxes in Chromium.** The same HTML, footer written as `@bottom-left` and `@bottom-right` with `counter(page)` and `counter(pages)`. Chromium draws these natively from version 131. Printed on the server with `page.pdf`, it passed 91 of 91 with the footer in the document's web font and no fonts installed, at a median of 196 ms per invoice (152 to 250 ms) and 728 ms from a cold browser launch. Printed with CSS only, as a user's browser would, it produced pixel-identical pages.

## Decision

We will generate the PDF of record with Chromium through Playwright. The server prints the invoice's own HTML with `page.pdf({ preferCSSPageSize: true, printBackground: true })`, with no header or footer template and no polyfill. The running footer is part of the template, written as CSS `@page` margin boxes. Fonts load from the template's local @font-face files, and the server awaits `document.fonts.ready` before printing.

Pinned versions, as tested:

- playwright 1.56.0, which fixes Chromium 141.0.7390.37 (Playwright browser build 1194);
- @fontsource/inter 5.3.0 (and each other template font at an exact version);
- Node 22.22.0.

The fallback, if a Chromium upgrade breaks margin boxes, is option 1 with the template fonts installed as system fonts, on the same pinned Playwright.

Options compared and not chosen, at the versions tested: pagedjs 0.4.3; @react-pdf/renderer 4.9.0 with react 18.3.1; @vivliostyle/cli 11.3.3. Tools used for the measurements: poppler 24.02.0, fontconfig 2.15.0, Python 3.13.16, fontTools 4.65.0, Pillow 12.3.0.

## Consequences

- One template language: the invoice and its footer are HTML and CSS, and the same file serves the screen, the server PDF and a user's own print in Chromium-based browsers.
- The footer uses the document's fonts with nothing installed on the server, which removes round 1's footer-font problem.
- The server must run Chromium. A warm browser or pool keeps generation at roughly 150 to 250 ms per invoice; a cold launch adds about 0.6 s. Memory, image size and concurrency have not been measured yet.
- Correct output depends on the pinned Chromium build. The spike's hard pack and checker (src/check.py) become a regression test, run on every Playwright upgrade before release.
- PDFs are 48 to 59 KB, about twice react-pdf's size, because three Inter subsets are embedded.
- A user's own browser print stays a convenience copy. In Chrome, the dialog's "Headers and footers" option adds date, title and URL over our margin area, and the page cannot switch it off. Margin-box support in Firefox and Safari is unconfirmed. "Download PDF" serves the server file.
- Template follow-ups found by the spike:
  - use `overflow-wrap: anywhere` only on description cells;
  - keep dates unbroken;
  - keep the one-line legal paragraph with the payment block, because on the JPY invoice it was left alone on the last page;
  - rework the Studio template, whose footer is absolutely positioned on a zero-margin page, as margin boxes.
- Not yet verified: PDF/A and tagged PDF, scripts outside the Latin range, physical printing, and the other five round-1 templates.
