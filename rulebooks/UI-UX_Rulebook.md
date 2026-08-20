# UI/UX Rulebook

**Last updated:** 2026-08-20

Portable reference. One line per rule. No project content — that belongs in the project's own
invariants file.

| | Section | Answers |
| --- | --- | --- |
| **§1** | Nielsen's 10 heuristics | Can the user work it out, undo it, recover from it? |
| **§2** | Gestalt principles | What does the eye group before the user reads? |
| **§3** | Laws of UX | Which memory, attention, and decision limits apply? |
| **§4** | Accessibility (WCAG 2.2) | Can a person use it without your sight, hearing, hands, or device? |
| **§5** | Responsive & mobile | Does it survive a small screen, a thumb, a slow network? |
| **§6** | Visual hierarchy | Where does the eye go first? |
| **§7** | Patterns & states | Do the wait, form, empty screen, error, and dialog behave? |
| **§8** | Conflicts | Which rule wins? |

**Goal.** ISO 9241-11:2018 defines usability as **effectiveness, efficiency, and satisfaction**
for specified users, in a specified context. A design is never usable in general. It is usable
for someone, for a task, in a place.

---

## §1 Nielsen's 10 usability heuristics

Broad rules of thumb, not testable criteria. A design can pass all ten and still fail a user.

| # | Heuristic | Demands |
| --- | --- | --- |
| 1 | **Visibility of system status** | Say what the system is doing, soon enough to matter. Nothing consequential happens in silence. |
| 2 | **Match the real world** | Use the words and model of the user, not of the code. |
| 3 | **User control and freedom** | Mark the exit from every state. Give undo. Keep mistakes cheap. |
| 4 | **Consistency and standards** | The same thing looks and behaves the same way, inside the product and against platform convention. |
| 5 | **Error prevention** | Design the costly error out. A constraint or a good default beats a warning. |
| 6 | **Recognition over recall** | Show the options and current values. Never make the user carry them between screens. |
| 7 | **Flexibility and efficiency** | Shortcuts for the fluent user, safe defaults for the rare one. Neither pays for the other. |
| 8 | **Aesthetic and minimalist design** | Every element competes for attention. What is not needed weakens what is. |
| 9 | **Recover from errors** | Name the problem in plain words and state the fix. Never an error code alone. |
| 10 | **Help and documentation** | Put help at the task, at the moment of need. |

---

## §2 Gestalt principles of perception

How the visual system sorts a scene into groups **before** the user reads anything.
Not a style guide — a model of what the eye does anyway.

| # | Principle | Design consequence |
| --- | --- | --- |
| 1 | **Proximity** | Space is the cheapest and strongest grouping tool. An uneven gap invents a group nobody meant. |
| 2 | **Similarity** | Shared styling promises a shared kind. Break it on purpose to make one thing findable. |
| 3 | **Continuity** | Align to one grid and let the eye run down a column. Decoration in the path stops the scan. |
| 4 | **Closure** | A clipped edge reads as finished, so hidden overflow becomes hidden data. |
| 5 | **Figure and ground** | One surface is live at a time. Contrast, dimming, and a focus ring say which. |
| 6 | **Prägnanz** | Regularity reads as deliberate. Near-alignment reads as sloppy. |
| 7 | **Common fate** | Shared motion is a strong claim of a group, so motion without meaning invents one. |
| 8 | **Common region** | A border is the most expensive cue. Try spacing, then a tint, then a rule, then a box. |
| 9 | **Uniform connectedness** | The strongest cue of all. A line or connector beats the truth when it is wrong. |
| 10 | **Emergence** | Every screen needs a silhouette. Equal weight everywhere forces the user to read. |
| 11 | **Invariance** | Change the chrome freely. Changing order, position, or grouping breaks recognition. |
| 12 | **Multistability** | **Treat as a defect.** Two honest readings of one control means relabel it or split it. |

---

## §3 Laws of UX

