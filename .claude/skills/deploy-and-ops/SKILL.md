---
name: deploy-and-ops
description: Shipping and running the job — GitHub Actions workflow, cron and timezone, secrets, build/CI, the sender avatar and BIMI/Gravatar. Use when the daily email did not arrive, arrived late, when changing the schedule, or when deploying to a new repo.
---

# Deploy and operations

Full human-facing runbook is `DEVNOTE.md`. This file is the working summary.

## Commands, and which ones send mail

```bash
npm run preview       # sample data → preview.html + .txt.  No keys.  NO MAIL.
npm run dryrun        # real data + real AI → preview-live.*.         NO MAIL.
npm run test:ranking  # subject-page regression test, offline.        NO MAIL.
npm run build         # tsc → dist/
npm run dev           # FULL PIPELINE — SENDS REAL MAIL
npm start             # node dist/index.js — what CI runs — SENDS REAL MAIL
```

`npm start` and `npm run dev` send mail **immediately**, with no confirmation and
no `--dry-run` flag. There is no safe way to smoke-test them; use `dryrun`.

## What a real run writes to the repo

`npm start` does three things beyond sending, in this order:

1. **Archives** the edition to `<ARCHIVE_DIR>/YYYY-MM-DD.html` and rebuilds the
   index. This happens *before* the send so the "view in browser" link is live
   when the mail lands.
2. **Sends.**
3. **Appends** the featured feed-entry keys to `<SENT_LOG_PATH>` — only after a
   successful send, so a failed run does not burn the events it was going to use.

Both destinations are **not on `main`**. They live on an orphan `gh-pages`
branch, which the workflow checks out into `site/` and points the job at via the
`ARCHIVE_DIR` and `SENT_LOG_PATH` environment variables (defaults `docs/` and
`data/sent.json`, both gitignored and used only for local scratch).

That separation is deliberate and worth keeping: generated output on `main` means
every clone drags down a growing pile of HTML nobody reads, and the bot's daily
commit races whatever you are working on locally. Code on `main`, output on
`gh-pages`.

The commit step runs `if: always()` and pushes only `gh-pages`, so a
generated-but-unsent digest is still readable at its URL.

**A local run sees an empty sent log**, since the real one is on the other
branch. That skews what `dryrun` shows you; it cannot affect what is published.

## Schedule

Workflow: `.github/workflows/daily.yml`. Cron `'30 20 * * *'` **UTC**.

The arithmetic is not what it looks like. MYT is UTC+8, so 07:30 MYT is 23:30 UTC
the previous day — but free-tier GitHub runners queue for 2–3 hours at peak. The
cron fires at 20:30 UTC (**04:30 MYT**) to absorb that lag and land near 07:30
MYT. Since 04:30 and 07:30 MYT are the same calendar day, firing early does not
change which day's events are sent.

Timezone is pinned to `Asia/Kuala_Lumpur` via luxon in `index.ts`. "Today" is
computed in MYT no matter where the code runs — never use the runner's clock.

If delivery time drifts, adjust the offset; do not "fix" it back to 23:30 UTC.

## Secrets

Repository → Settings → Secrets and variables → Actions.

| Secret | Required | Notes |
| --- | --- | --- |
| `GROQ_API_KEY` | yes | primary model |
| `RESEND_API_KEY` | yes | delivery |
| `RECIPIENT_EMAIL` | yes | |
| `GEMINI_API_KEY` | no | fallback; free tier is region-dependent and may return `limit: 0` permanently |
| `FROM_EMAIL` | no | only once a domain is verified in Resend |

Locally the same names live in `.env`, loaded by `dotenv/config` in `index.ts`.

## CI

Node 22 (`actions/setup-node@v5`), `npm ci` → `npm run build` →
`npm run test:ranking` → `npm start` → commit archive. Local dev is Node 24.
TypeScript is strict, CommonJS emit, `Node16` resolution, `src/` → `dist/`.

The ranking test runs **before** the send: subject-page selection fails silently,
so catching a regression after the mail has gone out is catching it too late.

`scripts/` sits outside `rootDir`, so `npm run build` does **not** type-check it —
it runs via tsx only.

## GitHub Pages

The archive is served from the root of the `gh-pages` branch. This needs enabling
once, by hand: **Settings → Pages → Source: Deploy from a branch → `gh-pages` /
`/ (root)`**. Until that is done the workflow still writes and commits the files,
and every "view in browser" link 404s.

`gh-pages` is an **orphan** branch — no shared history with `main`, by design.
Never merge one into the other.

The public base URL is `ARCHIVE_BASE_URL` in `src/archive.ts`. It is hardcoded to
`https://affannajiy.github.io/daily-history` — **forking or renaming the repo
means editing it**, or every link in every email points at someone else's site.

## When the email does not arrive

Check in this order:

1. **Actions tab** — did the run start at all? Free-tier cron on a low-activity
   repo is delayed or skipped, not guaranteed. `workflow_dispatch` is enabled;
   trigger it manually to distinguish "never ran" from "ran and failed".
2. **Job log** — `generateHistory` **throws by design** when the feed returned no
   verified events. That is a correct failure, not a bug to patch around.
3. **Groq quota** — if Groq failed and `GEMINI_API_KEY` is unset or returns
   `limit: 0`, there is no writer left and the run fails.
4. **Resend** — check the Resend dashboard for a bounce or a suppression before
   assuming the job never reached the send step.
5. **The archive** — if `YYYY-MM-DD.html` exists on `gh-pages` for today,
   generation succeeded and the failure is in the send. That is the fastest way
   to split the pipeline in half.
6. **The commit step** — if it fails, check `permissions: contents: write` is
   still on the job and that no branch protection blocks the bot. If the
   *checkout* step fails instead, the `gh-pages` branch is missing on the remote
   and must be pushed once before the job can run.

## The sender avatar

`assets/avatar/` is an **inbox-level asset, not part of the email body**. Do not
add it as an `<img>`. `npm run build:avatar` (tsx + sharp) rasterizes
`avatar.svg` into 512/256/128 PNGs; `bimi.svg` is an SVG Tiny-PS profile.

None of it is wired into the pipeline. The avatar appears only once registered
with **Gravatar** (needs a FROM address you own) or **BIMI** (own domain + DMARC
at `p=quarantine` or stronger + a DNS TXT record at `default._bimi.<domain>`).
Neither works with the shared default `onboarding@resend.dev` sender. Committing
the PNGs changes nothing on its own.
