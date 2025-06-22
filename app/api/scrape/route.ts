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
    parseAll: async (_: cheerio.Root, model: string): Promise<ScrapeResult[]> => {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page    = await browser.newPage();
      const searchUrl = `https://hobbyholics.com/search.php?search_query=${encodeURIComponent(model)}`;

      await page.goto(searchUrl, { waitUntil: "networkidle2" });
      // wait for JS to render the list
      await page.waitForSelector("ul.productGrid li.product");

      const items: ScrapeResult[] = await page.evaluate(() => {
        return Array.from(document.querySelectorAll<HTMLLIElement>("ul.productGrid li.product")).map(el => {
          // skip sold-out or missing
          const soldOut = !!el.querySelector(".outofstock, .sold-out");
          if (soldOut) return null;

          // name & link
          const a = el.querySelector<HTMLAnchorElement>("figure.card-figure a.card-figure__link");
          const name = a?.getAttribute("aria-label")?.trim() || a?.textContent?.trim() || "";
          let link = a?.href || "";
          if (link && !link.startsWith("http")) link = `https://hobbyholics.com${link}`;

          // image
          const img = el.querySelector<HTMLImageElement>("img.card-image");
          let picture = img?.src || img?.getAttribute("data-src") || "";
          if (picture && picture.startsWith("//")) picture = `https:${picture}`;
          else if (picture && !picture.startsWith("http")) picture = `https://hobbyholics.com${picture}`;

          // price: find all “$…” spans and pick the lowest
          const text = el.textContent || "";
          const prices = Array.from(text.matchAll(/\$(\d+(?:\.\d+)?)/g), m => parseFloat(m[1]));
          const price = prices.length
            ? `$${Math.min(...prices).toFixed(2)}`
            : "N/A";

          if (!name || price === "N/A" || !link || !picture) return null;
          return { site: "HobbyHolics", name, price, link, picture };
        })
        .filter((x): x is ScrapeResult => !!x);
      });

      await browser.close();
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
  {
    name: "NewtypeUS",
    url: (q: string) => `https://newtype.us/search?q=${encodeURIComponent(q)}`,
    parseAll: async (_: cheerio.Root, query: string): Promise<ScrapeResult[]> => {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page    = await browser.newPage();

      // avoid headless‐detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      );

      const searchUrl = `https://newtype.us/search?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "networkidle2" });
      // wait for the image wrappers to appear
      await page.waitForSelector("div.relative.flex.flex-col");

      const items: ScrapeResult[] = await page.$$eval(
        "div.relative.flex.flex-col",
        (wrappers) =>
          wrappers
            .map((wrap) => {
              // — 1) image & link
              const photoLink = wrap.querySelector<HTMLAnchorElement>("a.bg-photo");
              if (!photoLink) return null;

              let link = photoLink.href || photoLink.getAttribute("href")!;
              if (!link.startsWith("http")) link = `https://newtype.us${link}`;

              const imgEl = photoLink.querySelector<HTMLImageElement>("img");
              let picture = imgEl?.src || imgEl?.getAttribute("src") || "";
              if (picture.startsWith("//")) picture = `https:${picture}`;
              else if (!picture.startsWith("http")) picture = `https://newtype.us${picture}`;

              // — 2) details are in the very next sibling
              const detail = wrap.nextElementSibling as HTMLElement | null;
              if (!detail) return null;

              // — 3) product name
              const nameEl = detail.querySelector<HTMLAnchorElement>("a.text-strong");
              const name   = nameEl?.textContent?.trim() || "";
              if (!name) return null;

              // — 4) price: first <span> under the “items-center” row
              const priceEl = detail.querySelector<HTMLElement>("div.items-center span");
              const price   = priceEl?.textContent?.trim() || "N/A";
              if (price === "N/A") return null;

              // — 5) stock: drop if “out of stock”
              const stockTag = detail.querySelector<HTMLElement>("div.stock-tag");
              const stockTxt = stockTag?.textContent?.toLowerCase() || "";
              if (stockTxt.includes("out of stock")) return null;

              return { site: "NewtypeUS", name, price, link, picture };
            })
            .filter((x): x is ScrapeResult => !!x)
      );

      await browser.close();
      console.log("[NewtypeUS] Scraped items:", items.length);
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