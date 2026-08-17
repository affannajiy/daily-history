# Daily History Email

A scheduled Node.js/TypeScript program that emails you historical events that
happened on today's calendar day, broken into scannable blocks — who, what,
where, when, a timeline, and what changed afterwards. It runs every day at
**7:30 AM MYT (Asia/Kuala_Lumpur)** via GitHub Actions.

Deploying or operating it? See **[DEVNOTE.md](DEVNOTE.md)** — first deploy, the
cron offset, and what to check when the email doesn't arrive.

Each digest contains three sections:

1. **Global Headline Event** — the full card, including a statistics strip.
2. **Southeast Asia** — the same card, minus the statistics.
3. **Tanah Melayu / Malaya / Malaysia** — likewise, falling back to a figure of
   the day when the archive records no Malaysian event for the date.

Every card breaks the story into discrete blocks rather than running prose:

| Block | What it holds |
| --- | --- |
| Lead image | A freely-licensed photograph or painting (global card only) |
| Fact strip | Who · What · Where · When — four cells, scannable in a second |
| What happened | Two paragraphs of concrete narrative |
| Timeline | 3–6 dated beats, run-up through aftermath |
| By the numbers | 2–3 hard figures (global card only) |
| Key figures | People who acted, and what each of them did |
| What changed after | What was concretely different afterwards |

