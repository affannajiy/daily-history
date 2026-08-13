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

export const UA =
  "daily-history/1.0 (https://github.com/affannajiy/daily-history; affannajiy@gmail.com)";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

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

export class HttpError extends Error {
  constructor(readonly status: number, readonly body: string, url: string) {
    super(`HTTP ${status} for ${url}: ${body.slice(0, 300)}`);
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
    label = url,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(backoff(attempt - 1));

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
      console.warn(
        `${label}: HTTP ${res.status}, retrying (${attempt + 1}/${attempts})...`
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
