# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Run the full pipeline via tsx (FETCHES + GENERATES + SENDS a real email)
npm run preview  # Render preview.html from sample data — no API keys, no email sent
npm run build    # tsc → dist/
npm start        # node dist/index.js (what CI runs)
```

There is no test suite or linter. `npm run preview` is the safe way to iterate on
email/template changes; `npm run dev` actually sends mail and consumes API quota.

Local runs read secrets from `.env` (loaded via `dotenv/config` in `index.ts`).
Required: `GROQ_API_KEY`, `RESEND_API_KEY`, `RECIPIENT_EMAIL`. Optional:
`GEMINI_API_KEY` (fallback), `FROM_EMAIL`, `GROQ_MODEL`, `GEMINI_MODEL`.

## Architecture

This is a daily cron job (GitHub Actions, 07:30 MYT) that emails a historical
digest. The pipeline in `index.ts` is: **fetch verified events → classify by
region → AI rewrites into prose → build HTML → send via Resend.**

The central design principle is **grounding to prevent date hallucination.** An
earlier recall-only prompt snapped famous events onto the wrong day (e.g. the
Fall of Constantinople, actually May 29, appearing on May 30). The current
architecture makes wrong dates structurally impossible:

1. **`fetchOnThisDay.ts`** pulls the verified, correctly-dated event list for the
   calendar day from Wikimedia's "On This Day" REST feed. This is the factual
   backbone — every event genuinely occurred on that month/day with a correct year.

2. **`regions.ts`** classifies events into Southeast Asia / Malaysia buckets
   **deterministically with regex**, NOT via the LLM. The weaker fallback model
   was unreliable at scanning dozens of events for regional relevance, so code
   filters against event text + linked article titles and hands the model a short
   pre-filtered candidate list. Malaysia matches are excluded from the SEA bucket
   so the two never overlap.

3. **`fetchHistory.ts`** is where the AI runs, but it may **only select and
   rewrite from the supplied verified lists** — never invent events, years, or
   dates (enforced by the prompt's STRICT RULES and `temperature: 0`). It calls
   **Groq first** (`llama-3.3-70b-versatile`), **Gemini as fallback**
   (`gemini-2.0-flash`). The `enforce()` wrapper forces a regional section to
   `null` whenever code found zero candidates for that region, regardless of what
   the model returned — the model can never fabricate a section to fill an empty slot.
   References follow the same no-hallucination discipline: each event in the
   prompt carries a verified `[wikipedia: ...]` link (built deterministically by
   `wikipediaUrl()` from the feed's exact article titles), the model is told to
   always cite that link, and it must omit any URL it isn't sure of. The Malaysia
   section is additionally steered toward Arkib Negara Malaysia and other
   Malaysian archival authorities.

4. **`buildEmail.ts`** renders the HTML email (640px, table-based, inline styles,
   Georgia serif justified body). Regional sections are `HistorySection | null`;
   null renders an honest empty-state card rather than fabricated content. All
   AI-supplied strings must be HTML-escaped here.

### Things to know

- **Regional sections are nullable** (`HistoryData.southeastAsia` / `.malaysia`).
  Most days have no verified Malaysia event — `null` is the common, correct case,
  not an error. Any new consumer of `HistoryData` must handle null.
- **Timezone is pinned to `Asia/Kuala_Lumpur`** via luxon. "Today" is always
  computed in MYT regardless of where the code runs. The CI cron is `'30 23 * * *'`
  UTC because MYT is UTC+8 (so it fires the previous UTC day).
- **No verified events → hard failure.** `generateHistory` throws rather than
  emit unsourced content. This is intentional.
- **Gemini's free tier is region-dependent** and may return `limit: 0` (not a
  transient rate limit). That's why Groq is primary and the fallback is best-effort.
- When changing the AI output shape, update the prompt JSON skeleton in
  `buildPrompt`, the `HistorySection`/`HistoryData` types, the `isValidSection`
  guard, and the `buildEmail` renderer together — they are coupled by hand, not
  by a schema.
- CI runs on Node 22 (`actions/setup-node@v5`); local dev is Node 24. TypeScript
  is strict, CommonJS, compiling `src/` → `dist/`.
