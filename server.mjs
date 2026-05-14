import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname, normalize } from "node:path";

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8787);
const apiPerPage = Math.max(1, Number(process.env.API_PRODUCTS_PER_PAGE || 20));
const apiConcurrency = Math.max(1, Number(process.env.API_ENRICH_CONCURRENCY || 6));
const requestDelayMs = Math.max(0, Number(process.env.API_REQUEST_DELAY_MS || 40));
const projectRoot = process.cwd();
const dataRoot = resolve(projectRoot, "data");
const catalogIndexPath = resolve(projectRoot, "data/catalog/index.json");
const catalogPreviewPath = resolve(projectRoot, "data/catalog.json");
const brandCacheDir = resolve(projectRoot, "data/bartsparts/cache");
const searchIndexPath = resolve(projectRoot, "data/catalog/search/index.json");
const searchDir = resolve(projectRoot, "data/catalog/search");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const brandCacheStore = new Map();
const brandCacheLocks = new Map();
let cachedSearchIndex = null;
let cachedSearchShardMap = new Map();
const searchShardStore = new Map();
const priceCacheTtlMs = Math.max(1000, Number(process.env.API_PRICE_CACHE_TTL_MS || 3 * 60 * 60 * 1000));

function cleanText(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return cleanText(String(value).replace(/<[^>]*>/g, " "));
}

function extractAttribute(value = "", name) {
  const pattern = new RegExp(`\\b${name}=["']([^"']+)["']`, "i");
  return cleanText(value.match(pattern)?.[1] || "");
}

function normalizeSourceUrl(value = "") {
  if (!value) {
    return "";
  }

  try {
    return new URL(cleanText(value), "https://bartsparts.com/").toString();
  } catch {
    return "";
  }
}

function pickImageUrl(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return normalizeSourceUrl(value);
  }

  if (Array.isArray(value)) {
    return pickImageUrl(value[0]);
  }

  if (typeof value === "object") {
    return pickImageUrl(value.url || value.contentUrl || value["@id"]);
  }

  return "";
}

