import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cron from "node-cron";
import { scrapeJobs } from "./scraper.js";
import { isAgronomyOrAgritech } from "./filter.js";
import { sendJobAlert } from "./email.js";
import { loadSeen, saveSeen } from "./seen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const SEEN_FILE = path.join(root, "data", "seen-jobs.json");

function config() {
  return {
    jobsUrl:
      process.env.JOBS_URL ||
      "https://www.israel.agrisupportonline.com/drushim/csv/csvread.pl?mytemplate=tp1",
    emailjs: {
      serviceId: process.env.EMAILJS_SERVICE_ID || "",
      templateId: process.env.EMAILJS_TEMPLATE_ID || "",
      publicKey: process.env.EMAILJS_PUBLIC_KEY || "",
      privateKey: process.env.EMAILJS_PRIVATE_KEY || "",
    },
    email: process.env.NOTIFY_EMAIL || "tymaayan@gmail.com",
    cronSchedule: process.env.CRON_SCHEDULE || "0 9 * * *",
    maxPages: Number(process.env.MAX_PAGES || 7),
  };
}

export async function runOnce({ seed = false } = {}) {
  const cfg = config();
  console.log(`[${new Date().toISOString()}] Scanning jobs…`);

  const jobs = await scrapeJobs(cfg.jobsUrl, cfg.maxPages);
  console.log(`Fetched ${jobs.length} listings`);

  const matched = jobs.filter(isAgronomyOrAgritech);
  console.log(`Matched agronomy/agritech: ${matched.length}`);
  matched.slice(0, 15).forEach((j) => console.log(`  • ${j.title}`));

  const seen = loadSeen(SEEN_FILE);

  // First run or explicit --seed: remember current matches, do not email
  if (seed || seen.size === 0) {
    for (const j of matched) seen.add(j.id);
    saveSeen(SEEN_FILE, seen);
    console.log(
      `Saved ${matched.length} matches as baseline (no email). New posts will trigger EmailJS alerts.`
    );
    return { matched, fresh: [], emailed: false };
  }

  const fresh = matched.filter((j) => !seen.has(j.id));
  if (fresh.length === 0) {
    console.log("No new matching jobs.");
    return { matched, fresh, emailed: false };
  }

  console.log(`New jobs to notify: ${fresh.length}`);
  fresh.forEach((j) => console.log(`  • ${j.title} — ${j.url}`));

  await sendJobAlert({
    ...cfg.emailjs,
    notifyEmail: cfg.email,
    jobs: fresh,
  });

  for (const j of fresh) seen.add(j.id);
  saveSeen(SEEN_FILE, seen);
  console.log("Email sent via EmailJS and seen list updated.");
  return { matched, fresh, emailed: true };
}

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes("--once");
  const seed = args.includes("--seed");

  if (once || seed) {
    await runOnce({ seed });
    return;
  }

  const cfg = config();
  if (!cron.validate(cfg.cronSchedule)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${cfg.cronSchedule}`);
  }

  console.log(`Scheduler started. Cron: "${cfg.cronSchedule}" (local time)`);
  console.log("Press Ctrl+C to stop. Use npm run once for a single scan.");

  if (args.includes("--now")) {
    await runOnce({ seed: false });
  }

  cron.schedule(cfg.cronSchedule, () => {
    runOnce({ seed: false }).catch((err) => {
      console.error("Scheduled run failed:", err);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
