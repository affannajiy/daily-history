import "dotenv/config";
import { DateTime } from "luxon";
import { generateHistory } from "./fetchHistory";
import { buildEmailHtml } from "./buildEmail";
import { sendEmail } from "./sendEmail";

const TZ = "Asia/Kuala_Lumpur";

async function main(): Promise<void> {
  // Always compute "today" in Malaysia time, regardless of where this runs.
  const now = DateTime.now().setZone(TZ);
  const month = now.toFormat("LLLL"); // e.g. "May"
  const day = now.day; // e.g. 30
  const year = now.year;
  const dateLabel = now.toFormat("LLLL d, yyyy"); // e.g. "May 30, 2026"
  const subject = `History Today — ${month} ${day}`;

  console.log(`Generating digest for ${dateLabel} (${TZ})...`);
  const { data, provider } = await generateHistory(month, day, year);
  console.log(`Digest generated via ${provider}.`);

  const html = buildEmailHtml(data, dateLabel, provider);
  await sendEmail(subject, html);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
