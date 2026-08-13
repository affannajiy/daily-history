/**
 * The subject line and the preheader — the only two pieces of this email most
 * people will ever see.
 *
 * Every edition used to arrive as "History Today — August 13", which is the
 * date the reader already knows next to a name they already subscribed to. It
 * said nothing about whether today's edition was worth opening, so all the work
 * inside the cards was invisible until after the decision to open had been made.
 *
 * Both strings are built in code from the lead card. The model never writes
 * them: a subject line is a promise about the contents, and it must be made by
 * whatever actually knows the contents.
 */

import { HistoryData } from "./types";

/**
 * Gmail shows roughly 70 characters on desktop and fewer on a phone. Anything
 * past this is not shortened, it is simply not read.
 */
const MAX_SUBJECT = 68;
/** The inbox preview pane, which is generous but not unlimited. */
const MAX_PREHEADER = 140;

/** Truncates on a word boundary, never mid-word. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * "Aug 13 · Construction of the Berlin Wall begins"
 *
 * The date stays because this is a dated daily and the reader scanning a
 * thread wants to know which day they are looking at — but it is abbreviated
 * to buy characters for the headline, which is the part that earns the open.
 */
export function buildSubject(
  data: HistoryData,
  shortDate: string,
  year: string = data.global.year
): string {
  const headline = data.global.title.trim();
  if (!headline) return `History Today · ${shortDate}`;

  // The year is what makes a bare headline legible as history rather than news:
  // "Japan invades Singapore" alone reads like a bulletin.
  const yearSuffix = year && !headline.includes(year) ? ` (${year})` : "";
  return clamp(`${shortDate} · ${headline}${yearSuffix}`, MAX_SUBJECT);
}

/**
 * The grey text the inbox shows after the subject. Without one, clients fall
 * back to whatever text appears first in the HTML — here, the masthead — so
 * every edition previewed as "HISTORYTODAY August 13, 2026".
 *
 * The standfirst is the natural fit: it exists to say what the subject line
 * could not. When a day has none, the regional headlines at least tell the
 * reader what else is inside.
 */
export function buildPreheader(data: HistoryData): string {
  const standfirst = data.global.standfirst?.trim();
  if (standfirst) return clamp(standfirst, MAX_PREHEADER);

  const others = [data.southeastAsia, data.malaysia]
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => c.title.trim())
    .filter(Boolean);

  return others.length
    ? clamp(`Also today: ${others.join(" · ")}`, MAX_PREHEADER)
    : clamp(data.global.title, MAX_PREHEADER);
}
