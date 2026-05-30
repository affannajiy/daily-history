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

export interface OnThisDayEvent {
  year: number;
  text: string;
  /** Linked article titles, used as topic hints for the AI. */
  pages: string[];
}

const UA =
  "daily-history/1.0 (https://github.com/affannajiy/daily-history; affannajiy@gmail.com)";

export async function fetchOnThisDay(
  month: number,
  day: number
): Promise<OnThisDayEvent[]> {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`On This Day HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as any;
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

/** Formats the verified events as a compact numbered list for the prompt. */
export function formatEventsForPrompt(events: OnThisDayEvent[]): string {
  return events
    .map((e, i) => {
      const topics = e.pages.length ? ` [topics: ${e.pages.slice(0, 4).join(", ")}]` : "";
      // Hand the AI a verified Wikipedia link it can cite as-is.
      const wiki = e.pages.length ? ` [wikipedia: ${wikipediaUrl(e.pages[0])}]` : "";
      return `${i + 1}. (${e.year}) ${e.text}${topics}${wiki}`;
    })
    .join("\n");
}
