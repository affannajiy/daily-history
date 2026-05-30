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
  southeastAsia: HistorySection;
  malaysia: HistorySection;
}

/** Which AI provider produced the digest (surfaced in the email footer). */
export type Provider = "Gemini" | "Groq";

export interface HistoryResult {
  data: HistoryData;
  provider: Provider;
}
