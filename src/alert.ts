import { Resend } from "resend";
import { redact } from "./redact";

/**
 * The failure alert.
 *
 * The job is silent by design when it fails — it exits non-zero and sends
 * nothing, which is correct for the digest and useless for the operator. Two
 * dead model ids went unnoticed for two mornings because the only signal was a
 * red tick on a page nobody visits.
 *
 * This is deliberately the plainest thing in the repo: no template, no HTML
 * builder, no dependency on anything that could itself be the thing that broke.
 * It reuses only Resend and `RECIPIENT_EMAIL`.
 */

/** Written when this module has already spoken, so the workflow does not repeat it. */
export const ALERT_MARKER = "alert-sent";

/** A link back to the run, when the failure happened on a runner. */
function runUrl(): string | null {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return null;
  return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

/** The body. Exported so it can be read without sending anything. */
export function buildAlertText(err: unknown, dateLabel: string): string {
  const detail = err instanceof Error ? (err.stack || err.message) : String(err);
  const url = runUrl();
  return [
    `The digest for ${dateLabel} was not sent.`,
    "",
    redact(detail).slice(0, 4000),
    "",
    url ? `Run log: ${url}` : "Ran outside GitHub Actions.",
    "",
    "Nothing was archived and no event was marked as used, so re-running this",
    "workflow will produce the edition as if today had not been attempted.",
  ].join("\n");
}

/**
 * Best effort by definition. This runs inside the failure path, so it must never
 * throw: an alert that fails loudly would replace the original error with its
 * own and hide what actually went wrong.
 */
export async function sendFailureAlert(
  err: unknown,
  dateLabel: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RECIPIENT_EMAIL;
  const from = process.env.FROM_EMAIL || "History Today <onboarding@resend.dev>";
  if (!apiKey || !to) return false;

  const text = buildAlertText(err, dateLabel);
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      // Ugly on purpose. This must never be mistaken for a digest at a glance.
      subject: `FAILED: History Today — ${dateLabel}`,
      text,
    });
    if (error) {
      console.error("Failure alert could not be sent:", JSON.stringify(error));
      return false;
    }
    console.error(`Failure alert sent to ${to}.`);
    return true;
  } catch (alertErr) {
    console.error("Failure alert could not be sent:", String(alertErr));
    return false;
  }
}
