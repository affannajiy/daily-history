import {
  Card,
  EventCard,
  Fact,
  FactStat,
  FigureCard,
  HistoryData,
  HistoryResult,
  KeyFigure,
  Provider,
  Reference,
  TimelineBeat,
} from "./types";
import { OnThisDayEvent } from "./fetchOnThisDay";
import { classifyRegions, matchesMalaysia, matchesSoutheastAsia } from "./regions";
import { EnrichedEvent, enrichEvents, formatEnrichedForPrompt } from "./enrich";
import { FigureCandidate, findRegionalFigure } from "./fetchFigures";
import { postJson } from "./http";
import { availableIds, eventKey } from "./sentLog";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const MAX_TIMELINE = 6;
const MIN_TIMELINE = 3;
const MIN_NUMBERS = 2;

/**
 * Phrases that mean nothing. Every one of these was pulled from real output —
 * they are what a model writes when it has been asked for more paragraphs than
 * it has facts for, and they are why the synopsis and the impact section used
 * to say the same thing three times over.
 */
const BANNED_PHRASES = [
  "significant",
  "lasting impact",
  "far-reaching",
  "testament to",
  "paved the way",
  "a reminder that",
  "highlighted the need",
  "continues to this day",
  "shaped the course of",
  "left an indelible mark",
  "stands as a symbol",
  // The biography variant of the same emptiness, from the figure cards.
  "continues to be felt",
  "inspired generations",
  "remembered as",
  "played a key role",
  "played a crucial role",
  "worked tirelessly",
  "visionary leader",
  "respected leader",
  "stable and prosperous",
  "wisdom and integrity",
];

// ---------------------------------------------------------------------------
// Pass 1 — selection
// ---------------------------------------------------------------------------

/**
 * The selection pass sees only the one-line feed entries and returns ids. It
 * writes nothing. Splitting selection from writing is what lets us fetch the
 * full article for the chosen events *before* any prose is generated — the
 * writing pass then has real material instead of a single sentence to inflate.
 */
