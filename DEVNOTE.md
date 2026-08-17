# DEVNOTE

Operator's notes. How to deploy this, how to change it safely, and what to check
when the email doesn't show up. `README.md` explains what the project *is*;
this explains how to *run* it.

---

## 0. The one thing to remember

**`npm run dev` and `npm start` send real email immediately.** No confirmation
prompt, no dry-run flag, no undo. If you want to see output, use:

```bash
npm run dryrun
```

Real feed, real model, writes `preview-live.html`, sends nothing.

---

## 1. First deploy

### 1.1 Get the keys

| Service | Where | Env name |
| --- | --- | --- |
| Resend | [resend.com](https://resend.com) → API Keys → Create | `RESEND_API_KEY` |
| Groq | [console.groq.com](https://console.groq.com) → API Keys | `GROQ_API_KEY` |
| Gemini *(optional)* | [aistudio.google.com](https://aistudio.google.com) → Get API Key | `GEMINI_API_KEY` |

Gemini is the fallback only. Its free tier is **region-dependent** — some
projects get `limit: 0`, which is a permanent refusal and not a rate limit you
can wait out. If that happens, leave it unset; the job stays on Groq.

### 1.2 Run it locally first

```bash
npm install
cp .env.example .env     # then fill in your keys
npm run dryrun           # confirm it produces a sane preview-live.html
```

Open `preview-live.html` and actually read it. Then, once, send yourself a real
one:

```bash
npm run dev
```

### 1.3 Put the secrets in GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

- `GROQ_API_KEY` *(required)*
- `RESEND_API_KEY` *(required)*
- `RECIPIENT_EMAIL` *(required)*
- `GEMINI_API_KEY` *(optional)*
- `FROM_EMAIL` *(optional — only once you've verified a domain in Resend)*

Names must match exactly; `.github/workflows/daily.yml` maps them one-to-one.

### 1.4 Turn on GitHub Pages — do not skip this

The job writes every edition to the orphan **`gh-pages`** branch and the email
links to it ("View in browser", and the footer). Until Pages is switched on,
**every one of those links 404s**.

**Settings → Pages → Source: "Deploy from a branch" → branch `gh-pages`, folder
`/ (root)` → Save.**

The archive is on its own branch, not in `main`, so cloning the source never
drags down a year of generated HTML and the bot's daily commit can never collide
with your local work. `main` holds code; `gh-pages` holds output.

The public URL is hardcoded in `src/archive.ts` as `ARCHIVE_BASE_URL`:

```
https://affannajiy.github.io/daily-history
```

If you rename the repo or someone forks it, **edit that constant** — otherwise
every link in every email points at the original site.

### 1.5 Trigger it by hand

**Actions → Daily History Email → Run workflow.** Do this before trusting the
cron. It proves the secrets, the build, the send path and the commit-back all
work, independently of whether GitHub decides to run your schedule.

The workflow needs `permissions: contents: write` (already set) because it
commits the edition and `data/sent.json` to `gh-pages` after each run. If you add
branch protection to `gh-pages`, the bot must be allowed to push or this step
fails.

---

## 2. The schedule, and why it looks wrong

```yaml
- cron: '30 20 * * *'   # 20:30 UTC = 04:30 MYT
```

MYT is UTC+8, so 07:30 MYT is 23:30 UTC the previous day. The cron is **not** set
to that, deliberately.

Free-tier GitHub Actions cron is best-effort. Scheduled runs queue behind paid
workloads and routinely start **2–3 hours late** at peak times. Firing at 04:30
MYT absorbs that lag and lands the email near 07:30 MYT. Because 04:30 and 07:30
MYT are the same calendar day, firing early doesn't change which day's events go
out.

**If delivery drifts,** adjust this offset. Don't "correct" it to 23:30 UTC — you
will get yesterday's date and a late email.

**Free-tier cron can also be skipped entirely** on repos with no recent activity.
GitHub disables scheduled workflows after 60 days of repository inactivity. A
commit, or a manual dispatch, resets that.

---

## 3. Changing things safely

There is **one test and no linter**. Verification is:

```bash
npx tsc --noEmit                # types
npm run test:ranking            # subject-page selection, offline
npm run test:ranking -- --live  # …and the network path production uses
npm run preview                 # all three render paths, sample data
npm run dryrun                  # what a real day actually produces
```

`npm run preview` covers three shapes at once — a fully enriched event, an event
whose article couldn't be fetched, and a figure card. They fail differently, so
check all three. It writes `preview.html` **and** `preview.txt` (the plain-text
part), and prints the subject line, which appears in neither file.

### The ranking test

`src/rankTest.ts` runs 47 real feed entries with hand-checked answers past the
subject picker. Current scores:

| Mode | Score |
| --- | --- |
| `rankPages` alone, offline | 27/46 |
| `pickSubject`, live | **41/46** |

The second is the number that matters — it is what actually chooses the article
each card is written from. The floors in `MIN_PASS` are a ratchet: raise them
when you improve things, never lower one to make a change pass.

This exists because subject ranking is the one thing that breaks **invisibly**.
A card about the Cold War on the day the Berlin Wall went up renders perfectly,
cites a real URL, and reads well.

Things nothing will catch automatically:

- **Prose gone vague.** Guards catch banned phrases, not blandness.
- **A block quietly disappearing** because the output shape was changed in one of
  its six hand-coupled places and not the other five.
- **A dead or wrong lead image.** Licence detection is conservative, but a
  correctly-licensed picture of the wrong thing is still wrong.

Run `dryrun` on **more than one date**. A prompt change that improves a rich day
often empties a thin one:

```bash
MONTH=2 DAY=8 npm run dryrun
```

---

## 4. When the email doesn't arrive

In order:

1. **Actions tab — did it run at all?** If there's no run, it's cron, not code.
   Dispatch manually to confirm. See §2 on skipped schedules.
2. **Read the job log.** `generateHistory` **throws on purpose** when the feed
   returned no verified events for the day. That's a correct failure — the design
   refuses to invent content. Nothing to fix.
3. **Model quota.** Groq exhausted + Gemini absent or `limit: 0` = no writer left.
4. **Resend dashboard.** Check for a bounce or a suppression list entry before
   assuming the job never reached the send step. A soft-bounced address stays
   suppressed.
5. **Spam folder**, especially while sending from `onboarding@resend.dev`. A
   shared sender address has whatever reputation everyone else gave it.

**Fast triage:** check whether `YYYY-MM-DD.html` was committed to `gh-pages` for
today. If it exists, generation worked and the problem is in the send. If it
doesn't, the run failed before that — read the job log.

## 4a. The archive and the sent log

Everything the job writes lives on the orphan **`gh-pages`** branch, never on
`main`:

| Path on `gh-pages` | What it is |
| --- | --- |
| `YYYY-MM-DD.html` | One edition, the same HTML the email carried |
| `index.html`, `index.json` | The archive listing |
| `data/sent.json` | Feed-entry keys already featured, so they are not repeated |

The workflow checks that branch out into `site/` beside the source and points
the job at it with two environment variables, `ARCHIVE_DIR` and
`SENT_LOG_PATH`. Locally those are unset, so `npm run dev` writes to `docs/` and
`data/` in your working copy — both gitignored, both throwaway. A local run
therefore sees an **empty sent log** and may pick an event the real job already
used; that only affects what a dry run shows you, never what is published.

To read an old edition without cloning it, use the published site. To get the
files anyway:

```bash
git fetch origin gh-pages && git switch gh-pages
```

**Why the sent log exists:** the pipeline is deterministic — same calendar day,
same feed, `temperature: 0` — so without it, 13 August 2027 would send very
nearly the 13 August 2026 email. Nobody notices for twelve months, and then it
looks broken.

Exclusion is soft. If withholding every seen event would leave a slot empty, the
slot gets a repeat rather than nothing. Some days genuinely have one Malaysian
event and no other.

To **reset** the variety history, delete `data/sent.json` on `gh-pages`. To **rewrite** a bad
edition, re-run the workflow for that date; the archive entry is overwritten
rather than duplicated.

The log is appended only after a successful send, so a failed run does not burn
the events it was about to use.

---

## 5. Sending from your own domain

The default `onboarding@resend.dev` works for testing but is shared, not yours,
and lands in spam more often. To move off it:

1. Resend → **Domains → Add Domain**, add the SPF and DKIM records it gives you.
2. Wait for verification.
3. Set `FROM_EMAIL` (locally and as a GitHub secret) to
   `History Today <news@yourdomain.com>`.

This is also the prerequisite for the avatar — both routes below need an address
or domain you actually own.

---

## 6. The sender avatar

The image next to the sender name is **not in the email**. It's an inbox-level
asset keyed to your FROM address or domain. Adding an `<img>` to the body does
not produce it, and committing the PNGs does nothing on its own.

```bash
npm run build:avatar   # avatar.svg → avatar-512/256/128.png
```

Two independent routes, neither working from `onboarding@resend.dev`:

**Gravatar** — quickest. Create an account on the exact address in `FROM_EMAIL`,
verify it, upload `assets/avatar/avatar-512.png`. No DNS. Coverage varies by
client; Gmail web leans on BIMI instead.

**BIMI** — what Gmail wants. Needs, in order:

1. DMARC passing at `p=quarantine` or stronger, with SPF and DKIM aligned. TXT at
   `_dmarc.<domain>`:
   ```txt
   v=DMARC1; p=quarantine; rua=mailto:dmarc@<domain>
   ```
2. `assets/avatar/bimi.svg` hosted over HTTPS at a stable URL. It's already SVG
   Tiny-PS compliant — square viewBox, `baseProfile="tiny-ps"`, a `<title>`, no
   external references.
3. TXT at `default._bimi.<domain>`:
   ```txt
   v=BIMI1; l=https://<host>/bimi.svg;
   ```

A **VMC** certificate is optional — it buys the blue checkmark, not the logo.

---

## 7. Maintenance

- **Node.** CI pins 22 in `daily.yml`; local dev is on 24. Bump both together.
- **`npm audit`.** `sharp` and `tsx`/`esbuild` are devDependencies used by
  `build:avatar` and the dev scripts — they never run in the shipped `npm start`
  path, so an advisory there is not a production exposure. Still worth clearing.
- **Cost.** Groq, Gemini and Resend free tiers cover one email a day with room to
  spare. `dryrun` consumes model quota; `preview` and the offline ranking test
  don't.
- **Repo growth.** `gh-pages` gains one HTML file (~20–25 KB) per day, so roughly
  8 MB a year — all of it on a branch nobody checks out. `main` does not grow.
  If it ever matters, delete old editions; nothing depends on them existing.
- **The `.env` file is gitignored.** So are `preview.*`, `preview-live.*`, and
  `docs/` and `data/` — those last two are local scratch output on `main`; the
  published copies live on `gh-pages`.
