# Security posture

What this project's threat model actually is, and what it does about it.
`rulebooks/SECURITY_Rulebook.md` is the general reference — *what the principles
are*. This file is the specific answer — *what this repo does*, and what it
deliberately does not.

## What this is, in security terms

A cron job. No server, no users, no accounts, no database, no uploads, no
inbound requests of any kind. It runs once a day on a GitHub runner, reads public
Wikimedia APIs, asks a model to write about them, and emails one address.

That shape removes most of a normal application's attack surface. Per the
rulebook's own instruction, these categories are **not applicable — which is not
the same as satisfied**:

| Category | Why not applicable |
| --- | --- |
| Authentication, Session Management, Access Control | No users, no sessions, no login. The only identity is the runner's own token. |
| Database Security | No database. State is two files on a git branch. |
| File Management | Nothing is uploaded. Every file written has a name this code computed. |
| Memory Management | Managed runtime. |
| Cryptographic Practices | Nothing is encrypted at rest by this code; nothing sensitive is stored. TLS is the platform's. |

## What is actually exposed

Three things, in order of how much they matter.

**1. The secrets.** `GEMINI_API_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`,
`RECIPIENT_EMAIL`. They live in GitHub Actions secrets and a gitignored local
`.env`, and are never written to a file this repo publishes.

The sharp edge is that **Gemini takes its API key as a URL query parameter**, and
an HTTP error naturally quotes the URL it failed on. GitHub masks registered
secrets in the Actions log, but that protection ends at the log: it does not
cover a local terminal, a preview file, or an email. So redaction happens at the
source, in `src/redact.ts`, applied when `HttpError` is *constructed* rather than
when it is logged — there is no code path that can produce the raw message.

`src/alert.ts` is the only module permitted to put error text into an email, and
it redacts again before sending. Do not route errors into mail from anywhere
else.

**2. Untrusted input rendered into HTML.** Two sources: Wikimedia/Wikidata
responses, and whatever the model writes. Both are treated as hostile.

- Every AI- or API-supplied string is HTML-escaped in `buildEmail.ts`. Nothing
  upstream escapes; that file is the boundary.
- URLs go through `safeUrl()`, not the text escaper. Entity-encoding stops an
  attribute being broken out of but leaves `javascript:` and `data:` intact, and
  Wikidata — where the official-website links come from — is publicly editable.
  Anything that is not `http(s)` is dropped and the link renders unlinked.
- The model is never allowed to supply a URL, a date, a subject line or an
  image. Those are built in code from verified sources and anything the model
  writes in those positions is discarded. This began as a factual-accuracy rule;
  it doubles as an injection control.
- Every outbound host is a hardcoded literal and every query parameter goes
  through `URLSearchParams` or `encodeURIComponent`. No URL from a response is
  ever fetched, so there is no request-forgery path.

**3. The CI job.** It holds every secret and can push to the repo.

- Actions are pinned by **commit SHA**, not tag — a tag can be repointed at new
  code that would then run with those secrets. Dependabot keeps the pins current
  so they do not rot.
- The source checkout uses `persist-credentials: false`. It is only read from,
  so the push token does not sit in `.git/config` while the job parses untrusted
  responses. Only the `site/` checkout, which pushes, keeps its credentials.
- `permissions: contents: write` is the narrowest grant that still allows the
  archive commit. Actions has no per-step scoping, hence the credential drop
  above.
- `npm start` has a 90-minute step limit and the job a 120-minute one, instead
  of GitHub's 6-hour default. A hung provider can no longer keep a runner
  holding every secret for most of a day. The step limit is the one that
  matters: a timed-out step still fires the failure alert, a cancelled job
  does not.
- `npm audit --omit=dev --audit-level=high` runs before the send. Production
  dependencies only: `sharp` and `tsx` are dev tooling that never executes in
  `npm start`, and an advisory there must not cost a morning's digest.

## Against the OWASP Top 10 for LLM applications (2026)

The rulebook's §4 stance is to build the system so that when the model is fooled,
nothing important breaks. Here the model is a writer with no tools: it receives
verified text and returns JSON, and code decides what of that JSON survives.

| # | Risk | What this repo does |
| --- | --- | --- |
| LLM01 | Prompt injection | Wikipedia text is publicly editable and reaches the prompt. The model can act on nothing, so injection can only change prose. Dates, URLs, subject and images are discarded if the model writes them. |
| LLM02 | Sensitive information disclosure | No secret or personal data goes into a prompt. The API key travels in the request URL, never the prompt, and is redacted from errors. |
| LLM03 | Excessive agency | None. No tools, no function calling, no side effects. Sending, logging and publishing are code paths the model cannot reach. |
| LLM04 | Supply chain | Hosted models only, nothing loaded locally. Model ids are pattern-checked before they go into a URL. |
| LLM05 | Data and model poisoning | Not applicable: no training, fine-tuning or retrieval index of our own. A poisoned Wikipedia article is LLM01. |
| LLM06 | Unbounded consumption | One run a day, two passes, a fixed retry budget in `http.ts`, article extracts capped by length, and a 90-minute limit on `npm start` in the workflow. No output-token cap is set, by choice: both default models reason, their thinking counts toward the cap, and a cap set too low cuts off the JSON and loses the digest. The free tier is the spend ceiling, and the time limit stops a runaway. |
| LLM07 | Misinformation | The main risk, and the reason the design exists. Dates come only from the verified feed, every card cites its source article, and guards drop a block rather than let it ship unchecked. |
| LLM08 | Hidden context exposure | Nothing to hide. The prompts are in the repo and hold no credential or authorization rule. |
| LLM09 | Vector and embedding weaknesses | Not applicable: no embeddings, no vector store. |
| LLM10 | Improper output handling | Model output is untrusted input to `buildEmail.ts`: escaped with `esc()`, URLs dropped, shape checked by the `parse*Card` guards. It never reaches a shell, query or file path. |

The **OWASP Top 10 for Agentic Applications 2026** does not apply: the model has
no tools, no memory across runs (the sent-log is read by code, not given to the
model as instructions), and no other agents. Revisit both tables if any of that
changes.

## Failing securely

The job fails closed. No verified events means `generateHistory` throws rather
than emit unsourced content; a guard that does not pass drops its block rather
than pad it; a failed send leaves the sent-log untouched so nothing is silently
consumed. None of these degrade into a permissive path.

Failures are no longer silent: a failed run emails a redacted alert, and the
workflow covers the crashes that happen before the app can speak.

## Known limits

- **The recipient's inbox is the only place output goes, and it is one address.**
  A compromised `RECIPIENT_EMAIL` secret would redirect the digest; nothing here
  detects that.
- **No DAST.** There is no listening service to scan dynamically. Static
  analysis is CodeQL default setup, on `main`, for JavaScript/TypeScript and
  Actions.
- **Configuration is trusted, but checked.** CodeQL treats `process.env` as
  attacker input; here it is set by the workflow and by the local `.env`, so the
  real threat is a mistake rather than an attack. `ARCHIVE_DIR` and
  `SENT_LOG_PATH` are confined to the workspace by `safePath.ts`, and the model
  ids are pattern-checked before going into a URL, so a bad value stops the run
  instead of writing or requesting somewhere unintended.
- **Model output is not sandboxed.** It is escaped, guarded and stripped of
  URLs, but a prompt-injected article could still influence *prose*. The
  grounding rules bound what that prose may contain; they do not eliminate it.
- **Free-tier providers are a single point of failure**, mitigated only by
  having two of them.

## Reporting something

Open an issue, or email the address in the repo's user agent string. This is a
personal project with one recipient; there is no formal disclosure process.
