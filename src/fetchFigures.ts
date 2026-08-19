/**
 * Fallback source for a region with no verified event on the calendar day.
 * Most days have no Malaysian event, and an empty card that says "nothing
 * happened" is the weakest thing the email can show. Instead we fall back to a
 * person genuinely born or died on this day, drawn from the same Wikimedia
 * feed — so the card stays anchored to the date exactly like an event card is.
 *
 * Which person is chosen is decided by code, not by the model. Asking a model
 * to pick "someone notable" is an invitation to name whoever it remembers;
 * ranking by article size and interwiki coverage is a measurable proxy for
 * encyclopaedic significance that Gandhi clears and a squad-list footballer
 * does not.
 */

import { OnThisDayEvent } from "./fetchOnThisDay";
import { getJsonOrNull } from "./http";

/** Below this, the article is a stub and there is nothing to write from. */
const MIN_ARTICLE_BYTES = 4000;
/** Interwiki counts are fetched per title, so only the shortlist pays for them. */
const LANGLINK_SHORTLIST = 6;

export type FigureKind = "births" | "deaths";

export interface FigureCandidate extends OnThisDayEvent {
  /** Whether the feed listed this person as born or died on this day. */
  anchorKind: FigureKind;
}

/**
 * Every request in this file goes through `http.ts` like every other outbound
 * call in the project. This used to be a private `fetch` with its own timeout,
 * its own copy of the user agent and no retry at all — so a single blip on the
 * figures endpoint silently cost the whole figure card, on a job that gets one
 * attempt a day.
 */
async function getJson(url: string): Promise<any | null> {
  return getJsonOrNull(url, { label: "Figures" });
}

/** Pulls the verified births or deaths list for the calendar day. */
export async function fetchFigures(
  kind: FigureKind,
  month: number,
  day: number
): Promise<FigureCandidate[]> {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const json = await getJson(
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/${kind}/${mm}/${dd}`
  );
  const raw: any[] = Array.isArray(json?.[kind]) ? json[kind] : [];

  return raw
    .map((e) => ({
      year: Number(e?.year),
      text: String(e?.text ?? "").trim(),
      pages: Array.isArray(e?.pages)
        ? e.pages
            .map((p: any) => p?.normalizedtitle ?? p?.title)
            .filter((t: unknown): t is string => typeof t === "string")
        : [],
      anchorKind: kind,
    }))
    .filter((e) => e.text && Number.isFinite(e.year) && e.pages.length);
}

/** Article sizes in bytes, batched — the API takes up to 50 titles per call. */
async function fetchArticleSizes(titles: string[]): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  for (let i = 0; i < titles.length; i += 50) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "info",
      redirects: "1",
      titles: titles.slice(i, i + 50).join("|"),
    });
    const json = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
    for (const page of json?.query?.pages ?? []) {
      if (typeof page?.title === "string" && typeof page?.length === "number") {
        sizes.set(page.title, page.length);
      }
    }
    // Redirected titles come back under their target, so map both ways.
    for (const r of json?.query?.redirects ?? []) {
      const target = sizes.get(r?.to);
      if (typeof target === "number" && typeof r?.from === "string") {
        sizes.set(r.from, target);
      }
    }
  }
  return sizes;
}

/** How many language editions carry this article — a strong notability signal. */
async function fetchLanglinkCount(title: string): Promise<number> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "langlinks",
    lllimit: "max",
    redirects: "1",
    titles: title,
  });
  const json = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const links = json?.query?.pages?.[0]?.langlinks;
  return Array.isArray(links) ? links.length : 0;
}

/**
 * Ranks candidates by article size, then rescores the shortlist with interwiki
 * counts. Size alone already separates a biography from a stub; interwiki
 * coverage is what separates a nationally known figure from a globally known one.
 */
export async function rankFigures(
  candidates: FigureCandidate[]
): Promise<FigureCandidate[]> {
  if (!candidates.length) return [];

  const titles = candidates.map((c) => c.pages[0]);
  const sizes = await fetchArticleSizes(titles);

  const bySize = candidates
    .map((c) => ({ candidate: c, bytes: sizes.get(c.pages[0]) ?? 0 }))
    .filter((s) => s.bytes >= MIN_ARTICLE_BYTES)
    .sort((a, b) => b.bytes - a.bytes);

  if (!bySize.length) return [];

  const shortlist = bySize.slice(0, LANGLINK_SHORTLIST);
  const langlinks = await Promise.all(
    shortlist.map((s) => fetchLanglinkCount(s.candidate.pages[0]))
  );

  return shortlist
    .map((s, i) => ({
      candidate: s.candidate,
      // Both terms are unbounded, so normalise size into the same rough range
      // as an interwiki count before adding them.
      score: s.bytes / 1000 + langlinks[i],
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.candidate);
}

/**
 * Finds the best figure for a region on this day: someone born or died today
 * whose article matches the region filter. Returns null when nobody qualifies —
 * the empty-state card is still the correct output in that case.
 */
export async function findRegionalFigure(
  month: number,
  day: number,
  matchesRegion: (e: OnThisDayEvent) => boolean
): Promise<FigureCandidate | null> {
  const [births, deaths] = await Promise.all([
    fetchFigures("births", month, day),
    fetchFigures("deaths", month, day),
  ]);

  const regional = [...births, ...deaths].filter(matchesRegion);
  if (!regional.length) return null;

  const ranked = await rankFigures(regional);
  return ranked[0] ?? null;
}
