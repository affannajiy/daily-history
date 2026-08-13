/**
 * Real feed, real model, no email. This is the only safe way to see what a
 * given day actually produces — `npm run dev` and `npm start` both send mail.
 *
 * Writes the same three artefacts the real run would, into the working
 * directory rather than the archive: the HTML, the plain-text part, and the
 * subject line. All three are worth eyeballing, because all three are built
 * from the same data and each can be thin in a different way.
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { DateTime } from "luxon";
import { fetchOnThisDay } from "./fetchOnThisDay";
import { generateHistory } from "./fetchHistory";
import { buildEmailHtml } from "./buildEmail";
import { buildEmailText } from "./buildText";
import { buildSubject } from "./subject";
import { readSentLog, sentKeys } from "./sentLog";

async function main() {
  const base = DateTime.now().setZone("Asia/Kuala_Lumpur");
  const now = base.set({
    month: Number(process.env.MONTH) || base.month,
    day: Number(process.env.DAY) || base.day,
  });
  const month = now.toFormat("LLLL");
  const day = now.day;
  const dateLabel = now.toFormat("LLLL d, yyyy");
  const shortDate = now.toFormat("LLL d");

  const events = await fetchOnThisDay(now.month, day);
  console.log(`Found ${events.length} verified events for ${month} ${day}.`);

  // The real run withholds previously featured events; the dry run must too, or
  // it is not showing you what tomorrow morning will actually contain.
  const seen = sentKeys(readSentLog());
  const { data, provider } = await generateHistory(month, day, now.month, events, seen);
  console.log(`Generated via ${provider}.`);
  console.log(JSON.stringify(data, null, 2));

  const html = buildEmailHtml(data, dateLabel, "https://example.invalid/preview");
  const text = buildEmailText(data, dateLabel);

  writeFileSync("preview-live.html", html, "utf8");
  writeFileSync("preview-live.txt", text, "utf8");

  console.log(`\nSubject: ${buildSubject(data, shortDate)}`);
  console.log(
    `Wrote preview-live.html (${Math.round(Buffer.byteLength(html, "utf8") / 1024)} KB) ` +
      `and preview-live.txt. No email sent.`
  );
}

main().catch((e) => {
  console.error("Dry run failed:", e);
  process.exit(1);
});
