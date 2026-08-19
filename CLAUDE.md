# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this is

A daily cron job (GitHub Actions, targeting 07:30 MYT) that emails a historical
digest. The pipeline in `index.ts`: **fetch verified events → classify by region
→ AI selects → fetch the chosen articles → AI writes → build HTML → send via
Resend.**

The central design principle is **grounding to prevent date hallucination.** An
earlier recall-only prompt snapped famous events onto the wrong day (the Fall of
Constantinople, actually May 29, appearing on May 30). Dates now come only from a
verified feed, never from a model.

| File | Role |
| --- | --- |
| `index.ts` | Entry point; computes today in MYT |
| `http.ts` | Every outbound call: timeout, retry, backoff |
| `fetchOnThisDay.ts` | Verified dated events + subject-article ranking |
| `regions.ts` | SEA / Malaysia classification, regex only |
| `enrich.ts` | Article text, images, local-language sources, Wikidata facts |
| `fetchFigures.ts` | Figure-of-the-day fallback, ranked in code |
| `fetchHistory.ts` | Two-pass AI (select → write), Gemini → Groq |
| `sentLog.ts` | What has already been featured, so it is not repeated |
| `buildEmail.ts` | HTML part |
| `buildText.ts` | Plain-text part |
| `subject.ts` | Subject line and preheader |
| `archive.ts` | Archive pages, published from the orphan `gh-pages` branch |
| `sendEmail.ts` | Resend delivery |
| `alert.ts` | Failure alert — plain mail, redacted error, no template |
| `redact.ts` | Strips credentials from anything leaving the process |
| `safePath.ts` | Confines configurable output paths to the workspace |
| `rankTest.ts` | Subject-page regression test |

## Read the skill before you edit

Detail lives in `.claude/skills/`. Each one records **why** a decision was made,
which is what stops it being undone by accident. Load the matching skill first:

| Touching | Skill |
| --- | --- |
| `buildEmail.ts`, `buildText.ts`, `subject.ts`, `preview.ts`, anything visual, `rulebook/UI-UX_Rulebook.md` | `email-template` |
| `fetchHistory.ts`, prompts, guards, filler prose, references, `sentLog.ts` | `ai-grounding` |
| `fetchOnThisDay.ts`, `enrich.ts`, `regions.ts`, `fetchFigures.ts`, `http.ts`, ranking test | `source-fetching` |
| Workflow, cron, secrets, CI, Pages, avatar/BIMI, "email didn't arrive", anything in `SECURITY.md` | `deploy-and-ops` |

`DEVNOTE.md` is the human runbook for deploying and operating it. `SECURITY.md`
is the threat model and posture; `rulebook/` holds the general references it is
measured against.

## Commands

```bash
npm run preview       # sample data → preview.html + .txt. No keys. NO MAIL.
npm run dryrun        # real data + real AI → preview-live.*. NO MAIL. Takes MONTH/DAY.
npm run test:ranking  # subject-page regression test. Offline. Add -- --live for the network path.
npm run build         # tsc → dist/
npm run dev           # FULL PIPELINE — SENDS REAL MAIL
npm start             # node dist/index.js — what CI runs — SENDS REAL MAIL
```

**`npm run dev` and `npm start` send real mail with no confirmation.** Never run
either as a smoke test — `npm run dryrun` exists for that. There is no linter and
the only test is `test:ranking`, so `preview` and `dryrun` carry most of the
verification.

Local secrets come from `.env` via `dotenv/config`. Required: `GEMINI_API_KEY`
(primary writer), `GROQ_API_KEY` (fallback), `RESEND_API_KEY`,
`RECIPIENT_EMAIL`. Optional: `FROM_EMAIL`, `GROQ_MODEL`, `GEMINI_MODEL`.

## Rules that hold everywhere

- **No model ever supplies a date, a URL, a subject line or an image.** All are
  built in code from verified sources; anything a model writes in those
  positions is discarded.
- **Images ship only under a positively-identified free licence.** Public
  domain, CC0, CC-BY, CC-BY-SA. Anything unrecognised is dropped — Wikipedia
  lead images are often non-free, and fair use does not travel to a newsletter.
- **Every outbound call goes through `http.ts`.** Never call bare `fetch`: the
  job runs once a day and a transient blip used to lose the whole digest.
- **Empty is a valid render.** Guards drop blocks that fail their checks, so a
  thin day looks short rather than padded. Do not weaken a guard to fill space,
  and do not add placeholder text.
- **No verified events → hard failure.** `generateHistory` throws rather than
  emit unsourced content. Intentional — but a failed run now mails a redacted
  alert (`alert.ts`) instead of dying silently.
- **Nothing outside `alert.ts` may put an error into an email.** Gemini takes its
  API key as a query parameter and `HttpError` quotes the full URL; the Actions
  log masks secrets, an inbox does not.
- **Cards are a discriminated union** (`EventCard | FigureCard`, keyed by
  `kind`), not one type with everything optional.
- **Regional sections are nullable.** Null means neither a verified event nor a
  verified figure was found. Any new consumer must handle it.
- **The output shape is coupled by hand, not by a schema.** Changing a field
  means changing `EVENT_SHAPE`/`FIGURE_SHAPE` in `buildWritePrompt`, the types,
  the `parse*Card` guards, `buildEmail`, `buildText` and the `preview.ts`
  sample — all six, together.
- **Subject-page selection fails silently and has a ratcheted test.** A
  wrong-subject card renders perfectly. `MIN_PASS` in `rankTest.ts` records
  measured floors (27/46 offline, 41/46 live); raise them when you improve the
  ranking, never lower one to make a change pass.
- **Escape all AI-supplied strings in `buildEmail.ts`.** Nothing upstream
  escapes. Text goes through `esc()`; anything landing in an `href` or `src`
  goes through `safeUrl()`, which drops non-`http(s)` schemes. They are not
  interchangeable — entity-encoding does not stop `javascript:`.
- **Anything from `process.env` that lands in a path or a URL is checked first.**
  `ARCHIVE_DIR` and `SENT_LOG_PATH` go through `safePath()`; the model ids go
  through `modelId()` in `fetchHistory.ts`. The environment is set by the
  workflow, not by a reader, so these are mistake guards — but they are also what
  keeps CodeQL's `js/path-injection` and `js/request-forgery` findings closed.
- Timezone is pinned to `Asia/Kuala_Lumpur` via luxon; never use the host clock.
- TypeScript strict, CommonJS, `Node16` resolution, `src/` → `dist/`. CI on Node
  22, local dev on Node 24. `scripts/` is outside `rootDir` and is not
  type-checked by `npm run build`.
