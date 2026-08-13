---
name: source-fetching
description: Working on where the facts come from — fetchOnThisDay.ts, enrich.ts, fetchFigures.ts, regions.ts, http.ts. Use when a card is written about the wrong subject, a region is misclassified, article text, images or Wikidata facts are missing, the ranking test fails, or a new data source is being added.
---

# The sourcing layer

Five files, all deterministic. **No model runs in any of them** — that is the
point. Every date in the email comes from a verified feed, so a hallucinated date
is structurally impossible rather than merely discouraged.

## `http.ts` — every outbound call

All fetches go through `request`/`getJson`/`getJsonOrNull`/`postJson`. Three
attempts with jittered exponential backoff, retrying 408/425/429/5xx and network
errors but **never** 4xx — a 404 means the thing is not there and retrying only
burns runner time. The job runs once a day with no second chance, so a single
transient blip used to lose the whole digest.

`getJson` throws; `getJsonOrNull` warns and returns null. Enrichment uses the
latter, the feed uses the former. Do not call bare `fetch` in new code.

## `fetchOnThisDay.ts` — the factual backbone

Pulls Wikimedia's "On This Day" REST feed for the calendar day. Every entry
genuinely occurred on that month/day with a correct year.

It also owns **`rankPages` / `bestPageTitle`**, and this is load-bearing:

> The feed lists an entry's linked pages **in order of appearance**, so
> `pages[0]` is frequently the *background* topic. "Cold War: Construction of the
> Berlin Wall begins" links Cold War first. Enriching from that page produced a
> card about the Cold War on the day the Wall went up.

`rankPages` scores sentence signals: colon prefix (the background framing), a
year in the title, occurrence nouns (battle, siege, treaty, crash…), generic
concept penalty, and the position of each candidate's **distinctive** tokens —
distinctive because two candidates sharing a token ("Min Ping Yu No. 5202" and
"Min Ping Yu No. 5540 incident") both looked early otherwise. Background cues
("after", "marking", "following") subtract.

## `enrich.ts` — article text and facts

Wikipedia plain-text extract capped at 6000 chars, plus a **deliberately
restricted** set of Wikidata claims: bare counts, dates and URLs only. Any
entity-valued claim would need a second call to resolve its label, and a raw QID
in the email is worse than no fact at all.

`pickSubject` refines `rankPages` using each candidate's own short description —
penalising descriptions that read as a place, an institution or a broad concept,
rewarding event nouns and a matching year. That description check is what finally
separates a city from the occupation of that city, and it is worth about 14
fixtures (see the ranking test below). The top **6** candidates get a lookup;
narrowing that number loses entries that link a long chain of context first.

`NOT_AN_EVENT` deliberately omits most person words. A person genuinely is the
subject often enough ("Alexandros Panagoulis attempts to assassinate…") that
penalising them costs more than it gains.

**`pickSubject` is skipped entirely for figure slots** (`isFigure` in
`EnrichOptions`). A births/deaths entry's person is `pages[0]` by construction,
and running event scoring over a biography actively penalises the right answer.

### Lead images

`fetchImage` resolves a page's `pageimages` thumbnail, then checks the file's
`extmetadata` licence. **Only positively-identified free licences pass** — public
domain, CC0, CC-BY, CC-BY-SA. Wikipedia lead images are routinely non-free "fair
use" (logos, posters, press photographs), and fair use does not travel to a
newsletter. Anything unidentified is dropped: the cost of guessing wrong is
legal, the cost of dropping is a card without a picture.

Only the global slot requests one (`wantImage`).

### Local-language sources

English Wikipedia is thinnest on exactly the Malaysian and Southeast Asian
subjects the regional cards need, which is why those cards were the weakest.
`fetchLocalExtract` pulls the same subject from `ms`/`id` Wikipedia, reached
through **Wikidata sitelinks** rather than by translating a title — so it is the
same subject by construction and cannot drift. Capped at 2000 chars, stubs under
400 chars are dropped, and the article is cited in the reference list like any
other source that fed the writing pass.

**Every call degrades to empty rather than throwing.** A thin card ships; a
missing digest does not.

## `regions.ts` — classification, by regex, never by the model

The fallback model was unreliable at scanning dozens of entries for regional
relevance. Code filters event text plus linked article titles and hands the model
a short pre-filtered candidate list. Malaysia matches are **excluded** from the
SEA bucket so the two never overlap. `matchesMalaysia` / `matchesSoutheastAsia`
are exported so the births/deaths feed is filtered by identical rules.

## `fetchFigures.ts` — the empty-region fallback

Most days record no Malaysian event, and a card saying "nothing happened" was the
weakest thing in the email. The slot falls back to someone **born or died on the
same date**, from the same feed, so the card stays date-anchored.

**Who is chosen is decided by code** — `MIN_ARTICLE_BYTES = 4000`, then ranked by
`bytes / 1000 + langlinks` — because asking a model for "someone notable" invites
whoever it happens to remember.

## Verifying a change here — run the ranking test

Ranking changes cannot be type-checked and they fail **silently**: a
wrong-subject card still renders perfectly, cites a real URL and reads well.

```bash
npm run test:ranking            # offline, deterministic, no network
npm run test:ranking -- --live  # also runs pickSubject (fetches descriptions)
```

47 real feed entries with hand-checked answers, frozen in
`test/fixtures/subject-ranking.json`. Current measured floors, enforced in
`MIN_PASS` in `src/rankTest.ts`:

| Mode | Score | What it covers |
| --- | --- | --- |
| `rankPages` (offline) | 27/46 | Citation links, and the fallback with no network |
| `pickSubject` (live) | 41/46 | **What actually chooses the article a card is written from** |

Those floors are a **ratchet**. Raise them when you improve the ranking; never
lower one to make a change pass — a drop is the test doing its job. Run `--live`
before trusting any change to `NOT_AN_EVENT`, `IS_AN_EVENT` or the shortlist
size; run offline before trusting any change to `rankPages`. A change that
improves one mode can wreck the other.

One fixture is unscoreable: the Gatumba massacre entry links no article about
the massacre at all. It is kept so the known miss stays visible and counted.

The remaining live failures are mostly genuinely ambiguous — a sentence naming
both an assassin and his target does not say which article it is "about".
**Chasing them on 47 fixtures is fitting noise.** Add fixtures before tuning.

Then check real output end to end:

```bash
MONTH=8 DAY=13 npm run dryrun
```

## Adding a source

Any new source must supply a **date it can be held to**. A source that gives good
prose but no verifiable date reintroduces the original bug. Fetches must time out
(8s here) and degrade to empty, never throw into the pipeline.
