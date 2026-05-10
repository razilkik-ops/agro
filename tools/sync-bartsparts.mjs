import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const baseUrl = (process.env.BARTSPARTS_BASE_URL || "https://bartsparts.com").replace(/\/$/, "");
const previewPath = resolve(process.env.CATALOG_OUTPUT || "data/catalog.json");
const catalogDir = resolve(process.env.CATALOG_DIR || "data/catalog");
const searchDir = resolve(catalogDir, "search");
const stateDir = resolve(process.env.BARTSPARTS_STATE_DIR || "data/bartsparts");
const indexDir = resolve(stateDir, "index");
const cacheDir = resolve(stateDir, "cache");
const statePath = resolve(stateDir, "sync-state.json");
const indexMetadataPath = resolve(indexDir, "metadata.json");
const searchIndexPath = resolve(searchDir, "index.json");

const chunkSize = getNumberEnv("BARTSPARTS_CHUNK_SIZE", 1000);
const featuredPerBrand = getNumberEnv("BARTSPARTS_FEATURED_PER_BRAND", 12);
const limit = getNumberEnv("BARTSPARTS_LIMIT", 0, { allowZero: true });
const requestDelayMs = getNumberEnv("BARTSPARTS_REQUEST_DELAY_MS", 120);
const translationBatchSize = getNumberEnv("BARTSPARTS_TRANSLATION_BATCH_SIZE", 40);
const priceMarkup = getPercentEnv("BARTSPARTS_PRICE_MARKUP", 20);
const enrichPerRun = getNumberEnv("BARTSPARTS_ENRICH_PER_RUN", 2500, { allowZero: true });
const enrichConcurrency = getNumberEnv("BARTSPARTS_ENRICH_CONCURRENCY", 4);
const refreshIndex = process.env.BARTSPARTS_REFRESH_INDEX === "1";
const retryErrorHours = getNumberEnv("BARTSPARTS_ERROR_RETRY_HOURS", 12);
const searchPrefixLength = getNumberEnv("BARTSPARTS_SEARCH_PREFIX_LENGTH", 3);

const brandMap = {
  "john-deere": { label: "John Deere", visual: "green", icon: "package" },
  fendt: { label: "Fendt", visual: "amber", icon: "package" },
  "case-ih": { label: "Case IH", visual: "red", icon: "package" },
  "new-holland": { label: "New Holland", visual: "blue", icon: "package" },
  claas: { label: "Claas", visual: "green", icon: "package" },
  krone: { label: "Krone", visual: "amber", icon: "package" }
};

