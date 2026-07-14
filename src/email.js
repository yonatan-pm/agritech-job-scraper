import emailjs from "@emailjs/nodejs";

/**
 * Send job alert email via EmailJS.
 * Dashboard: https://www.emailjs.com
 * Template variables: to_email, subject, message, job_count
 */
export async function sendJobAlert({
  serviceId,
  templateId,
  publicKey,
  privateKey,
  notifyEmail,
  jobs,
}) {
  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      "EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in .env"
    );
  }

  const lines = jobs.map(
    (j, i) =>
      `${i + 1}. ${j.title}\n` +
      `   Location: ${j.location || "—"}\n` +
      `   Date: ${j.date || "—"}\n` +
      `   ${j.description || ""}\n` +
      `   Link: ${j.url}\n`
  );

  const subject = `Agritech/Agronomy jobs: ${jobs.length} new match${jobs.length === 1 ? "" : "es"}`;
  const message =
    `Found ${jobs.length} new agronomy/agritech job(s) on AgriSupport:\n\n` +
    lines.join("\n") +
    `\nSource: https://www.israel.agrisupportonline.com/drushim/csv/csvread.pl?mytemplate=tp1`;

  const templateParams = {
    to_email: notifyEmail,
    subject,
    message,
    job_count: String(jobs.length),
  };

  const options = { publicKey };
  if (privateKey) options.privateKey = privateKey;

  const response = await emailjs.send(
    serviceId,
    templateId,
    templateParams,
    options
  );

  return response;
}
