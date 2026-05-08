import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = (process.env.BARTSPARTS_BASE_URL || "https://bartsparts.com").replace(/\/$/, "");
const outputPath = resolve(process.env.CATALOG_OUTPUT || "data/catalog.json");
const feedUrl = process.env.BARTSPARTS_FEED_URL;
const allowedBrandSlugs = ["john-deere", "fendt", "case-ih", "new-holland", "claas", "krone"];
const allowedBrandNames = ["JOHN DEERE", "FENDT", "CASE IH", "NEW HOLLAND", "CLAAS", "KRONE"];
const brandSlugs = (process.env.BARTSPARTS_BRANDS || allowedBrandSlugs.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter((item) => allowedBrandSlugs.includes(item))
  .filter(Boolean);
const maxPagesPerBrand = getNumberEnv("BARTSPARTS_MAX_PAGES", getNumberEnv("BARTSPARTS_PAGES_PER_BRAND", 500));
const limit = getNumberEnv("BARTSPARTS_LIMIT", 0);
const requestDelayMs = getNumberEnv("BARTSPARTS_REQUEST_DELAY_MS", 1500);

const categoryWords = [
  ["hydraulic", ["HYDRAULIC", "CYLINDER", "HOSE", "PUMP", "VALVE", "STEERING"]],
  ["combine", ["SIEVE", "BLADE", "BELT", "HARVEST", "DRUM", "AUGER"]],
  ["tractor", ["FILTER", "GASKET", "BEARING", "SEAL", "KIT", "SHAFT", "PIN", "O-RING"]]
];

const visuals = ["green", "amber", "blue", "red"];

function getNumberEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parsePrice(value) {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const price = Number(normalized);
  return Number.isFinite(price) ? price : 0;
}

function parseTitle(title) {
  const parts = title.split(" - ").map((item) => item.trim()).filter(Boolean);
  const brand = parts[0] || "BartsParts";
  const sku = parts[1] || slugify(title).toUpperCase();
  const warehouseMatch = title.match(/\s-\sWh\d+.*$/i);
  const cleanTitle = warehouseMatch ? title.replace(warehouseMatch[0], "").trim() : title.trim();
  const name = parts.length >= 3 ? parts.slice(2).join(" - ").replace(/\s-\sWh\d+.*$/i, "").trim() : cleanTitle;

  return { brand, sku, name: name || cleanTitle, cleanTitle };
}

function getCategory(productName) {
  const upperName = productName.toUpperCase();
  const match = categoryWords.find(([, words]) => words.some((word) => upperName.includes(word)));
  return match?.[0] || "tractor";
}

function getIcon(productName, category) {
  const upperName = productName.toUpperCase();

  if (upperName.includes("FILTER")) return "filter";
  if (upperName.includes("BELT")) return "rotate-cw-square";
  if (upperName.includes("BEARING")) return "disc-3";
  if (upperName.includes("CYLINDER") || upperName.includes("HYDRAULIC")) return "activity";
  if (category === "combine") return "wheat";
  if (category === "hydraulic") return "activity";
  return "package";
}

function normalizeProduct(raw, index) {
  const title = decodeHtml(raw.title || raw.name || "");
  const parsed = parseTitle(title);
  const category = raw.category || getCategory(parsed.name);
  const brand = raw.brand || parsed.brand;
  const sku = raw.sku || raw.partNumber || parsed.sku;
  const price = Number(raw.price) || parsePrice(String(raw.priceText || raw.price_from || ""));
  const currency = raw.currency || (String(raw.priceText || "").includes("€") ? "EUR" : "EUR");
  const stock = raw.stock || raw.availability || "Наличие уточняется";
  const url = raw.url?.startsWith("http") ? raw.url : `${baseUrl}${raw.url || ""}`;

  return {
    id: raw.id || `${slugify(brand)}-${slugify(sku)}-${index}`,
    name: parsed.name || title,
    brand,
    sku,
    category,
    price,
    currency,
    stock,
    visual: raw.visual || visuals[index % visuals.length],
    icon: raw.icon || getIcon(parsed.name, category),
    description:
      raw.description ||
      `Оригинальная запчасть ${parsed.name} для техники ${brand}. Данные синхронизированы с каталогом BartsParts.`,
    compatible: raw.compatible || brand,
    weight: raw.weight || "Уточняется",
    warranty: raw.warranty || "По условиям поставщика",
    url
  };
}

function isAllowedBrand(product) {
  const brand = String(product.brand || "").toUpperCase();
  return allowedBrandNames.some((allowedBrand) => brand.includes(allowedBrand));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ru,en;q=0.9",
      "user-agent": "Mozilla/5.0 (compatible; AgroDetalCatalogSync/1.0; +https://razilkik-ops.github.io/agro/)"
    }
  });

  if (!response.ok) {
    const error = new Error(`Failed to fetch ${url}: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.text();
}

function parseProductsFromHtml(html, sourceUrl) {
  const products = [];
  const productLinkPattern = /<a\b[^>]*href="([^"]*\/warehouse\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const matches = [...html.matchAll(productLinkPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const [, href, anchorHtml] = matches[index];
    const title = decodeHtml(stripTags(anchorHtml));

    if (!title || !title.includes(" - ")) {
      continue;
    }

    const start = matches[index].index || 0;
    const end = matches[index + 1]?.index || html.length;
    const chunk = html.slice(start, end);
    const priceMatch = chunk.match(/€\s*[\d,.]+/);
    const stockMatch = decodeHtml(stripTags(chunk)).match(/(\d+\s+parts?\s+in\s+\d+\s+Warehouses?)/i);

    products.push({
      title,
      url: href.startsWith("http") ? href : `${baseUrl}${href}`,
      priceText: priceMatch?.[0] || "",
      stock: stockMatch?.[1] || "Наличие уточняется",
      sourceUrl
    });
  }

  return products;
}

async function importFromFeed(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json") || url.endsWith(".json")) {
    const payload = await response.json();
    return Array.isArray(payload) ? payload : payload.products || payload.items || [];
  }

  const csv = await response.text();
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((item) => item.trim());

  return lines.map((line) => {
    const values = line.split(",").map((item) => item.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

async function importFromPages() {
  const products = [];
  const perBrandLimit = limit > 0 ? Math.max(1, Math.ceil(limit / brandSlugs.length)) : Infinity;

  for (const brandSlug of brandSlugs) {
    const brandProducts = [];
    const seenUrls = new Set();

    for (let page = 1; page <= maxPagesPerBrand; page += 1) {
      if (brandProducts.length >= perBrandLimit) break;

      const url = page === 1 ? `${baseUrl}/${brandSlug}/` : `${baseUrl}/${brandSlug}/?page=${page}`;
      let html = "";

      try {
        html = await fetchText(url);
      } catch (error) {
        if (error.status === 403 || error.status === 404) {
          console.log(`${brandSlug}: stopped at page ${page} (${error.status})`);
          break;
        }

        throw error;
      }

      const pageProducts = parseProductsFromHtml(html, url);
      const newProducts = pageProducts.filter((product) => {
        if (seenUrls.has(product.url)) {
          return false;
        }

        seenUrls.add(product.url);
        return true;
      });

      if (pageProducts.length === 0 || newProducts.length === 0) {
        console.log(`${brandSlug}: stopped at page ${page}`);
        break;
      }

      brandProducts.push(...newProducts);

      await new Promise((resolveDelay) => setTimeout(resolveDelay, requestDelayMs));
    }

    products.push(...brandProducts.slice(0, perBrandLimit));
  }

  return limit > 0 ? products.slice(0, limit) : products;
}

async function main() {
  const rawProducts = feedUrl ? await importFromFeed(feedUrl) : await importFromPages();
  const normalizedProducts = rawProducts
    .map(normalizeProduct)
    .filter(isAllowedBrand)
    .filter((item, index, list) => item.name && list.findIndex((candidate) => candidate.id === item.id) === index);

  const catalog = {
    metadata: {
      sourceName: feedUrl ? "BartsParts feed" : "BartsParts",
      sourceUrl: feedUrl || baseUrl,
      updatedAt: new Date().toISOString(),
      count: normalizedProducts.length,
      currency: normalizedProducts[0]?.currency || "EUR",
      brands: allowedBrandNames
    },
    products: normalizedProducts
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Catalog synced: ${normalizedProducts.length} products -> ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