function normalizeAvailability(value = "") {
  const cleaned = cleanText(value).toLowerCase();

  if (!cleaned) {
    return "";
  }

  if (cleaned.includes("instock") || cleaned.includes("in stock")) {
    return "in_stock";
  }

  if (cleaned.includes("outofstock") || cleaned.includes("out of stock")) {
    return "out_of_stock";
  }

  if (cleaned.includes("preorder") || cleaned.includes("pre-order")) {
    return "preorder";
  }

  if (cleaned.includes("backorder")) {
    return "backorder";
  }

  return cleaned.replace(/^https?:\/\/schema\.org\//, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function formatStock(sourcePrice, availability = "", fallback = "Цена уточняется") {
  if (availability === "out_of_stock") {
    return "Нет в наличии";
  }

  if (availability === "preorder" || availability === "backorder") {
    return "Под заказ";
  }

  return sourcePrice > 0 ? "Цена обновлена" : fallback;
}

function normalizeSearchValue(value = "") {
  return String(value)
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

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function decodeSearchProduct(record, fields = []) {
  return fields.reduce((product, field, index) => {
    product[field] = record[index];
    return product;
  }, {});
}

function getSearchMinQueryLength(index) {
  return Number(index?.metadata?.minQueryLength) || 2;
}

function getSearchPrefixLength(index) {
  return Number(index?.metadata?.prefixLength) || 3;
}

function getSearchShardPrefix(token = "", index = null) {
  const normalized = normalizeSearchValue(token).replace(/\s+/g, "");

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, Math.min(getSearchPrefixLength(index), normalized.length));
}

function buildSearchableText(product) {
  return normalizeSearchValue(
    [product.sku, product.brand, product.name, product.nameOriginal, product.category].filter(Boolean).join(" ")
  );
}

function matchesSearchProduct(product, normalizedQuery, tokens) {
  const searchable = buildSearchableText(product);

  if (!searchable) {
    return false;
  }

  return tokens.every((token) => searchable.includes(token)) || searchable.includes(normalizedQuery);
}

function scoreSearchProduct(product, normalizedQuery, tokens) {
  const sku = normalizeSearchValue(product.sku);
  const name = normalizeSearchValue(product.name);
  const nameOriginal = normalizeSearchValue(product.nameOriginal);
  const brand = normalizeSearchValue(product.brand);
  const searchable = [sku, name, nameOriginal, brand].join(" ");
  let score = 0;

  if (sku === normalizedQuery) {
    score += 500;
  } else if (sku.startsWith(normalizedQuery)) {
    score += 220;
  }

  if (name.startsWith(normalizedQuery)) {
    score += 170;
  }

  if (nameOriginal.startsWith(normalizedQuery)) {
    score += 140;
  }

  if (brand.startsWith(normalizedQuery)) {
    score += 80;
  }

  score += tokens.filter((token) => searchable.includes(token)).length * 25;

  if (Number(product.price) > 0) {
    score += 5;
  }

  return score;
}

function parseSourcePrice(value = "") {
  const match = cleanText(value)
    .replace(/\u00a0/g, " ")
    .match(/(\d[\d\s.,]*)/);

  if (!match) {
    return 0;
  }

  let numberText = match[1].replace(/\s+/g, "");
  const commaIndex = numberText.lastIndexOf(",");
  const dotIndex = numberText.lastIndexOf(".");

  if (commaIndex !== -1 && dotIndex !== -1) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    numberText = numberText.replaceAll(thousandsSeparator, "");
    numberText = decimalSeparator === "," ? numberText.replace(",", ".") : numberText;
  } else if (commaIndex !== -1) {
    numberText = /\d+,\d{1,2}$/.test(numberText) ? numberText.replace(",", ".") : numberText.replaceAll(",", "");
  } else if (dotIndex !== -1 && !/\d+\.\d{1,2}$/.test(numberText)) {
    numberText = numberText.replaceAll(".", "");
  }

  const parsed = Number(numberText);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractVisibleProductPrice(html) {
  const patterns = [
    /<div[^>]*class="[^"]*productView-price[^"]*"[^>]*>[\s\S]*?<span[^>]*(?:data-product-price-without-tax|class="[^"]*price[^"]*price--withoutTax)[^>]*>([\s\S]*?)<\/span>/i,
    /<span[^>]*data-product-price-without-tax[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    /<meta[^>]*itemprop="price"[^>]*content="([^"]+)"[^>]*>/i,
    /<meta[^>]*content="([^"]+)"[^>]*itemprop="price"[^>]*>/i
  ];

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1] || "";
    const price = parseSourcePrice(stripTags(value));

    if (price > 0) {
      return price;
    }
  }

  return 0;
}

function extractVisibleOldProductPrice(html = "") {
  const patterns = [
    /<span[^>]*(?:data-product-rrp-without-tax|data-product-non-sale-price-without-tax)[^>]*>([\s\S]*?)<\/span>/i,
    /<span[^>]*class=["'][^"']*(?:price--rrp|price--non-sale|price--was|was-price|old-price)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    /<div[^>]*class=["'][^"']*(?:rrp-price|non-sale-price|was-price|old-price)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1] || "";
    const price = parseSourcePrice(stripTags(value));

    if (price > 0) {
      return price;
    }
  }

  return 0;
}

function collectJsonLdNodes(value, nodes = []) {
  if (!value || typeof value !== "object") {
    return nodes;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLdNodes(item, nodes);
    }
    return nodes;
  }

  nodes.push(value);
  collectJsonLdNodes(value["@graph"], nodes);
  return nodes;
}

