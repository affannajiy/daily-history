/**
 * Writes each edition to `docs/`, which GitHub Pages serves as a public archive.
 *
 * This exists for three reasons, in order of how much they matter:
 *   - Gmail clips a message past ~102 KB and hides the rest behind a link. The
 *     "view in browser" link at the top of the email is the escape hatch, and
 *     it needs somewhere to point.
 *   - An email is unsearchable and unshareable once it is a week old.
 *   - A rendering bug is far easier to inspect at a URL than in a mail client.
 *
 * The archive page is the same HTML as the email. It is not a second template
 * to maintain, and anything that looks wrong here looks wrong in the inbox too.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Where editions are written. The workflow checks the `gh-pages` branch out
 * into a sibling directory and points this at it, so the archive never lands on
 * `main` and a local clone never has to pull a year of HTML it will not read.
 * Locally it defaults to `docs/`, which is gitignored.
 */
export const ARCHIVE_DIR = process.env.ARCHIVE_DIR || "docs";
/** Set once, in one place: every archive URL is built from this. */
export const ARCHIVE_BASE_URL = "https://affannajiy.github.io/daily-history";

export interface ArchiveEntry {
  /** ISO date, which is also the file name. */
  date: string;
  /** The lead card's headline, used as the index link text. */
  title: string;
}

const INDEX_DATA = "index.json";

function esc(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function archiveUrl(isoDate: string): string {
  return `${ARCHIVE_BASE_URL}/${isoDate}.html`;
}

function readIndex(dir: string): ArchiveEntry[] {
  const path = join(dir, INDEX_DATA);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed) ? (parsed as ArchiveEntry[]) : [];
  } catch (err) {
    console.warn(`Could not read ${path}, rebuilding:`, String(err));
    return [];
  }
}

/**
 * The index is plain and unstyled on purpose: it is a list of links, and the
 * editions themselves carry the design. Styling it would mean maintaining a
 * second look for no reader benefit.
 */
function renderIndex(entries: ArchiveEntry[]): string {
  const items = entries
    .map(
      (e) =>
        `    <li><a href="${esc(e.date)}.html"><time datetime="${esc(e.date)}">${esc(e.date)}</time> &mdash; ${esc(e.title)}</a></li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>History Today &mdash; Archive</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #111; background: #fff; line-height: 1.6; }
    h1 { font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase; font-size: 20px; border-bottom: 3px solid #CC1100; padding-bottom: 10px; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; border-bottom: 1px solid #e2e2e2; }
    a { color: #111; text-decoration: none; }
    a:hover { color: #CC1100; }
    time { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px; color: #6b6b6b; }
    @media (prefers-color-scheme: dark) {
      body { background: #111; color: #eee; }
      a { color: #eee; }
      li { border-bottom-color: #333; }
    }
  </style>
</head>
<body>
  <h1>History Today &mdash; Archive</h1>
  <ul>
${items}
  </ul>
</body>
</html>
`;
}

/**
 * Writes one edition and refreshes the index. Returns its public URL.
 *
 * Re-running for a date overwrites that edition rather than adding a duplicate,
 * so a manually re-triggered workflow does not litter the archive.
 */
export function writeArchive(
  isoDate: string,
  title: string,
  html: string,
  dir: string = ARCHIVE_DIR
): string {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${isoDate}.html`), html, "utf8");

  const entries = readIndex(dir).filter((e) => e.date !== isoDate);
  entries.push({ date: isoDate, title });
  entries.sort((a, b) => b.date.localeCompare(a.date)); // newest first

  writeFileSync(join(dir, INDEX_DATA), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  writeFileSync(join(dir, "index.html"), renderIndex(entries), "utf8");
  // Stops Pages running the output through Jekyll, which would drop any file
  // or directory beginning with an underscore.
  writeFileSync(join(dir, ".nojekyll"), "", "utf8");

  return archiveUrl(isoDate);
}
