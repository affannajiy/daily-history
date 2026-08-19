---
name: email-template
description: Editing what the reader sees — src/buildEmail.ts, buildText.ts, subject.ts. Layout, colour, card blocks, the subject line, the preheader, the plain-text part, images. Use when changing how the digest looks or reads, adding or removing a block, restyling, or auditing against rulebook/UI-UX_Rulebook.md.
---

# Editing the email

Four files render what the reader sees:

| File | Produces |
| --- | --- |
| `buildEmail.ts` | The HTML part |
| `buildText.ts` | The plain-text part |
| `subject.ts` | The subject line and preheader |
| `preview.ts` | Sample data covering every render path |

The HTML is 640px, table-based, inline styles, Georgia serif justified body. No
stylesheet, no flexbox, no external assets — Gmail strips or ignores all of them.
Gmail also clips a message past ~102 KB, which is what the "view in browser"
link exists for.

## Iterate with preview, never with dev

```bash
npm run preview   # writes preview.html + preview.txt. No API keys. No mail.
```

It also prints the subject line, which is not visible in either file.

`npm run dev` and `node dist/index.js` **send real mail**. Never run either as a
smoke test.

The sample data in `src/preview.ts` deliberately covers all three render paths at
once — a fully enriched event, an event whose article text could not be fetched
(empty timeline, numbers, whatChangedAfter), and a figure card. Each fails
differently, so a change must be checked against all three. If you add a block,
add it to the sample too.

## Card shape

Cards are a **discriminated union**, `EventCard | FigureCard` keyed by `kind`.
`renderCard(label, card, lead)` switches on `kind` once. Do not add optional
fields to fake a shared type; add to the correct member of the union.

Blocks, in render order: lead image (global only) · fact strip
(who/what/where/when) · what happened · timeline · by the numbers · key figures ·
what changed after · references.

## The three strings outside the page

- **Subject** — `buildSubject`, code-built from the lead card: `Aug 13 · The Fall
  of Constantinople (1453)`. Capped at 68 chars, truncated on a word boundary.
  Every edition used to arrive as "History Today — August 13", which told the
  reader only what they already knew.
- **Preheader** — `buildPreheader`, the hidden grey line the inbox shows after
  the subject. Without it, clients read the masthead and preview as
  "HISTORYTODAY August 13, 2026". Uses the standfirst, falling back to the
  regional headlines.
- **Plain text** — `buildEmailText`. HTML-only mail is a spam signal and breaks
  watches and screen readers. Built from the same `HistoryData`, so the two parts
  cannot drift.

**The model writes none of them.** A subject line is a promise about the
contents and must be made by whatever knows the contents.

## Images

`card.image` is `CardImage | null`, and null is the common case — `enrich.ts`
returns an image only when it can positively identify a free licence. The
renderer never makes a licence decision.

Three things in `imageBlock` are load-bearing, not polish: the `width` attribute
and real `alt` text (Gmail blocks remote images by default, and without both the
card opens with a broken box that shifts the layout when it loads), and the
credit rendered as a **caption, not alt text** — a screen reader announcing a
licence name learns nothing about the picture.

## Rulings already made against `rulebook/UI-UX_Rulebook.md`

These are in the code as comments. Read them before restyling — each one is a
fix for a defect that was found in an audit, so reverting one reintroduces it.

- **Red means a date or time anchor and nothing else.** It was previously
  carrying five different meanings at once, which made it carry none.
- **Only the fact strip earns a full border.** Everything bordered is nothing
  emphasised (§ over-boxing). `numbersBlock` uses a background tint only,
  `keyFigureBlock` a left rule, `afterBlock` a **black** rule — not red.
- **The global card keeps the statistics strip; the regional cards drop it.**
  That asymmetry is what gives the email one dominant shape instead of three
  equal ones (§2.10 emergence).
- **Sections are stacked full width**, not two narrow columns. The block set
  does not fit in a column.
- **Only the global card gets an image.** Giving all three one flattens the same
  hierarchy the statistics strip establishes.
- **"View in browser" sits above the masthead.** A clipped message is clipped
  from the bottom, so a link in the footer is inside the part that vanished.

## Accessibility rules already applied

- Every layout table carries `role="presentation"` **and** `border="0"`.
- Decorative rules (the red bars, the 1px dividers) carry `aria-hidden="true"`.
- Links are **underlined**, not colour-only — colour alone is not a
  distinguishing cue (WCAG 1.4.1).
- Headings are real and ordered: `h1` lead card, `h2` regional cards and Sources.
- No text below 10px.

## Non-negotiables

- **Escape every AI-supplied string here.** `buildEmail.ts` is the only escape
  boundary; nothing upstream escapes.
- **Empty is a valid render.** A block that fails its guard upstream arrives
  empty and must simply not render. Never substitute placeholder text — a thin
  day is supposed to look short, not padded.
- Regional sections are nullable (`HistoryData.southeastAsia` / `.malaysia`).
  Null means neither a verified event nor a verified figure was found.
- **The provider is not rendered.** `HistoryResult.provider` is for logs. In the
  email it occupied the most-remembered position and led the reader nowhere.
- **Do not add the avatar as an `<img>`.** See the `deploy-and-ops` skill — it is
  an inbox-level asset, not body content.

## Changing the data shape

`EVENT_SHAPE`/`FIGURE_SHAPE` in `buildWritePrompt`, the `EventCard`/`FigureCard`
types, the `parseEventCard`/`parseFigureCard` guards, the HTML renderer, **the
text renderer** and the preview sample are coupled **by hand, not by a schema**.
Change all six together or the field silently vanishes from one of them.

## Two escapers, and using the wrong one is a hole

`esc()` is for text. `safeUrl()` is for anything that lands in an `href` or a
`src`, and it is not interchangeable with `esc()`: entity-encoding stops an
attribute being broken out of, but `javascript:` and `data:` pass through it
untouched. Official-website links come from Wikidata, which anyone can edit.

`safeUrl()` returns `""` for anything that is not `http(s)`, and every caller
treats that as "no link": the reference renders unlinked, the image block is
dropped whole. That is the same shape as an authority the model was never
allowed to link, so nothing downstream needs a new case.

Adding a new `href` or `src`? It goes through `safeUrl()`. There is no third
option.

See `SECURITY.md` for why this is a boundary rather than a nicety.