function extractProductImage(html = "", productData = null) {
  const fallback =
    cleanText(html.match(/<meta[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] || "") ||
    cleanText(html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i)?.[1] || "") ||
    extractAttribute(html.match(/<img[^>]*class=["'][^"']*productView-image[^"']*["'][^>]*>/i)?.[0] || "", "src") ||
    extractAttribute(html.match(/<img[^>]*data-main-image[^>]*>/i)?.[0] || "", "src");

  return pickImageUrl(productData?.image) || (fallback ? normalizeSourceUrl(fallback) : "");
}

function appendPriceHistory(previous = {}, next = {}) {
  const currentPrice = Number(next.sourcePrice) || 0;
  const previousPrice = Number(previous.sourcePrice) || 0;

  if (currentPrice <= 0 || currentPrice === previousPrice) {
    return Array.isArray(previous.priceHistory) ? previous.priceHistory.slice(-50) : [];
  }

  return [
    ...(Array.isArray(previous.priceHistory) ? previous.priceHistory : []),
    {
      sourcePrice: currentPrice,
      oldSourcePrice: previousPrice || Number(next.oldSourcePrice) || 0,
      currency: next.currency || previous.currency || "EUR",
      fetchedAt: next.lastFetchedAt
    }
  ].slice(-50);
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

function jsonReply(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function errorReply(res, statusCode, message) {
  jsonReply(res, statusCode, { error: message });
}

async function readJson(path, fallback) {
  try {
    const content = await readFile(path, "utf8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value)}\n`);
}

function withBrandLock(brandSlug, handler) {
  const previous = brandCacheLocks.get(brandSlug) || Promise.resolve();
  const next = previous
    .catch(() => null)
    .then(handler)
    .finally(() => {
      if (brandCacheLocks.get(brandSlug) === next) {
        brandCacheLocks.delete(brandSlug);
      }
    });
  brandCacheLocks.set(brandSlug, next);
  return next;
}

async function loadBrandCache(brandSlug) {
  if (!brandSlug) {
    return {};
  }

  if (brandCacheStore.has(brandSlug)) {
    return brandCacheStore.get(brandSlug);
  }

  const cachePath = resolve(brandCacheDir, `${brandSlug}.json`);
  const cache = await readJson(cachePath, {});
  const store = cache && typeof cache === "object" ? cache : {};
  brandCacheStore.set(brandSlug, store);
  return store;
}

async function persistBrandCache(brandSlug) {
  if (!brandSlug || !brandCacheStore.has(brandSlug)) {
    return;
  }

  const cachePath = resolve(brandCacheDir, `${brandSlug}.json`);
  const payload = brandCacheStore.get(brandSlug);
  await withBrandLock(brandSlug, () => writeJson(cachePath, payload));
}

function getCacheEntryFresh(entry) {
  if (!entry || !entry.lastFetchedAt) {
    return false;
  }

  const ts = Date.parse(entry.lastFetchedAt);
  return Number.isFinite(ts) && Date.now() - ts < priceCacheTtlMs;
}

function parseBartsPartsHtml(html, product) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
  let nameOriginal = "";
  let sourcePrice = 0;
  let oldSourcePrice = 0;
  let currency = product.currency || "EUR";
  let image = "";
  let availability = "";

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1]);
      const values = collectJsonLdNodes(parsed);
      const item = values.find(
        (entry) => entry && typeof entry === "object" && String(entry["@type"] || "").toLowerCase() === "product"
      );

      if (!item) {
        continue;
      }

      nameOriginal =
        extractNameFromCompositeTitle(item.description, product.brand, product.sku) ||
        extractNameFromCompositeTitle(item.name, product.brand, product.sku);
      const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      const parsedPrice = parseSourcePrice(offers?.price);

      if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
        sourcePrice = parsedPrice;
      }

      currency = cleanText(offers?.priceCurrency || item.priceCurrency || currency) || currency;
      oldSourcePrice = parseSourcePrice(offers?.highPrice || item.highPrice || "");
      image = extractProductImage(html, item);
      availability = normalizeAvailability(offers?.availability || item.availability || "");
      break;
    } catch {
      continue;
    }
  }

  if (!sourcePrice) {
    sourcePrice = extractVisibleProductPrice(html);
  }

  if (!oldSourcePrice) {
    oldSourcePrice = extractVisibleOldProductPrice(html);
  }

  if (!sourcePrice) {
    const metaPrice =
      html.match(/<meta property="product:price:amount" content="([^"]+)"/i)?.[1] ||
      html.match(/"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ||
      "";
    sourcePrice = parseSourcePrice(metaPrice);
  }

  if (!image) {
    image = extractProductImage(html);
  }

  if (!availability) {
    const availabilityMeta =
      html.match(/<link[^>]*itemprop=["']availability["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ||
      html.match(/"availability"\s*:\s*"([^"]+)"/i)?.[1] ||
      "";
    availability = normalizeAvailability(availabilityMeta);
  }

  if (!nameOriginal) {
    nameOriginal =
      cleanText(html.match(/<h1[^>]*class="[^"]*productView-title[^"]*"[^>]*>\s*([^<]+?)\s*<\/h1>/i)?.[1] || "") ||
      cleanText(html.match(/<title>\s*([^<]+?)\s*\|/i)?.[1] || "") ||
      product.nameOriginal ||
      product.name;
  }

  return {
    nameOriginal,
    sourcePrice: roundMoney(sourcePrice),
    oldSourcePrice: oldSourcePrice > sourcePrice ? roundMoney(oldSourcePrice) : 0,
    currency: currency || "EUR",
    image,
    availability
  };
}

async function fetchProductHtml(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`BartsParts request failed: ${response.status}`);
  }

  return response.text();
}

