export interface KeyFigure {
  name: string;
  role: string;
  significance: string;
}

export interface Reference {
  title: string;
  url?: string;
}

/** One label/value cell of the fact strip (Who / What / Where / When). */
export interface Fact {
  label: string;
  value: string;
}

/** One dated beat of a timeline. `when` must carry a real date or year. */
export interface TimelineBeat {
  when: string;
  what: string;
}

/** A hard figure for the "By the numbers" strip. */
export interface FactStat {
  value: string;
  label: string;
}

/**
 * A lead image, only ever built in code from a verified free-licence file.
 * `credit` is not optional: every licence this project accepts either requires
 * attribution or is harmless to attribute anyway, so the renderer never has to
 * decide whether to show it.
 */
export interface CardImage {
  url: string;
  /** What the picture shows. Never the licence — that is what `credit` is for. */
  alt: string;
  credit: string;
  /** The file's description page, so the credit can be checked. */
  sourceUrl: string;
}

/**
 * The two card shapes are a discriminated union rather than one type with
 * everything optional: the renderer switches on `kind` once instead of
 * guarding every field, and neither shape can be built half-populated.
 */
export interface EventCard {
  kind: "event";
  title: string;
  /** Exact year from the verified feed. Never derived, never rounded. */
  year: string;
  location: string;
  /** One-sentence hook under the headline. */
  standfirst: string;
  facts: Fact[];
  whatHappened: string;
  timeline: TimelineBeat[];
  numbers: FactStat[];
  keyFigures: KeyFigure[];
  whatChangedAfter: string;
  references: Reference[];
  /** Null whenever no freely-licensed lead image could be verified. */
  image: CardImage | null;
}

/**
 * Used when a region has no verified event for the day. The person is still
 * sourced from the same day's verified births/deaths feed, so the card is
 * anchored to this calendar day exactly like an event card is.
 */
export interface FigureCard {
  kind: "figure";
  title: string;
  /** Lifespan, e.g. "1869–1948". */
  year: string;
  location: string;
  standfirst: string;
  facts: Fact[];
  whatTheyDid: string;
  timeline: TimelineBeat[];
  numbers: FactStat[];
  legacy: string;
  references: Reference[];
  image: CardImage | null;
  /** Why this person appears today: "Born on this day, 1869". */
  anchor: string;
}

export type Card = EventCard | FigureCard;

/** The three section headings, fixed so the renderer and the source list agree. */
export type HistorySectionLabel =
  | "Global Headline"
  | "Southeast Asia"
  | "Tanah Melayu / Malaysia";

export interface HistoryData {
  /** The global slot always has a verified event — the feed is never empty. */
  global: EventCard;
  // Null only when the region has neither a verified event nor a verified
  // figure for the day. We never fabricate one to fill the slot.
  southeastAsia: Card | null;
  malaysia: Card | null;
}

/** Which AI provider produced the digest. Logged, not rendered. */
export type Provider = "Gemini" | "Groq";

export interface HistoryResult {
  data: HistoryData;
  provider: Provider;
  /** Feed-entry keys featured today, recorded so they are not repeated. */
  featuredKeys: string[];
}
