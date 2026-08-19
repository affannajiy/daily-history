import "dotenv/config";
import { writeFileSync } from "node:fs";
import { DateTime } from "luxon";
import { fetchOnThisDay } from "./fetchOnThisDay";
import { generateHistory } from "./fetchHistory";
import { buildEmailHtml } from "./buildEmail";
import { buildEmailText } from "./buildText";
import { buildSubject } from "./subject";
import { sendEmail } from "./sendEmail";
import { writeArchive } from "./archive";
import { appendSentLog, readSentLog, sentKeys } from "./sentLog";
import { ALERT_MARKER, sendFailureAlert } from "./alert";

const TZ = "Asia/Kuala_Lumpur";

async function main(): Promise<void> {
  // Always compute "today" in Malaysia time, regardless of where this runs.
  const now = DateTime.now().setZone(TZ);
  const month = now.toFormat("LLLL"); // e.g. "May"
  const day = now.day; // e.g. 30
  const dateLabel = now.toFormat("LLLL d, yyyy"); // e.g. "May 30, 2026"
  const shortDate = now.toFormat("LLL d"); // e.g. "May 30" — for the subject line
  const isoDate = now.toFormat("yyyy-MM-dd"); // archive file name

  console.log(`Fetching verified events for ${month} ${day}...`);
  const events = await fetchOnThisDay(now.month, day);
  console.log(`Found ${events.length} verified events.`);

  // What has run before, so a deterministic pipeline does not send the same
  // edition again a year from now.
  const seen = sentKeys(readSentLog());

  console.log(`Generating digest for ${dateLabel} (${TZ})...`);
  const { data, provider, featuredKeys } = await generateHistory(
    month,
    day,
    now.month,
    events,
    seen
  );
  // Logged, not printed in the email — useful when a day reads badly and we
  // need to know which model wrote it.
  console.log(`Digest generated via ${provider}.`);

  // The archive is written first so the "view in browser" link in the email is
  // live by the time the email arrives.
  const archivedUrl = writeArchive(
    isoDate,
    data.global.title,
    buildEmailHtml(data, dateLabel)
  );
  console.log(`Archived to ${archivedUrl}`);

  const html = buildEmailHtml(data, dateLabel, archivedUrl);
  const text = buildEmailText(data, dateLabel, archivedUrl);
  const subject = buildSubject(data, shortDate);
  console.log(`Subject: ${subject}`);

  await sendEmail(subject, html, text);

  // Recorded only after a successful send: a failed run must not burn the
  // events it was going to feature.
  appendSentLog(isoDate, featuredKeys);
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("Fatal error:", err);

  // A failed run used to be silent: no mail, no archive entry, only a red tick
  // in a tab nobody opens. Two retired model ids cost two mornings that way.
  // The marker tells the workflow this failure has already been reported, so
  // its own `if: failure()` step stays quiet unless the crash happened before
  // this code could run at all.
  const dateLabel = DateTime.now().setZone(TZ).toFormat("LLLL d, yyyy");
  if (await sendFailureAlert(err, dateLabel)) {
    try {
      writeFileSync(ALERT_MARKER, "");
    } catch {
      // A missing marker only costs a duplicate alert. Never mask the real error.
    }
  }
  process.exit(1);
});
