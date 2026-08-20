# Engineering Rulebook

**Last updated:** 2026-08-20

Portable reference. One line per failure mode or principle. No project architecture — that
belongs in the project's own architecture document and changelog.

| | Section | Answers |
| --- | --- | --- |
| **§1** | Common failure modes | Does this code match a named anti-pattern? |
| **§2** | Core principles | Is the system simple, coherent, and easy to change? |
| **§3** | Code quality & reliability | Is it correct, testable, fast enough, and able to survive failure? |
| **§4** | Delivery & maintenance | Can it change without a build-up of risk? |
| **§5** | Run & measure | Can the team see what it does and how fast it improves? |
| **§6** | Accessibility & localization in code | Can a person use it with any ability, device, or language? |
| **§7** | Conflicts | Which rule wins? |

**Goals.** Correctness, reliability, maintainability, testability, simplicity, evolvability,
performance, and consistency. ISO/IEC 25010:2023 names all of these except consistency, which
is a team property. Interaction capability belongs to the UI/UX Rulebook, security to the
Security Rulebook.

---

## §1 Common failure modes

A principle states the target. A failure mode states what you are looking at. The name matters,
because "this is shotgun surgery" ends an argument that "this feels messy" cannot. A smell is
an indicator, not proof.

| # | Failure mode | Looks like | Breaks |
| --- | --- | --- | --- |
| 1 | **God object** | One class or file knows and does everything. Every feature touches it. | §2.1, §2.9 |
| 2 | **Shotgun surgery** | One idea changes, and you make small edits in many unrelated files. | §2.7, §2.9 |
| 3 | **Divergent change** | The opposite. One module changes for many unrelated reasons. | §2.1 |
| 4 | **Temporal coupling** | Call A must run before call B, and nothing states or enforces it. | §2.19, §3.4 |
| 5 | **Action at a distance** | A change here alters behavior far away, through global or shared state. | §2.12, §3.8 |
| 6 | **Feature envy** | A function spends most of its work on another object's data. | §2.9, §2.8 |
| 7 | **Primitive obsession** | A domain idea travels as a bare string or map. Every caller rebuilds its rules. | §2.7, §3.4 |
| 8 | **Leaky abstraction** | The caller must know how the wrapper works. The layer adds no contract. | §2.17, §2.14 |
| 9 | **Speculative generality** | Hooks and parameters wait for a caller that never arrived. | §2.16, §2.13 |
| 10 | **Inheritance for reuse** | A class extends another to borrow code, so the child inherits rules it must break. | §2.3, §2.11 |
| 11 | **Magic value** | A number or flag carries a meaning nobody wrote down. | §2.19 |
| 12 | **Boolean trap** | `render(true, false)` — the reader cannot tell what either argument does. | §2.19 |
| 13 | **Copy-paste divergence** | Duplicated logic was fine until somebody fixed one copy. | §2.15, §3.15 |
| 14 | **Lava flow** | Dead code or a half-done migration stays because nobody is sure it is safe to remove. | §4.12, §4.13 |
| 15 | **Big ball of mud** | No visible architecture. Every layer reaches into every other. | §2.6 |
| 16 | **Golden hammer** | One familiar tool goes on a problem it does not fit. | §2.13 |
| 17 | **Error swallowing** | A catch block logs nothing and continues, so a failure becomes a wrong answer later. | §3.2, §3.14 |
| 18 | **Distributed monolith** | Services deploy alone but cannot be released, tested, or understood alone. | §2.8, §2.17 |
| 19 | **Premature optimization** | Complexity arrives for a problem no measurement confirmed. | §3.21 |
| 20 | **Flaky test** | Passes and fails on the same code, so the team learns to ignore a red build. | §3.19, §3.5 |
| 21 | **Hardcoded configuration** | A host name or key sits in the source, so each environment needs a code change. | §4.9 |
| 22 | **Snowflake environment** | Staging and production differ in ways nobody tracks. | §5.1 |

