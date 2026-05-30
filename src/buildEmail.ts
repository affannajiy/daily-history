import { HistorySection, HistoryData, Provider, Reference } from "./types";

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
  red: "#CC1100",
  grey: "#6b6b6b",
  lightGrey: "#f1f1f1",
  border: "#e2e2e2",
  white: "#ffffff",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', Menlo, Consolas, monospace";
const SANS = "'Helvetica Neue', Arial, sans-serif";

function keyFigurePills(section: HistorySection): string {
  if (!section.keyFigures?.length) return "";
  const pills = section.keyFigures
    .filter((f) => f && f.name)
    .map(
      (f) => `
        <span style="display:inline-block;background:${C.lightGrey};border:1px solid ${C.border};border-radius:4px;padding:6px 10px;margin:0 6px 6px 0;font-family:${SANS};font-size:12px;color:${C.black};">
          <strong>${esc(f.name)}</strong>${f.role ? ` &middot; <span style="color:${C.grey}">${esc(f.role)}</span>` : ""}
          ${f.significance ? `<br><span style="color:${C.grey};font-size:11px;">${esc(f.significance)}</span>` : ""}
        </span>`
    )
    .join("");
  return `
    <div style="margin:14px 0;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.grey};margin-bottom:8px;">Key Figures</div>
      ${pills}
    </div>`;
}

function impactBlock(section: HistorySection): string {
  if (!section.impact) return "";
  return `
    <div style="border-left:4px solid ${C.red};padding:4px 0 4px 16px;margin:16px 0 0;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.red};margin-bottom:6px;">Impact</div>
      ${paragraphs(section.impact, `font-family:${SERIF};font-style:italic;font-size:15px;line-height:1.6;color:#333;margin:0 0 10px;text-align:justify;`)}
    </div>`;
}

function metaLine(section: HistorySection): string {
  const bits = [section.year, section.location].filter(Boolean).map(esc).join(" &middot; ");
  if (!bits) return "";
  return `<div style="font-family:${MONO};font-size:12px;letter-spacing:1px;color:${C.red};text-transform:uppercase;margin-bottom:6px;">${bits}</div>`;
}

/** The full-width hero card for the global headline event. */
function featureCard(section: HistorySection): string {
  return `
  <tr>
    <td style="padding:28px 28px 8px;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.grey};">Global Headline</div>
      <div style="height:3px;width:48px;background:${C.red};margin:10px 0 14px;"></div>
      ${metaLine(section)}
      <h1 style="font-family:${SERIF};font-size:30px;line-height:1.2;color:${C.black};margin:0 0 14px;font-weight:bold;">${esc(section.title)}</h1>
      ${paragraphs(section.synopsis, `font-family:${SERIF};font-size:16px;line-height:1.7;color:#222;margin:0 0 14px;text-align:justify;`)}
      ${keyFigurePills(section)}
      ${impactBlock(section)}
    </td>
  </tr>`;
}

/** A condensed column card for the SEA / Malaysia honorable mentions. */
function columnCard(label: string, section: HistorySection): string {
  return `
  <td style="width:50%;vertical-align:top;padding:20px;background:${C.white};border:1px solid ${C.border};border-radius:6px;" valign="top">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.grey};">${esc(label)}</div>
    <div style="height:3px;width:36px;background:${C.red};margin:8px 0 12px;"></div>
    ${metaLine(section)}
    <h2 style="font-family:${SERIF};font-size:20px;line-height:1.25;color:${C.black};margin:0 0 10px;font-weight:bold;">${esc(section.title)}</h2>
    ${paragraphs(section.synopsis, `font-family:${SERIF};font-size:14px;line-height:1.65;color:#333;margin:0 0 10px;text-align:justify;`)}
    ${keyFigurePills(section)}
    ${impactBlock(section)}
  </td>`;
}

/** Renders one event's reference list as <li> items (with links where present). */
function referenceItems(refs: Reference[] | undefined): string {
  if (!refs?.length) return "";
  return refs
    .filter((r) => r && r.title)
    .map((r) => {
      const label = esc(r.title);
      const body = r.url
        ? `<a href="${esc(r.url)}" style="color:${C.red};text-decoration:none;">${label}</a>`
        : label;
      return `<li style="margin:0 0 6px;">${body}</li>`;
    })
    .join("");
}

/** Consolidated "References" block grouped by event, shown above the footer. */
function referencesSection(data: HistoryData): string {
  const groups: Array<[string, HistorySection]> = [
    ["Global Headline", data.global],
    ["Southeast Asia", data.southeastAsia],
    ["Tanah Melayu / Malaysia", data.malaysia],
  ];

  const blocks = groups
    .map(([label, section]) => {
      const items = referenceItems(section.references);
      if (!items) return "";
      return `
        <div style="margin:0 0 16px;">
          <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.grey};margin-bottom:6px;">${esc(label)} &mdash; ${esc(section.title)}</div>
          <ul style="font-family:${SANS};font-size:12px;line-height:1.5;color:#444;margin:0;padding-left:18px;">${items}</ul>
        </div>`;
    })
    .filter(Boolean)
    .join("");

  if (!blocks) return "";

  return `
  <tr>
    <td style="padding:8px 28px 24px;">
      <div style="height:1px;background:${C.border};margin-bottom:20px;"></div>
      <div style="font-family:${SERIF};font-size:18px;font-weight:bold;color:${C.black};margin-bottom:4px;">References</div>
      <div style="height:3px;width:36px;background:${C.red};margin:0 0 16px;"></div>
      ${blocks}
    </td>
  </tr>`;
}

export function buildEmailHtml(
  data: HistoryData,
  dateLabel: string,
  provider: Provider
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>History Today &mdash; ${esc(dateLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#dddddd;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#dddddd;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background:${C.white};">

          <!-- Masthead -->
          <tr>
            <td style="background:${C.black};padding:22px 28px;border-bottom:4px solid ${C.red};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
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

          <!-- Global feature -->
          ${featureCard(data.global)}

          <!-- Divider -->
          <tr><td style="padding:8px 28px;"><div style="height:1px;background:${C.border};"></div></td></tr>

          <!-- Honorable mentions: two columns (stack on mobile) -->
          <tr>
            <td style="padding:12px 22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${columnCard("Southeast Asia", data.southeastAsia)}
                  <td style="width:14px;font-size:0;line-height:0;">&nbsp;</td>
                  ${columnCard("Tanah Melayu / Malaysia", data.malaysia)}
                </tr>
              </table>
            </td>
          </tr>

          <!-- References -->
          ${referencesSection(data)}

          <!-- Footer -->
          <tr>
            <td style="background:${C.black};padding:18px 28px;">
              <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;color:#9a9a9a;">
                Daily History &middot; ${esc(dateLabel)} &middot; Powered by ${esc(provider)}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
