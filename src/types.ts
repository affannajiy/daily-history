export interface KeyFigure {
  name: string;
  role: string;
  significance: string;
}

export interface Reference {
  title: string;
  url?: string;
}

export interface HistorySection {
  title: string;
  year: string;
  location: string;
  synopsis: string;
  keyFigures: KeyFigure[];
  impact: string;
  references: Reference[];
}

export interface HistoryData {
  global: HistorySection;
  // Null when the day's verified event list contains no genuine regional event.
  // We never fabricate one to fill the slot.
  southeastAsia: HistorySection | null;
  malaysia: HistorySection | null;
}

/** Which AI provider produced the digest (surfaced in the email footer). */
export type Provider = "Gemini" | "Groq";

export interface HistoryResult {
  data: HistoryData;
  provider: Provider;
}