export function buildSelectPrompt(
  month: string,
  day: number,
  events: OnThisDayEvent[],
  seaIds: Set<number>,
  malaysiaIds: Set<number>,
  offered?: Set<number>
): string {
  const list = events
    .map((e, i) => {
      const tags = [
        seaIds.has(i + 1) ? "[SOUTHEAST ASIA]" : "",
        malaysiaIds.has(i + 1) ? "[MALAYSIA]" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const topics = e.pages.length ? ` (topics: ${e.pages.slice(0, 3).join(", ")})` : "";
      return { id: i + 1, line: `${i + 1}. (${e.year}) ${e.text}${topics} ${tags}`.trim() };
    })
    // Events featured in a previous year are simply not offered. Ids stay at
    // their original numbers so the gaps are harmless — the model returns ids
    // from this list, and code validates them against it.
    .filter((row) => !offered || offered.has(row.id))
    .map((row) => row.line)
    .join("\n");

  return `You are a history editor choosing what to feature for ${month} ${day}.

Below are verified events that genuinely occurred on ${month} ${day}. Each has an id.

${list}

Choose:
- "global": the id of the single most globally consequential event. Prefer events with wide, traceable consequences over anniversaries and minor incidents.
- "southeastAsia": the id of the most consequential event tagged [SOUTHEAST ASIA], or null if none is tagged.
- "malaysia": the id of the most consequential event tagged [MALAYSIA], or null if none is tagged.

Rules:
- Return ids only. Do not write any prose.
- Never return an id that is not in the list above.
- Never use the same id twice.
- Only return an id for "southeastAsia" if it carries the [SOUTHEAST ASIA] tag.
- Only return an id for "malaysia" if it carries the [MALAYSIA] tag.

Return ONLY this JSON:
{"global": <id>, "southeastAsia": <id or null>, "malaysia": <id or null>}`;
}

interface Selection {
  global: number;
  southeastAsia: number | null;
  malaysia: number | null;
}

function parseSelection(
  raw: string,
  events: OnThisDayEvent[],
  seaIds: Set<number>,
  malaysiaIds: Set<number>,
  offered?: Set<number>
): Selection {
  const data = JSON.parse(extractJson(raw)) as any;
  const inRange = (n: unknown): n is number =>
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= events.length &&
    (!offered || offered.has(n));

  if (!inRange(data?.global)) {
    throw new Error("Selection pass returned no valid global id.");
  }

  // A regional id is accepted only if code already classified it into that
  // region. The model cannot promote an unrelated event into a regional slot.
  const pick = (value: unknown, allowed: Set<number>, used: number[]): number | null => {
    if (!inRange(value) || !allowed.has(value) || used.includes(value)) return null;
    return value;
  };

  const used = [data.global as number];
  const southeastAsia = pick(data?.southeastAsia, seaIds, used);
  if (southeastAsia) used.push(southeastAsia);
  const malaysia = pick(data?.malaysia, malaysiaIds, used);

  return { global: data.global, southeastAsia, malaysia };
}

// ---------------------------------------------------------------------------
// Pass 2 — writing
// ---------------------------------------------------------------------------

const EVENT_SHAPE = `{
    "title": "Event name",
    "year": "Exact year, copied from the verified event line",
    "location": "City, Country as it was called then",
    "standfirst": "ONE complete sentence of 12-25 words, with a verb, naming the concrete thing that makes this worth reading. Never a bare noun phrase or an alternative name for the event.",
    "facts": [
      { "label": "Who", "value": "The people or body that acted — max 8 words" },
      { "label": "What", "value": "What was actually done — max 8 words" },
      { "label": "Where", "value": "Specific place — max 8 words" },
      { "label": "When", "value": "Full date INCLUDING the year, plus time of day if the article gives one" }
    ],
    "whatHappened": "2 paragraphs of concrete narrative. Names, places, numbers, sequence. Every claim must come from the ARTICLE TEXT.",
    "timeline": [ { "when": "Date or year", "what": "What happened at that point, one sentence" } ],
    "numbers": [ { "value": "1,750", "label": "kg spacecraft mass" } ],
    "keyFigures": [ { "name": "Full name", "role": "Their actual role", "significance": "What THEY specifically did — not why the event mattered" } ],
    "whatChangedAfter": "1-2 paragraphs. What concretely changed: laws passed, borders moved, institutions founded, numbers before and after.",
    "references": [ { "title": "Institution or publication name" } ]
  }`;

const FIGURE_SHAPE = `{
    "title": "Full name",
    "year": "Lifespan exactly as the article gives it, e.g. 1869-1948, or 1925- if still living",
    "location": "Where they were principally active",
    "standfirst": "ONE complete sentence of 12-25 words, with a verb, naming what they actually did. Never a bare noun phrase.",
    "facts": [
      { "label": "Born", "value": "Date and place" },
      { "label": "Died", "value": "Date and place, or 'Living'" },
      { "label": "Field", "value": "Their actual field — max 6 words" },
      { "label": "Known for", "value": "The specific achievement — max 8 words" }
    ],
    "whatTheyDid": "2 paragraphs of concrete biography: offices held with dates, works written, organisations founded, decisions taken, elections won. Names and dates from the ARTICLE TEXT. No character assessment.",
    "timeline": [ { "when": "Year", "what": "One dated milestone of their life or work" } ],
    "numbers": [ { "value": "23", "label": "years as Prime Minister" } ],
    "legacy": "What of theirs still exists and can be named: institutions founded, laws or treaties they signed, parties or policies that outlived them, universities, awards, buildings or roads named after them. Name at least two such things. If you cannot name two, write ONE sentence and stop. Never assess their character, and never say what they are remembered for.",
    "references": [ { "title": "Institution or publication name" } ]
  }`;

interface WriteSlot {
  key: "global" | "southeastAsia" | "malaysia";
  label: string;
  kind: "event" | "figure";
  enriched: EnrichedEvent;
  anchorKind?: "births" | "deaths";
}

export function buildWritePrompt(month: string, day: number, slots: WriteSlot[]): string {
  const blocks = slots
    .map((s) => {
      const header =
        s.kind === "event"
          ? `=== SLOT "${s.key}" — TYPE: EVENT — SECTION: ${s.label} ===`
          : `=== SLOT "${s.key}" — TYPE: FIGURE — SECTION: ${s.label} ===\nThis person was ${
              s.anchorKind === "births" ? "born" : "recorded as having died"
            } on ${month} ${day}, ${s.enriched.event.year}. Write about the person, not about that day.`;
      return `${header}\n${formatEnrichedForPrompt(s.enriched)}`;
    })
    .join("\n\n");

  const shapes = slots
    .map(
      (s) =>
        `  "${s.key}": ${s.kind === "event" ? EVENT_SHAPE : FIGURE_SHAPE}`
    )
    .join(",\n");

  return `You are a historian writing for a daily briefing. The date is ${month} ${day}.

For each slot below you are given a verified event line and the text of its Wikipedia article. Write the slot's card from that material.

${blocks}

STRICT SOURCING RULES:
- Write about the specific event named on the "WRITE ABOUT THIS EVENT" line. The source article often covers a wider subject — a whole war, a whole era, an aircraft type. Use only the parts of it that bear on that one event, and ignore the rest.
- Every fact you write must be supported by the ARTICLE TEXT supplied for that slot. Do not add anything from memory.
- Copy years and dates exactly. Never change, guess, or round one.
- If the article text does not support a field, return an empty string or an empty array for it. An empty field is correct; an invented one is not.
- Do not reuse content between slots.
- "keyFigures" are people who took part in this event and are named in the article text. Not commentators, not historians who later wrote about it, not people connected only to the wider subject. List the most consequential first — those who decided, led, or were the target of the action — and leave out bystanders, however vivid.
- "standfirst" must not repeat the first sentence of "whatHappened"/"whatTheyDid". It says something the narrative does not open with.

WRITING RULES — these exist because earlier drafts said the same empty thing in every section:
- Never use these phrases or any variation of them: ${BANNED_PHRASES.map((p) => `"${p}"`).join(", ")}.
- Every sentence in "whatChangedAfter" and "legacy" must name a concrete actor, place, number, date, law, or institution. If you cannot, write less.
- "whatHappened"/"whatTheyDid" describes what occurred. "whatChangedAfter"/"legacy" describes what was different afterwards. They must not restate each other.
- No sentence may begin with "The event" or "This was".

TIMELINE RULES — the timeline is the most useful part of this briefing, so build one for every slot whose article gives you the dates:
- Between ${MIN_TIMELINE} and ${MAX_TIMELINE} entries, in chronological order.
- Read the article text for dates and years and turn them into beats. Most articles contain far more than ${MIN_TIMELINE}; find them before concluding you cannot.
- Cover the run-up, the day itself, and what followed. For a person, cover their life: "1949", "Called to the bar at the Inner Temple".
- Every entry needs a real date or year taken from the article. Drop any beat you cannot date. A "when" without digits is not a date.
- Only if the article genuinely gives fewer than ${MIN_TIMELINE} datable moments, return an empty array.

NUMBERS RULES:
- Quantities only: counts, masses, distances, durations, sums, populations, casualties, percentages.
- A year is NOT a number. Never output a value like "1945" with a label like "Year of the end of the war" — dates belong in the timeline.
- Each value must appear verbatim in the article text or the structured facts.
- At least ${MIN_NUMBERS}, or return an empty array. Never pad with a number you had to reason out.

REFERENCE RULES:
- NEVER output a URL. Links are added by the system from verified sources; any URL you write will be discarded.
- Name only institutions or publications you are certain hold material on this subject: Encyclopaedia Britannica, Library of Congress, national archives, university presses.
- Do not name a specific book, document, file, or article title unless that exact title appears in the ARTICLE TEXT above.
- For a Malaysian subject, prefer Arkib Negara Malaysia, Perpustakaan Negara Malaysia, or Dewan Bahasa dan Pustaka.

Return ONLY valid JSON, no markdown, in exactly this shape:

{
${shapes}
}`;
}

// ---------------------------------------------------------------------------
// Parsing and normalisation
// ---------------------------------------------------------------------------

/** Strips ```json fences if a model wraps its reply despite instructions. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Deletes any banned phrase that survived the prompt. Removing the sentence
 * rather than the phrase keeps the prose grammatical, and a card that loses
 * every sentence this way had nothing to say in the first place.
 */
function stripFiller(text: string): string {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => {
          const lower = sentence.toLowerCase();
          return !BANNED_PHRASES.some((p) => lower.includes(p));
        })
        .join(" ")
        .trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

function facts(v: unknown): Fact[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((f: any) => ({ label: str(f?.label), value: str(f?.value) }))
    .filter((f) => f.label && f.value)
    .slice(0, 4);
}

/** A beat without a date is a sentence pretending to be a timeline entry. */
function timeline(v: unknown): TimelineBeat[] {
  if (!Array.isArray(v)) return [];
  const beats = v
    .map((b: any) => ({ when: str(b?.when), what: str(b?.what) }))
    .filter((b) => b.when && b.what && /\d/.test(b.when))
    .slice(0, MAX_TIMELINE);
  return beats.length >= MIN_TIMELINE ? beats : [];
}

/** Digits with separators removed, so "1,750" in a card matches "1750" in prose. */
function digitsOf(text: string): string {
  return text.replace(/[,\s]/g, "");
}

/**
 * One lonely statistic reads as an accident, so the strip is all-or-nothing.
 *
 * Two things get dropped before that count is taken: bare years, which the
 * model likes to dress up as statistics ("1945 — year the war ended"), and any
 * figure whose digits do not occur in the source text, which is the only
 * mechanical test for a number that was reasoned out rather than read.
 */
function numbers(v: unknown, source: string): FactStat[] {
  if (!Array.isArray(v)) return [];
  const haystack = digitsOf(source);
  const stats = v
    .map((n: any) => ({ value: str(n?.value), label: str(n?.label) }))
    .filter((n) => n.value && n.label)
    .filter((n) => !/^\(?(1[0-9]{3}|20[0-9]{2})\)?$/.test(n.value.trim()))
    .filter((n) => {
      const digits = digitsOf(n.value).match(/\d+/)?.[0];
      return !digits || haystack.includes(digits);
    })
    .slice(0, 3);
  return stats.length >= MIN_NUMBERS ? stats : [];
}

/** Anyone not named in the source did not take part in the event. */
function keyFigures(v: unknown, source: string): KeyFigure[] {
  if (!Array.isArray(v)) return [];
  const haystack = normalise(source);
  return v
    .map((f: any) => ({
      name: str(f?.name),
      role: str(f?.role),
      significance: stripFiller(str(f?.significance)),
    }))
    .filter((f) => f.name && haystack.includes(normalise(f.name)))
    .slice(0, 3);
}

/**
 * A standfirst is a sentence or it is nothing. Fragments like "Barbed Wire
 * Sunday" render as a stray line under the headline that says less than the
 * headline did, and a standfirst that restates the first line of the narrative
 * below it is the same duplication this rewrite exists to remove.
 */
function standfirst(v: unknown, body: string): string {
  const text = stripFiller(str(v));
  if (text.split(/\s+/).filter(Boolean).length < 8) return "";
  const opening = body.split(/(?<=[.!?])\s+/)[0] ?? "";
  return normalise(opening).includes(normalise(text)) ? "" : text;
}

/** Normalises for the "did this title actually appear in the source?" check. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Builds the reference list in code. The model never supplies a URL — every
 * dead link in earlier editions came from a model writing one from memory.
 * Links here are either the article's own canonical URL or an official-site
 * URL from Wikidata, both of which are known to resolve.
 *
 * Model-supplied entries survive only as unlinked names, and only if they name
 * an institution rather than a specific document we cannot verify exists.
 */
function references(v: unknown, enriched: EnrichedEvent): Reference[] {
  const out: Reference[] = [];
  const seen = new Set<string>();

  const add = (ref: Reference) => {
    const key = normalise(ref.title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(ref);
  };

  if (enriched.url) {
    add({ title: `Wikipedia — ${enriched.title}`, url: enriched.url });
  }
  // A local-language article that fed the writing pass must be cited like any
  // other source that fed it.
  for (const local of enriched.localSources) {
    add({
      title: `Wikipedia (${local.lang.toUpperCase()}) — ${local.title}`,
      url: local.url,
    });
  }
  for (const official of enriched.officialUrls) {
    add({ title: `${enriched.title} — official website`, url: official.url });
  }

  const haystack = normalise(`${enriched.extract} ${enriched.event.text}`);
  if (Array.isArray(v)) {
    for (const r of v as any[]) {
      const title = str(r?.title);
      if (!title || /https?:\/\//i.test(title)) continue;

      // "Institution — specific work" is only allowed when the work is named
      // in the source text; otherwise we would be citing a document that may
      // not exist. Bare institution names pass through unchanged.
      const parts = title.split(/\s+[—–-]\s+|:\s+/);
      if (parts.length > 1) {
        const work = parts.slice(1).join(" ");
        if (!haystack.includes(normalise(work))) {
          add({ title: parts[0].trim() });
          continue;
        }
      }
      add({ title });
    }
  }

  return out.slice(0, 5);
}

function parseEventCard(v: unknown, enriched: EnrichedEvent): EventCard | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const title = str(c.title);
  const whatHappened = stripFiller(str(c.whatHappened));
  if (!title || !whatHappened) return null;

  // Local-language text counts as source for the "did you read this?" checks:
  // a name or a figure the model took from the Malay article is sourced, and
  // rejecting it would push the card back to the thinner English one.
  const source = [
    enriched.extract,
    enriched.event.text,
    ...enriched.localSources.map((l) => l.extract),
  ].join(" ");

  return {
    kind: "event",
    title,
    year: str(c.year) || String(enriched.event.year),
    location: str(c.location),
    standfirst: standfirst(c.standfirst, whatHappened),
    facts: facts(c.facts),
    whatHappened,
    timeline: timeline(c.timeline),
    numbers: numbers(c.numbers, source),
    keyFigures: keyFigures(c.keyFigures, source),
    whatChangedAfter: stripFiller(str(c.whatChangedAfter)),
    references: references(c.references, enriched),
    image: enriched.image,
  };
}

function parseFigureCard(
  v: unknown,
  enriched: EnrichedEvent,
  anchorKind: "births" | "deaths"
): FigureCard | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const title = str(c.title);
  const whatTheyDid = stripFiller(str(c.whatTheyDid));
  if (!title || !whatTheyDid) return null;

  const source = [
    enriched.extract,
    enriched.event.text,
    ...enriched.localSources.map((l) => l.extract),
  ].join(" ");

  return {
    kind: "figure",
    title,
    year: str(c.year),
    location: str(c.location),
    standfirst: standfirst(c.standfirst, whatTheyDid),
    facts: facts(c.facts),
    whatTheyDid,
    timeline: timeline(c.timeline),
    numbers: numbers(c.numbers, source),
    legacy: stripFiller(str(c.legacy)),
    references: references(c.references, enriched),
    image: enriched.image,
    // Built here, not by the model: this is the sourcing claim that ties the
    // card to today's date, so it must be exact.
    anchor: `${anchorKind === "births" ? "Born" : "Died"} on this day, ${enriched.event.year}`,
  };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/**
 * Model calls get a longer timeout than the article fetches — a writing pass
 * over three articles is slow by nature, and aborting it early would throw away
 * work that was going to succeed.
 */
const MODEL_TIMEOUT_MS = 60000;

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const json = await postJson(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
      // temperature 0 → factual selection and close paraphrase, not creative recall.
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    },
    { timeoutMs: MODEL_TIMEOUT_MS, label: "Gemini" }
  );

  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text content.");
  return text;
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");

  const json = await postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    },
    {
      timeoutMs: MODEL_TIMEOUT_MS,
      label: "Groq",
      headers: { Authorization: `Bearer ${key}` },
    }
  );

  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text content.");
  return text;
}

