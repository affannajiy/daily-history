# UI/UX Rulebook

A pure reference: three design frameworks, each reduced to *what the principle is* and a
one-line description. No app-specific inventory, no history of what any one project already
does with them — that belongs in that project's own invariants file and changelog. Drop this
file into any project; it costs no tokens beyond what it takes to read the tables.

Three frameworks, answering different questions:

| | Framework | Question it answers |
| --- | --- | --- |
| **§1** | Nielsen's 10 usability heuristics | *Over time* — can the user work this out, undo it, recover from it? |
| **§2** | The 12 Gestalt principles of perception | *At first glance* — what does the eye group before a word is read? |
| **§3** | The Laws of UX (lawsofux.com) | *Underneath both* — the psychology (memory, attention, decision cost, motivation) that §1 and §2 are consequences of. |

---

## §0 Goals these serve

| Goal | Succeeded when the user can say… |
| --- | --- |
| **Satisfaction** | "It is pleasant to use." / "It works the way I want." |
| **Usefulness** | "It helps me be more effective." |
| **Flexibility & efficiency** | "It is flexible." |
| **Ease of use** | "It is easy to use." |
| **Ease of learning** | "I learned it quickly." / "I easily remember how." |

---

## §1 Nielsen's 10 usability heuristics

| # | Heuristic | What it demands |
| --- | --- | --- |
| 1 | **Visibility of system status** | Always say what the system is doing, promptly. No consequential action happens unannounced. |
| 2 | **Match between system and the real world** | Speak the user's words and mental model, not the code's. No jargon they must look up. |
| 3 | **User control and freedom** | Undo, redo, and a clearly labelled exit from every state. Mistakes must be cheap. |
| 4 | **Consistency and standards** | The same thing looks and behaves the same way everywhere — internally, and against platform convention. |
| 5 | **Error prevention** | Design the high-cost error out. Constraints and good defaults beat warnings. |
| 6 | **Recognition rather than recall** | Show options and current values; never make the user remember them between screens. |
| 7 | **Flexibility and efficiency of use** | Accelerators for the fluent, safe defaults for the occasional — without penalising either. |
| 8 | **Aesthetic and minimalist design** | Every element competes for attention. Anything not needed now weakens what is. |
| 9 | **Recognise, diagnose, recover from errors** | Plain language, no codes, and a stated fix — not just a statement of what broke. |
| 10 | **Help and documentation** | Help in context, at the moment of need. Findable, task-focused, short. |

---

## §2 The 12 Gestalt principles of perception

Gestalt ("form") describes how the visual system organises a scene into groups
**pre-attentively** — faster than reading, and not optional. Grouping is *constructed by the
brain*, not detected by the eye: two lights flashed in sequence are seen as one light moving
(the phi phenomenon). Nothing moved. **Not a style guide**: a model of what the eye does
anyway, on any screen dense enough that the user is pattern-matching rather than reading.

| # | Principle | What the brain does | Design consequence |
| --- | --- | --- | --- |
| 1 | **Proximity** | Groups things placed close together. | Space is the cheapest and strongest grouping tool. Inconsistent gaps invent groups nobody meant. |
| 2 | **Similarity** | Groups things that look alike into one class. | Shared styling is a promise of shared kind. Break similarity deliberately to make one thing findable. |
| 3 | **Continuity** | Follows smooth lines and consistent alignment. | Align to one grid; let the eye run down a column uninterrupted. Decoration mid-path stops the scan. |
| 4 | **Closure** | Completes cut-off forms into something whole. | A cleanly clipped edge reads as *finished* — hidden overflow becomes hidden data. Never let closure fill in load-bearing content. |
| 5 | **Figure/ground** | Separates one focal object from its background. | Exactly one surface is live at a time; contrast, dimming and focus rings say which. Low contrast destroys this silently. |
| 6 | **Prägnanz (symmetry & order)** | Reads complex arrangements in their simplest, most regular form. | Regularity reads as deliberate; near-alignment reads as sloppy. Do not buy symmetry with hierarchy. |
| 7 | **Common fate** | Groups things that move together. | Shared motion is a strong grouping claim — so motion without meaning invents a group. |
| 8 | **Common region** | Groups anything inside a shared boundary, overriding distance and appearance. | A border is the most expensive cue: spacing → tint → rule → box, in that order. Boxing everything flattens structure. |
| 9 | **Uniform connectedness** | Groups things joined by a visible link. The strongest cue of all. | A line, bracket or connector asserts a relationship harder than any spacing — and will beat the truth if it is wrong. |
| 10 | **Emergence** | Recognises the whole before its parts. | Every screen needs a distinguishable silhouette. Uniform weight everywhere means recognition falls back to reading. |
| 11 | **Invariance** | Recognises a familiar form despite restyling, scaling or partial change. | Change chrome freely; changing *structure* (order, position, grouping) is what breaks recognition. |
| 12 | **Multistability** | Flips between readings of an ambiguous form; cannot hold both. | **A defect here.** If a control has two honest readings, relabel or split it. The second reading is the one that ships. |

---

## §3 The Laws of UX