**One hit is a note. Two or more in the same area mean the design is wrong, not the code.**

---

## §2 Core principles

Rows 1 to 5 are SOLID (Robert C. Martin, 2000).

| # | Principle | Demands |
| --- | --- | --- |
| 1 | **Single responsibility** | One reason to change, per module and function. |
| 2 | **Open-closed** | Extend by adding code, not by editing code that works. |
| 3 | **Liskov substitution** | A subtype works everywhere its base type works, with no special case at the call site. |
| 4 | **Interface segregation** | Keep interfaces small. No caller depends on a method it never calls. |
| 5 | **Dependency inversion** | Policy and detail both depend on the abstraction, never the reverse. |
| 6 | **Separation of concerns** | Keep presentation, logic, data access, configuration, and infrastructure apart. |
| 7 | **Single source of truth** | Each authoritative fact lives in one place. Derive the rest. |
| 8 | **Minimize coupling** | Depend on a stable contract, not on another component's internals. |
| 9 | **Maximize cohesion** | Keep related logic together. Do not bundle unrelated logic because the file is open. |
| 10 | **Least knowledge** | Talk to direct collaborators. `a.getB().getC().doThing()` couples you to every link. |
| 11 | **Composition over inheritance** | Combine parts. Use inheritance only for a real "is a" rule. |
| 12 | **Explicit dependencies** | State what a component needs. Do not reach for hidden global state. |
| 13 | **Prefer simplicity** | Choose the simplest solution that meets the requirement. |
| 14 | **Avoid premature abstraction** | Wait for repeated structure or a real boundary before building a generic layer. |
| 15 | **Do not repeat yourself** | Remove duplicated knowledge when removal does not create a worse abstraction. |
| 16 | **You are not going to need it** | No feature, hook, or layer without a current requirement. |
| 17 | **Stable contracts** | An interface changes less often than the implementation behind it. |
| 18 | **Design for testability** | Hard to test means coupled. Fix the design first. |
| 19 | **Least astonishment** | Code behaves the way its name, location, and neighbors promise. |

**Kent Beck's four rules of simple design**, in priority order: passes the tests, reveals
intention, no duplication, fewest elements. Use as a tiebreaker. The earlier rule wins.

---

## §3 Code quality & reliability

| # | Principle | Demands |
| --- | --- | --- |
| 1 | **Correctness first** | Shorter and faster are not better when the answer is wrong. |
| 2 | **Fail explicitly** | Detect an invalid state early and stop. Do not continue with corrupt state. |
| 3 | **Handle errors at the right boundary** | Low-level code reports. The layer that can recover decides. |
| 4 | **Validate assumptions** | Check inputs, preconditions, external responses, and state changes. |
| 5 | **Deterministic behavior** | Same input and state give the same result, unless randomness is required. |
| 6 | **Keep functions focused** | One unit of work a reader can hold in mind. |
| 7 | **Make state explicit** | Keep mutable state small and local. Change it through one path. |
| 8 | **Avoid hidden side effects** | Reading a value must not change state or start unrelated work. |
| 9 | **Concurrency safety** | Name the shared data and the rule that protects it. Guard against races, deadlocks, and lost updates. |
| 10 | **Idempotent operations** | A retried write matches one write. Use a key or a version. |
| 11 | **Timeouts and retries** | Every remote call gets a timeout. Retries use backoff and a cap. |
| 12 | **Graceful degradation** | When a dependency fails, serve what works and say what is missing. |
| 13 | **Resource discipline** | Files, connections, memory, timers, listeners: one owner, one cleanup path. |
| 14 | **Observable failures** | A person can diagnose the failure from the error, log, metric, or screen. |
| 15 | **No silent corruption** | Never hide bad data or a failed write to keep the program running. |
| 16 | **Test behavior** | Test what a caller observes, including failure paths. Not private detail. |
| 17 | **Test the risk first** | Cover the most consequential and failure-prone behavior before the easy cases. |
| 18 | **Test pyramid** | Many fast unit tests, fewer service, fewest end to end. Push each test down, then delete the higher one. |
| 19 | **No flaky tests** | Quarantine or fix on the day you find it. A build nobody trusts is worse than none. |
| 20 | **Coverage is a signal** | Use it to find untested risk. A percentage is not the goal. |
| 21 | **Performance by evidence** | Measure, then optimize the bottleneck you found. |
| 22 | **Set a performance budget** | A number before you start: size, time, or query count. A budget without a number is a wish. |
| 23 | **Know how cost grows** | State how work scales with input. Fine at 100 rows can stop the system at 100,000. |
| 24 | **One query, not one per row** | A query inside a loop is the most common cause of a slow page. |
| 25 | **A cache needs an invalidation rule** | Write the expiry and invalidation path in the same change that adds the cache. |
| 26 | **Test under load** | Measure at expected traffic and above. One user says nothing about a hundred. |

