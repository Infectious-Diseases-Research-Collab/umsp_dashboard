import 'server-only';
import nodemailer from 'nodemailer';

// Supabase's own SMTP settings only serve Supabase Auth emails, so the app
// carries its own copy of the same credentials in SMTP_* env vars.
function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  const port = Number(SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

/**
 * Sends a plain-text email. Never throws: a failed notification must not fail
 * the request that triggered it, since everything is also visible in the app.
 */
export async function sendEmail(to: string | string[], subject: string, text: string): Promise<boolean> {
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length) return false;

  const transport = createTransport();
  if (!transport) {
    console.warn(`SMTP_HOST not set; skipped email "${subject}"`);
    return false;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  // Low-volume automated mail tends to land in spam; ask readers to allow-list us.
  const sender = from?.match(/<([^>]+)>/)?.[1] ?? from;
  const footer = [
    '',
    '--',
    'UMSP Malaria Surveillance Dashboard',
    `To make sure these emails reach your inbox, add ${sender} to your contacts or mark this message as "Not spam".`,
  ].join('\n');

  try {
    await transport.sendMail({
      from,
      to: recipients,
      subject,
      text: text + '\n' + footer,
    });
    return true;
  } catch (error) {
    console.error(`Email "${subject}" failed:`, error);
    return false;
  }
}
