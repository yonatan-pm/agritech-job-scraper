import { scrapeAgrisupport } from "./agrisupport.js";
import { scrapeAgriGov } from "./agriGov.js";
import { scrapeWeizmann } from "./weizmann.js";
import { scrapeHuji } from "./huji.js";

export const SOURCES = {
  agrisupport: {
    name: "AgriSupport",
    // Broad board — keep keyword filter
    filter: true,
    scrape: (cfg) => scrapeAgrisupport(cfg.agrisupportUrl, cfg.maxPages),
  },
  "agri-gov": {
    name: "Volcani / agri.gov.il",
    // Already agriculture-focused
    filter: false,
    scrape: (cfg) => scrapeAgriGov(cfg.agriGovUrl),
  },
  weizmann: {
    name: "Weizmann careers",
    filter: true,
    scrape: (cfg) => scrapeWeizmann(cfg.weizmannUrl),
  },
  huji: {
    name: "HUJI Hunter (agriculture area)",
    // Area filter already scopes to agriculture faculty
    filter: false,
    scrape: (cfg) => scrapeHuji(cfg.hujiUrl),
  },
};

/**
 * Parse JOBS_SOURCES env: comma-separated keys, or "all".
 */
export function resolveSourceKeys(jobsSources) {
  const raw = (jobsSources || "all").trim().toLowerCase();
  if (!raw || raw === "all") return Object.keys(SOURCES);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((k) => SOURCES[k]);
}

/**
 * Scrape all enabled sources. Continues on per-source errors.
 */
export async function scrapeAll(cfg) {
  const keys = resolveSourceKeys(cfg.jobsSources);
  const jobs = [];
  const errors = [];

  for (const key of keys) {
    const source = SOURCES[key];
    try {
      console.log(`Scanning ${source.name}…`);
      const batch = await source.scrape(cfg);
      console.log(`  ${source.name}: ${batch.length} listings`);
      jobs.push(...batch);
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`  ${source.name} failed: ${message}`);
      errors.push({ source: key, message });
    }
  }

  return { jobs, errors, sourceKeys: keys };
}

export function sourceNeedsFilter(sourceKey) {
  return SOURCES[sourceKey]?.filter !== false;
}
