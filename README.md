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
| Scheduler      | GitHub Actions (`cron: '30 20 * * *'` UTC, fires early to compensate for runner lag) |
| AI (primary)   | Groq (`llama-3.3-70b-versatile`, free tier)         |
| AI (fallback)  | Google Gemini (`gemini-2.0-flash`, free tier)       |
| Event grounding| Wikimedia "On This Day" feed (verified dated events)|
| Email delivery | Resend                                              |
| Timezone       | `luxon`, pinned to `Asia/Kuala_Lumpur`              |

If Groq fails for any reason (quota, network, malformed output), the program
automatically falls back to Gemini. Either way, the events themselves come from
the verified On This Day feed — the AI only selects and rewrites them, so it
cannot invent events or dates.

Each section also carries a **References** list. Every event is handed to the AI
with a verified Wikipedia link (built from the feed's exact article titles, so
the URL is always real), which is always cited — Wikipedia in turn carries its
own sourced references at the bottom of each article. The AI adds other
authoritative sources it genuinely knows (Britannica, Library of Congress,
academic works), and the Malaysian section is steered toward Arkib Negara
Malaysia and other Malaysian archival authorities. The AI is told never to
invent a URL.

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
