import * as cheerio from "cheerio";
import { fetchPage, stripHtml } from "../fetchPage.js";

const DEFAULT_URL =
  "https://huji.hunterhrms.com/search-results/?areas%5B%5D=4";

/**
 * Hebrew University Hunter HRMS search results (area filter in URL).
 * Agriculture faculty area — caller may include all listings without keyword filter.
 */
export async function scrapeHuji(listUrl = DEFAULT_URL) {
  const html = await fetchPage(listUrl || DEFAULT_URL);
  const $ = cheerio.load(html);
  const jobs = [];
  const seen = new Set();

  $(".job-wrap").each((_, el) => {
    const $el = $(el);
    const $input = $el.find("input[jobcode], input[id^='JB-']").first();
    const code =
      $input.attr("jobcode") ||
      $input.attr("id") ||
      ($el.find("a[href*='jobcode=']").attr("href") || "").match(
        /jobcode=(JB-\d+)/i
      )?.[1];

    if (!code || !/^JB-\d+/i.test(code)) return;
    const id = `huji-${code}`;
    if (seen.has(id)) return;
    seen.add(id);

    const title = stripHtml($el.find("label.job-title").first().text()).replace(
      new RegExp(`^${code}\\s*`, "i"),
      ""
    );
    const location = stripHtml($el.find(".kampus").first().text());
    const date = stripHtml($el.find(".last-date").first().text())
      .replace(/תאריך אחרון להגשה/g, "")
      .trim();
    const description = stripHtml(
      $el.find(".card-body, .sr-job-details, .more").first().text()
    );

    const href =
      $el.find("a[href*='jobcode=']").attr("href") ||
      `https://huji.hunterhrms.com/job-details/?jobcode=${code}`;

    jobs.push({
      id,
      source: "huji",
      title: title || code,
      description,
      location,
      date,
      url: href.startsWith("http") ? href : new URL(href, listUrl).toString(),
    });
  });

  return jobs;
}
