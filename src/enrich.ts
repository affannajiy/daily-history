/**
 * Turns a one-line "On This Day" entry into enough verified material to write
 * from. The feed gives a single sentence per event; asking a model for four
 * paragraphs from one sentence is what produced interchangeable filler prose
 * ("significant", "far-reaching", "a testament to human ingenuity"). Here we
 * fetch the actual Wikipedia article text and Wikidata's structured facts for
 * the events the model picked, so the writing pass has concrete detail —
 * dates, names, quantities — to work from.
 *
 * Nothing here involves the model. Enrichment is deterministic, keyed off the
 * exact article titles the feed already gave us, so it cannot drift off-topic.
 * Every network call degrades to empty rather than throwing: a thin card still
 * ships, a missing digest does not.
 */

import { OnThisDayEvent, rankPages, wikipediaUrl } from "./fetchOnThisDay";
import { getJsonOrNull } from "./http";
import { CardImage } from "./types";

/** Plenty for the model to write from without blowing the free-tier context. */
const MAX_EXTRACT_CHARS = 6000;
/**
 * A second-language article is a supplement, not a replacement, so it gets a
 * smaller share of the prompt than the English one.
 */
const MAX_LOCAL_EXTRACT_CHARS = 2000;

export interface WikidataFact {
  label: string;
  value: string;
}

/** A local-language article on the same subject, used to thicken thin days. */
export interface LocalSource {
  /** Language code, e.g. "ms". */
  lang: string;
  title: string;
  extract: string;
  url: string;
}

export interface EnrichedEvent {
  event: OnThisDayEvent;
  /** Exact article title the extract came from. */
  title: string;
  /** Plain-text article body, truncated at a paragraph boundary. */
  extract: string;
  /** Wikidata's one-line descriptor, e.g. "1786 British settlement". */
  description: string;
  /** Canonical article URL — always real, always safe to cite. */
  url: string;
  facts: WikidataFact[];
  /** Official-website links from Wikidata (P856), safe to cite. */
  officialUrls: Reference[];
  /** Lead image, only when it is freely licensed. Null far more often than not. */
  image: CardImage | null;
  /** Same subject in a regional language, when one exists. */
  localSources: LocalSource[];
}

interface Reference {
  title: string;
  url: string;
}

/** Enrichment never fails the digest: every call here degrades to null. */
async function getJson(url: string): Promise<any | null> {
  return getJsonOrNull(url, { label: "Enrichment" });
}

/** Truncates at the last paragraph break before the cap, so text never cuts mid-sentence. */
function trimExtract(text: string): string {
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= MAX_EXTRACT_CHARS) return clean;
  const slice = clean.slice(0, MAX_EXTRACT_CHARS);
  const lastBreak = slice.lastIndexOf("\n\n");
  return (lastBreak > 1000 ? slice.slice(0, lastBreak) : slice).trim();
}

interface PageResult {
  title: string;
  extract: string;
  description: string;
  url: string;
  wikibaseItem?: string;
  /** Thumbnail URL from pageimages, before any licence check. */
  thumbnail?: string;
  /** The "File:…" name behind that thumbnail, which is what carries the licence. */
  imageFile?: string;
}

/**
 * Fetches one article's plain-text body. TextExtracts caps whole-page extracts
 * at one title per request, so these are issued in parallel rather than batched.
 */
async function fetchPage(title: string): Promise<PageResult | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "extracts|pageprops|info|description|pageimages",
    inprop: "url",
    explaintext: "1",
    exsectionformat: "plain",
    piprop: "thumbnail|name",
    pithumbsize: "1200",
    redirects: "1",
    titles: title,
  });
  const json = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const page = json?.query?.pages?.[0];
  if (!page || page.missing || typeof page.extract !== "string") return null;

  return {
    title: page.title ?? title,
    extract: trimExtract(page.extract),
    description: typeof page.description === "string" ? page.description : "",
    url: typeof page.fullurl === "string" ? page.fullurl : wikipediaUrl(title),
    wikibaseItem: page.pageprops?.wikibase_item,
    thumbnail: page.thumbnail?.source,
    imageFile: typeof page.pageimage === "string" ? page.pageimage : undefined,
  };
}

// ---------------------------------------------------------------------------
// Lead image
// ---------------------------------------------------------------------------

/**
 * Only these licences may be reproduced in an email we send out. Wikipedia
 * articles routinely carry non-free "fair use" lead images — a logo, a film
 * poster, a copyrighted news photograph — and fair use does not travel to a
 * newsletter. Anything whose licence we cannot positively identify as free is
 * dropped, because the failure mode of guessing wrong is a legal one and the
 * failure mode of dropping is a card without a picture.
 */
