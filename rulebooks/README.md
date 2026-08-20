# Rulebooks

**Last updated:** 2026-08-20

Portable reference files. No project-specific content, no history — pure principle tables.
Drop any of these into a project (or hand to a person) and it works standalone.

Three lenses. Every significant change gets three questions:

```
                 ┌──────────────────┐
                 │      PROJECT     │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
          HUMAN         TRUST         CODE
             │            │            │
             ↓            ↓            ↓
          UI/UX       SECURITY    ENGINEERING
             │            │            │
             └────────────┼────────────┘
                          ↓
                   QUALITY DECISION
```

| Rulebook                                           | Governs          | Core question                                        |
| -------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| [UI-UX_Rulebook.md](UI-UX_Rulebook.md)             | Human experience | Can someone understand and use this?                 |
| [SECURITY_Rulebook.md](SECURITY_Rulebook.md)       | System & data    | Can someone misuse, break, or exploit this?          |
| [ENGINEERING_Rulebook.md](ENGINEERING_Rulebook.md) | Codebase         | Can we change this without everything catching fire? |

Contents:

| File        | Covers                                                                                                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-UX       | Nielsen's 10 usability heuristics, 12 Gestalt principles, Laws of UX, WCAG 2.2 accessibility, responsive & mobile behavior, visual hierarchy, interaction patterns & states                                                                                       |
| Security    | Saltzer and Schroeder design principles, modern secure-by-design additions, secure coding controls (ASVS 5.0), data protection & retention, OWASP Top 10:2025, OWASP Top 10 for LLM applications (2025), supply chain & secure SDLC (SSDF, SLSA), run and respond |
| Engineering | Common failure modes (anti-patterns), core engineering principles, code quality & reliability, delivery & maintenance, run & measure, accessibility & localization in code                                                                                        |

Every file ends with a conflict table and a tiebreaker, so a disagreement between two rules
has a written ruling instead of a new argument each time.

## Which rulebook first

All three still apply. The order decides what you read before you write, and what blocks the
change if it fails.

| Change                                                      | Read first                 | Then                            | Blocks the change                            |
| ----------------------------------------------------------- | -------------------------- | ------------------------------- | -------------------------------------------- |
| Auth, permissions, sessions, or anything touching user data | Security §2c to §2e        | Engineering                     | A Security failure                           |
| A new screen, form, or flow                                 | UI-UX §7, then §4          | Engineering §6                  | An accessibility failure (UI-UX §4)          |
| A refactor with no behavior change                          | Engineering                | —                               | A broken contract or a lost test             |
| A new dependency                                            | Security §5                | Engineering §4.6, §4.19, §4.20  | Unknown provenance                           |
| Anything with a model, a prompt, or a tool call             | Security §4                | Engineering                     | Excessive agency or unvalidated model output |
| An error message, empty state, or failure path              | UI-UX §7b, §7c             | Engineering §3.14, Security §2h | A leaked internal detail                     |
| A performance change                                        | Engineering §3.21 to §3.26 | UI-UX §7a, §5.14                | No measurement                               |
| A public API or data format                                 | Engineering §2.17, §4.5    | Security §2e                    | An unversioned breaking change               |
| Collecting, storing, or keeping personal data               | Security §2i               | Engineering §4.11               | No stated retention period                   |
| A destructive or irreversible action                        | UI-UX §7e                  | Security §2e, Engineering §4.7  | No undo and no confirmation                  |
| Shipping in a second language or script                     | Engineering §6.10 to §6.16 | UI-UX §5.4, §6.11               | A sentence built by concatenation            |
| A long-running or background job                            | UI-UX §7a                  | Engineering §3.11, §3.12        | A screen that waits with no exit             |

If a change touches more than one row, read every row it touches. The strictest ruling wins.

## Token cost

Each file is read in full when an agent loads it. Load only the one the change needs — the
routing table above says which. Loading all three costs roughly the sum.

| File        | Approximate tokens |
| ----------- | ------------------ |
| UI-UX       | 5,600              |
| Security    | 7,000              |
| Engineering | 5,200              |
| README      | 1,300              |

Do not paste a rulebook into a `CLAUDE.md`. Reference it by path, so the agent reads it only
when the task needs it.

## Where each thing lives

The rulebooks are **laws** — what good software generally does. They are not the only file
in the system:

| File                     | Answers                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `CLAUDE.md` (project)    | What does _this_ software require, and how should the AI work on it? |
| Rulebooks                | What should good software generally do?                              |
| `CHANGELOG.md` (project) | What happened?                                                       |

Keep AI behavior instructions in `CLAUDE.md`, not in a rulebook — a rulebook about prompting
is meta-governance and does not govern the product. Keep project posture (what _this_ app
actually does about each principle) in that project's own `SECURITY.md` / architecture /
invariants file. Never in here.
