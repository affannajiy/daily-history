/**
 * The regression test for subject-page selection.
 *
 * This is the only part of the pipeline that fails *silently*: pick the wrong
 * article and the digest still renders perfectly, still cites a real URL, still
 * reads well — it is simply about the Cold War on the day the Berlin Wall went
 * up. Nothing else catches that. Not the type checker, not the output guards,
 * not a glance at the preview.
 *
 * The fixtures are real feed entries with hand-checked answers, frozen into
 * JSON so the default run needs no network and is deterministic.
 *
 *   npm run test:ranking          sentence signals only (rankPages), offline
 *   npm run test:ranking -- --live  also runs pickSubject, which fetches each
 *                                   candidate's short description
 *
 * Both matter. `rankPages` is what the citation links and the offline fallback
 * use; `pickSubject` is what actually chooses the article a card is written
 * from. A change that improves one can quietly wreck the other.
 */

import { readFileSync } from "fs";
import { OnThisDayEvent, bestPageTitle } from "./fetchOnThisDay";
import { pickSubject } from "./enrich";

const FIXTURES = "test/fixtures/subject-ranking.json";

interface Fixture {
  day: string;
  event: OnThisDayEvent;
  /** Any of these titles is a correct answer. Empty = no correct answer exists. */
  expected: string[];
  note?: string;
}

/**
 * The bar each mode must clear. These are measured floors, not targets: they
 * record what the ranking currently achieves so that a later change cannot
 * quietly make it worse. Raise them when you improve the ranking; never lower
 * one to make a change pass — a drop here is the test doing its job.
 *
 * The gap between the two numbers is the point of the split. Sentence signals
 * alone get roughly three in five; adding each candidate's own description
 * takes it to roughly nine in ten. That is why `pickSubject` exists and why
 * `rankPages` is not trusted on its own for anything but citation links.
 *
 * The six live failures that remain are mostly genuinely ambiguous — a sentence
 * naming both an assassin and his target does not say which article it is
 * "about". Chasing them on 47 fixtures would be fitting noise.
 */
const MIN_PASS = { offline: 27, live: 41 };

function loadFixtures(): Fixture[] {
  return JSON.parse(readFileSync(FIXTURES, "utf8")) as Fixture[];
}

interface Outcome {
  fixture: Fixture;
  got: string | null;
  ok: boolean;
}

function judge(fixture: Fixture, got: string | null): Outcome {
  // A fixture with no expected answer is a case where the feed entry links no
  // article about the event at all. It is recorded so the known misses stay
  // visible and countable, but it cannot be passed or failed.
  const ok = fixture.expected.length === 0 || fixture.expected.includes(got ?? "");
  return { fixture, got, ok };
}

function report(mode: string, outcomes: Outcome[], floor: number): boolean {
  const scored = outcomes.filter((o) => o.fixture.expected.length > 0);
  const failures = scored.filter((o) => !o.ok);
  const passed = scored.length - failures.length;
  const unanswerable = outcomes.length - scored.length;

  console.log(`\n${mode}: ${passed}/${scored.length} correct (floor ${floor}).`);
  if (unanswerable) {
    console.log(`${unanswerable} entry(s) excluded — no correct article is linked.`);
  }

  for (const f of failures) {
    console.log(`\n  FAIL  ${f.fixture.day} (${f.fixture.event.year})`);
    console.log(`  text  ${f.fixture.event.text.slice(0, 110)}`);
    console.log(`  want  ${f.fixture.expected.join(" | ")}`);
    console.log(`  got   ${f.got ?? "(null)"}`);
    console.log(`  from  ${f.fixture.event.pages.join(", ")}`);
  }

  if (passed < floor) {
    console.error(
      `\n${mode} REGRESSED: ${passed} correct, floor is ${floor}.`
    );
    return false;
  }
  if (passed > floor) {
    console.log(
      `\n${mode} beats its floor (${passed} > ${floor}). Raise MIN_PASS.${mode === "offline" ? "offline" : "live"} in src/rankTest.ts.`
    );
  }
  return true;
}

async function main(): Promise<void> {
  const live = process.argv.includes("--live");
  const fixtures = loadFixtures();
  console.log(`Loaded ${fixtures.length} fixtures from ${FIXTURES}.`);

  const offline = fixtures.map((f) => judge(f, bestPageTitle(f.event)));
  let ok = report("offline (rankPages)", offline, MIN_PASS.offline);

  if (live) {
    console.log("\nFetching descriptions for pickSubject...");
    const results: Outcome[] = [];
    for (const f of fixtures) {
      results.push(judge(f, await pickSubject(f.event)));
    }
    ok = report("live (pickSubject)", results, MIN_PASS.live) && ok;
  } else {
    console.log("\nSkipped live pickSubject check. Re-run with --live to include it.");
  }

  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("Ranking test failed to run:", err);
  process.exit(1);
});
