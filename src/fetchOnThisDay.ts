/**
 * Pulls the verified list of historical events for a given calendar day from
 * Wikimedia's "On This Day" feed. This is the factual backbone of the digest:
 * every event returned genuinely occurred on this month/day, with a correct
 * year. The AI is only allowed to select and rewrite from this list, which is
 * what prevents the date hallucinations we saw with a recall-only prompt.
 *
 * Note: Wikimedia is used here purely as a dated *index* of events — not as the
 * narrative voice. The editorial prose and cited references come from the AI.
 */

import { getJson } from "./http";

export interface OnThisDayEvent {
  year: number;
  text: string;
  /** Linked article titles, used as topic hints for the AI. */
  pages: string[];
}

export async function fetchOnThisDay(
  month: number,
  day: number
): Promise<OnThisDayEvent[]> {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;

  // Retried, not one-shot: this feed is the factual backbone, and losing it to
  // a transient blip loses the whole day.
  const json = await getJson(url, { label: "On This Day" });
  const raw: any[] = Array.isArray(json?.events) ? json.events : [];

  const events = raw
    .map((e) => ({
      year: Number(e?.year),
      text: String(e?.text ?? "").trim(),
      pages: Array.isArray(e?.pages)
        ? e.pages
            .map((p: any) => p?.normalizedtitle ?? p?.title)
            .filter((t: unknown): t is string => typeof t === "string")
        : [],
    }))
    .filter((e) => e.text && Number.isFinite(e.year));

  return events;
}

/**
 * Builds a real Wikipedia article URL from an exact article title. The titles
 * come straight from the On This Day feed, so these links are guaranteed valid
 * and can be cited verbatim — the AI never has to guess a URL.
 */
export function wikipediaUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

