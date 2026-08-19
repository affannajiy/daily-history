/**
 * One HTTP client for every outbound call, with retries.
 *
 * The job runs once a day and has no second chance: a single transient blip
 * from Wikimedia or a provider used to lose the entire digest. Every fetch in
 * this codebase now goes through here.
 *
 * Two failure classes are treated differently on purpose. A 404 or a 400 means
 * the thing genuinely is not there and retrying only wastes the runner's time;
 * a 429, a 5xx, a timeout or a dropped socket are all worth another attempt.
 */

import { redact } from "./redact";

export const UA =
  "daily-history/1.0 (https://github.com/affannajiy/daily-history; affannajiy@gmail.com)";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

/**
 * Cap on an honoured `Retry-After`. A model provider's per-minute token window
 * asks for tens of seconds, which is worth waiting out — the job runs once a
 * day, so a minute of sleep is free and a lost digest is not. Anything longer is
 * a quota that will not clear inside this run.
 */
const MAX_RETRY_AFTER_MS = 75000;

export interface RequestOptions {
  timeoutMs?: number;
  attempts?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Label used in log lines when a request is retried or gives up. */
  label?: string;
}

/** Status codes worth trying again. Anything else is a real answer. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Full jitter: a fixed backoff would have every parallel enrichment call retry
 * in the same instant, which is what produced the rate limit in the first place.
 */
function backoff(attempt: number): number {
  return Math.round(Math.random() * BASE_BACKOFF_MS * 2 ** attempt);
}

/**
 * Providers say how long to wait; jittered backoff tops out around a second and
 * guessing lost a whole digest to a Groq token-per-minute limit that wanted
 * three. Honour the header when it is present and sane, else fall back to the
 * jitter. Accepts both the seconds and HTTP-date forms of `Retry-After`.
 */
function retryDelay(res: Response, attempt: number): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    const ms = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(header) - Date.now();
    if (ms > 0) return Math.min(ms, MAX_RETRY_AFTER_MS);
  }
  // Floor the jitter: a provider answering 503 "high demand" with no header was
  // being retried 400ms later, three times, which is not a wait at all.
  return Math.max(backoff(attempt), 1500);
}

export class HttpError extends Error {
  /**
   * The message is redacted at construction, not at the point of logging.
   *
   * Gemini passes its API key in the query string, so an unredacted message
   * leaks it into the terminal on every local dry run, into any preview file,
   * and into the failure alert. Doing it here means no future caller can
   * forget: there is no path that produces the raw one.
   */
  constructor(readonly status: number, readonly body: string, url: string) {
    super(redact(`HTTP ${status} for ${url}: ${body.slice(0, 300)}`));
    this.name = "HttpError";
  }
}

/**
 * Fetches with timeout and retry. Throws on final failure — callers that must
 * degrade rather than fail use `getJsonOrNull` below.
 */
export async function request(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    attempts = DEFAULT_ATTEMPTS,
    method = "GET",
    headers = {},
    body,
    label = redact(url),
  } = options;

  let lastError: unknown;
  /** Set when the previous attempt's response asked for a specific wait. */
  let nextDelayMs: number | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(nextDelayMs ?? backoff(attempt - 1));
    nextDelayMs = null;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { "User-Agent": UA, ...headers },
        body,
        signal: ctrl.signal,
      });

      if (res.ok) return res;

      const text = await res.text();
      const error = new HttpError(res.status, text, url);
      if (!isRetryableStatus(res.status)) throw error;

      lastError = error;
      nextDelayMs = retryDelay(res, attempt);
      console.warn(
        `${label}: HTTP ${res.status}, retrying in ${Math.round(
          nextDelayMs / 1000
        )}s (${attempt + 1}/${attempts})...`
      );
    } catch (err) {
      // A non-retryable HttpError thrown just above must not be swallowed here.
      if (err instanceof HttpError && !isRetryableStatus(err.status)) throw err;
      lastError = err;
      console.warn(
        `${label}: ${String(err)}, retrying (${attempt + 1}/${attempts})...`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${label} failed after ${attempts} attempts.`);
}

/** JSON, or throw. For calls the digest cannot proceed without. */
export async function getJson(url: string, options?: RequestOptions): Promise<any> {
  const res = await request(url, {
    ...options,
    headers: { Accept: "application/json", ...options?.headers },
  });
  return res.json();
}

/**
 * JSON, or null. For enrichment: a thin card ships, a missing digest does not.
 * The warning is kept because a silent null here looks identical to an article
 * that genuinely has no content.
 */
export async function getJsonOrNull(
  url: string,
  options?: RequestOptions
): Promise<any | null> {
  try {
    return await getJson(url, options);
  } catch (err) {
    console.warn(`${options?.label ?? url} gave up:`, String(err));
    return null;
  }
}

/** POST JSON, or throw. Used by both model providers. */
export async function postJson(
  url: string,
  payload: unknown,
  options?: RequestOptions
): Promise<any> {
  const res = await request(url, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(payload),
  });
  return res.json();
}
