/**
 * Strips credentials out of any text that might leave the process.
 *
 * This lives in its own module, with no dependencies, because both of the
 * places that need it sit on failure paths — `http.ts` when it logs a failed
 * request, `alert.ts` when it emails one — and neither can afford to pull in a
 * mail client or a network stack to get it.
 *
 * The reason it exists at all: **Gemini takes its API key as a URL query
 * parameter**, and `HttpError` puts the whole URL in its message. GitHub masks
 * registered secrets in Actions logs, but that is GitHub's layer and it does not
 * extend to a local terminal, a preview file or an inbox. Redact at the source.
 */

/** Env vars whose values must never appear in output. */
const SECRET_ENV = [
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "RESEND_API_KEY",
  "RECIPIENT_EMAIL",
];

export function redact(input: string): string {
  let out = input
    // Key-shaped query parameters, including providers we have not met yet.
    .replace(/([?&](?:key|api_?key|access_token|token)=)[^&\s"'`]+/gi, "$1***")
    .replace(/(Bearer\s+)\S+/gi, "$1***")
    // Vendor-prefixed keys, for the case where the value is not in this process.
    .replace(/\b(gsk_|re_|sk-|AIza)[A-Za-z0-9_-]{8,}/g, "$1***");

  // Second layer: the literal values, for any format the patterns above miss.
  for (const name of SECRET_ENV) {
    const value = process.env[name];
    // Short values are not secrets worth the false positives of a blind replace.
    if (value && value.length >= 8) out = out.split(value).join(`***${name}***`);
  }
  return out;
}
