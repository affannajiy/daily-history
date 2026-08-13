import {
  Card,
  CardImage,
  Fact,
  FactStat,
  HistoryData,
  HistorySectionLabel,
  KeyFigure,
  Reference,
  TimelineBeat,
} from "./types";
import { buildPreheader } from "./subject";

/** Escapes user/AI-supplied text so it cannot break the HTML structure. */
function esc(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Splits a block of prose into <p> paragraphs on blank lines or newlines. */
function paragraphs(text: string, style: string): string {
  return String(text)
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${style}">${esc(p)}</p>`)
    .join("");
}

const C = {
  black: "#111111",
  /**
   * Red means one thing in this email: a date or time anchor (and links, which
   * are red everywhere online). It used to mark meta lines, timeline dates,
   * impact rules and statistics all at once, which meant it marked nothing.
   */
  red: "#CC1100",
  grey: "#6b6b6b",
  tint: "#f4f4f4",
  border: "#e2e2e2",
  white: "#ffffff",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', Menlo, Consolas, monospace";
const SANS = "'Helvetica Neue', Arial, sans-serif";

const LABEL = `font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.grey};`;

function sectionLabel(text: string): string {
  return `<div style="${LABEL}margin:0 0 8px;">${esc(text)}</div>`;
}

/**
 * Section kicker plus its rule. Same mark everywhere, per consistency (§1.4).
 * The rule is decoration, so it is hidden from assistive technology rather than
 * announced as an empty element.
 */
function kicker(label: string, wide: boolean): string {
  return `
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.grey};">${esc(label)}</div>
    <div aria-hidden="true" style="height:3px;width:${wide ? 48 : 36}px;background:${C.red};margin:10px 0 14px;"></div>`;
}

/**
 * The lead image, and only ever a freely-licensed one — `enrich.ts` returns
 * null for anything it cannot positively identify as free, so there is no
 * licence decision left to make here.
 *
 * `width`/`height` attributes and real alt text are load-bearing rather than
 * polish: Gmail blocks remote images until the reader clicks "display images",
 * and without both the card opens with a broken grey box that shifts the whole
 * layout when it finally loads.
 *
 * The credit is a caption, not alt text. A screen reader reading out a licence
 * name learns nothing about the picture.
 */
function imageBlock(image: CardImage | null): string {
  if (!image) return "";
  return `
    <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr><td>
        <img src="${esc(image.url)}" alt="${esc(image.alt)}" width="584" style="display:block;width:100%;max-width:584px;height:auto;border:0;outline:none;text-decoration:none;">
      </td></tr>
      <tr><td style="padding:6px 0 0;font-family:${SANS};font-size:10px;line-height:1.4;color:${C.grey};">
        ${esc(image.credit)} &middot; <a href="${esc(image.sourceUrl)}" style="color:${C.grey};text-decoration:underline;">source</a>
      </td></tr>
    </table>`;
}

function metaLine(card: Card): string {
  const bits = [card.year, card.location].filter(Boolean).map(esc).join(" &middot; ");
  if (!bits) return "";
  return `<div style="font-family:${MONO};font-size:12px;letter-spacing:1px;color:${C.red};text-transform:uppercase;margin-bottom:6px;">${bits}</div>`;
}

function standfirst(text: string, size: number): string {
  if (!text) return "";
  return `<p style="font-family:${SERIF};font-style:italic;font-size:${size}px;line-height:1.5;color:#444;margin:0 0 18px;">${esc(text)}</p>`;
}

/**
 * The fact strip is the one place a full border is justified: four unrelated
 * values sitting side by side have nothing but a boundary to group them
 * (common region, §2.8). Everything below this uses a cheaper cue.
 */
function factStrip(facts: Fact[]): string {
  if (facts.length < 2) return "";
  const width = Math.floor(100 / facts.length);
  const cells = facts
    .map(
      (f, i) => `
        <td style="width:${width}%;padding:12px 10px;${i < facts.length - 1 ? `border-right:1px solid ${C.border};` : ""}" valign="top">
          <div style="font-family:${MONO};font-size:10px;letter-spacing:1px;color:${C.grey};text-transform:uppercase;margin-bottom:4px;">${esc(f.label)}</div>
          <div style="font-family:${SANS};font-size:12px;line-height:1.4;color:${C.black};">${esc(f.value)}</div>
        </td>`
    )
    .join("");
  return `
    <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};background:#fafafa;margin:0 0 18px;">
      <tr>${cells}</tr>
    </table>`;
}

/**
 * A vertical connector, not a box: uniform connectedness (§2.9) is the
 * strongest grouping cue there is, and here the claim it makes — that these
 * beats form one sequence — is true.
 */
function timelineBlock(beats: TimelineBeat[]): string {
  if (!beats.length) return "";
  const rows = beats
    .map(
      (b, i) => `
      <tr>
        <td style="width:92px;padding:0 10px ${i === beats.length - 1 ? 0 : 12}px 0;font-family:${MONO};font-size:11px;color:${C.red};" valign="top">${esc(b.when)}</td>
        <td style="padding:0 0 ${i === beats.length - 1 ? 0 : 12}px 14px;border-left:2px solid ${C.border};font-family:${SERIF};font-size:14px;line-height:1.5;color:#333;" valign="top">${esc(b.what)}</td>
      </tr>`
    )
    .join("");
  return `
    ${sectionLabel("Timeline")}
    <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">${rows}</table>`;
}

/** Tint only — a border here would box a box beside a box (§4, cheapest cue). */
function numbersBlock(stats: FactStat[]): string {
  if (!stats.length) return "";
  const width = Math.floor(100 / stats.length);
  const cells = stats
    .map(
      (s, i) => `
        ${i > 0 ? `<td style="width:8px;font-size:0;line-height:0;">&nbsp;</td>` : ""}
        <td style="width:${width}%;padding:12px;background:${C.tint};" valign="top">
          <div style="font-family:${SERIF};font-size:24px;line-height:1;color:${C.black};">${esc(s.value)}</div>
          <div style="font-family:${SANS};font-size:11px;line-height:1.4;color:${C.grey};margin-top:5px;">${esc(s.label)}</div>
        </td>`
    )
    .join("");
  return `
    ${sectionLabel("By the numbers")}
    <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr>${cells}</tr></table>`;
}

/** Spacing and a single rule. No fill, no border — these are not cards. */
function keyFigureBlock(figures: KeyFigure[]): string {
  if (!figures.length) return "";
  const rows = figures
    .map(
      (f) => `
      <tr><td style="padding:0 0 12px;">
        <div style="border-left:3px solid ${C.black};padding-left:12px;">
          <div style="font-family:${SANS};font-size:13px;font-weight:bold;color:${C.black};">${esc(f.name)}</div>
          ${f.role ? `<div style="font-family:${SANS};font-size:11px;color:${C.grey};margin:2px 0 4px;">${esc(f.role)}</div>` : ""}
          ${f.significance ? `<div style="font-family:${SERIF};font-size:13px;line-height:1.5;color:#333;">${esc(f.significance)}</div>` : ""}
        </div>
      </td></tr>`
    )
    .join("");
  return `
    ${sectionLabel("Key figures")}
    <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">${rows}</table>`;
}

/**
 * The closing block of every card. Named for what it contains: "Impact" had
 * two honest readings — impact at the time, and impact now — and a label that
 * can be read two ways (§2.12) is how this section ended up restating the
 * narrative above it in every edition.
 */
function afterBlock(label: string, text: string): string {
  if (!text) return "";
  return `
    <div style="border-left:4px solid ${C.black};padding:2px 0 2px 16px;margin:0;">
      <div style="${LABEL}color:${C.black};margin-bottom:6px;">${esc(label)}</div>
      ${paragraphs(text, `font-family:${SERIF};font-size:15px;line-height:1.6;color:#333;margin:0 0 10px;text-align:justify;`)}
    </div>`;
}

/**
 * One renderer for both card kinds. The global card carries the statistics
 * strip and the larger headline; the regional cards deliberately do not, so
 * the email has a dominant shape rather than three cards of equal weight
 * (emergence, §2.10).
 */
function renderCard(label: string, card: Card, lead: boolean): string {
  const body = card.kind === "event" ? card.whatHappened : card.whatTheyDid;
  const tail = card.kind === "event" ? card.whatChangedAfter : card.legacy;
  const bodyLabel = card.kind === "event" ? "What happened" : "What they did";
  const tailLabel = card.kind === "event" ? "What changed after" : "What still stands";

  const heading = lead
    ? `<h1 style="font-family:${SERIF};font-size:30px;line-height:1.2;color:${C.black};margin:0 0 8px;font-weight:bold;">${esc(card.title)}</h1>`
    : `<h2 style="font-family:${SERIF};font-size:22px;line-height:1.25;color:${C.black};margin:0 0 8px;font-weight:bold;">${esc(card.title)}</h2>`;

  const anchor =
    card.kind === "figure" && card.anchor
      ? `<div style="font-family:${MONO};font-size:11px;letter-spacing:1px;color:${C.red};text-transform:uppercase;margin:0 0 12px;">${esc(card.anchor)}</div>`
      : "";

  return `
    ${kicker(label, lead)}
    ${metaLine(card)}
    ${heading}
    ${anchor}
    ${standfirst(card.standfirst, lead ? 17 : 15)}
    ${imageBlock(card.image)}
    ${factStrip(card.facts)}
    ${sectionLabel(bodyLabel)}
    ${paragraphs(body, `font-family:${SERIF};font-size:${lead ? 16 : 15}px;line-height:1.7;color:#222;margin:0 0 14px;text-align:justify;`)}
    <div style="height:4px;"></div>
    ${timelineBlock(card.timeline)}
    ${lead ? numbersBlock(card.numbers) : ""}
    ${card.kind === "event" ? keyFigureBlock(card.keyFigures) : ""}
    ${afterBlock(tailLabel, tail)}`;
}

/**
 * Shown when a region has neither a verified event nor a verified figure for
 * the day. It names the source that was searched rather than only stating an
 * absence, so the reader can tell this is a gap in the archive and not a
 * failure of the email (§1.9).
 */
function emptyCard(label: string): string {
  return `
    ${kicker(label, false)}
    <p style="font-family:${SERIF};font-style:italic;font-size:15px;line-height:1.6;color:${C.grey};margin:0;">No event or figure for this region is recorded on this day in Wikimedia's verified archive. Nothing has been written to fill the space.</p>`;
}

function regionRow(label: string, card: Card | null): string {
  return `
  <tr><td style="padding:14px 28px 8px;">
    ${card ? renderCard(label, card, false) : emptyCard(label)}
  </td></tr>`;
}

function referenceItems(refs: Reference[] | undefined): string {
  if (!refs?.length) return "";
  return refs
    .filter((r) => r && r.title)
    .map((r) => {
      const title = esc(r.title);
      // Underlined, not colour-only: colour alone is not a distinguishing cue
      // for a reader who cannot separate red from black (WCAG 1.4.1).
      const body = r.url
        ? `<a href="${esc(r.url)}" style="color:${C.red};text-decoration:underline;">${title}</a>`
        : title;
      return `<li style="margin:0 0 6px;">${body}</li>`;
    })
    .join("");
}

/**
 * References close the email. The last thing read is the thing remembered
 * (§3.22), and this is the only block that carries the reader somewhere — the
 * provider credit that used to sit here carried them nowhere.
 */
function referencesSection(data: HistoryData): string {
  const groups: Array<[HistorySectionLabel, Card | null]> = [
    ["Global Headline", data.global],
    ["Southeast Asia", data.southeastAsia],
    ["Tanah Melayu / Malaysia", data.malaysia],
  ];

  const blocks = groups
    .map(([label, card]) => {
      if (!card) return "";
      const items = referenceItems(card.references);
      if (!items) return "";
      return `
        <div style="margin:0 0 16px;">
          <div style="${LABEL}margin-bottom:6px;">${esc(label)} &mdash; ${esc(card.title)}</div>
          <ul style="font-family:${SANS};font-size:12px;line-height:1.5;color:#444;margin:0;padding-left:18px;">${items}</ul>
        </div>`;
    })
    .filter(Boolean)
    .join("");

  if (!blocks) return "";

  return `
  <tr>
    <td style="padding:16px 28px 24px;">
      <div aria-hidden="true" style="height:1px;background:${C.border};margin-bottom:20px;"></div>
      <h2 style="font-family:${SERIF};font-size:18px;font-weight:bold;color:${C.black};margin:0 0 4px;">Sources</h2>
      <div aria-hidden="true" style="height:3px;width:36px;background:${C.red};margin:0 0 16px;"></div>
      ${blocks}
    </td>
  </tr>`;
}

/** Trims the indentation this file's template literals leave behind. */
function minify(html: string): string {
  return html.replace(/\n\s*/g, "\n").replace(/\n{2,}/g, "\n");
}

/**
 * The grey preview line the inbox shows after the subject. Hidden in the body
 * itself — clients read the first text they find, and without this they read
 * the masthead, so every edition previewed as "HISTORYTODAY August 13, 2026".
 *
 * The trailing whitespace run is the standard trick to stop the client pulling
 * the next real sentence into the preview after the intended text ends.
 */
function preheaderBlock(text: string): string {
  if (!text) return "";
  return `
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#dddddd;opacity:0;">
    ${esc(text)}
    ${"&#8199;&#65279;&#847; ".repeat(30)}
  </div>`;
}

/**
 * The escape hatch from Gmail's ~102 KB clipping, and the only way to read an
 * old edition. Sits above the masthead because a clipped message is clipped
 * from the bottom — a link at the foot would be inside the part that vanished.
 */
function browserLink(url: string | undefined): string {
  if (!url) return "";
  return `
          <tr>
            <td align="right" style="padding:0 28px 8px;font-family:${SANS};font-size:11px;color:${C.grey};">
              <a href="${esc(url)}" style="color:${C.grey};text-decoration:underline;">View in browser</a>
            </td>
          </tr>`;
}

export function buildEmailHtml(
  data: HistoryData,
  dateLabel: string,
  browserUrl?: string
): string {
  return minify(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>History Today &mdash; ${esc(dateLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#dddddd;">
  ${preheaderBlock(buildPreheader(data))}
  <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0" style="background:#dddddd;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background:${C.white};">

          ${browserLink(browserUrl)}

          <tr>
            <td style="background:${C.black};padding:22px 28px;border-bottom:4px solid ${C.red};">
              <table role="presentation" border="0" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS};font-size:26px;font-weight:bold;letter-spacing:3px;color:${C.white};">
                    HISTORY<span style="color:${C.red};">TODAY</span>
                  </td>
                  <td align="right" style="font-family:${MONO};font-size:12px;letter-spacing:1px;color:#bbbbbb;">
                    ${esc(dateLabel)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="padding:28px 28px 8px;">${renderCard("Global Headline", data.global, true)}</td></tr>

          <tr><td style="padding:8px 28px;"><div aria-hidden="true" style="height:1px;background:${C.border};"></div></td></tr>

          ${regionRow("Southeast Asia", data.southeastAsia)}

          <tr><td style="padding:8px 28px;"><div aria-hidden="true" style="height:1px;background:${C.border};"></div></td></tr>

          ${regionRow("Tanah Melayu / Malaysia", data.malaysia)}

          ${referencesSection(data)}

          <tr>
            <td style="background:${C.black};padding:16px 28px;">
              <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;color:#9a9a9a;">
                ${esc(dateLabel)} &middot; Events verified against Wikimedia On This Day${
                  browserUrl
                    ? ` &middot; <a href="${esc(browserUrl)}" style="color:#9a9a9a;text-decoration:underline;">archive</a>`
                    : ""
                }
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`);
}
