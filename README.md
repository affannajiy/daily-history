# Daily History Email

A scheduled Node.js/TypeScript program that emails you historical events that
happened on today's calendar day, written in a **National Geographic /
History Channel** editorial voice. It runs every day at **7:30 AM MYT
(Asia/Kuala_Lumpur)** via GitHub Actions.

Each digest contains three sections:

1. **Global Headline Event** — a full feature with synopsis, key figures, and impact.
2. **Southeast Asia** — a condensed honorable mention.
3. **Tanah Melayu / Malaya / Malaysia** — a condensed Malaysian-history mention.

## Stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Runtime        | Node.js 20+ + TypeScript                            |
| Scheduler      | GitHub Actions (`cron: '30 23 * * *'` UTC)          |
| AI (primary)   | Groq (`llama-3.3-70b-versatile`, free tier)         |
| AI (fallback)  | Google Gemini (`gemini-2.0-flash`, free tier)       |
| Event grounding| Wikimedia "On This Day" feed (verified dated events)|
| Email delivery | Resend                                              |
| Timezone       | `luxon`, pinned to `Asia/Kuala_Lumpur`              |

If Groq fails for any reason (quota, network, malformed output), the program
automatically falls back to Gemini. Either way, the events themselves come from
the verified On This Day feed — the AI only selects and rewrites them, so it
cannot invent events or dates.

## Project structure

```
daily-history/
├── src/
│   ├── index.ts          # Entry point — computes today's date in MYT
│   ├── fetchOnThisDay.ts # Verified dated events from Wikimedia
│   ├── regions.ts        # Deterministic SEA / Malaysia classification
│   ├── fetchHistory.ts   # AI selects + rewrites, Groq→Gemini fallback
│   ├── buildEmail.ts     # HTML email template (red/black/white/grey)
│   ├── sendEmail.ts      # Resend delivery
│   ├── preview.ts        # Renders preview.html with sample data
│   └── types.ts          # Shared types
├── .github/workflows/daily.yml
├── .env.example
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
3. The workflow runs automatically at 7:30 AM MYT every day.
4. To test now: **Actions → Daily History Email → Run workflow**.

> **Timezone note:** GitHub Actions cron is in UTC. MYT is UTC+8, so 7:30 AM MYT
> equals 23:30 UTC the previous day — hence `'30 23 * * *'`. GitHub's scheduler
> can lag by a few minutes under load, which is normal.

## Customization

Optional environment variables (defaults shown):

```env
GEMINI_MODEL=gemini-2.0-flash
GROQ_MODEL=llama-3.3-70b-versatile
FROM_EMAIL=History Today <onboarding@resend.dev>
```
