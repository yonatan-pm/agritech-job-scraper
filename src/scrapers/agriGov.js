import * as cheerio from "cheerio";
import { fetchPage, stripHtml } from "../fetchPage.js";

const DEFAULT_URL = "https://www.agri.gov.il/wanted/";

function idFromUrl(href) {
  try {
    const u = new URL(href, DEFAULT_URL);
    const parts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    const slug = parts[parts.length - 1] || "unknown";
    return `agri-gov-${slug}`;
  } catch {
    return `agri-gov-${Buffer.from(href).toString("base64url").slice(0, 24)}`;
  }
}

/**
 * Volcani Institute / agri.gov.il wanted board.
 * Agriculture-focused board — caller may include all listings without keyword filter.
 */
export async function scrapeAgriGov(listUrl = DEFAULT_URL) {
  const html = await fetchPage(listUrl || DEFAULT_URL);
  const $ = cheerio.load(html);
  const jobs = [];
  const seen = new Set();

  $(".wanted-posting").each((_, el) => {
    const $el = $(el);
    const $link = $el.find("a.wanted-posting--wrapper, a[href*='/wanted/']").first();
    const href = $link.attr("href") || $el.find("a[href]").first().attr("href");
    if (!href) return;

    const id = idFromUrl(href);
    if (seen.has(id)) return;
    seen.add(id);

    const title = stripHtml($el.find("h3").first().text());
    const description = stripHtml($el.find(".wanted-posting-content").first().text());

    jobs.push({
      id,
      source: "agri-gov",
      title: title || id,
      description,
      location: "מכון וולקני / משרד החקלאות",
      date: "",
      url: href.startsWith("http") ? href : new URL(href, listUrl).toString(),
    });
  });

  return jobs;
}