The perception laws from [lawsofux.com](https://lawsofux.com) restate §2 and are not repeated here.

| # | Law | Says |
| --- | --- | --- |
| 1 | **Aesthetic-Usability Effect** | An attractive design reads as more usable, and its faults get forgiven. |
| 2 | **Choice Overload** | Too many options stall the decision and cause regret. |
| 3 | **Chunking** | Grouped items scan faster and stay in mind longer. |
| 4 | **Cognitive Bias** | People decide from a pattern, not a full analysis. |
| 5 | **Cognitive Load** | Task load is necessary. Design load is not. |
| 6 | **Doherty Threshold** | A response under about 400 ms keeps the user in flow. |
| 7 | **Fitts's Law** | Time to hit a target grows with distance and shrinks with size. |
| 8 | **Flow** | Focus arrives when task difficulty matches user skill. |
| 9 | **Goal-Gradient Effect** | Visible progress speeds up completion near the goal. |
| 10 | **Hick's Law** | More options, or harder options, take longer to decide. |
| 11 | **Jakob's Law** | Users bring expectations from every other product. Match the convention. |
| 12 | **Mental Model** | Users act on what they believe the system does, not what it does. |
| 13 | **Miller's Law** | Working memory holds about seven items, plus or minus two. |
| 14 | **Occam's Razor** | Among equal options, take the simplest. |
| 15 | **Paradox of the Active User** | Users skip the manual and start doing, even when reading would be faster. |
| 16 | **Pareto Principle** | About 80% of the outcome comes from about 20% of the causes. |
| 17 | **Parkinson's Law** | A task grows to fill the time allowed. Bound the time. |
| 18 | **Peak-End Rule** | People judge by the strongest moment and the end, not the average. |
| 19 | **Postel's Law** | Accept input broadly. Send output narrowly and predictably. |
| 20 | **Selective Attention** | People filter out whatever does not serve the current goal. |
| 21 | **Serial Position Effect** | First and last items stay in memory. The middle goes first. |
| 22 | **Tesler's Law** | Every process keeps irreducible complexity. Put it in the system, not the user. |
| 23 | **Von Restorff Effect** | The item that differs is the item people remember. |
| 24 | **Working Memory** | About four to seven chunks, for 20 to 30 seconds. |
| 25 | **Zeigarnik Effect** | An unfinished task stays in memory and pulls people back. |

---

## §4 Accessibility (WCAG 2.2)

Four principles (**POUR**), 13 guidelines, testable criteria at A, AA, AAA.
**Level AA is the usual legal target.** W3C Recommendation, revised 12 December 2024.

| Principle | Guideline | Demands |
| --- | --- | --- |
| **Perceivable** | 1.1 Text alternatives | Every non-text element gets a text equivalent. Mark decorative images as decorative. |
| | 1.2 Time-based media | Captions, a transcript, or audio description. |
| | 1.3 Adaptable | Structure lives in the markup. Headings, labels, and reading order survive a style change. |
| | 1.4 Distinguishable | Text contrast 4.5:1, or 3:1 large (1.4.3). Controls and meaningful graphics 3:1 (1.4.11). Resize to 200% (1.4.4). Reflow at 320 CSS px (1.4.10). Color never alone (1.4.1). |
| **Operable** | 2.1 Keyboard | Every action works from the keyboard, and the user can always leave a component. |
| | 2.2 Enough time | The user can turn off, extend, or adjust a time limit. |
| | 2.3 Seizures | Nothing flashes more than three times per second. |
| | 2.4 Navigable | Page titles, headings, meaningful link text, skip link. Focus indicator visible (2.4.7) and unobscured (2.4.11). |
| | 2.5 Input modalities | Targets at least 24×24 CSS px unless spaced (2.5.8). Every drag has a single-pointer alternative (2.5.7). |
| **Understandable** | 3.1 Readable | Declare the page language. Explain unusual words. |
| | 3.2 Predictable | Focus or input never changes context without warning. Help stays in one place (3.2.6). |
| | 3.3 Input assistance | Name errors in text, label fields, allow review or reversal. No redundant entry (3.3.7). No memory test to log in (3.3.8). |
| **Robust** | 4.1 Compatible | Every custom control has a correct name, role, and value. Status messages announce without moving focus. |

**New in 2.2:** 2.4.11, 2.4.12, 2.4.13 (focus), 2.5.7 (dragging), 2.5.8 (target size), 3.2.6
(consistent help), 3.3.7 (redundant entry), 3.3.8, 3.3.9 (accessible authentication). 4.1.1
Parsing was removed.

**First resort:** use the native element. A `<button>` is accessible before anyone writes ARIA.
A custom control inherits nothing — see Engineering §6.

---

## §5 Responsive & mobile

Responsive means the content stays readable, reachable, and complete at every size.

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **Declare the viewport** | `<meta name="viewport" content="width=device-width, initial-scale=1">`. Without it a mobile browser scales a desktop page down. |
| 2 | **Content decides the breakpoint** | Add one where the layout starts to hurt. Never name a breakpoint after a device or brand. |
| 3 | **Start narrow** | Design small first, then widen until the whitespace asks for a change. |
| 4 | **Fluid before fixed** | Relative units, flexbox, grid. A fixed pixel width is a bug waiting for a narrower screen. |
| 5 | **One source of content** | Same content at every size. Hiding a feature on mobile removes it. |
| 6 | **No horizontal scroll** | A wide table, diagram, or code block scrolls inside its own container. |
| 7 | **Size the media** | `max-width: 100%`, plus `width` and `height` so the browser reserves space. |
| 8 | **Target size** | 24×24 CSS px meets WCAG 2.5.8. Apple asks 44×44 pt, Material asks 48×48 dp, 8 dp apart. |
| 9 | **Reach** | Frequent actions go where a thumb reaches. Top corners are the hardest place on a large phone. |
| 10 | **Hover is not available** | Anything behind hover needs a tap, focus, or visible equivalent. Query `hover` and `pointer`, do not guess the device. |
| 11 | **Respect the system** | Honor text size, color scheme, contrast, and reduced-motion settings. |
| 12 | **Orientation and safe area** | Both orientations work. A keyboard, a notch, and a safe-area inset each cut the space you have. |
| 13 | **Budget the network** | Assume slow and metered. Size images to the viewport, defer below the fold. |
| 14 | **Core Web Vitals** | LCP ≤ 2.5 s. INP ≤ 200 ms. CLS ≤ 0.1. Measured at the 75th percentile of real visits, per device type. |
| 15 | **Test on the constraint** | 320 CSS px wide, 200% text zoom, keyboard only, real mid-range phone. |

---

## §6 Visual hierarchy

§2 explains what the eye groups. This explains what it reads first. A screen with no hierarchy
has not removed the ranking job — it moved that job to the user.

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **One primary action per view** | Two equal primary buttons mean the screen has none. |
| 2 | **Rank before you style** | Decide the order of importance, then spend size, weight, color, and space on it. |
| 3 | **Three type sizes are enough** | More sizes flatten the hierarchy and make the page noisy. |
| 4 | **Size and weight carry rank** | The eye reads bigger and heavier as more important. Never make a minor element loudest. |
| 5 | **Spend contrast on what matters** | If everything is emphasized, nothing is. |
| 6 | **Color accents, it does not structure** | Color directs attention. It never carries meaning alone (WCAG 1.4.1). |
| 7 | **Align to one grid** | A single grid gives the eye a path. Near-alignment reads as a mistake. |
| 8 | **Write for the scan** | People scan in an F-pattern, layer-cake, spotted, or commitment pattern. Put load-bearing words first. |
| 9 | **Headings carry the layer cake** | A scanner reads headings and skips the body. Headings must deliver the content alone. |
| 10 | **Bound the line length** | 80 characters per line or fewer, 40 for CJK. |
| 11 | **Space the lines** | Line spacing at least 1.5 inside a paragraph. Paragraph spacing at least 1.5 times that. |
| 12 | **Do not justify body text** | Justified text opens rivers of space and slows the reader. |
| 13 | **Placement is a rank** | The first fixation lands at the start of the reading direction, whether you meant it or not. |
| 14 | **Repeat the pattern** | The same kind of thing looks the same way every time. |

Rows 10 to 12 come from WCAG 1.4.8, which is **level AAA**. Treat them as a readability target,
not a legal minimum.

---

## §7 Interaction patterns and states

The parts you build again in every product. Each has a known correct shape.

### §7a Feedback and waiting

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **0.1 s** | Feels instant. Show the result, add nothing else. |
| 2 | **1 s** | The user keeps their train of thought. They notice the delay but stay in flow. |
| 3 | **10 s** | The limit of held attention. Past it the user starts something else. |
| 4 | **Pick the indicator** | Nothing under 1 s. Looped animation from 2 to 9 s. Percent-done bar at 10 s and above. |
| 5 | **Skeletons are for page loads** | Full-page load under 10 s only, and it must show the real layout, not an empty frame. |
| 6 | **Every action answers** | Click, tap, submit, save each produce a visible response. Silence reads as failure. |
| 7 | **Say what changed** | "Saved at 14:02" beats "Success". Name the object and the outcome. |
| 8 | **Long work runs in the background** | Let the user leave and tell them when it ends. Never trap a person on a waiting screen. |

### §7b States every view needs

Design all of these. A view with only its ideal state is not finished.

| # | State | Demands |
| --- | --- | --- |
| 1 | **First-use empty** | Explain what goes here and give the one action that creates the first item. |
| 2 | **No-results empty** | Say what was searched and offer a way to widen or clear it. |
| 3 | **Loading** | Follow §7a.4. Reserve the space so nothing jumps when content arrives. |
| 4 | **Partial** | Show what arrived, name what failed. |
| 5 | **Error** | Follow §7c. Keep the user's work. |
| 6 | **Ideal** | The populated state everybody designs. |
| 7 | **Overloaded** | Far more items than expected. Paginate, virtualize, or summarize. |
| 8 | **No permission** | Say so plainly and say who can grant access. Do not pretend it is missing. |
| 9 | **Offline or stale** | Show the last known data, mark it stale, say when it was fetched. |

### §7c Errors and recovery

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **Name it, explain it, fix it** | What happened, why, and what to do next, in plain words. |
| 2 | **Put it where the problem is** | Next to the field or object that caused it, not only at the top. |
| 3 | **Never blame the user** | Drop "invalid", "illegal", "you failed". Describe the problem, not the person. |
| 4 | **Match loudness to severity** | Toast for small, inline for a field, dialog only for what must be resolved now. |
| 5 | **Never signal with color alone** | Pair color with an icon and with text (WCAG 1.4.1). |
| 6 | **Never show an error early** | Do not mark a field wrong before the user finishes it. |
| 7 | **Keep the work** | Return the user to their own input. Never clear a filled form. |
| 8 | **Offer the fix** | Where you can name a likely correction, offer it as a choice. |

### §7d Forms

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **One thing per page** | One question per screen where the flow allows. Easier to answer, correct, and test. |
| 2 | **Label every field, visibly** | A placeholder is not a label. It disappears when the user needs it. |
| 3 | **Ask only for what you use** | Every field costs completion. |
| 4 | **Mark the exception** | Mark the optional fields if most are required, or the reverse. |
| 5 | **Match input to data** | Correct input type, keyboard, and autocomplete. Let the browser fill what it knows. |
| 6 | **Do not ask twice** | Carry forward what the process already holds (WCAG 3.3.7). |
| 7 | **Validate at the right moment** | Confirm or report on leaving the field, or on submit. Never on every keystroke. |
| 8 | **Accept what the user types** | Trim spaces, fix case, parse formats on the server. Never reject a card number for its spaces. |
| 9 | **Summarize errors at the top** | On a failed submit, list every error and link each to its field. |
| 10 | **Say what happens next** | Before the final button, state what submitting does and whether it can be changed. |

### §7e Dialogs and destructive actions

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **Prefer undo to confirm** | A dialog seen every day gets dismissed unread. |
| 2 | **Confirm what cannot be undone** | State the consequence and name the exact object. |
| 3 | **Label buttons with the action** | "Delete file" and "Keep file", never "Yes" and "No". |
| 4 | **Destructive is never the default** | No initial focus, and the Enter key must not trigger it. |
| 5 | **Interrupt only when you must** | A modal blocks everything. Use one for a decision needed now, nothing else. |
| 6 | **Manage the focus** | Move focus in, keep it there, close on Escape, return focus to what opened it. |
| 7 | **Bulk actions state the count** | Say how many items and which ones before the user commits. |

### §7f Disclosure and consistency

| # | Rule | Demands |
| --- | --- | --- |
| 1 | **Two disclosure levels, no more** | Three levels and people lose their place. |
| 2 | **Label the way in** | The control that opens the next level says what is behind it. |
| 3 | **One component, one behavior** | Build it once and reuse it. |
| 4 | **Follow the platform first** | Match convention before you invent (§3.11). |
| 5 | **Name each thing one way** | One concept, one word, in the interface, help, errors, and email. |
| 6 | **Put the rules in tokens** | Color, spacing, and type scale in named tokens, so consistency is the default. |

---

## §8 When principles disagree

| Conflict | Ruling |
| --- | --- |
| Minimalism (§1.8) wants the focus ring gone. WCAG 2.4.7 wants it visible. | **Focus wins.** Restyle it. Removing it deletes the only position marker a keyboard user has. |
| A brand color fails contrast (WCAG 1.4.3). Consistency (§1.4) wants the palette everywhere. | **Contrast wins on text and controls.** Keep the brand color for surfaces and accents. |
| Density (§1.7) wants small controls. Target size (WCAG 2.5.8) wants large. | **Add spacing before you shrink.** Enlarge the hit area or drop a row before going under 24 px. |
| Hick's Law (§3.10) wants fewer choices. Recognition (§1.6) wants options visible. | **Break the task into steps, not hidden menus.** Fewer choices per screen, not fewer shown. |
| Aesthetic-usability (§3.1) hides faults. Error prevention (§1.5) wants them found. | **Test past the aesthetic.** A pretty screen needs the hardest testing, because users report fewer problems with it. |
| Motion feels alive. Reduced-motion (§5.11) asks for stillness. | **Ship both.** Motion is the enhancement. The still version is the product. |
| A small screen wants fewer features (§5.5). Recognition (§1.6) wants options visible. | **Reduce depth, not content.** Move a control behind a labeled step. Never drop it in silence. |
| A hero image serves the brand. Core Web Vitals (§5.14) want a fast paint. | **The budget decides.** An image that pushes LCP past 2.5 s is too heavy. |
| Undo (§7e.1) is safer. A confirm dialog (§7e.2) is quicker to build. | **Undo where it reverses, a dialog where it does not.** A dialog on a routine action trains people to dismiss every dialog. |
| One thing per page (§7d.1) adds steps. Efficiency (§1.7) wants fewer screens. | **Split the hard questions, group the trivial ones.** A step is cheap. A wrong answer is not. |
| Three type sizes (§6.3) limit hierarchy. A dense screen wants more. | **Add weight, color, and space before a size.** A fourth size costs the scale its clarity. |
| An empty state (§7b.1) needs words. Minimalism (§1.8) wants fewer. | **The empty screen is the one that needs the words.** A blank panel gives a new user nothing. |
| Closure (§2.4) says a clean edge looks finished. Tidiness wants the scrollbar hidden. | **Closure wins.** Hidden overflow is hidden data. Show a scroll cue. |

**Tiebreaker:** take the reading that survives a first-time user who succeeds without prior
knowledge of the product.

---

## How to use

1. Check every section. A control can pass Nielsen, group with the wrong neighbor, fail a
   keyboard, and break at 320 px, all at once.
2. **§4, §5, and §7 pass or fail.** §1 to §3 and §6 need judgment.
3. Building a screen? §7 names the shape. §4 decides whether it ships.
4. §8 rules a recurring conflict. Extend it when a new one returns.

**Other lenses.** Security asks whether it can be abused. Engineering asks whether it can be
changed safely. Engineering §6 is the code that makes §4 and §7 here real.

---

## Sources

| § | Source |
| --- | --- |
| Goal | ISO 9241-11:2018 (usability), ISO 9241-110:2020 (interaction principles) |
| §1 | [NN/g: 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), 1994, revised 2024 |
| §2 | Gestalt psychology, Berlin school, plus common region and uniform connectedness |
| §3 | [lawsofux.com](https://lawsofux.com) |
| §4 | [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [quick reference](https://www.w3.org/WAI/WCAG22/quickref/) |
| §5 | [web.dev responsive basics](https://web.dev/articles/responsive-web-design-basics), [Core Web Vitals](https://web.dev/articles/vitals), Apple HIG, Material Design 3 |
| §6 | [NN/g good visual design](https://www.nngroup.com/articles/good-visual-design/), [text scanning patterns](https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/), [WCAG 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) (AAA) |
| §7a | [Nielsen: response times](https://www.nngroup.com/articles/response-times-3-important-limits/), [progress indicators](https://www.nngroup.com/articles/progress-indicators/), [skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) |
| §7b, §7c | [NN/g empty states](https://www.nngroup.com/articles/empty-state-interface-design/), [error message guidelines](https://www.nngroup.com/articles/error-message-guidelines/) |
| §7d, §7e, §7f | [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/), [NN/g confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/), [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) |
