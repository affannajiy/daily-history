/**
 * The plain-text half of the email.
 *
 * A message sent as HTML alone is a spam signal — legitimate senders send
 * `multipart/alternative`, and bulk senders often do not. It also matters to
 * anyone reading on a watch, through a screen reader, or in a client with
 * remote content switched off, all of which prefer the text part when it exists.
 *
 * This is generated from the same `HistoryData` as the HTML, so the two cannot
 * drift: a block dropped by a guard upstream is absent from both.
 */

import { Card, HistoryData, Reference, TimelineBeat } from "./types";

/** Plain-text convention: wrap at 72 so quoting and indenting still fit 80. */
const WRAP = 72;

function wrap(text: string, indent = ""): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = indent;

  for (const word of words) {
    if (line.length + word.length + 1 > WRAP && line.trim()) {
      lines.push(line.trimEnd());
      line = indent;
    }
    line += (line === indent ? "" : " ") + word;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.join("\n");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => wrap(p))
    .join("\n\n");
}

function rule(char: string, width = WRAP): string {
  return char.repeat(width);
}

function heading(label: string): string {
  return `${label.toUpperCase()}\n${rule("=", Math.max(label.length, 12))}`;
}

const DATE_COLUMN = 14;

function timeline(beats: TimelineBeat[]): string {
  if (!beats.length) return "";
  const indent = " ".repeat(DATE_COLUMN);
  const rows = beats
    .map((b) => {
      // The date column is built after wrapping, not before: `wrap` normalises
      // runs of whitespace, so padding the date first collapses the column.
      const body = wrap(b.what, indent).slice(DATE_COLUMN);
      const when =
        b.when.length >= DATE_COLUMN
          ? `${b.when}\n${indent}`
          : b.when.padEnd(DATE_COLUMN);
      return `${when}${body}`;
    })
    .join("\n");
  return `\nTIMELINE\n${rows}\n`;
}

function references(refs: Reference[]): string {
  if (!refs.length) return "";
  const items = refs
    .map((r) => (r.url ? `  - ${r.title}\n    ${r.url}` : `  - ${r.title}`))
    .join("\n");
  return `\nSOURCES\n${items}\n`;
}

function renderCard(label: string, card: Card): string {
  const body = card.kind === "event" ? card.whatHappened : card.whatTheyDid;
  const tail = card.kind === "event" ? card.whatChangedAfter : card.legacy;
  const bodyLabel = card.kind === "event" ? "WHAT HAPPENED" : "WHAT THEY DID";
  const tailLabel =
    card.kind === "event" ? "WHAT CHANGED AFTER" : "WHAT STILL STANDS";

  const parts: string[] = [heading(label), ""];

  const meta = [card.year, card.location].filter(Boolean).join(" · ");
  if (meta) parts.push(meta);
  parts.push(wrap(card.title), "");

  if (card.kind === "figure" && card.anchor) parts.push(card.anchor, "");
  if (card.standfirst) parts.push(paragraphs(card.standfirst), "");

  for (const fact of card.facts) {
    parts.push(wrap(`${fact.label}: ${fact.value}`, ""));
  }
  if (card.facts.length) parts.push("");

  parts.push(bodyLabel, paragraphs(body));

  const beats = timeline(card.timeline);
  if (beats) parts.push(beats);

  if (card.numbers.length) {
    parts.push(
      "\nBY THE NUMBERS",
      card.numbers.map((n) => `  ${n.value} — ${n.label}`).join("\n")
    );
  }

  if (card.kind === "event" && card.keyFigures.length) {
    parts.push(
      "\nKEY FIGURES",
      card.keyFigures
        .map((f) =>
          wrap(
            `${f.name}${f.role ? ` (${f.role})` : ""}${f.significance ? `. ${f.significance}` : ""}`,
            "  "
          )
        )
        .join("\n")
    );
  }

  if (tail) parts.push(`\n${tailLabel}`, paragraphs(tail));

  const refs = references(card.references);
  if (refs) parts.push(refs);

  return parts.join("\n");
}

function emptyCard(label: string): string {
  return [
    heading(label),
    "",
    wrap(
      "No event or figure for this region is recorded on this day in Wikimedia's verified archive. Nothing has been written to fill the space."
    ),
  ].join("\n");
}

export function buildEmailText(
  data: HistoryData,
  dateLabel: string,
  browserUrl?: string
): string {
  const sections = [
    `HISTORY TODAY`,
    dateLabel,
    browserUrl ? `\nRead in your browser: ${browserUrl}` : "",
    rule("="),
    "",
    renderCard("Global Headline", data.global),
    "",
    rule("-"),
    "",
    data.southeastAsia
      ? renderCard("Southeast Asia", data.southeastAsia)
      : emptyCard("Southeast Asia"),
    "",
    rule("-"),
    "",
    data.malaysia
      ? renderCard("Tanah Melayu / Malaysia", data.malaysia)
      : emptyCard("Tanah Melayu / Malaysia"),
    "",
    rule("="),
    `${dateLabel} · Events verified against Wikimedia On This Day`,
  ];

  return sections.filter((s) => s !== "").join("\n").replace(/\n{4,}/g, "\n\n\n");
}