Sourced from [lawsofux.com](https://lawsofux.com). Where a law restates a Gestalt principle
from §2, it is marked **†** and kept short here — §2 has the fuller treatment.

| # | Law | What it says |
| --- | --- | --- |
| 1 | **Aesthetic-Usability Effect** | Users perceive attractive design as more usable than it is, and forgive more of its flaws. |
| 2 | **Choice Overload** | Too many options overwhelm decision-making and cause paralysis or regret. |
| 3 | **Chunking** | Grouping related items into visually distinct clusters lets people scan and retain them faster. |
| 4 | **Cognitive Bias** | Systematic mental shortcuts distort judgment; people decide from pattern, not full analysis. |
| 5 | **Cognitive Load** | Total mental effort to use an interface; intrinsic (task) load is necessary, extraneous (design) load is not. |
| 6 | **Doherty Threshold** | Responses under ~400ms keep both user and system in flow; slower breaks engagement. |
| 7 | **Fitts's Law** | Time to reach a target depends on its distance and size — bigger and closer is faster and more accurate. |
| 8 | **Flow** | Full immersion and focus occurs when a task's difficulty matches the user's skill exactly. |
| 9 | **Goal-Gradient Effect** | Effort and motivation increase as a person nears a goal — visible progress accelerates completion. |
| 10 | **Hick's Law** | More, or more complex, choices take longer to decide between; fewer and simpler decide faster. |
| 11 | **Jakob's Law** | Users bring expectations from every other product they use; match convention over inventing anew. |
| 12 | **Law of Common Region†** | A shared visible boundary groups its contents regardless of spacing or style. |
| 13 | **Law of Prägnanz†** | The eye resolves ambiguous or complex shapes into the simplest form available. |
| 14 | **Law of Proximity†** | Elements placed near each other read as one group. |
| 15 | **Law of Similarity†** | Elements that look alike read as one class, even when apart. |
| 16 | **Mental Model** | Users act on their existing belief of how a system works, not on how it actually works. |
| 17 | **Miller's Law** | Working memory holds about 7±2 items — chunk content to fit inside it, not around it. |
| 18 | **Occam's Razor** | Given equally valid options, the simplest is correct — remove anything that isn't load-bearing. |
| 19 | **Paradox of the Active User** | Users skip the manual and start doing, even when reading first would save them time. |
| 20 | **Pareto Principle** | Roughly 80% of outcomes trace to 20% of causes — find and prioritize that 20%. |
| 21 | **Parkinson's Law** | A task expands to fill the time given it — bound the time and the task shrinks with it. |
| 22 | **Peak-End Rule** | People judge an experience by its most intense moment and its ending, not the average. |
| 23 | **Postel's Law** | Accept broadly and flexibly from users; emit narrowly and predictably back to them. |
| 24 | **Selective Attention** | People filter out anything not relevant to their current goal — direct focus deliberately, don't fight it. |
| 25 | **Serial Position Effect** | The first and last items in a list are remembered best; the middle is forgotten first. |
| 26 | **Tesler's Law** | Every process has an irreducible core of complexity — it must live somewhere; put it in the system, not the user. |
| 27 | **Von Restorff Effect** | The one item that differs from its neighbors is the one that gets remembered. |
| 28 | **Working Memory** | Holds ~4-7 chunks for ~20-30 seconds — never require the user to hold more than that unaided. |
| 29 | **Zeigarnik Effect** | Unfinished tasks stick in memory harder than finished ones — partial-progress states pull people back to complete them. |

---

## §4 When principles disagree

| Conflict | Ruling |
| --- | --- |
| Common region (§2.8) wants boxes; minimalism (§1.8) wants fewer lines | **Cheapest cue that works.** Do not box what spacing already groups. |
| Prägnanz (§2.6) wants regularity; emergence (§2.10) wants a dominant shape | **Emergence wins.** A perfectly even screen has no hierarchy. |
| Closure (§2.4) says a clean edge looks finished; tidiness wants a scrollbar hidden | **Closure wins.** Hidden overflow is hidden data — show a scrollbar, a partial column, or a scroll affordance. |
| Similarity (§2.2) wants one consistent style; visibility of status (§1.1) wants status to stand out | **Status wins** — and says itself in words, never in colour alone. |
| Hick's Law (§3.10) wants fewer choices; recognition-over-recall (§1.6) wants options visible | **Break into steps**, not into hidden menus — fewer choices per screen, not fewer choices shown. |
| Aesthetic-usability (§3.1) makes flaws forgivable; error prevention (§1.5) wants flaws found | **Test past the aesthetic.** A pretty screen is exactly the one to test hardest, since users self-report fewer problems with it. |

**Tiebreaker in every case:** favour whichever reading survives a first-time user who succeeds
without prior knowledge of the product. Perception and instinct are what a user has before
they have your product's specific knowledge.

---

## How to use this document

1. Find the principles the change touches. Check **all three frameworks** — a control can be
   flawless by Nielsen and still group itself with the wrong neighbour, or fight a memory or
   attention effect neither framework names directly.
2. This file is pure reference — *what the principles are*, nothing about how any one project
   already satisfies them. Concrete, enforceable rules for a specific codebase belong in that
   project's own invariants file (e.g. `CLAUDE.md`); history of what changed and why belongs
   in its changelog. Keep those two out of this file, or every future read pays for content
   the review doesn't need.
3. When a principle conflicts with density, speed, or power, favour the principle — §4 gives
   the ruling for the recurring conflicts; extend the table when a new one repeats.
4. When two frameworks conflict with each other, §4 rules; when a case isn't listed there,
   apply the tiebreaker.