---

## §4 Delivery & maintenance

| # | Principle | Demands |
| --- | --- | --- |
| 1 | **Small changes** | One problem per change. Easier to review, test, and revert. |
| 2 | **Integrate often** | Merge to the shared branch at least daily. A long-lived branch hides conflict and risk. |
| 3 | **Preserve existing behavior** | Do not change behavior the task did not ask you to change. |
| 4 | **Backward compatibility** | Keep interfaces, data, and workflows working unless the break is deliberate and documented. |
| 5 | **Semantic versioning** | Declare the public API. MAJOR for incompatible, MINOR for compatible addition, PATCH for a fix. |
| 6 | **Dependency discipline** | Value must beat cost in maintenance, security, size, and complexity. Read its design, tests, open issues, release history, license, and its own dependencies. |
| 7 | **Reversible changes** | Every important change has a rollback path, and somebody has tried it. |
| 8 | **Phased rollout** | Risky change goes behind a flag or canary. Remove the flag when the rollout ends. |
| 9 | **Configuration in the environment** | Host names, credentials, and limits stay out of the source. One build runs everywhere. |
| 10 | **Documentation at the boundary** | Document decisions, constraints, non-obvious behavior, and public interfaces. Not obvious syntax. |
| 11 | **Record the decision** | Write an ADR for a hard-to-reverse choice: context, decision, alternatives, consequences. |
| 12 | **Technical debt visibility** | Write down a known compromise. An unrecorded compromise becomes permanent architecture. |
| 13 | **Keep the repository clean** | Remove dead code, obsolete assets, unused dependencies, and abandoned experiments. |
| 14 | **Automate repetition** | Automate the checks, formatting, tests, builds, and deployments that repeat. |
| 15 | **Review for code health** | Approve once it clearly improves the codebase, even when imperfect. Mark optional comments as nits. Design outweighs style. |
| 16 | **Verify before done** | Run the tests, build, or manual path the change touches. Report what you ran. |
| 17 | **Change for a reason** | Every architectural or behavioral change has a stated reason. |
| 18 | **Leave the code better** | Fix an obvious related problem while you are there. Do not turn a feature into a rewrite. |
| 19 | **Own the boundary** | Wrap a third-party API in a small interface of your own. A replacement then touches one file. |
| 20 | **Count the whole tree** | A flaw in an indirect dependency costs as much as one in a direct dependency. |

---

## §5 Run & measure

