# Round 6 working files

The proposal is `../round-6-templates.md`, and its second pass `../round-7-templates.md`. These are the files that
made what they show, as of the second pass.

## prototypes/

Fifteen invoice templates (Marquee in three type pairings) written against the real `DocumentView` (`packages/documents/src/view.ts`) and the shared
helpers in `packages/documents/src/templates/shared.ts`, rendered to PDF with the same Chromium settings as
`packages/pdf`. They are prototypes: nothing in the product imports them. Porting them is step 3 of the build plan.

- `t/` holds one file per template, each exporting `{ id, name, fonts, footer, css(view), body(view, logo) }`, the
  same shape as the templates in `packages/documents`.
- `data.ts` holds the invented business for each template (names, numbers and addresses are all made up), built with
  `assembleSnapshot` and `computeDocument` from `@invoica/core`.
- `logos.ts` holds an invented SVG mark for some businesses; the rest are in `logos/`, drawn by `make_logos.py`
  (with `textpath.py`, which turns type into outlines with fontTools). A template can ask for a variant, such as a
  light one for a dark ground (`logoVariant`).
- `funnel800.json` holds Funnel Display's advance widths at weight 800, which Billboard uses to size the name to the
  width.
- `lib.ts` embeds the fonts and renders the PDF; `run.ts` renders every template (or the ones named) to PDF and PNG.

To run them, install the extra fonts somewhere outside the repository:

```
mkdir -p /tmp/proto-fonts && cd /tmp/proto-fonts && npm init -y && npm install @fontsource-variable/fraunces @fontsource-variable/figtree @fontsource-variable/syne @fontsource/space-mono @fontsource-variable/unbounded @fontsource-variable/manrope @fontsource/instrument-serif @fontsource-variable/instrument-sans @fontsource-variable/mona-sans @fontsource-variable/geist @fontsource-variable/geist-mono @fontsource-variable/archivo @fontsource-variable/source-serif-4 @fontsource-variable/source-sans-3 @fontsource-variable/cormorant @fontsource/cormorant-sc @fontsource-variable/eb-garamond @fontsource-variable/ibm-plex-sans @fontsource/ibm-plex-mono @fontsource-variable/bodoni-moda @fontsource-variable/jost @fontsource-variable/cormorant-garamond @fontsource-variable/dm-sans @fontsource-variable/schibsted-grotesk @fontsource-variable/funnel-display @fontsource-variable/inter-tight @fontsource-variable/big-shoulders-display @fontsource/anton @fontsource-variable/hanken-grotesk @fontsource/libre-caslon-text @fontsource/libre-caslon-display
```

then, from the repository root:

```
OUT=/tmp/proto-out PROTO_FONTS=/tmp/proto-fonts/node_modules node node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs docs/design/round-6/prototypes/run.ts
```

`QA=1` also renders each template without a logo, with the long fixture and with the UK VAT fixture. `extras.ts`
renders the colour variants; `nologo.ts` the pages without a logo at full size.

## canvas/

The Python that wrote the boards on the design canvas pages "Invoice templates", "Invoice templates, round 2"
(`round7.py`), "How it works: the line" and "The app below the hero". Each board is written twice: the canvas file, with images by their uploaded addresses (`blobs.json`)
and fonts from Google Fonts, and a local preview with images and fonts from disk, rendered with `shoot.cjs` to check
the design before it was published. Set `CANVAS_ROOT` to a folder holding the canvas's `project/` and `R6` to a folder
holding the images under `assets/`.
