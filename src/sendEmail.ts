import { Resend } from "resend";

/**
 * Sends the digest via Resend. Uses the verified FROM_EMAIL if provided,
 * otherwise Resend's shared testing sender (onboarding@resend.dev).
 */
export async function sendEmail(
  subject: string,
  html: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RECIPIENT_EMAIL;
  const from = process.env.FROM_EMAIL || "History Today <onboarding@resend.dev>";

  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  if (!to) throw new Error("RECIPIENT_EMAIL is not set.");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({ from, to, subject, html });

  if (error) {
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }
  console.log(`Email sent to ${to} (id: ${data?.id}).`);
}