const FREE_LICENCES = /^(pd|cc0|cc-by(-sa)?(-\d(\.\d)?)?([a-z-]*)?)$/i;
const PUBLIC_DOMAIN_HINT = /public domain|^pd|cc0/i;

/** extmetadata values arrive as HTML fragments; the email needs plain text. */
function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a page's lead image to something we are allowed to send, with the
 * attribution its licence requires. Returns null on any doubt.
 */
async function fetchImage(page: PageResult): Promise<CardImage | null> {
  if (!page.thumbnail || !page.imageFile) return null;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "extmetadata|url",
    iiextmetadatafilter: "License|LicenseShortName|Artist|Credit|ImageDescription",
    titles: `File:${page.imageFile}`,
  });
  const json = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const info = json?.query?.pages?.[0]?.imageinfo?.[0];
  const meta = info?.extmetadata;
  if (!meta) return null;

  const licenceCode = String(meta.License?.value ?? "").trim();
  const licenceName = stripHtml(meta.LicenseShortName?.value) || licenceCode;
  const free =
    FREE_LICENCES.test(licenceCode) || PUBLIC_DOMAIN_HINT.test(licenceName);
  if (!free) {
    console.warn(`Lead image skipped — licence "${licenceName || "unknown"}".`);
    return null;
  }

  const artist = stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value);
  const description = stripHtml(meta.ImageDescription?.value);

  return {
    url: page.thumbnail,
    // Alt text describes the picture; the caption credits it. They are not the
    // same string — a screen reader announcing a licence name is useless.
    alt: description.slice(0, 180) || `Illustration for ${page.title}`,
    credit: artist ? `${artist} — ${licenceName}` : licenceName,
    sourceUrl:
      typeof info.descriptionurl === "string" ? info.descriptionurl : page.url,
  };
}

// ---------------------------------------------------------------------------
// Local-language sources
// ---------------------------------------------------------------------------

/**
 * English Wikipedia is thin on Malaysian and wider Southeast Asian subjects —
 * that thinness is exactly why the regional cards were the weakest in the
 * email. The same subject on ms.wikipedia or id.wikipedia often carries detail
 * the English article never had.
 *
 * These are reached through Wikidata sitelinks rather than by translating a
 * title, so they are the *same subject* by construction and cannot drift.
 */
