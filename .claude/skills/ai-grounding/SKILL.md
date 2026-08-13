---
name: ai-grounding
description: Working on the AI pipeline in src/fetchHistory.ts — prompts, model selection, output parsing, quality guards, references, or filler in the generated prose. Use when the digest text reads as vague, dates or facts look wrong, links are dead, or a new provider or field is being added.
---

# The AI pipeline

`src/fetchHistory.ts`. Groq first (`llama-3.3-70b-versatile`), Gemini as
best-effort fallback (`gemini-2.0-flash`), `temperature: 0` throughout. Both go
through `http.ts` (3 attempts, jittered backoff, 60s timeout — a writing pass
over three articles is slow by nature and must not be aborted early).

## Two passes, with a fetch in between

1. **Select.** The model sees only the day's verified one-line feed entries and
   returns **ids, no prose**.
2. **Fetch.** Code pulls the full article for each chosen event (`enrich.ts`).
3. **Write.** The model writes each card from that article text and is told it
   may use nothing else.

This split is the fix for the original defect: the feed gives one sentence per
event, so asking for four paragraphs from it made the model reach for adjectives
("significant", "far-reaching", "a testament to human ingenuity") in every
section, which is why synopsis and impact used to say the same thing. Selection
must come first because you cannot fetch an article before you know which event
won. **Do not collapse the passes back into one.**

Pass 1's ids are validated against the regex region buckets, so the model cannot
promote an unrelated event into a regional slot.

## Selection also excludes what has already run

`sentLog.ts` records the feed-entry keys featured each day in `data/sent.json`,
and those entries are simply **not offered** to pass 1 next time. Without this
the pipeline repeats itself: same calendar day, same feed, `temperature: 0`, so
13 August 2027 would send very nearly the 13 August 2026 email.

Exclusion is **soft** — if filtering would empty a bucket, the unfiltered bucket
is returned. Some calendar days genuinely have one Malaysian event and nothing
else. A repeat is a mild disappointment; an empty global slot is a failed digest.

Ids keep their original numbers when entries are withheld, so the list handed to
the model has gaps. That is fine: the model returns ids from that list and
`parseSelection` validates them against the same set.

The log is written **after** a successful send, so a failed run does not burn the
events it was about to feature.

## Guards live in code, not in the prompt

The prompt asks; the code enforces. Every one of these exists because the model
failed exactly that way at least once.

| Guard | Rule | Failure it prevents |
| --- | --- | --- |
| `MIN_TIMELINE` | 3+ dated beats or the block is dropped (max 6) | Two-item stub timelines |
| `numbers()` | 2+ stats; bare years rejected; each figure's digits must occur in the source | "1945 — Year of the end of the Second World War" |
| `keyFigures()` | The name must appear in the source text | George Orwell credited on the Berlin Wall |
| `standfirst()` | ≥8 words, and must not restate the body's opening sentence | The fragment "Barbed Wire Sunday" |
| `stripFiller()` | Deletes whole sentences containing a `BANNED_PHRASES` entry | Interchangeable filler prose |

`BANNED_PHRASES` covers both the event variant ("lasting impact", "paved the
way", "testament to") and the biography variant ("inspired generations",
"visionary leader", "wisdom and integrity") — figure cards drifted into eulogy
and needed their own list.

**A dropped block is the correct outcome.** Do not soften a guard to make a card
look fuller.

## References: the model never writes a URL

Every dead link in earlier editions came from a model reciting one from memory.
`references()` builds links **in code** from the article's canonical URL and
Wikidata's official-website claim (P856), and **discards any URL the model
writes**. A model may still name an authority (Britannica, Arkib Negara) but only
unlinked, and a `"Publisher — Specific Work"` title is truncated to the publisher
unless the work is named in the fetched extract.

If you are tempted to let the model supply a URL: the whole class of bug returns.

Local-language articles that fed the writing pass are cited too, as
`Wikipedia (MS) — Title`. Their text also counts as "the source" for the
`numbers`/`keyFigures` presence checks — a name the model took from the Malay
article is sourced, and rejecting it would push the card back to the thinner
English one.

## Hard failure is intentional

`generateHistory` **throws** when there are no verified events, rather than emit
unsourced content. Do not add a fallback that invents a day.

## Adding or changing a field

`EVENT_SHAPE`/`FIGURE_SHAPE` in `buildWritePrompt`, the types, the
`parseEventCard`/`parseFigureCard` guards, `buildEmail`, `buildText` and the
`preview.ts` sample are coupled by hand. All six, together.

## Checking your work

```bash
npm run dryrun          # real feed + real model → preview-live.html + .txt, sends NO mail
MONTH=2 DAY=8 npm run dryrun
```

The dry run applies the same sent-log exclusions the real run does, so it shows
what tomorrow morning would actually contain rather than what it could have.

Prose quality cannot be type-checked. Read the output. Run more than one date —
a prompt change that improves a rich day often empties a thin one.

## Gemini caveat

Gemini's free tier is region-dependent and may return `limit: 0` — a permanent
refusal, not a transient rate limit. That is why Groq is primary and the fallback
is best-effort rather than assumed.