const allowedBrandSlugs = Object.keys(brandMap);
const brandSlugs = (process.env.BARTSPARTS_BRANDS || allowedBrandSlugs.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter((item) => allowedBrandSlugs.includes(item));

const searchRecordFields = [
  "id",
  "sku",
  "brand",
  "brandSlug",
  "name",
  "nameOriginal",
  "category",
  "price",
  "sourcePrice",
  "currency",
  "visual",
  "icon",
  "stock",
  "url"
];

const sitemapIndexes = [
  `${baseUrl}/content/sitemap-products/sitemap-en-0.xml`,
  `${baseUrl}/content/sitemap-expensive-products/sitemap-expensive.xml`
];

function getNumberEnv(key, fallback, options = {}) {
  const value = Number(process.env[key]);
  const { allowZero = false } = options;

  if (Number.isFinite(value) && (value > 0 || (allowZero && value === 0))) {
    return value;
  }

  return fallback;
}

function getPercentEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value / 100 : fallback / 100;
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function cleanText(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchValue(value = "") {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ё/gi, "е")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchValue(value = "") {
  return normalizeSearchValue(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSearchShardPrefix(token = "") {
  const normalized = normalizeSearchValue(token).replace(/\s+/g, "");

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, Math.min(searchPrefixLength, normalized.length));
}

function encodeSearchShardId(prefix = "") {
  return [...prefix].map((char) => char.codePointAt(0).toString(16)).join("-");
}

function slugifySku(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrice(value = "") {
  const match = cleanText(value).match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return 0;
  }

  return Number(match[1].replace(",", "."));
}

function normalizeUrl(path) {
  return new URL(cleanText(path), `${baseUrl}/`).toString();
}

function parseLocs(xml, pattern) {
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

function inferCategory(nameOriginal = "") {
  const value = nameOriginal.toLowerCase();

  if (/(hydraulic|cylinder|pump|valve|hose|seal|gasket|filter housing)/i.test(value)) {
    return "hydraulic";
  }

  if (/(combine|harvester|header|thresher|rotor|straw|chopper|auger)/i.test(value)) {
    return "combine";
  }

  return "tractor";
}

function toIsoDate(value = new Date()) {
  return value.toISOString();
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path, fallback) {
  try {
    const content = await readFile(path, "utf8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(path, value, pretty = false) {
  await mkdir(dirname(path), { recursive: true });
  const json = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  await writeFile(path, `${json}\n`);
}

async function fetchBuffer(url, attempt = 1) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      accept: "application/xml,text/xml;q=0.9,text/html;q=0.8,*/*;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    }
  });

  if (response.ok) {
    return Buffer.from(await response.arrayBuffer());
  }

  if ((response.status === 403 || response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(requestDelayMs * attempt * 4);
    return fetchBuffer(url, attempt + 1);
  }

  throw new Error(`Failed to fetch ${url}: ${response.status}`);
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    }
  });

  if (response.ok) {
    return response.text();
  }

  if ((response.status === 403 || response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(requestDelayMs * attempt * 4);
    return fetchText(url, attempt + 1);
  }

  throw new Error(`Failed to fetch ${url}: ${response.status}`);
}

async function loadSitemapUrls() {
  const productUrls = [];

  for (const indexUrl of sitemapIndexes) {
    console.log(`Loading sitemap index: ${indexUrl}`);
    const xml = (await fetchBuffer(indexUrl)).toString("utf8");

    if (xml.includes("<sitemapindex")) {
      const sitemapUrls = parseLocs(xml, /<loc>([^<]+\.xml\.gz)<\/loc>/g);

      for (const sitemapUrl of sitemapUrls) {
        const gz = await fetchBuffer(sitemapUrl);
        const sitemapXml = gunzipSync(gz).toString("utf8");
        const locs = parseLocs(sitemapXml, /<loc>(https:\/\/bartsparts\.com\/products\/[^<]+)<\/loc>/g);
        productUrls.push(...locs);
      }
    } else {
      const locs = parseLocs(xml, /<loc>(https:\/\/bartsparts\.com\/products\/[^<]+)<\/loc>/g);
      productUrls.push(...locs);
    }
  }

  return [...new Set(productUrls)];
}

function parseUrlToIndexEntry(url) {
  const parsed = new URL(url);
  const slug = parsed.pathname.replace(/^\/products\//, "").replace(/\/$/, "");
  const brandSlug = brandSlugs.find((candidate) => slug.startsWith(`${candidate}-`));

  if (!brandSlug) {
    return null;
  }

  const rawSku = slug.replace(new RegExp(`^${brandSlug}-`, "i"), "");
  let sku = rawSku;

  try {
    sku = decodeURIComponent(rawSku);
  } catch {
    sku = rawSku;
  }

  sku = cleanText(sku).toUpperCase();

  if (!sku) {
    return null;
  }

  return {
    id: `${brandSlug}-${slugifySku(sku)}`,
    brandSlug,
    brand: brandMap[brandSlug].label,
    sku,
    url: parsed.toString()
  };
}

async function buildIndexFromSitemap() {
  const urls = await loadSitemapUrls();
  const indexByBrand = brandSlugs.reduce((acc, brandSlug) => {
    acc[brandSlug] = [];
    return acc;
  }, {});
  const seenByBrand = brandSlugs.reduce((acc, brandSlug) => {
    acc[brandSlug] = new Set();
    return acc;
  }, {});

  for (const url of urls) {
    const entry = parseUrlToIndexEntry(url);

    if (!entry) {
      continue;
    }

    const seen = seenByBrand[entry.brandSlug];

    if (seen.has(entry.sku)) {
      continue;
    }

    seen.add(entry.sku);
    indexByBrand[entry.brandSlug].push(entry);
  }

  let totalCount = 0;

  await mkdir(indexDir, { recursive: true });

  for (const brandSlug of brandSlugs) {
    indexByBrand[brandSlug].sort((a, b) => a.sku.localeCompare(b.sku, "en"));
    totalCount += indexByBrand[brandSlug].length;
    await writeJson(resolve(indexDir, `${brandSlug}.json`), indexByBrand[brandSlug], false);
  }

  await writeJson(
    indexMetadataPath,
    {
      sourceName: "BartsParts sitemap",
      sourceUrl: baseUrl,
      updatedAt: toIsoDate(),
      totalCount,
      brands: brandSlugs.map((brandSlug) => ({
        brandSlug,
        brand: brandMap[brandSlug].label,
        count: indexByBrand[brandSlug].length
      }))
    },
    true
  );

  return indexByBrand;
}

async function loadIndexData() {
  const indexByBrand = {};
  let totalCount = 0;

  for (const brandSlug of brandSlugs) {
    const items = await readJson(resolve(indexDir, `${brandSlug}.json`), []);
    indexByBrand[brandSlug] = Array.isArray(items) ? items : [];
    totalCount += indexByBrand[brandSlug].length;
  }

  return { indexByBrand, totalCount };
}

async function ensureFullIndex() {
  const missingIndex = await Promise.all(
    brandSlugs.map(async (brandSlug) => !(await fileExists(resolve(indexDir, `${brandSlug}.json`))))
  );
  const mustRebuild = refreshIndex || missingIndex.some(Boolean);

  if (mustRebuild) {
    console.log("Building full index from sitemap...");
    const indexByBrand = await buildIndexFromSitemap();
    return { indexByBrand, rebuilt: true };
  }

  const { indexByBrand } = await loadIndexData();
  return { indexByBrand, rebuilt: false };
}

async function loadCacheData() {
  const cacheByBrand = {};

  for (const brandSlug of brandSlugs) {
    const cache = await readJson(resolve(cacheDir, `${brandSlug}.json`), {});
    cacheByBrand[brandSlug] = cache && typeof cache === "object" ? cache : {};
  }

  return cacheByBrand;
}

async function writeCacheData(cacheByBrand) {
  await mkdir(cacheDir, { recursive: true });

  for (const brandSlug of brandSlugs) {
    await writeJson(resolve(cacheDir, `${brandSlug}.json`), cacheByBrand[brandSlug], false);
  }
}

function getOffsets(indexByBrand) {
  const offsets = [];
  let cursor = 0;

  for (const brandSlug of brandSlugs) {
    const items = indexByBrand[brandSlug] || [];
    offsets.push({
      brandSlug,
      start: cursor,
      end: cursor + items.length
    });
    cursor += items.length;
  }

  return { offsets, totalCount: cursor };
}

function getEntryAtPosition(position, indexByBrand, offsets) {
  for (const offset of offsets) {
    if (position >= offset.start && position < offset.end) {
      const index = position - offset.start;
      return {
        ...indexByBrand[offset.brandSlug][index],
        brandSlug: offset.brandSlug
      };
    }
  }

  return null;
}

function shouldFetchCache(cacheItem) {
  if (!cacheItem) {
    return true;
  }

  if (!cacheItem.nameOriginal) {
    return true;
  }

  if (cacheItem.status === "error" && cacheItem.nextRetryAt && Date.now() >= Date.parse(cacheItem.nextRetryAt)) {
    return true;
  }

  return false;
}

function collectTargets(indexByBrand, cacheByBrand, cursor, maxTargets) {
  const { offsets, totalCount } = getOffsets(indexByBrand);

  if (totalCount === 0) {
    return {
      targets: [],
      nextCursor: 0,
      totalCount
    };
  }

  const targets = [];
  let steps = 0;

  while (steps < totalCount && targets.length < maxTargets) {
    const position = (cursor + steps) % totalCount;
    const entry = getEntryAtPosition(position, indexByBrand, offsets);

    if (entry) {
      const cacheItem = cacheByBrand[entry.brandSlug]?.[entry.sku];

      if (shouldFetchCache(cacheItem)) {
        targets.push({ position, entry });
      }
    }

    steps += 1;
  }

  return {
    targets,
    nextCursor: (cursor + steps) % totalCount,
    totalCount
  };
}

function extractNameFromCompositeTitle(title, brandLabel, sku) {
  const cleanTitle = cleanText(title);
  const marker = `${brandLabel} - ${sku} - `;

  if (cleanTitle.startsWith(marker)) {
    return cleanTitle.slice(marker.length).trim();
  }

  const parts = cleanTitle.split(" - ").map((item) => item.trim()).filter(Boolean);

  if (parts.length >= 3) {
    return parts.slice(2).join(" - ");
  }

  return cleanTitle;
}

function parseProductDetails(html, entry) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
  let productData = null;

  for (const script of scripts) {
    const raw = script[1];

    try {
      const parsed = JSON.parse(raw);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const product = values.find(
        (item) => item && typeof item === "object" && String(item["@type"] || "").toLowerCase() === "product"
      );

      if (product) {
        productData = product;
        break;
      }
    } catch {
      continue;
    }
  }

  const brandLabel = brandMap[entry.brandSlug].label;
  const fallbackName = `${brandLabel} ${entry.sku}`;
  let nameOriginal = "";
  let sourcePrice = 0;
  let currency = "EUR";

  if (productData) {
    const description = cleanText(productData.description || "");
    const titleName = cleanText(productData.name || "");

    nameOriginal =
      description ||
      extractNameFromCompositeTitle(titleName, brandLabel, entry.sku) ||
      fallbackName;

    const offers = productData.offers;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    const offerPrice = Number(offer?.price);

    if (Number.isFinite(offerPrice) && offerPrice > 0) {
      sourcePrice = offerPrice;
    }

    currency = cleanText(offer?.priceCurrency || productData.priceCurrency || "EUR") || "EUR";
  }

  if (!sourcePrice) {
    const priceMeta =
      html.match(/<meta property="product:price:amount" content="([^"]+)"/i)?.[1] ||
      html.match(/"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ||
      "";
    sourcePrice = parsePrice(priceMeta);
  }

  if (!nameOriginal) {
    const titleValue = cleanText(html.match(/<title>\s*([^<]+?)\s*\|/i)?.[1] || "");
    nameOriginal = extractNameFromCompositeTitle(titleValue, brandLabel, entry.sku) || fallbackName;
  }

  return {
    nameOriginal,
    sourcePrice: Number.isFinite(sourcePrice) ? roundMoney(sourcePrice) : 0,
    currency: currency || "EUR"
  };
}

async function translateBatch(batch) {
  const source = batch.map((item) => item.replace(/\s+/g, " ").trim()).join("\n");
  const url = new URL("https://translate.googleapis.com/translate_a/single");

  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "ru");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", source);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      accept: "application/json,text/plain,*/*",
      "accept-language": "ru,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Translation request failed: ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = Array.isArray(payload?.[0])
    ? payload[0].map((item) => item?.[0] || "").join("")
    : "";
  const translatedLines = translatedText.split("\n").map((item) => item.trim());

  return batch.map((original, index) => translatedLines[index] || original);
}

async function translateNames(names) {
  const unique = [...new Set(names.map((item) => cleanText(item)).filter(Boolean))];
  const map = new Map();

  for (let index = 0; index < unique.length; index += translationBatchSize) {
    const batch = unique.slice(index, index + translationBatchSize);

    try {
      const translated = await translateBatch(batch);
      batch.forEach((source, batchIndex) => {
        map.set(source, translated[batchIndex] || source);
      });
    } catch (error) {
      console.warn(`Translation fallback at batch ${index}: ${error.message}`);
      batch.forEach((source) => {
        map.set(source, source);
      });
    }

    await sleep(Math.max(100, requestDelayMs));
  }

  return map;
}

async function enrichTargets(targets, cacheByBrand) {
  const results = [];
  let pointer = 0;

  async function worker() {
    while (pointer < targets.length) {
      const currentIndex = pointer;
      pointer += 1;
      const target = targets[currentIndex];
      const { entry } = target;

      try {
        const html = await fetchText(entry.url);
        const details = parseProductDetails(html, entry);
        results.push({
          ok: true,
          entry,
          details
        });
      } catch (error) {
        results.push({
          ok: false,
          entry,
          error: error.message
        });
      }

      await sleep(requestDelayMs);
    }
  }

  const workers = Array.from({ length: Math.max(1, enrichConcurrency) }, () => worker());
  await Promise.all(workers);

  const namesToTranslate = results.filter((item) => item.ok).map((item) => item.details.nameOriginal);
  const translatedNames = await translateNames(namesToTranslate);
  const nowIso = toIsoDate();
  const retryAt = toIsoDate(new Date(Date.now() + retryErrorHours * 60 * 60 * 1000));

  for (const result of results) {
    const brandCache = cacheByBrand[result.entry.brandSlug];
    const previous = brandCache[result.entry.sku] || {};

    if (result.ok) {
      const sourceName = cleanText(result.details.nameOriginal);
      const translatedName = translatedNames.get(sourceName) || sourceName;

      brandCache[result.entry.sku] = {
        ...previous,
        sku: result.entry.sku,
        url: result.entry.url,
        nameOriginal: sourceName,
        name: translatedName,
        sourcePrice: result.details.sourcePrice,
        currency: result.details.currency || "EUR",
        status: "ok",
        errorCount: 0,
        nextRetryAt: null,
        lastFetchedAt: nowIso
      };
    } else {
      brandCache[result.entry.sku] = {
        ...previous,
        sku: result.entry.sku,
        url: result.entry.url,
        status: "error",
        error: result.error,
        errorCount: Number(previous.errorCount || 0) + 1,
        nextRetryAt: retryAt,
        lastFetchedAt: nowIso
      };
    }
  }

  return results;
}

function buildProducts(indexByBrand, cacheByBrand) {
  const productsByBrand = {};
  let totalProducts = 0;
  let enrichedProducts = 0;
  let pricedProducts = 0;

  for (const brandSlug of brandSlugs) {
    const brandInfo = brandMap[brandSlug];
    const entries = indexByBrand[brandSlug] || [];
    const cache = cacheByBrand[brandSlug] || {};

    productsByBrand[brandSlug] = entries.map((entry) => {
      const cached = cache[entry.sku] || {};
      const nameOriginal = cleanText(cached.nameOriginal || entry.sku);
      const sourcePrice = Number(cached.sourcePrice) || 0;
      const price = sourcePrice > 0 ? roundMoney(sourcePrice * (1 + priceMarkup)) : 0;
      const name = cleanText(cached.name || cached.nameOriginal || `${brandInfo.label} ${entry.sku}`);
      const category = inferCategory(nameOriginal);

      totalProducts += 1;

      if (cached.nameOriginal) {
        enrichedProducts += 1;
      }

      if (sourcePrice > 0) {
        pricedProducts += 1;
      }

      return {
        id: entry.id,
        name,
        nameOriginal,
        brand: brandInfo.label,
        sku: entry.sku,
        category,
        visual: brandInfo.visual,
        icon: brandInfo.icon,
        price,
        sourcePrice,
        currency: cached.currency || "EUR",
        stock: sourcePrice > 0 ? "Цена обновлена с BartsParts" : "Цена по запросу",
        url: entry.url
      };
    });
  }

  return {
    productsByBrand,
    totalProducts,
    enrichedProducts,
    pricedProducts
  };
}

function applyLimit(productsByBrand) {
  if (limit <= 0) {
    return productsByBrand;
  }

  const limited = {};
  let remaining = limit;

  for (const brandSlug of brandSlugs) {
    if (remaining <= 0) {
      limited[brandSlug] = [];
      continue;
    }

    const items = productsByBrand[brandSlug] || [];
    const slice = items.slice(0, remaining);
    limited[brandSlug] = slice;
    remaining -= slice.length;
  }

  return limited;
}

async function writeBrandChunks(groupedProducts) {
  const brandIndex = [];

  await rm(catalogDir, { recursive: true, force: true });
  await mkdir(catalogDir, { recursive: true });

  for (const brandSlug of brandSlugs) {
    const items = groupedProducts[brandSlug] || [];
    const pages = Math.max(1, Math.ceil(items.length / chunkSize));
    const brandDir = resolve(catalogDir, brandSlug);
    const brandInfo = brandMap[brandSlug];

    await mkdir(brandDir, { recursive: true });

    for (let page = 1; page <= pages; page += 1) {
      const slice = items.slice((page - 1) * chunkSize, page * chunkSize);

      await writeJson(resolve(brandDir, `page-${page}.json`), {
        metadata: {
          brand: brandInfo.label,
          brandSlug,
          page,
          pages,
          count: items.length,
          chunkSize,
          currency: "EUR",
          priceMarkupPercent: roundMoney(priceMarkup * 100)
        },
        products: slice
      });
    }

    brandIndex.push({
      brand: brandInfo.label,
      brandSlug,
      count: items.length,
      pages,
      visual: brandInfo.visual
    });
  }

  return brandIndex;
}

function createSearchRecord(product, brandSlug) {
  return [
    product.id,
    product.sku,
    product.brand,
    brandSlug,
    product.name,
    product.nameOriginal,
    product.category,
    product.price,
    product.sourcePrice,
    product.currency,
    product.visual,
    product.icon,
    product.stock,
    product.url
  ];
}

async function writeSearchIndex(groupedProducts) {
  const shardMap = new Map();
  let totalProducts = 0;

  await mkdir(searchDir, { recursive: true });

  for (const brandSlug of brandSlugs) {
    const products = groupedProducts[brandSlug] || [];

    for (const product of products) {
      totalProducts += 1;

      const tokens = new Set([
        ...tokenizeSearchValue(product.sku),
        ...tokenizeSearchValue(product.brand),
        ...tokenizeSearchValue(product.name),
        ...tokenizeSearchValue(product.nameOriginal)
      ]);
      const prefixes = [...new Set([...tokens].map((token) => getSearchShardPrefix(token)).filter(Boolean))];

      if (prefixes.length === 0) {
        continue;
      }

      const record = createSearchRecord(product, brandSlug);

      for (const prefix of prefixes) {
        const records = shardMap.get(prefix) || [];
        records.push(record);
        shardMap.set(prefix, records);
      }
    }
  }

  const shards = [];

  for (const prefix of [...shardMap.keys()].sort((a, b) => a.localeCompare(b, "ru"))) {
    const shardId = encodeSearchShardId(prefix);
    const records = shardMap.get(prefix) || [];

    await writeJson(
      resolve(searchDir, `${shardId}.json`),
      {
        metadata: {
          prefix,
          shardId,
          count: records.length
        },
        fields: searchRecordFields,
        products: records
      },
      false
    );

    shards.push({
      prefix,
      shardId,
      count: records.length
    });
  }

  await writeJson(
    searchIndexPath,
    {
      metadata: {
        sourceName: "BartsParts sitemap + product pages",
        sourceUrl: baseUrl,
        updatedAt: toIsoDate(),
        totalProducts,
        totalShards: shards.length,
        prefixLength: searchPrefixLength,
        minQueryLength: 2,
        fields: searchRecordFields
      },
      shards
    },
    true
  );

  return {
    totalProducts,
    totalShards: shards.length
  };
}

async function main() {
  const syncState = await readJson(statePath, {
    cursor: 0,
    totalCount: 0,
    lastRunAt: null,
    lastIndexBuildAt: null
  });

  const indexStatus = await ensureFullIndex();
  const indexByBrand = indexStatus.indexByBrand;
  const { totalCount } = getOffsets(indexByBrand);
  const cacheByBrand = await loadCacheData();

  const startCursor = Number(syncState.cursor) || 0;
  const { targets, nextCursor } = collectTargets(indexByBrand, cacheByBrand, startCursor, enrichPerRun);

  console.log(`Index size: ${totalCount}`);
  console.log(`Enrichment targets this run: ${targets.length}`);

  if (targets.length > 0) {
    const results = await enrichTargets(targets, cacheByBrand);
    const okCount = results.filter((item) => item.ok).length;
    const errCount = results.length - okCount;
    console.log(`Enriched OK: ${okCount}, errors: ${errCount}`);
  } else {
    console.log("No pending targets to enrich.");
  }

  await writeCacheData(cacheByBrand);

  const built = buildProducts(indexByBrand, cacheByBrand);
  const limitedProductsByBrand = applyLimit(built.productsByBrand);
  const brandIndex = await writeBrandChunks(limitedProductsByBrand);
  const searchIndex = await writeSearchIndex(limitedProductsByBrand);
  const featuredProducts = brandSlugs.flatMap((brandSlug) =>
    (limitedProductsByBrand[brandSlug] || []).slice(0, featuredPerBrand)
  );
  const limitedCount = brandSlugs.reduce(
    (sum, brandSlug) => sum + (limitedProductsByBrand[brandSlug] || []).length,
    0
  );

  await writeJson(
    resolve(catalogDir, "index.json"),
    {
      metadata: {
        sourceName: "BartsParts sitemap + product pages",
        sourceUrl: baseUrl,
        updatedAt: toIsoDate(),
        count: limitedCount,
        fullIndexCount: built.totalProducts,
        enrichedCount: built.enrichedProducts,
        pricedCount: built.pricedProducts,
        coveragePercent:
          built.totalProducts > 0 ? roundMoney((built.enrichedProducts / built.totalProducts) * 100) : 0,
        pricedCoveragePercent:
          built.totalProducts > 0 ? roundMoney((built.pricedProducts / built.totalProducts) * 100) : 0,
        chunkSize,
        currency: "EUR",
        priceMarkupPercent: roundMoney(priceMarkup * 100)
      },
      brands: brandIndex
    },
    true
  );

  await writeJson(
    previewPath,
    {
      metadata: {
        sourceName: "BartsParts sitemap + product pages",
        sourceUrl: baseUrl,
        updatedAt: toIsoDate(),
        count: limitedCount,
        fullIndexCount: built.totalProducts,
        enrichedCount: built.enrichedProducts,
        pricedCount: built.pricedProducts,
        coveragePercent:
          built.totalProducts > 0 ? roundMoney((built.enrichedProducts / built.totalProducts) * 100) : 0,
        pricedCoveragePercent:
          built.totalProducts > 0 ? roundMoney((built.pricedProducts / built.totalProducts) * 100) : 0,
        previewCount: featuredProducts.length,
        currency: "EUR",
        priceMarkupPercent: roundMoney(priceMarkup * 100),
        brands: brandIndex.map((brand) => brand.brand)
      },
      products: featuredProducts
    },
    true
  );

  await writeJson(
    statePath,
    {
      cursor: nextCursor,
      totalCount,
      lastRunAt: toIsoDate(),
      lastIndexBuildAt: indexStatus.rebuilt ? toIsoDate() : syncState.lastIndexBuildAt,
      pendingTargets: Math.max(0, totalCount - built.enrichedProducts)
    },
    true
  );

  console.log(`Catalog built: ${limitedCount} products`);
  console.log(`Search shards built: ${searchIndex.totalShards}`);
  console.log(
    `Coverage: ${built.enrichedProducts}/${built.totalProducts}, priced: ${built.pricedProducts}/${built.totalProducts}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
