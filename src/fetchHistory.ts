import { HistoryData, HistoryResult, HistorySection } from "./types";
import { OnThisDayEvent, formatEventsForPrompt } from "./fetchOnThisDay";
import { classifyRegions } from "./regions";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Builds the historian prompt. Crucially, the AI is given a VERIFIED list of
 * events that actually occurred on this day and is told it may only select and
 * rewrite from that list — it must not invent events, dates, or years. This is
 * what eliminates the "famous event snapped onto the wrong day" failure mode.
 */
export function buildPrompt(
  month: string,
  day: number,
  events: OnThisDayEvent[],
  seaCandidates: OnThisDayEvent[],
  malaysiaCandidates: OnThisDayEvent[]
): string {
  const seaList = seaCandidates.length
    ? formatEventsForPrompt(seaCandidates)
    : "NONE";
  const malaysiaList = malaysiaCandidates.length
    ? formatEventsForPrompt(malaysiaCandidates)
    : "NONE";

  return `You are a senior historian and writer for National Geographic. The date is ${month} ${day}.

Below are VERIFIED historical events that genuinely occurred on ${month} ${day} across different years. The year is given in parentheses before each event. These are the ONLY events you may use.

STRICT RULES:
- Use ONLY events from the lists below. Never introduce an event that is not listed.
- Never change, guess, or round a year. Copy the year exactly as given.
- Never claim an event happened on a different day than ${month} ${day}.

ALL VERIFIED EVENTS FOR ${month} ${day} (use for the global headline):
${formatEventsForPrompt(events)}

SOUTHEAST ASIA EVENTS (already filtered for you):
${seaList}

MALAYSIA / TANAH MELAYU / MALAYA EVENTS (already filtered for you):
${malaysiaList}

Your tasks:
1. "global": From ALL verified events, pick the SINGLE most globally significant one and expand it into rich, cinematic, National Geographic-style narrative prose (3-4 paragraphs).
2. "southeastAsia": From the SOUTHEAST ASIA EVENTS list, pick the most significant event and write it up. If that list is "NONE", set this field to null.
3. "malaysia": From the MALAYSIA list, pick the most relevant event and write it up. If that list is "NONE", set this field to null.
Do not reuse the same event for more than one section.

For each chosen event, write a "synopsis" and "impact", list "keyFigures", and provide a "references" array of authoritative sources (Britannica, Library of Congress, Arkib Negara Malaysia, academic works, etc.) you would point a reader to for verification. Only include a "url" when you are confident it is a real, correct link; otherwise omit the "url" field.

Return ONLY valid JSON, no markdown, no preamble, in exactly this shape (use null for southeastAsia/malaysia if no listed event qualifies):

{
  "global": {
    "title": "Event name",
    "year": "Exact year from the list",
    "location": "City, Country",
    "synopsis": "3-4 paragraphs of cinematic NatGeo-style prose",
    "keyFigures": [{ "name": "Full name", "role": "Their role", "significance": "Why they matter" }],
    "impact": "2-3 paragraphs on how this event shaped society from then until today",
    "references": [{ "title": "Publication — specific work", "url": "https://... (omit if unsure)" }]
  },
  "southeastAsia": {
    "title": "Event name",
    "year": "Exact year from the list",
    "location": "City, Country",
    "synopsis": "1-2 paragraph narrative",
    "keyFigures": [{ "name": "", "role": "", "significance": "" }],
    "impact": "1 paragraph",
    "references": [{ "title": "Publication — specific work" }]
  } OR null,
  "malaysia": {
    "title": "Event name",
    "year": "Exact year from the list",
    "location": "Location in Malaysia/Malaya/Tanah Melayu",
    "synopsis": "1-2 paragraph narrative",
    "keyFigures": [{ "name": "", "role": "", "significance": "" }],
    "impact": "1 paragraph",
    "references": [{ "title": "Publication — specific work" }]
  } OR null
}`;
}

/** Strips ```json fences if a model wraps its reply despite instructions. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function isValidSection(s: unknown): s is HistorySection {
  if (!s || typeof s !== "object") return false;
  const sec = s as Record<string, unknown>;
  return (
    typeof sec.title === "string" &&
    typeof sec.synopsis === "string" &&
    typeof sec.impact === "string" &&
    Array.isArray(sec.keyFigures)
  );
}

/** Coerces a regional section to null if the model returned something invalid. */
function normalizeOptional(s: unknown): HistorySection | null {
  return isValidSection(s) ? s : null;
}

function parseHistory(raw: string): HistoryData {
  const data = JSON.parse(extractJson(raw)) as any;
  if (!isValidSection(data?.global)) {
    throw new Error("AI response is missing a valid global section.");
  }
  return {
    global: data.global,
    southeastAsia: normalizeOptional(data.southeastAsia),
    malaysia: normalizeOptional(data.malaysia),
  };
}

async function callGemini(prompt: string): Promise<HistoryData> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // temperature 0 → factual/deterministic selection, not creative recall.
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as any;
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text content.");
  return parseHistory(text);
}

async function callGroq(prompt: string): Promise<HistoryData> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as any;
  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text content.");
  return parseHistory(text);
}

/** Calls a provider, retrying once if the JSON comes back malformed. */
async function withRetry(
  fn: (prompt: string) => Promise<HistoryData>,
  prompt: string
): Promise<HistoryData> {
  try {
    return await fn(prompt);
  } catch (err) {
    if (err instanceof SyntaxError || /missing a valid/.test(String(err))) {
      console.warn("Malformed JSON from provider, retrying once...");
      return await fn(prompt);
    }
    throw err;
  }
}

/**
 * Generates the digest from the verified event list. Tries Groq first and
 * falls back to Gemini if Groq fails for any reason.
 */
export async function generateHistory(
  month: string,
  day: number,
  events: OnThisDayEvent[]
): Promise<HistoryResult> {
  if (!events.length) {
    throw new Error(
      "No verified events were available for this day; refusing to generate unsourced content."
    );
  }

  const { southeastAsia, malaysia } = classifyRegions(events);
  console.log(
    `Regional candidates — SEA: ${southeastAsia.length}, Malaysia: ${malaysia.length}.`
  );
  const prompt = buildPrompt(month, day, events, southeastAsia, malaysia);

  // If code found no candidate for a region, force null regardless of what the
  // model returns — it must never fabricate one to fill the slot.
  const enforce = (data: HistoryData): HistoryData => ({
    global: data.global,
    southeastAsia: southeastAsia.length ? data.southeastAsia : null,
    malaysia: malaysia.length ? data.malaysia : null,
  });

  try {
    const data = await withRetry(callGroq, prompt);
    return { data: enforce(data), provider: "Groq" };
  } catch (err) {
    console.warn("Groq failed, falling back to Gemini:", err);
    const data = await withRetry(callGemini, prompt);
    return { data: enforce(data), provider: "Gemini" };
  }
}
