/**
 * Remembers which feed entries have already been featured, so the digest does
 * not repeat itself a year later.
 *
 * The pipeline is deterministic — same calendar day, same feed, `temperature: 0`
 * — which means that without this file, 13 August 2027 would send very nearly
 * the same email as 13 August 2026. Nobody notices for twelve months, and then
 * it looks broken.
 *
 * The log is a plain JSON file committed by the workflow rather than a database
 * because the whole project is a cron job with no infrastructure, and a file in
 * the repo is inspectable, diffable and trivially resettable by deleting it.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { OnThisDayEvent } from "./fetchOnThisDay";

export const SENT_LOG_PATH = "data/sent.json";

export interface SentEntry {
  /** ISO date the digest was sent, in MYT. */
  date: string;
  /** Feed-entry keys featured that day, one per filled slot. */
  keys: string[];
}

/**
 * Identity of a feed entry. Year plus the opening of its text: the feed's
 * wording for a given entry is stable, and the year alone is not unique within
 * a day. Truncated so an upstream copy-edit to the tail of a sentence does not
 * silently make an old entry look new.
 */
export function eventKey(event: OnThisDayEvent): string {
  const text = event.text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 60);
  return `${event.year}|${text}`;
}

export function readSentLog(path: string = SENT_LOG_PATH): SentEntry[] {
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed) ? (parsed as SentEntry[]) : [];
  } catch (err) {
    // A corrupt log must not stop the digest — worst case we repeat an event.
    console.warn(`Could not read ${path}, treating as empty:`, String(err));
    return [];
  }
}

/** Every key ever featured, for exclusion at selection time. */
export function sentKeys(log: SentEntry[]): Set<string> {
  return new Set(log.flatMap((entry) => entry.keys));
}

export function appendSentLog(
  date: string,
  keys: string[],
  path: string = SENT_LOG_PATH
): void {
  const log = readSentLog(path).filter((entry) => entry.date !== date);
  log.push({ date, keys });
  // Chronological, so the file reads as a history rather than an append heap.
  log.sort((a, b) => a.date.localeCompare(b.date));

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

/**
 * Ids the selection pass is allowed to choose from.
 *
 * Exclusion is deliberately soft: if filtering would empty a bucket, the
 * unfiltered bucket is returned instead. A repeated event is a mild
 * disappointment; an empty global slot is a failed digest, and some calendar
 * days genuinely only have one event worth featuring.
 */
export function availableIds(
  events: OnThisDayEvent[],
  seen: Set<string>,
  candidateIds?: Set<number>
): Set<number> {
  const pool = events
    .map((_, i) => i + 1)
    .filter((id) => !candidateIds || candidateIds.has(id));
  const fresh = pool.filter((id) => !seen.has(eventKey(events[id - 1])));
  return new Set(fresh.length ? fresh : pool);
}
