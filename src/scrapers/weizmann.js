import * as cheerio from "cheerio";
import { fetchPage, stripHtml } from "../fetchPage.js";

const DEFAULT_URL = "https://www.weizmann.ac.il/career/jobs?categories=7";
const ORIGIN = "https://www.weizmann.ac.il";

/**
 * Weizmann Institute career listings (category filter in URL).
 */
export async function scrapeWeizmann(listUrl = DEFAULT_URL) {
  const html = await fetchPage(listUrl || DEFAULT_URL);
  const $ = cheerio.load(html);
  const jobs = [];
  const seen = new Set();

  $(".job-item, .views-row .node--type-job").each((_, el) => {
    const $el = $(el);
    const $link = $el.find('a[href*="/career/jobs/"]').first();
    const href = $link.attr("href");
    if (!href) return;

    const idMatch = href.match(/\/career\/jobs\/(\d+)/);
    if (!idMatch) return;
    const id = `weizmann-${idMatch[1]}`;
    if (seen.has(id)) return;
    seen.add(id);

    const title = stripHtml(
      $el.find(".field--name-field-job-title-hebrew, h2").first().text()
    );
    const category = stripHtml(
      $el.find(".field--name-field-category").first().text()
    );
    const scope = stripHtml(
      $el.find(".field--name-field-job-scope, .field--name-field-scope").first().text()
    );

    jobs.push({
      id,
      source: "weizmann",
      title: title || id,
      description: [category, scope].filter(Boolean).join(" · "),
      location: "מכון ויצמן למדע",
      date: "",
      url: href.startsWith("http") ? href : new URL(href, ORIGIN).toString(),
    });
  });

  return jobs;
}