/** Runs a prompt through Groq, falling back to Gemini, retrying each once. */
async function complete(
  prompt: string,
  parse: (raw: string) => void
): Promise<{ raw: string; provider: Provider }> {
  const attempt = async (
    fn: (p: string) => Promise<string>,
    provider: Provider
  ): Promise<{ raw: string; provider: Provider }> => {
    for (let i = 0; i < 2; i++) {
      const raw = await fn(prompt);
      try {
        parse(raw);
        return { raw, provider };
      } catch (err) {
        if (i === 0) {
          console.warn(`${provider} returned unusable JSON, retrying once...`);
          continue;
        }
        throw err;
      }
    }
    throw new Error(`${provider} failed to return usable JSON.`);
  };

  try {
    return await attempt(callGroq, "Groq");
  } catch (err) {
    console.warn("Groq failed, falling back to Gemini:", String(err));
    return await attempt(callGemini, "Gemini");
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function generateHistory(
  month: string,
  day: number,
  monthIndex: number,
  events: OnThisDayEvent[],
  alreadySent: Set<string> = new Set()
): Promise<HistoryResult> {
  if (!events.length) {
    throw new Error(
      "No verified events were available for this day; refusing to generate unsourced content."
    );
  }

  const { southeastAsia, malaysia } = classifyRegions(events);
  const idsOf = (subset: OnThisDayEvent[]) =>
    new Set(subset.map((e) => events.indexOf(e) + 1));
  const seaIds = idsOf(southeastAsia);
  const malaysiaIds = idsOf(malaysia);
  console.log(
    `Regional candidates — SEA: ${southeastAsia.length}, Malaysia: ${malaysia.length}.`
  );

  // Events featured in an earlier year are withheld, per bucket, so a region
  // with exactly one recorded event never loses it permanently.
  const globalOffered = availableIds(events, alreadySent);
  const offered = new Set([
    ...globalOffered,
    ...availableIds(events, alreadySent, seaIds),
    ...availableIds(events, alreadySent, malaysiaIds),
  ]);
  const withheld = events.length - offered.size;
  if (withheld > 0) console.log(`Withholding ${withheld} previously featured event(s).`);

  // Pass 1: pick ids only.
  const selectPrompt = buildSelectPrompt(month, day, events, seaIds, malaysiaIds, offered);
  const selected = await complete(selectPrompt, (raw) =>
    parseSelection(raw, events, seaIds, malaysiaIds, offered)
  );
  const selection = parseSelection(selected.raw, events, seaIds, malaysiaIds, offered);
  console.log(
    `Selected — global: #${selection.global}, SEA: ${selection.southeastAsia ?? "none"}, Malaysia: ${selection.malaysia ?? "none"}.`
  );

  // A region with no verified event falls back to a person from the same day.
  const [seaFigure, malaysiaFigure] = await Promise.all([
    selection.southeastAsia
      ? Promise.resolve(null)
      : findRegionalFigure(monthIndex, day, matchesSoutheastAsia),
    selection.malaysia
      ? Promise.resolve(null)
      : findRegionalFigure(monthIndex, day, matchesMalaysia),
  ]);
  if (seaFigure) console.log(`SEA falls back to figure: ${seaFigure.pages[0]}.`);
  if (malaysiaFigure) console.log(`Malaysia falls back to figure: ${malaysiaFigure.pages[0]}.`);

  // Pass 2: fetch article text for the chosen few, then write from it.
  const plan: Array<{
    key: WriteSlot["key"];
    label: string;
    kind: "event" | "figure";
    source: OnThisDayEvent;
    anchorKind?: "births" | "deaths";
  }> = [
    {
      key: "global",
      label: "Global Headline",
      kind: "event",
      source: events[selection.global - 1],
    },
  ];

  const addRegion = (
    key: "southeastAsia" | "malaysia",
    label: string,
    id: number | null,
    figure: FigureCandidate | null
  ) => {
    if (id) {
      plan.push({ key, label, kind: "event", source: events[id - 1] });
    } else if (figure) {
      plan.push({ key, label, kind: "figure", source: figure, anchorKind: figure.anchorKind });
    }
  };
  addRegion("southeastAsia", "Southeast Asia", selection.southeastAsia, seaFigure);
  addRegion("malaysia", "Tanah Melayu / Malaysia", selection.malaysia, malaysiaFigure);

  const enriched = await enrichEvents(plan.map((p) => p.source), {
    // Malay for the Malaysian slot, Malay and Indonesian for the wider region:
    // English Wikipedia is thinnest exactly where these cards are weakest.
    localLangs: plan.map((p) =>
      p.key === "malaysia" ? ["ms"] : p.key === "southeastAsia" ? ["ms", "id"] : []
    ),
    // Only the lead card carries a picture. Giving all three one would flatten
    // the hierarchy the layout works to establish (§2.10 emergence).
    wantImage: plan.map((p) => p.key === "global"),
    isFigure: plan.map((p) => p.kind === "figure"),
  });
  const withText = enriched.filter((e) => e.extract).length;
  const withLocal = enriched.filter((e) => e.localSources.length).length;
  console.log(
    `Enriched ${withText}/${enriched.length} slots with article text` +
      `${withLocal ? `, ${withLocal} with a local-language source` : ""}` +
      `${enriched.some((e) => e.image) ? ", lead image found" : ", no free lead image"}.`
  );

  const slots: WriteSlot[] = plan.map((p, i) => ({
    key: p.key,
    label: p.label,
    kind: p.kind,
    enriched: enriched[i],
    anchorKind: p.anchorKind,
  }));

  const writePrompt = buildWritePrompt(month, day, slots);
  const parseAll = (raw: string): HistoryData => {
    const parsed = JSON.parse(extractJson(raw)) as any;
    const slotFor = (key: WriteSlot["key"]) => slots.find((s) => s.key === key);

    const globalSlot = slotFor("global")!;
    const global = parseEventCard(parsed?.global, globalSlot.enriched);
    if (!global) throw new Error("Writing pass returned no valid global card.");

    const region = (key: "southeastAsia" | "malaysia"): Card | null => {
      const slot = slotFor(key);
      if (!slot) return null;
      return slot.kind === "event"
        ? parseEventCard(parsed?.[key], slot.enriched)
        : parseFigureCard(parsed?.[key], slot.enriched, slot.anchorKind ?? "births");
    };

    return { global, southeastAsia: region("southeastAsia"), malaysia: region("malaysia") };
  };

  const written = await complete(writePrompt, (raw) => parseAll(raw));
  return {
    data: parseAll(written.raw),
    provider: written.provider,
    // What was actually featured, so the caller can record it and not repeat it
    // next year. Taken from the plan rather than the cards: card titles are
    // model-written and would not match the feed entry a year later.
    featuredKeys: plan.map((p) => eventKey(p.source)),
  };
}