function patchProductFromCache(product, cacheItem, markupRate) {
  const sourcePrice = Number(cacheItem?.sourcePrice) || 0;
  const oldSourcePrice = Number(cacheItem?.oldSourcePrice) || 0;
  const price = sourcePrice > 0 ? roundMoney(sourcePrice * (1 + markupRate)) : 0;
  const oldPrice = oldSourcePrice > sourcePrice ? roundMoney(oldSourcePrice * (1 + markupRate)) : 0;
  const nameOriginal = cleanText(cacheItem?.nameOriginal || product.nameOriginal || product.name);
  const availability = cacheItem?.availability || product.availability || "";

  return {
    ...product,
    nameOriginal,
    name: cleanText(nameOriginal || product.name),
    sourcePrice,
    price,
    oldSourcePrice,
    oldPrice,
    currency: cacheItem?.currency || product.currency || "EUR",
    image: cacheItem?.image || product.image || "",
    availability,
    priceUpdatedAt: cacheItem?.priceUpdatedAt || cacheItem?.lastFetchedAt || product.priceUpdatedAt || "",
    lastFetchedAt: cacheItem?.lastFetchedAt || product.lastFetchedAt || "",
    stock: formatStock(sourcePrice, availability, product.stock || "Цена уточняется")
  };
}

async function ensureProductPrice(product, markupRate) {
  const brandSlug = product.brandSlug || "";
  const sku = cleanText(product.sku || "").toUpperCase();

  if (!brandSlug || !sku || !product.url) {
    return product;
  }

  const cache = await loadBrandCache(brandSlug);
  const cached = cache?.[sku];
  const cachedSourcePrice = Number(cached?.sourcePrice) || 0;

  if (cached && getCacheEntryFresh(cached) && (cached.nameOriginal || cachedSourcePrice > 0) && cachedSourcePrice > 0) {
    return patchProductFromCache(product, cached, markupRate);
  }

  try {
    const html = await fetchProductHtml(product.url);
    const details = parseBartsPartsHtml(html, product);
    const nowIso = new Date().toISOString();

    cache[sku] = {
      ...(cached || {}),
      sku,
      url: product.url,
      nameOriginal: details.nameOriginal,
      name: details.nameOriginal,
      sourcePrice: details.sourcePrice,
      oldSourcePrice: details.oldSourcePrice || 0,
      currency: details.currency || "EUR",
      image: details.image || cached?.image || "",
      availability: details.availability || cached?.availability || "",
      status: "ok",
      errorCount: 0,
      nextRetryAt: null,
      lastFetchedAt: nowIso,
      priceUpdatedAt:
        Number(cached?.sourcePrice || 0) !== Number(details.sourcePrice || 0)
          ? nowIso
          : cached?.priceUpdatedAt || nowIso
    };

    cache[sku].priceHistory = appendPriceHistory(cached || {}, cache[sku]);

    await persistBrandCache(brandSlug);
    return patchProductFromCache(product, cache[sku], markupRate);
  } catch {
    if (cached && (cached.nameOriginal || Number(cached.sourcePrice) > 0)) {
      return patchProductFromCache(product, cached, markupRate);
    }

    return product;
  } finally {
    if (requestDelayMs > 0) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, requestDelayMs));
    }
  }
}