async function fetchLocalExtract(
  lang: string,
  title: string
): Promise<LocalSource | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "extracts|info",
    inprop: "url",
    explaintext: "1",
    exsectionformat: "plain",
    redirects: "1",
    titles: title,
  });
  const json = await getJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  const page = json?.query?.pages?.[0];
  if (!page || page.missing || typeof page.extract !== "string") return null;

  const extract = page.extract.trim().slice(0, MAX_LOCAL_EXTRACT_CHARS);
  // A stub adds nothing but noise to the prompt.
  if (extract.length < 400) return null;

  return {
    lang,
    title: page.title ?? title,
    extract,
    url:
      typeof page.fullurl === "string"
        ? page.fullurl
        : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

/**
 * A day's entry is never *about* a settlement, a model of aircraft, or the
 * institution that carried the action out. The organisation terms were added
 * after the ranking test showed the same failure repeatedly: the regiment beat
 * the affair, the air force beat the air operation, the railway beat the
 * collision. An event is performed by an institution; it is not that institution.
 *
 * Note what is deliberately absent — most person words. A person genuinely is
 * the subject often enough ("Alexandros Panagoulis attempts to assassinate…")
 * that penalising them costs more than it gains.
 */
const NOT_AN_EVENT =
  /\b(city|town|village|municipality|settlement|capital|country|province|state|county|district|island|river|mountain|airport|region|territory|politician|actor|singer|footballer|player|writer|author|painter|physicist|family name|given name|aircraft|airliner|jet|automobile|ship class|company|band|album|film|genus|species|regiment|corps|air force|navy|army|railway|rail service|agency|political party|trail|highway|university|college|overview of|aspect of|list of)\b/i;

/** Descriptions that mark an article about one occurrence. */
const IS_AN_EVENT =
  /\b(battle|war|attack|massacre|bombing|occupation|invasion|incident|crash|disaster|treaty|revolution|uprising|coup|siege|riot|protest|election|referendum|expedition|mission|accident|explosion|earthquake|eruption|assassination|shooting|hijacking|epidemic|famine)\b/i;

/**
 * A span of years describes a period, not something that happened on a day:
 * "1904–1905 conflict" is the war, "1904 naval battle" is the event we want.
 */
const YEAR_RANGE = /\b(1[0-9]{3}|20[0-9]{2})\s*[–—-]\s*(1[0-9]{3}|20[0-9]{2})\b/;

/** The light REST summary, used only to screen candidate pages. */
async function fetchDescription(title: string): Promise<string | null> {
  const json = await getJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`
  );
  if (!json) return null;
  return [json.description, json.extract].filter((s) => typeof s === "string").join(" ");
}

/**
 * Chooses the article a feed entry is about, refining the sentence-only ranking
 * with what each candidate article says it is. This is the step that stops the
 * digest writing about the Russo-Japanese War on the day of the attack that
 * started it, or about the city of Gori on the day it was occupied.
 */
/**
 * How many candidates get a description lookup. Widened from four after the
 * ranking test showed the right answer sitting fifth on entries that link a
 * long chain of context first — "1993 Tehran mid-air collision" trails four
 * aircraft types and air forces, and "Hinton train collision" trails the two
 * railways involved.
 */
const DESCRIPTION_SHORTLIST = 6;

export async function pickSubject(event: OnThisDayEvent): Promise<string | null> {
  if (!event.pages.length) return null;
  if (event.pages.length === 1) return event.pages[0];

  const ranked = rankPages(event).slice(0, DESCRIPTION_SHORTLIST);
  const descriptions = await Promise.all(
    ranked.map((r) => fetchDescription(r.title))
  );

  const rescored = ranked.map((r, i) => {
    const description = descriptions[i];
    let score = r.score;
    if (description) {
      if (NOT_AN_EVENT.test(description)) score -= 5;
      if (IS_AN_EVENT.test(description)) score += 2;
      if (YEAR_RANGE.test(description)) score -= 3;
      if (description.includes(String(event.year))) score += 2;
    }
    return { title: r.title, score, index: r.index };
  });

  rescored.sort((a, b) => b.score - a.score || a.index - b.index);
  return rescored[0].title;
}

/**
 * Reads a small, deliberately restricted set of Wikidata claims: only
 * properties whose value is a bare count, a date, or a URL. Anything whose
 * value is itself an entity would need a second call to resolve its label,
 * and a QID rendered raw is worse than no fact at all.
 */
const COUNT_PROPS: Record<string, string> = {
  P1120: "Deaths",
  P1339: "Injured",
  P1590: "Casualties",
  P1082: "Population",
};

const TIME_PROPS: Record<string, string> = {
  P585: "Date",
  P580: "Start",
  P582: "End",
};

function formatWikidataTime(value: any): string | null {
  const raw: unknown = value?.time;
  if (typeof raw !== "string") return null;
  // Wikidata times look like "+1786-08-11T00:00:00Z"; precision 11 = day.
  const m = raw.match(/^([+-])(\d{4,})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, sign, year, month, day] = m;
  const era = sign === "-" ? " BC" : "";
  const precision: number = typeof value?.precision === "number" ? value.precision : 11;
  if (precision <= 9) return `${Number(year)}${era}`;
  if (precision === 10) return `${year}-${month}${era}`;
  return `${year}-${month}-${day}${era}`;
}

interface WikidataResult {
  facts: WikidataFact[];
  officialUrls: Reference[];
  /** Article titles for the same subject in other languages, keyed by lang code. */
  sitelinks: Record<string, string>;
}

async function fetchWikidata(
  qids: string[]
): Promise<Map<string, WikidataResult>> {
  const out = new Map<string, WikidataResult>();
  if (!qids.length) return out;

  const params = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    formatversion: "2",
    // Sitelinks come back in the same call that already fetches claims, so the
    // local-language lookup costs no extra round trip to Wikidata.
    props: "claims|sitelinks",
    ids: qids.join("|"),
  });
  const json = await getJson(`https://www.wikidata.org/w/api.php?${params}`);
  const entities = json?.entities;
  if (!entities) return out;

  for (const qid of qids) {
    const entity = entities[qid];
    const claims = entity?.claims;
    if (!claims) continue;

    const facts: WikidataFact[] = [];
    const officialUrls: Reference[] = [];
    const sitelinks: Record<string, string> = {};

    for (const [site, link] of Object.entries<any>(entity?.sitelinks ?? {})) {
      const lang = site.match(/^([a-z]{2,3})wiki$/)?.[1];
      if (lang && typeof link?.title === "string") sitelinks[lang] = link.title;
    }

    for (const [prop, label] of Object.entries(COUNT_PROPS)) {
      const amount: unknown = claims[prop]?.[0]?.mainsnak?.datavalue?.value?.amount;
      if (typeof amount === "string") {
        facts.push({ label, value: amount.replace(/^\+/, "") });
      }
    }

    for (const [prop, label] of Object.entries(TIME_PROPS)) {
      const when = formatWikidataTime(
        claims[prop]?.[0]?.mainsnak?.datavalue?.value
      );
      if (when) facts.push({ label, value: when });
    }

    for (const claim of claims.P856 ?? []) {
      const url: unknown = claim?.mainsnak?.datavalue?.value;
      if (typeof url === "string" && /^https?:\/\//.test(url)) {
        officialUrls.push({ title: "Official website", url });
      }
    }

    out.set(qid, { facts, officialUrls: officialUrls.slice(0, 1), sitelinks });
  }

  return out;
}

/**
 * Enriches the handful of events the selection pass chose. Events whose
 * article could not be fetched are still returned, carrying only the feed's
 * own sentence — the writing pass then produces a short, honest card instead
 * of a padded one.
 */
export interface EnrichOptions {
  /**
   * Extra language editions to look for, per event, by index. Used for the
   * regional slots — see `fetchLocalExtract`.
   */
  localLangs?: string[][];
  /** Whether this slot may carry a lead image. Only the lead card asks for one. */
  wantImage?: boolean[];
  /**
   * Marks a slot as a biography. Subject selection is then skipped entirely:
   * for a births/deaths entry the person's own article is `pages[0]` by
   * construction, and running the event scoring over it is actively wrong —
   * `NOT_AN_EVENT` would penalise the biography for being about a person.
   */
  isFigure?: boolean[];
}

export async function enrichEvents(
  events: OnThisDayEvent[],
  options: EnrichOptions = {}
): Promise<EnrichedEvent[]> {
  // Enrich from the article the entry is *about*, not the first one it links.
  const subjects = await Promise.all(
    events.map((event, i) =>
      options.isFigure?.[i]
        ? Promise.resolve(event.pages[0] ?? null)
        : pickSubject(event)
    )
  );
  const pages = await Promise.all(
    subjects.map((title) => (title ? fetchPage(title) : Promise.resolve(null)))
  );

  const qids = pages
    .map((p) => p?.wikibaseItem)
    .filter((q): q is string => typeof q === "string");
  const wikidata = await fetchWikidata(qids);

  // Images and local articles are independent of each other and of the pages
  // already in hand, so they all go out at once rather than in sequence.
  const [images, localSources] = await Promise.all([
    Promise.all(
      pages.map((page, i) =>
        page && options.wantImage?.[i] ? fetchImage(page) : Promise.resolve(null)
      )
    ),
    Promise.all(
      pages.map((page, i) => {
        const langs = options.localLangs?.[i] ?? [];
        const wd = page?.wikibaseItem ? wikidata.get(page.wikibaseItem) : undefined;
        if (!langs.length || !wd) return Promise.resolve([]);
        return Promise.all(
          langs
            .map((lang) => ({ lang, title: wd.sitelinks[lang] }))
            .filter((s): s is { lang: string; title: string } => Boolean(s.title))
            .map((s) => fetchLocalExtract(s.lang, s.title))
        ).then((results) => results.filter((r): r is LocalSource => Boolean(r)));
      })
    ),
  ]);

  return events.map((event, i) => {
    const page = pages[i];
    const subject = subjects[i];
    const title = page?.title ?? subject ?? event.text.slice(0, 60);
    const wd = page?.wikibaseItem ? wikidata.get(page.wikibaseItem) : undefined;
    return {
      event,
      title,
      extract: page?.extract ?? "",
      description: page?.description ?? "",
      url: page?.url ?? (subject ? wikipediaUrl(subject) : ""),
      facts: wd?.facts ?? [],
      officialUrls: wd?.officialUrls ?? [],
      image: images[i],
      localSources: localSources[i],
    };
  });
}

/** Renders one enriched event as the source block handed to the writing pass. */
export function formatEnrichedForPrompt(e: EnrichedEvent): string {
  const parts = [
    `WRITE ABOUT THIS EVENT (verified): (${e.event.year}) ${e.event.text}`,
    `SOURCE ARTICLE: ${e.title}${e.description ? ` — ${e.description}` : ""}`,
    `VERIFIED LINK: ${e.url}`,
  ];
  if (e.facts.length) {
    parts.push(
      `STRUCTURED FACTS (Wikidata): ${e.facts
        .map((f) => `${f.label}: ${f.value}`)
        .join("; ")}`
    );
  }
  parts.push(
    e.extract
      ? `ARTICLE TEXT (the ONLY source for detail below — it may cover a broader subject than the event, so use only the parts that bear on the event named above):\n${e.extract}`
      : `ARTICLE TEXT: unavailable. Write only what the one-line event above supports. Keep the card short. Do not add detail from memory.`
  );

  // Offered as an additional source, and labelled as such, so the model treats
  // it as material to draw on rather than as text to translate.
  for (const local of e.localSources) {
    parts.push(
      `ADDITIONAL SOURCE — ${local.lang.toUpperCase()} WIKIPEDIA ("${local.title}"). This is the same subject in another language and often carries local detail the English article lacks. You may use facts from it. Write your output in English:\n${local.extract}`
    );
  }

  return parts.join("\n");
}
