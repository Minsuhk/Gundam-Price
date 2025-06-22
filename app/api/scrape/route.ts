// app/api/scrape/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

interface ScrapeResult {
  site:   string;
  name:   string;
  price:  string;
  link:   string;
  picture: string;
}

const SITES = [
  {
    name: "Robots4Less",
    url:  (model: string) =>
      `https://r4lus.com/search?q=${encodeURIComponent(model)}`,
    parseAll: ($: cheerio.Root): ScrapeResult[] => {
      const items: ScrapeResult[] = [];
      $(".grid__item").each((_, el) => {
        const card = cheerio.load(el);
        const badgeText = card(".badge").first().text().trim().toLowerCase();
        if (badgeText.includes("sold out")) return;

        const aTag   = card(".card-information__text a").first();
        const rawHref = aTag.attr("href") || "";
        const link    = rawHref.startsWith("http")
          ? rawHref
          : `https://r4lus.com${rawHref}`;
        const name    = aTag.text().trim();
        const price =
          card(".price-item--sale").first().text().trim() ||
          card(".price-item--regular").first().text().trim() ||
          "N/A";

        const rawSrc = card(".card-wrapper img").first().attr("src") || "";
        const picture = rawSrc.startsWith("http")
          ? rawSrc
          : rawSrc.startsWith("//")
          ? `https:${rawSrc}`
          : `https://r4lus.com${rawSrc}`;

        if (!name || price === "N/A" || link === "https://r4lus.com") return;
        items.push({ site: "Robots4Less", name, price, link, picture });
      });
      return items;
    },
  },
  {
    name: "HobbyHolics",
    url: (model: string) =>
      `https://hobbyholics.com/search.php?search_query=${encodeURIComponent(model)}`,
    parseAll: ($: cheerio.Root): ScrapeResult[] => {
      const items: ScrapeResult[] = [];
      $("ul.productGrid li.product").each((_, el) => {
        const cardHtml = $.html(el);
        const card     = cheerio.load(el);
        const aTag = card("figure.card-figure > a.card-figure__link").first();
        const rawHref = aTag.attr("href") || "";
        const link    = rawHref.startsWith("http")
          ? rawHref
          : `https://hobbyholics.com${rawHref}`;
        const name    = aTag.attr("aria-label")?.trim() || aTag.text().trim();

        const matches = cardHtml.match(/\$\d+(?:\.\d+)?/g) || [];
        const price   = matches.length
          ? `$${Math.min(...matches.map(p => parseFloat(p.slice(1)))).toFixed(2)}`
          : "N/A";

        const imgEl   = card("img.card-image").first();
        const src     = imgEl.attr("src")     || "";
        const dataSrc = imgEl.attr("data-src")|| "";
        const rawSrc  = src || dataSrc;
        if (!rawSrc) return;

        const picture = rawSrc.startsWith("http")
          ? rawSrc
          : rawSrc.startsWith("//")
          ? `https:${rawSrc}`
          : `https://hobbyholics.com${rawSrc}`;

        if (!name || price === "N/A" || !link) return;
        items.push({ site: "HobbyHolics", name, price, link, picture });
      });
      return items;
    },
  },
  {
    name: "USAGundamStore",
    url: (model: string) =>
      `https://usagundamstore.com/collections/shop?q=${encodeURIComponent(model)}`,
    parseAll: async (_: cheerio.Root, model: string): Promise<ScrapeResult[]> => {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page    = await browser.newPage();
      const searchUrl = `https://usagundamstore.com/collections/shop?q=${encodeURIComponent(model)}`;

      await page.goto(searchUrl, { waitUntil: "networkidle2" });
      await page.waitForSelector("li.ss__result");

      const items: ScrapeResult[] = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("li.ss__result"))
          .map((el) => {
            // **1) Skip sold-out cards**
            if (el.querySelector(".flag.outofstock")) return null;

            // 2) Name & Link
            const linkEl = el.querySelector<HTMLAnchorElement>(
              "span.card-information__text.h5 a"
            );
            const name = linkEl?.textContent?.trim() || "";
            let link = linkEl?.href || "";
            if (link && !link.startsWith("http")) {
              link = `https://usagundamstore.com${link}`;
            }

            // 3) Price: sale first, else regular
            const saleEl = el.querySelector(".price--on-sale .price-item--sale");
            const regEl  = el.querySelector(".price__regular .price-item--regular");
            const saleTxt = saleEl?.textContent?.trim() || "";
            const regTxt  = regEl?.textContent?.trim()  || "";
            const price = saleTxt || regTxt || "N/A";

            // 4) Picture
            const imgEl = el.querySelector<HTMLImageElement>(
              ".media--hover-effect img"
            );
            let picture = imgEl?.getAttribute("src") || "";
            if (picture && !picture.startsWith("http")) {
              if (picture.startsWith("//")) picture = `https:${picture}`;
              else picture = `https://usagundamstore.com${picture}`;
            }

            return {
              site:    "USAGundamStore",
              name,
              price,
              link,
              picture,
            } as ScrapeResult;
          })
          // drop nulls and any with missing data
          .filter(
            (item): item is ScrapeResult =>
              !!item &&
              item.name.length > 0 &&
              item.price !== "N/A" &&
              item.link.length > 0
          );
      });

      await browser.close();
      return items;
    },
  },
  {
    name: "BrookhurstHobbies",
    url: (model: string) =>
      `https://brookhursthobbies.com/#99db/fullscreen/m=and&q=${encodeURIComponent(model)}`,
    // note: we ignore Cheerio’s Root here
    parseAll: async (_: cheerio.Root, model: string): Promise<ScrapeResult[]> => {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page    = await browser.newPage();
      const searchUrl = `https://brookhursthobbies.com/#99db/fullscreen/m=and&q=${encodeURIComponent(model)}`;

      await page.goto(searchUrl, { waitUntil: "networkidle2" });
      // their cards live under div.dfd-card inside #dfd-results-vAXL3
      await page.waitForSelector("div.dfd-card");

      const items: ScrapeResult[] = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.dfd-card")).map((el) => {
          // 1) Image + alt/title as name
          const thumb = el.querySelector<HTMLImageElement>(
            "div.dfd-card-thumbnail img"
          );
          let picture = thumb?.getAttribute("src") || "";
          if (picture && !picture.startsWith("http")) {
            picture = picture.startsWith("//")
              ? `https:${picture}`
              : `https://brookhursthobbies.com${picture}`;
          }
          const name =
            thumb?.getAttribute("alt")?.trim() ||
            thumb?.getAttribute("title")?.trim() ||
            "";

          // 2) Link
          const linkEl = el.querySelector<HTMLAnchorElement>("a.dfd-card-link");
          let link = linkEl?.href || "";
          if (link && !link.startsWith("http")) {
            link = `https://brookhursthobbies.com${link}`;
          }

          // 3) Price: grab every $X.XX, take lowest
          const text = el.textContent || "";
          const matches = Array.from(text.matchAll(/\$\d+(?:\.\d+)?/g), m => m[0]);
          const price =
            matches.length > 0
              ? `$${Math.min(...matches.map(p => parseFloat(p.slice(1)))).toFixed(2)}`
              : "N/A";

          // 4) Skip sold-out badges
          const badge = el.querySelector(".flag.autofstock")?.textContent?.toLowerCase();
          const soldOut = badge?.includes("sold out");

          return { site: "BrookhurstHobbies", name, price, link, picture, soldOut };
        })
        .filter(item =>
          // only keep valid, in-stock entries
          !item.soldOut &&
          item.name &&
          item.price !== "N/A" &&
          item.link
        )
        .map(({ soldOut, ...rest }) => rest); // strip the helper flag
      });

      await browser.close();
      return items;
    },
  },

];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 1) read both grade + model
  const grade = searchParams.get("grade")?.trim()  || "";
  const model = searchParams.get("model")?.trim()  || "";
  if (!model) {
    return NextResponse.json([], { status: 400 });
  }

  // 2) build a single combined query string
  const fullQuery = [grade, model].filter((x) => x).join(" ");  // e.g. "MG Strike Freedom"

  // 3) scrape every site, passing fullQuery into each URL/parser
  const all = await Promise.all(
    SITES.map(async ({ name, url, parseAll }) => {
      try {
        if (name === "USAGundamStore" || name === "BrookhurstHobbies") {
          // Puppeteer‐powered parsers already expect ( _ , modelString )
          return await parseAll(undefined as any, fullQuery);
        }

        // Cheerio sites: just hit their search endpoint with fullQuery
        const siteUrl = url(encodeURIComponent(fullQuery));
        const res     = await fetch(siteUrl);
        if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${name}`);
        const html = await res.text();
        const $    = cheerio.load(html);

        // pass cheerio root + **also** fullQuery, in case you ever use it there
        return parseAll($, fullQuery);
      } catch (err: any) {
        console.error(`Error scraping ${name}`, err);
        return [{
          site:    name,
          name:    `ERROR: ${err.message}`,
          price:   "N/A",
          link:    "",
          picture: ""
        }] as ScrapeResult[];
      }
    })
  );

  // 4) flatten all results into one array
  const results = all.flat();

  // 5) split your fullQuery into individual words
  const words = fullQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // 6) only keep products whose name contains *every* word
  const filtered = results.filter((item) => {
    const lower = item.name.toLowerCase();
    return words.every((w) => lower.includes(w));
  });

  // 7) return that final, filtered list
  return NextResponse.json(filtered, {
    status: 200,
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate" },
  });
}





//In the following code, is it possible to create buttons that will allow the user to change between the webscraping of different sites? For example, I want four buttons undearneath teh title of "Char's Choice". One for "Robots4Less", second for "HobbyHolics", third for "Brookhurt Hobbies", and fourth for "Amazon"