async function enrichProducts(products, markupRate) {
  const result = [...products];
  let pointer = 0;

  async function worker() {
    while (pointer < result.length) {
      const index = pointer;
      pointer += 1;
      const product = result[index];

      if (Number(product.sourcePrice) > 0 && Number(product.price) > 0) {
        continue;
      }

      result[index] = await ensureProductPrice(product, markupRate);
    }
  }

  const workers = Array.from({ length: Math.max(1, apiConcurrency) }, () => worker());
  await Promise.all(workers);
  return result;
}

async function getCatalogIndex() {
  const index = await readJson(catalogIndexPath, null);

  if (!index || !Array.isArray(index.brands)) {
    throw new Error("Catalog index is missing or invalid");
  }

  return index;
}

async function loadSearchIndexData() {
  if (cachedSearchIndex) {
    return cachedSearchIndex;
  }

  const index = await readJson(searchIndexPath, null);

  if (!index || !Array.isArray(index.shards)) {
    throw new Error("Search index is missing or invalid");
  }

  cachedSearchIndex = index;
  cachedSearchShardMap = new Map((index.shards || []).map((item) => [item.prefix, item]));
  return index;
}

async function loadSearchShard(index, prefix) {
  if (!prefix) {
    return [];
  }

  if (searchShardStore.has(prefix)) {
    return searchShardStore.get(prefix);
  }

  const shardInfo = cachedSearchShardMap.get(prefix);

  if (!shardInfo?.shardId) {
    searchShardStore.set(prefix, []);
    return [];
  }

  const shardPath = resolve(searchDir, `${shardInfo.shardId}.json`);
  const payload = await readJson(shardPath, { products: [] });
  const fields = Array.isArray(index?.metadata?.fields) ? index.metadata.fields : [];
  const products = Array.isArray(payload.products) ? payload.products.map((record) => decodeSearchProduct(record, fields)) : [];

  searchShardStore.set(prefix, products);
  return products;
}

function brandSlugFromName(index, brandName) {
  const item = index.brands.find((entry) => cleanText(entry.brand) === cleanText(brandName));
  return item?.brandSlug || "";
}

async function getCatalogPage(index, brandSlug, page, perPage) {
  const isAll = !brandSlug || brandSlug === "all";
  const currentPage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.max(1, Number(perPage) || apiPerPage);
  const markupRate = Number(index?.metadata?.priceMarkupPercent || 20) / 100;
  const chunkSize = Number(index?.metadata?.chunkSize || 1000);

  if (isAll) {
    const preview = await readJson(catalogPreviewPath, { products: [] });
    const allProducts = Array.isArray(preview.products) ? preview.products : [];
    const totalCount = allProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / safePerPage));
    const clampedPage = Math.min(currentPage, totalPages);
    const start = (clampedPage - 1) * safePerPage;
    const products = allProducts.slice(start, start + safePerPage).map((product) => ({
      ...product,
      brandSlug: brandSlugFromName(index, product.brand)
    }));

    const enriched = await enrichProducts(products, markupRate);
    return {
      metadata: {
        brandSlug: "all",
        page: clampedPage,
        pages: totalPages,
        count: totalCount,
        productsPerPage: safePerPage
      },
      products: enriched
    };
  }

  const brandInfo = index.brands.find((entry) => entry.brandSlug === brandSlug);

  if (!brandInfo) {
    throw new Error(`Unknown brand slug: ${brandSlug}`);
  }

  const totalCount = Number(brandInfo.count) || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const start = (clampedPage - 1) * safePerPage;
  const sourcePage = Math.floor(start / chunkSize) + 1;
  const offset = start % chunkSize;
  const sourcePath = resolve(dataRoot, `catalog/${brandSlug}/page-${sourcePage}.json`);
  const source = await readJson(sourcePath, { products: [] });
  const sourceProducts = Array.isArray(source.products) ? source.products : [];
  const products = sourceProducts.slice(offset, offset + safePerPage).map((product) => ({
    ...product,
    brandSlug
  }));
  const enriched = await enrichProducts(products, markupRate);

  return {
    metadata: {
      brand: brandInfo.brand,
      brandSlug,
      page: clampedPage,
      pages: totalPages,
      count: totalCount,
      productsPerPage: safePerPage
    },
    products: enriched
  };
}