Each edition is also published to a **[web archive](https://affannajiy.github.io/daily-history)**,
linked from the top of the email — Gmail clips messages past ~102 KB, and an
email is unsearchable a week later.

Earlier editions ran a free-form *synopsis* and an *impact* section, and the two
routinely said the same thing twice — both filled with "significant", "far-reaching"
and "a testament to human ingenuity". Two causes, both fixed: the sections had
overlapping definitions, and the AI was being asked for four paragraphs from a
source that gave it one sentence. See **How the writing is grounded** below.

## Stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Runtime        | Node.js 22+ + TypeScript                            |
| Scheduler      | GitHub Actions (`cron: '30 20 * * *'` UTC, fires early to compensate for runner lag) |
| AI (primary)   | Groq (`llama-3.3-70b-versatile`, free tier)         |
| AI (fallback)  | Google Gemini (`gemini-2.0-flash`, free tier)       |
| Event grounding| Wikimedia "On This Day" feed (verified dated events)|
| Detail sourcing| Wikipedia (EN + `ms`/`id`) article text + Wikidata claims |
| Images         | Wikimedia Commons, free licences only               |
| Email delivery | Resend (`multipart/alternative` — HTML + plain text)|
| Archive        | GitHub Pages, served from the `gh-pages` branch     |
| Timezone       | `luxon`, pinned to `Asia/Kuala_Lumpur`              |

If Groq fails for any reason (quota, network, malformed output), the program
automatically falls back to Gemini.

## How the writing is grounded

The AI runs **twice**, and fetching happens in between.

1. **Select.** The model sees the day's verified one-line entries and returns
   *ids only* — no prose. Its regional picks are checked against the same regex
   buckets that produced the candidate lists, so it cannot promote an unrelated
   event into a regional slot.
2. **Fetch.** Code pulls the full Wikipedia article for each chosen event, plus a
   restricted set of Wikidata claims (bare counts, dates and URLs only).
3. **Write.** The model writes each card from that article text, and is told it
   may use nothing else.

The split exists because the feed gives one sentence per event. Asking for four
paragraphs from one sentence is what produced the filler — the model had no facts
left, so it reached for adjectives. It also can't work the other way round: you
cannot fetch an article before you know which event won.

Several rules are then enforced in code rather than trusted to the prompt. A
timeline needs three dated beats or the block is dropped. A statistic's digits
must occur in the source text. A named figure must appear in the source. Whole
sentences containing banned phrases are deleted. **A short card is the correct
output for a thin day** — nothing is padded to fill space.

### References

The model is **forbidden from writing URLs**, and any it writes is discarded.
Every dead link in earlier editions came from a model reciting one from memory.
Links are built in code from the article's own canonical URL and Wikidata's
official-website claim, both of which are known to resolve.

The model may still *name* an authority it knows holds material — Britannica, the
Library of Congress, Arkib Negara Malaysia for the Malaysian section — but only as
an unlinked name, and it may not cite a specific document unless that document is
named in the fetched article text.

### Which article a card is written from

The feed lists an entry's linked pages in order of appearance, so the first one is
often the *background* topic rather than the subject — "Cold War: Construction of
the Berlin Wall begins" links Cold War first. Writing from that page produced a
card about the Cold War on the day the Wall went up. The subject is now chosen by
scoring the sentence (colon prefixes, years in titles, where each candidate is
mentioned, cues like "after" and "marking") and then checking each candidate's own
short description — which is what separates a city from the occupation of it.

This is the one thing in the pipeline that fails **silently**: a wrong-subject
card renders perfectly and cites a real URL. So it has the project's only test —
47 real feed entries with hand-checked answers:

```bash
npm run test:ranking            # sentence signals only, offline: 27/46
npm run test:ranking -- --live  # plus description checks: 41/46
```

The floors are a ratchet, and CI runs the offline check before any mail goes out.

### Repeats

The pipeline is deterministic, so without intervention the same calendar day
would produce the same email every year. Featured entries are recorded in
`data/sent.json` on the `gh-pages` branch and withheld from future selection —
softly, so a region with
exactly one recorded event never loses it permanently.

### When a region has no event

Most days record no Malaysian event, and a card saying nothing happened was the
weakest thing in the email. That slot now falls back to someone **born or died on
the same date**, drawn from the same Wikimedia feed, so the card stays anchored to
the day. Who gets chosen is decided by code — ranked by article size and interwiki
coverage — because asking a model for "someone notable" invites whoever it happens
to remember. If neither an event nor a figure exists, the section says so and names
the archive that was searched.

## Project structure

```
daily-history/
├── src/
│   ├── index.ts          # Entry point — computes today's date in MYT
│   ├── http.ts           # Every outbound call: timeout, retry, backoff
│   ├── fetchOnThisDay.ts # Verified dated events + subject-article picking
│   ├── regions.ts        # Deterministic SEA / Malaysia classification
│   ├── enrich.ts         # Article text, images, local-language sources, Wikidata
│   ├── fetchFigures.ts   # Figure-of-the-day fallback, ranked in code
│   ├── fetchHistory.ts   # Two-pass AI (select → write), Groq→Gemini fallback
│   ├── sentLog.ts        # What has already been featured
│   ├── buildEmail.ts     # HTML part (red/black/white/grey)
│   ├── buildText.ts      # Plain-text part
│   ├── subject.ts        # Subject line and inbox preheader
│   ├── archive.ts        # Writes the archive pages for GitHub Pages
│   ├── sendEmail.ts      # Resend delivery
│   ├── preview.ts        # Renders preview.html/.txt with sample data
│   ├── dryrun.ts         # Real data + real AI, writes preview-live.*
│   ├── rankTest.ts       # Subject-page regression test
│   └── types.ts          # Shared types
├── test/fixtures/        # 47 real feed entries with hand-checked answers
├── .claude/skills/       # Task-scoped guidance for Claude Code
├── .github/workflows/daily.yml
├── .env.example
├── DEVNOTE.md            # Deploy + operate runbook
├── package.json
└── tsconfig.json
```

## Local setup

```bash
npm install
cp .env.example .env   # then fill in your keys
```

Run it for real (sends an email):

```bash
npm run dev            # runs src/index.ts via tsx
# or, after compiling:
npm run build && npm start
```

Inspect the email design **without** API keys or sending anything:

```bash
npm run preview        # writes preview.html — open it in a browser
```

The sample data covers all three render paths at once — a fully enriched event, an
event whose article text could not be fetched, and the figure-of-the-day card —
because those are the three shapes a real morning can produce and each one fails
differently.

To see what a **real** day produces, with live data and a live model but no email:

```bash
npm run dryrun         # writes preview-live.html
```

Set `MONTH` and `DAY` to render any date, e.g. `MONTH=2 DAY=8`. This consumes a
little API quota; `npm run dev` is the only command that actually sends mail.

## Getting the API keys

### 1. Resend (email)

- Sign up at [resend.com](https://resend.com) → **API Keys** → **Create API Key**, name it `daily-history`.
- Put it in `.env` as `RESEND_API_KEY`.
- For testing you can send from `onboarding@resend.dev` (the default). To use
  your own domain, verify it in Resend and set `FROM_EMAIL`, e.g.
  `History Today <news@yourdomain.com>`.

### 2. Groq (primary AI)

- Sign up at [console.groq.com](https://console.groq.com) → **API Keys** → **Create API Key**.
- Put it in `.env` as `GROQ_API_KEY`.

### 3. Gemini (fallback AI)

- Go to [aistudio.google.com](https://aistudio.google.com) → **Get API Key**, put it in `.env` as `GEMINI_API_KEY`.
- Only used if Groq fails. Note the free tier is region-dependent — some
  projects return `limit: 0`, in which case the program simply stays on Groq.

## Deploying the daily schedule (GitHub Actions)

1. Push this repo to GitHub.
2. **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `RESEND_API_KEY`
   - `RECIPIENT_EMAIL`
   - `FROM_EMAIL` *(optional — only if you verified a domain in Resend)*
3. **Settings → Pages → Deploy from a branch → `gh-pages` / `/ (root)`.** Without
   this the archive links in every email 404. If you forked or renamed the repo,
   also update `ARCHIVE_BASE_URL` in `src/archive.ts`.

   The published editions and the sent-event log live on that orphan `gh-pages`
   branch, not on `main` — so cloning the source never pulls down a growing pile
   of generated HTML, and the daily bot commit never lands on the branch you
   work in.
4. The workflow runs automatically at 7:30 AM MYT every day.
5. To test now: **Actions → Daily History Email → Run workflow**.

See **[DEVNOTE.md](DEVNOTE.md)** for the full runbook, including what to check
when the email doesn't arrive.

> **Timezone note:** GitHub Actions cron is in UTC. MYT is UTC+8, so 7:30 AM MYT
> equals 23:30 UTC the previous day in theory — but free-tier GitHub Actions
> runners experience 2–3 hours of queue lag during peak hours. The cron is set to
> `'30 20 * * *'` UTC (04:30 MYT) to compensate, targeting email delivery by
> ~07:30 MYT. If delivery time drifts, adjust the cron offset accordingly.

## Customization

Optional environment variables (defaults shown):

```env
GEMINI_MODEL=gemini-2.0-flash
GROQ_MODEL=llama-3.3-70b-versatile
FROM_EMAIL=History Today <onboarding@resend.dev>
```

## Sender avatar

The little image clients show next to the sender name is **not** part of the
email body — it's an inbox/client-level asset keyed to the FROM address or the
sending domain. The artwork lives in `assets/avatar/`:

| File              | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `avatar.svg`      | Master vector (hourglass = "on this day in history") |
| `avatar-512.png`  | Canonical raster upload (Gravatar, BIMI rasterizers) |
| `avatar-256.png`  | Downscale                                            |
| `avatar-128.png`  | Downscale                                            |
| `bimi.svg`        | BIMI-compliant SVG Tiny-PS profile                   |

Regenerate the PNGs from the SVG any time:

```bash
npm run build:avatar   # writes avatar-512/256/128.png
```

The design is flat and circle-safe (everything sits inside the inscribed circle
with margin, no fine text), so it survives the circular crop and ~32px sizes that
Gmail and Apple Mail apply.

There are two independent ways to make it appear, and **neither works with the
default `onboarding@resend.dev` sender** — that address is shared and not yours
to claim. Both paths require sending from an address/domain you control, so the
first real step is verifying a domain in Resend and setting `FROM_EMAIL` to
something like `History Today <news@yourdomain.com>`. After that, Gravatar is the
quick win and BIMI is what Gmail prefers.

> Until `FROM_EMAIL` is on an address you own, the avatar will **not** change —
> clients keep showing their default letter tile. Generating/committing the PNGs
> does nothing on its own; the image must be registered with Gravatar or BIMI.

### 1. Gravatar — quickest, once you own the FROM address

Many clients pull the sender avatar from [Gravatar](https://gravatar.com), keyed
to the email address in `FROM_EMAIL`.

1. Create a Gravatar account on the **exact** address you send from (the address
   in `FROM_EMAIL` — must be one you own and can verify).
2. Upload `assets/avatar/avatar-512.png` as the profile image.
3. Confirm/verify that email on the account.

Needs no DNS, just a verified address. (Coverage varies by client; Gmail web in
particular leans on BIMI rather than Gravatar.)

### 2. BIMI — works once you own + verify a domain in Resend

[BIMI](https://bimigroup.org) lets clients like Gmail display your logo for
**authenticated** mail sent from your own domain. Requirements:

1. **Pass DMARC** on the sending domain at `p=quarantine` or stronger (with SPF
   and DKIM aligned — Resend's domain setup walks you through SPF/DKIM). Example
   DMARC TXT record at `_dmarc.<domain>`:

   ```txt
   v=DMARC1; p=quarantine; rua=mailto:dmarc@<domain>
   ```

2. **Use the BIMI profile** at `assets/avatar/bimi.svg`. It's already SVG Tiny-PS
   compliant (square `viewBox`, `baseProfile="tiny-ps"`, a `<title>`, no external
   references) — regenerate it from `avatar.svg` only if you change the artwork.

3. **Host it over HTTPS** at a stable URL, e.g. `https://<host>/bimi.svg`.

4. **Add a DNS TXT record** at `default._bimi.<domain>`:

   ```txt
   v=BIMI1; l=https://<host>/bimi.svg;
   ```

A **VMC** (Verified Mark Certificate) is *optional* — it's only needed for the
blue verified checkmark next to the logo, not for the logo itself.
