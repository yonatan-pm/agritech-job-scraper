import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cron from "node-cron";
import { scrapeAll, sourceNeedsFilter, SOURCES } from "./scrapers/index.js";
import { hasStrongAgronomySignal, isAgronomyOrAgritech } from "./filter.js";
import { sendJobAlert } from "./email.js";
import { loadSeen, saveSeen } from "./seen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const SEEN_FILE = path.join(root, "data", "seen-jobs.json");

function config() {
  return {
    jobsSources: process.env.JOBS_SOURCES || "all",
    agrisupportUrl:
      process.env.JOBS_URL ||
      "https://www.israel.agrisupportonline.com/drushim/csv/csvread.pl?mytemplate=tp1",
    agriGovUrl: process.env.AGRI_GOV_URL || "https://www.agri.gov.il/wanted/",
    weizmannUrl:
      process.env.WEIZMANN_URL ||
      "https://www.weizmann.ac.il/career/jobs?categories=7",
    hujiUrl:
      process.env.HUJI_URL ||
      "https://huji.hunterhrms.com/search-results/?areas%5B%5D=4",
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

function isMatch(job) {
  if (!sourceNeedsFilter(job.source)) return true;
  // Weizmann titles often say "טכנולוגיה" for IT — require a strong agronomy signal
  if (job.source === "weizmann") {
    return hasStrongAgronomySignal({
      title: job.title,
      description: "",
      location: "",
    });
  }
  return isAgronomyOrAgritech(job);
}

export async function runOnce({ seed = false } = {}) {
  const cfg = config();
  console.log(`[${new Date().toISOString()}] Scanning jobs…`);

  const { jobs, errors } = await scrapeAll(cfg);
  console.log(`Fetched ${jobs.length} listings from all sources`);

  const matched = jobs.filter(isMatch);
  console.log(`Matched / included: ${matched.length}`);
  matched.slice(0, 20).forEach((j) => {
    const label = SOURCES[j.source]?.name || j.source;
    console.log(`  • [${label}] ${j.title}`);
  });

  const seen = loadSeen(SEEN_FILE);

  // First run or explicit --seed: remember current matches, do not email
  if (seed || seen.size === 0) {
    for (const j of matched) seen.add(j.id);
    saveSeen(SEEN_FILE, seen);
    console.log(
      `Saved ${matched.length} matches as baseline (no email). New posts will trigger EmailJS alerts.`
    );
    if (errors.length) {
      console.warn(
        `Completed with ${errors.length} source error(s). Fix and re-run seed if needed.`
      );
    }
    return { matched, fresh: [], emailed: false, errors };
  }

  const fresh = matched.filter((j) => !seen.has(j.id));
  if (fresh.length === 0) {
    console.log("No new matching jobs.");
    if (errors.length) {
      console.warn(`Completed with ${errors.length} source error(s).`);
    }
    return { matched, fresh, emailed: false, errors };
  }

  console.log(`New jobs to notify: ${fresh.length}`);
  fresh.forEach((j) => {
    const label = SOURCES[j.source]?.name || j.source;
    console.log(`  • [${label}] ${j.title} — ${j.url}`);
  });

  await sendJobAlert({
    ...cfg.emailjs,
    notifyEmail: cfg.email,
    jobs: fresh,
  });

  for (const j of fresh) seen.add(j.id);
  saveSeen(SEEN_FILE, seen);
  console.log("Email sent via EmailJS and seen list updated.");
  return { matched, fresh, emailed: true, errors };
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
