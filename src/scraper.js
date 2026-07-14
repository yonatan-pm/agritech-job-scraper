import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AgritechJobScraper/1.0; +local)";

function stripHtml(text) {
  return (text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function jobIdFromUrl(url) {
  const m = String(url).match(/[?&]show=(\d+)/i);
  return m ? m[1] : null;
}

function parseJobsFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const jobs = [];
  const seen = new Set();

  $("tr").each((_, row) => {
    const $row = $(row);
    const $link = $row.find('a[href*="show="]').first();
    if (!$link.length) return;

    const href = $link.attr("href");
    const id = jobIdFromUrl(href);
    if (!id || seen.has(id)) return;
    seen.add(id);

    const title = stripHtml($row.find("h5").first().text());
    const muted = stripHtml($row.find(".text-muted").first().text());
    const fullText = stripHtml($row.find("td").first().text());

    let description = fullText;
    if (title) description = description.replace(title, "").trim();
    if (muted) description = description.replace(muted, "").trim();
    description = description
      .replace(/לפרטים נוספים ולהגשת מועמדות/g, "")
      .trim();

    const dateMatch = muted.match(/(\d{2}-\d{2}-\d{4})/);
    const location = muted.replace(/\d{2}-\d{2}-\d{4}/, "").replace(/-/g, " ").trim();

    jobs.push({
      id,
      title: title || `Job ${id}`,
      description,
      location,
      date: dateMatch ? dateMatch[1] : "",
      url: href.startsWith("http")
        ? href
        : new URL(href, pageUrl).toString(),
    });
  });

  // VIP cards (may duplicate table rows — dedupe by id)
  $(".card").each((_, card) => {
    const $card = $(card);
    const $link = $card.find('a[href*="show="]').first();
    if (!$link.length) return;

    const href = $link.attr("href");
    const id = jobIdFromUrl(href);
    if (!id || seen.has(id)) return;
    seen.add(id);

    jobs.push({
      id,
      title: stripHtml($card.find(".card-title").first().text()).replace(/\bVIP\b/gi, "").trim(),
      description: stripHtml($card.find(".card-text").first().text()),
      location: "",
      date: "",
      url: href.startsWith("http")
        ? href
        : new URL(href, pageUrl).toString(),
    });
  });

  return jobs;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Scrape listing pages and return unique jobs.
 */
export async function scrapeJobs(baseUrl, maxPages = 7) {
  const url = new URL(baseUrl);
  url.hash = "";
  const all = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("page", String(page));

    const html = await fetchPage(pageUrl.toString());
    const jobs = parseJobsFromHtml(html, pageUrl.toString());

    if (jobs.length === 0) break;

    for (const job of jobs) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      all.push(job);
    }

    // Be polite to the server
    await new Promise((r) => setTimeout(r, 400));
  }

  return all;
}