async function searchCatalog(index, query, brandSlug, limit) {
  const searchIndex = await loadSearchIndexData();
  const normalizedQuery = normalizeSearchValue(query);
  const safeLimit = Math.max(1, Number(limit) || 120);
  const minQueryLength = getSearchMinQueryLength(searchIndex);

  if (!normalizedQuery || normalizedQuery.length < minQueryLength) {
    return {
      metadata: {
        brandSlug: brandSlug || "all",
        query: cleanText(query),
        minQueryLength,
        total: 0,
        shown: 0,
        limit: safeLimit
      },
      products: []
    };
  }

  const tokens = [...new Set(tokenizeSearchValue(normalizedQuery))];
  const prefixes = [...new Set(tokens.map((token) => getSearchShardPrefix(token, searchIndex)).filter(Boolean))];
  const shardProducts = await Promise.all(prefixes.map((prefix) => loadSearchShard(searchIndex, prefix)));
  const merged = new Map();

  shardProducts.flat().forEach((product) => {
    if (!merged.has(product.id)) {
      merged.set(product.id, product);
    }
  });

  let results = [...merged.values()].filter((product) => matchesSearchProduct(product, normalizedQuery, tokens));

  if (brandSlug && brandSlug !== "all") {
    results = results.filter((product) => product.brandSlug === brandSlug);
  }

  results.sort(
    (left, right) => scoreSearchProduct(right, normalizedQuery, tokens) - scoreSearchProduct(left, normalizedQuery, tokens)
  );

  const markupRate = Number(index?.metadata?.priceMarkupPercent || 20) / 100;
  const shownResults = results.slice(0, safeLimit).map((product) => ({
    ...product,
    brandSlug: product.brandSlug || brandSlugFromName(index, product.brand)
  }));
  const enriched = await enrichProducts(shownResults, markupRate);

  return {
    metadata: {
      brandSlug: brandSlug || "all",
      query: cleanText(query),
      minQueryLength,
      total: results.length,
      shown: enriched.length,
      limit: safeLimit
    },
    products: enriched
  };
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS"
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    errorReply(res, 405, "Method not allowed");
    return;
  }

  if (url.pathname === "/api/health") {
    jsonReply(res, 200, { ok: true, now: new Date().toISOString() });
    return;
  }

  if (url.pathname === "/api/catalog-index") {
    try {
      const index = await getCatalogIndex();
      jsonReply(res, 200, { ...index, api: { productsPerPage: apiPerPage } });
      return;
    } catch (error) {
      errorReply(res, 500, error.message || "Failed to load catalog index");
      return;
    }
  }

  if (url.pathname === "/api/catalog-page") {
    const brand = cleanText(url.searchParams.get("brand") || "all").toLowerCase();
    const page = Number(url.searchParams.get("page") || 1);
    const perPage = Number(url.searchParams.get("perPage") || apiPerPage);

    try {
      const index = await getCatalogIndex();
      const pagePayload = await getCatalogPage(index, brand, page, perPage);
      jsonReply(res, 200, pagePayload);
      return;
    } catch (error) {
      errorReply(res, 500, error.message || "Failed to load catalog page");
      return;
    }
  }

  if (url.pathname === "/api/search") {
    const brand = cleanText(url.searchParams.get("brand") || "all").toLowerCase();
    const query = cleanText(url.searchParams.get("q") || "");
    const limit = Number(url.searchParams.get("limit") || 120);

    try {
      const index = await getCatalogIndex();
      const payload = await searchCatalog(index, query, brand, limit);
      jsonReply(res, 200, payload);
      return;
    } catch (error) {
      errorReply(res, 500, error.message || "Failed to search catalog");
      return;
    }
  }

  errorReply(res, 404, "API endpoint not found");
}

function safePathFromUrl(pathname) {
  const decoded = decodeURIComponent(pathname);
  const cleanPath = decoded === "/" ? "/index.html" : decoded;
  const normalizedPath = normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return resolve(projectRoot, `.${normalizedPath}`);
}

async function handleStatic(url, res) {
  const filePath = safePathFromUrl(url.pathname);

  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }

  await handleStatic(url, res);
});

server.listen(port, host, () => {
  console.log(`Agrodetal server listening on http://${host}:${port}`);
});
