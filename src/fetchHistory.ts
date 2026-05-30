import { HistoryData, HistoryResult, HistorySection } from "./types";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Builds the historian prompt for a given date. Both providers receive the
 * exact same instructions so the output shape is identical regardless of which
 * one answers.
 */
export function buildPrompt(month: string, day: number, year: number): string {
  return `You are a senior historian and writer for National Geographic. Today's date is ${month} ${day}, ${year}.

Write a daily history digest for THREE events that occurred on ${month} ${day} in history. Return ONLY valid JSON, no markdown, no preamble.

Use authoritative sources such as Britannica, Library of Congress, Arkib Negara Malaysia, and established historical records. Do NOT use Wikipedia as a primary source.

- "global" must be a globally significant event.
- "southeastAsia" must be a real event from Southeast Asia (Indonesia, Thailand, Vietnam, Philippines, Singapore, Myanmar, Cambodia, Laos, Brunei, or Timor-Leste).
- "malaysia" must specifically relate to Malaysian history (pre-colonial Tanah Melayu, colonial Malaya, or modern Malaysia).

For each event, include a "references" array listing the authoritative sources you actually drew the information from (2-4 per event). Use the publication or institution and the specific work, e.g. "Encyclopaedia Britannica — Fall of Constantinople". Only include a "url" when you are confident it is a real, correct link; if you are not certain of the exact URL, omit the "url" field entirely rather than guessing.

Return JSON in exactly this shape:

{
  "global": {
    "title": "Event name",
    "year": "Year it occurred",
    "location": "City, Country",
    "synopsis": "3-4 paragraphs of rich, cinematic, NatGeo-style narrative prose",
    "keyFigures": [
      { "name": "Full name", "role": "Their role", "significance": "Why they matter" }
    ],
    "impact": "2-3 paragraphs on how this event shaped society from then until today",
    "references": [
      { "title": "Publication — specific work", "url": "https://... (omit if unsure)" }
    ]
  },
  "southeastAsia": {
    "title": "Event name",
    "year": "Year",
    "location": "City, Country",
    "synopsis": "1-2 paragraph narrative",
    "keyFigures": [{ "name": "", "role": "", "significance": "" }],
    "impact": "1 paragraph",
    "references": [{ "title": "Publication — specific work" }]
  },
  "malaysia": {
    "title": "Event name",
    "year": "Year",
    "location": "Location in Malaysia/Malaya/Tanah Melayu",
    "synopsis": "1-2 paragraph narrative",
    "keyFigures": [{ "name": "", "role": "", "significance": "" }],
    "impact": "1 paragraph",
    "references": [{ "title": "Publication — specific work" }]
  }
}`;
}

/** Strips ```json fences if a model wraps its reply despite instructions. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Otherwise grab from the first { to the last } to drop any stray prose.
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

function parseHistory(raw: string): HistoryData {
  const data = JSON.parse(extractJson(raw)) as HistoryData;
  if (
    !isValidSection(data.global) ||
    !isValidSection(data.southeastAsia) ||
    !isValidSection(data.malaysia)
  ) {
    throw new Error("AI response is missing one or more required sections.");
  }
  return data;
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
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
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
      temperature: 0.7,
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
    if (err instanceof SyntaxError || /missing one or more/.test(String(err))) {
      console.warn("Malformed JSON from provider, retrying once...");
      return await fn(prompt);
    }
    throw err;
  }
}

/**
 * Generates the digest. Tries Gemini first and falls back to Groq if Gemini
 * fails for any reason (quota, network, malformed output).
 */
export async function generateHistory(
  month: string,
  day: number,
  year: number
): Promise<HistoryResult> {
  const prompt = buildPrompt(month, day, year);
  try {
    const data = await withRetry(callGemini, prompt);
    return { data, provider: "Gemini" };
  } catch (err) {
    console.warn("Gemini failed, falling back to Groq:", err);
    const data = await withRetry(callGroq, prompt);
    return { data, provider: "Groq" };
  }
}