| # | Practice | Demands |
| --- | --- | --- |
| 1 | **Dev and production parity** | Keep environments close in version, data shape, and configuration. |
| 2 | **Disposable processes** | Start fast, shut down cleanly, hold no state the replacement needs. |
| 3 | **Logs as event streams** | Write events to the output stream. The platform collects and routes them. |
| 4 | **Three signals** | Logs say what happened, metrics say how much, traces say where the time went. Ship all three. |
| 5 | **Service levels** | An SLI measures. An SLO targets. An SLA adds a consequence for missing it. |
| 6 | **Error budget** | The gap between SLO and 100% is the budget for change. Spent budget means reliability work first. |
| 7 | **100% is the wrong target** | It costs more than it returns, and users start depending on reliability you never promised. |
| 8 | **DORA's five metrics** | Change lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate. |
| 9 | **Metrics diagnose, they do not rank** | A metric that becomes a target stops measuring (Goodhart's law). Compare against your own history. |
| 10 | **Blameless incident review** | Ask what made the mistake possible. Fix that, and record it where the next person reads. |

---

## §6 Accessibility and localization in code

The UI/UX Rulebook states what a person must be able to do. This is what the code must do to
make that possible. Both cost far more to add later than to build in.

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **Native element first** | If a built-in element carries the semantics and behavior you need, use it. A role on a generic element gives you neither. |
| 2 | **A role is a promise** | Declaring a role owes every keyboard interaction and state it implies. Wrong ARIA is worse than none. |
| 3 | **Keyboard for every control** | Every interactive control works from the keyboard alone. Never hide a focusable element from assistive technology. |
| 4 | **Structure lives in the markup** | Headings, lists, labels, tables, and reading order are code, not style. |
| 5 | **Name every control in code** | Programmatic name, role, and state. An icon-only button needs an accessible name. |
| 6 | **Fix it in the shared component** | Repair the shared button, field, dialog, and menu once. A copy carries the defect everywhere. |
| 7 | **Tokens, not literals** | Color, spacing, and type size behind named tokens. A hardcoded value blocks a theme and a later fix. |
| 8 | **Respect platform settings** | Read reduced motion, contrast, color scheme, and text size from the system. Never override a user setting. |
| 9 | **An automated check is partial** | A tool assists a review. It cannot decide conformance. Add a keyboard pass and a screen-reader pass. |
| 10 | **UTF-8 everywhere** | Source, database, transport, and response. Declare the encoding. |
| 11 | **Declare the language** | Mark the document language, and any passage that changes language. |
| 12 | **Never build a sentence from parts** | A concatenated fragment cannot be translated. Pass one whole string with named parameters. |
| 13 | **Format through the locale library** | Let the platform format dates, numbers, currency, and plurals. Do not write one rule per country. |
| 14 | **Leave room for the text** | Translated text runs longer. A layout sized to the English string breaks elsewhere. |
| 15 | **Support both directions** | Set direction on the root element. Use logical properties such as `inline-start`, not `left`. |
| 16 | **Accept the user's data shape** | Names, addresses, postal codes, and phone numbers differ by country. Do not validate against one national format. |

Rows 1 to 9 are the code side of UI/UX §4. Rows 10 to 16 are the code side of shipping in a
second language. Neither replaces a test with a real user.

---

## §7 When principles conflict

| Conflict | Ruling |
| --- | --- |
| Simplicity wants less code. DRY wants an abstraction. | **Prefer duplication over a premature abstraction.** Repeated code costs less than a wrong abstraction. |
| Reuse wants a generic component. YAGNI wants less code. | **Build for demonstrated reuse.** No extension point for a caller nobody has. |
| Performance wants optimization. Clarity wants simple code. | **Measure first.** Optimize only where evidence shows the simple version is not enough. |
| A small change wants narrow scope. Leave-it-better wants cleanup. | **Contain the cleanup.** Fix the related problem. Do not grow a feature into a refactor. |
| Backward compatibility wants the old behavior. Correctness needs the new one. | **Keep the contract where you can, break it deliberately when you cannot.** Raise MAJOR and write the migration. |
| Explicit dependencies add setup. Convenience wants a global. | **Prefer explicit.** Hidden coupling is paid for later, in testing and maintenance. |
| A named failure mode (§1) demands a refactor. Small changes (§4.1) want narrow scope. | **Name it now, fix it in its own change.** |
| Removing a lava flow (§1.14) is cleanup. Preserving behavior (§4.3) wants no unrelated change. | **Prove it is dead, then delete.** No caller, no test, no telemetry means it goes. Doubt means a dated note. |
| A god object (§1.1) is the fastest place to add the feature. Cohesion (§2.9) says stop feeding it. | **Add beside it, not inside it.** |
| Confidence wants more end-to-end tests. The pyramid (§3.18) wants fewer. | **One end-to-end test per critical journey.** Cover variations one level down. |
| Deployment frequency (§5.8) wants speed. Change fail rate (§5.8) wants care. | **Make the change smaller.** Small changes improve both numbers. |
| A spent error budget (§5.6) blocks release. A deadline wants the feature. | **The budget decides, and the rule is agreed before the incident.** |
| A feature flag (§4.8) adds a branch. Simplicity (§2.13) wants one path. | **A flag is temporary.** Give it an owner and a removal date when you create it. |
| A custom component gives design freedom. Native elements (§6.1) give behavior free. | **Start native, restyle it.** Build custom only when no native element fits, and then owe §6.2 in full. |
| A performance budget (§3.22) blocks the change. The feature is already built. | **Move the budget or cut the payload, and write down which.** A budget quietly exceeded is not a budget. |
| A dependency solves it today (§4.6). Owning the code avoids the risk. | **Judge it on the cost of removal.** Replaceable in one file is cheap. Spread through the codebase is not. |
| Localization (§6.12) wants one whole string. A dynamic message wants concatenation. | **Pass parameters, not pieces.** |

**Tiebreaker:** the smallest change that keeps correctness, security, usability, and future
maintenance intact.

---

## How to use

1. Scan §1 first. A named failure mode is faster to spot than a broken principle.
2. Prefer an existing project convention over a new pattern.
3. Make the smallest change that solves the requirement correctly.
4. Check failure paths, state changes, dependencies, and side effects. Run the tests.
5. §7 rules a recurring conflict. Extend it when a new one returns.

**Other lenses.** Security asks whether it can be abused. UI/UX asks whether a person can use
it. §6 is where this file meets UI/UX §4. §4.6 is where it meets Security §5.

---

## Sources

| § | Source |
| --- | --- |
| Goals | ISO/IEC 25010:2023 product quality model |
| §1 | Martin Fowler, *Refactoring* and the [code smell](https://martinfowler.com/bliki/CodeSmell.html) catalog |
| §2 | Robert C. Martin, *Design Principles and Design Patterns* (2000), [Beck's design rules](https://martinfowler.com/bliki/BeckDesignRules.html) |
| §3.18 | [Martin Fowler: the practical test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| §3.22 | [web.dev performance budgets](https://web.dev/articles/performance-budgets-101) |
| §4.5 | [Semantic Versioning 2.0.0](https://semver.org/) |
| §4.6, §4.19, §4.20 | Russ Cox, [Our software dependency problem](https://research.swtch.com/deps) |
| §4.9, §5.1 to §5.3 | [The Twelve-Factor App](https://12factor.net/) |
| §4.11 | [Architecture decision records](https://adr.github.io/) |
| §4.15 | [Google: the standard of code review](https://google.github.io/eng-practices/review/reviewer/standard.html) |
| §5.5 to §5.7, §5.10 | [Google SRE: service level objectives](https://sre.google/sre-book/service-level-objectives/) |
| §5.8, §5.9 | [DORA metrics](https://dora.dev/guides/dora-metrics/) |
| §6.1 to §6.9 | [W3C: using ARIA](https://www.w3.org/TR/using-aria/), [ARIA APG read me first](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), [W3C WAI evaluation tools](https://www.w3.org/WAI/test-evaluate/tools/) |
| §6.10 to §6.16 | [W3C internationalization quick tips](https://www.w3.org/International/quicktips/) |