const STOPWORDS = new Set([
  "the", "of", "and", "in", "a", "an", "at", "on", "for", "to", "by", "is", "are",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Loose stem match, so "crash" matches "crashes" and "occupation" "occupy". */
function tokenAppears(token: string, haystack: string[]): boolean {
  return haystack.some(
    (h) =>
      h === token ||
      (token.length >= 4 && h.startsWith(token.slice(0, 4)) && Math.abs(h.length - token.length) <= 4)
  );
}

/** Nouns that mark an article about one occurrence rather than a whole theme. */
const OCCURRENCE_NOUNS =
  /\b(battle|siege|massacre|crash|bombing|attack|occupation|invasion|uprising|riot|coup|assassination|disaster|earthquake|eruption|treaty|accord|referendum|election|expedition|mission|launch|trial|raid|revolt|mutiny|fall|liberation|surrender|evacuation|sinking|explosion|shooting|rebellion|revolution|operation|collision|affair|campaign|offensive|escape|murder|execution|hanging|landing|crossing|capture|conquest|rescue|strike|protest|march|scandal|crisis|fire|flood)\b/i;
// "incident" is deliberately absent, though it is plainly an occurrence noun.
// Feed entries refer back to earlier incidents far more often than they report
// one ("…the second tragedy less than a month after Min Ping Yu No. 5540
// incident"), so in a *title* it points at background as often as at subject.
// `enrich.ts`'s IS_AN_EVENT still rewards it in an article's own description,
// where it describes what the article is rather than what the sentence mentions.

/**
 * Words that introduce background rather than subject: a topic mentioned just
 * after one of these is context for the event, not the event.
 */
const BACKGROUND_CUE =
  /\b(after|since|following|marking|amid|during|prior to|part of|start of|end of|beginning of)\b.{0,30}$/i;

/**
 * A title with no proper noun and no number names a concept, not an occurrence:
 * an entry about a massacre at a named camp links "Refugee camp", and one about
 * the Apollo 11 crew's homecoming links "Ticker-tape parade". Neither article
 * is about the day being reported.
 *
 * A one-word title is exempt. Every Wikipedia title is capitalised, so the
 * first word carries no information — and treating them as generic penalised
 * "Stasi" and "Adlertag", which are proper nouns and were the right answers.
 */
function isGenericConcept(title: string): boolean {
  if (/\d/.test(title)) return false;
  const words = title.split(/\s+/);
  if (words.length < 2) return false;
  return !words.slice(1).some((w) => /^[A-Z]/.test(w));
}

/**
 * Where in the sentence a title is mentioned, as a 0-1 ratio.
 *
 * Measured on the tokens unique to this candidate. Shared tokens are useless
 * here: "Min Ping Yu No. 5202" and "Min Ping Yu No. 5540 incident" both hit on
 * "min", so both looked early, and the second one — a prior incident the
 * sentence merely refers back to — scored as if it were the subject.
 *
 * The *median* position is used rather than the earliest. One token of a long
 * title routinely appears early by coincidence: "Japanese forces launch a
 * surprise attack … marking the start of the Russo-Japanese War" opens with a
 * word from the war's title, so by earliest-mention the war looked like the
 * subject and the attack looked like background — exactly backwards. A median
 * survives one stray early match and one stray late one.
 */
function firstMention(
  title: string,
  text: string,
  distinctive: string[]
): { ratio: number; background: boolean } {
  const probes = distinctive.length ? distinctive : tokens(title);
  const lower = text.toLowerCase();
  const positions = probes
    .map((token) => lower.indexOf(token))
    .filter((at) => at !== -1)
    .sort((a, b) => a - b);

  if (!positions.length) return { ratio: 1, background: false };
  const median = positions[Math.floor((positions.length - 1) / 2)];
  return {
    ratio: median / Math.max(lower.length, 1),
    background: BACKGROUND_CUE.test(lower.slice(0, median)),
  };
}

/**
 * Picks which linked article a feed entry is actually *about*.
 *
 * The feed lists pages in order of appearance in the sentence, so the first one
 * is frequently the background topic rather than the subject: "Cold War:
 * Construction of the Berlin Wall begins" links Cold War first. Enriching from
 * that page produced a card about the Cold War on the day the Wall went up.
 *
 * Four signals separate subject from background, and they are combined because
 * no one of them covers every sentence shape:
 *   - a topic named as a "Background:" prefix is context by construction;
 *   - a title carrying a year is about one occurrence, not a theme;
 *   - the subject is named early, the wider war or era late ("…, marking the
 *     start of the Russo-Japanese War");
 *   - a topic introduced by "after", "following" or "part of" is a reference
 *     to something else, not the thing being reported.
 */
export interface ScoredPage {
  title: string;
  score: number;
  index: number;
}

/**
 * Scores every linked page for how likely it is to be the entry's subject,
 * using only the sentence itself. `enrichEvents` refines these scores with each
 * article's own short description, which is what finally separates a city from
 * the occupation of that city; this function is what the prompt's citation
 * links use, and the fallback when the network is unavailable.
 */
export function rankPages(event: OnThisDayEvent): ScoredPage[] {
  const prefix = event.text.match(/^([^:]{3,60}):\s/)?.[1]?.trim().toLowerCase();
  const textTokens = tokens(event.text);
  const allTitleTokens = event.pages.map(tokens);

  return event.pages
    .map((title, index) => {
      const titleTokens = allTitleTokens[index];
      const distinctive = titleTokens.filter(
        (t) => !allTitleTokens.some((other, i) => i !== index && other.includes(t))
      );
      let score = 0;

      if (prefix && title.toLowerCase() === prefix) score -= 10;
      if (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(title)) score += 3;
      if (OCCURRENCE_NOUNS.test(title)) score += 1.5;
      if (isGenericConcept(title)) score -= 4;

      const overlap = titleTokens.length
        ? titleTokens.filter((t) => tokenAppears(t, textTokens)).length / titleTokens.length
        : 0;
      score += overlap * 2;

      // Specific subjects are usually named in more words than broad ones.
      score += Math.min(titleTokens.length, 6) * 0.3;

      const { ratio, background } = firstMention(title, event.text, distinctive);
      score -= ratio * 2;
      if (background) score -= 4;

      return { title, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

/** The best subject page by sentence signals alone. */
export function bestPageTitle(event: OnThisDayEvent): string | null {
  if (!event.pages.length) return null;
  if (event.pages.length === 1) return event.pages[0];
  return rankPages(event)[0].title;
}

/** Formats the verified events as a compact numbered list for the prompt. */
export function formatEventsForPrompt(events: OnThisDayEvent[]): string {
  return events
    .map((e, i) => {
      const topics = e.pages.length ? ` [topics: ${e.pages.slice(0, 4).join(", ")}]` : "";
      // Hand the AI a verified Wikipedia link it can cite as-is.
      const best = bestPageTitle(e);
      const wiki = best ? ` [wikipedia: ${wikipediaUrl(best)}]` : "";
      return `${i + 1}. (${e.year}) ${e.text}${topics}${wiki}`;
    })
    .join("\n");
}
