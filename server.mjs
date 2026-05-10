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

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseSourcePrice(value = "") {
  const match = cleanText(value).match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return 0;
  }

  return Number(match[1].replace(",", "."));
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
  let currency = product.currency || "EUR";

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1]);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const item = values.find(
        (entry) => entry && typeof entry === "object" && String(entry["@type"] || "").toLowerCase() === "product"
      );

      if (!item) {
        continue;
      }

      nameOriginal = cleanText(item.description || item.name || "");
      const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      const parsedPrice = Number(offers?.price);

      if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
        sourcePrice = parsedPrice;
      }

      currency = cleanText(offers?.priceCurrency || item.priceCurrency || currency) || currency;
      break;
    } catch {
      continue;
    }
  }

  if (!sourcePrice) {
    const metaPrice =
      html.match(/<meta property="product:price:amount" content="([^"]+)"/i)?.[1] ||
      html.match(/"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ||
      "";
    sourcePrice = parseSourcePrice(metaPrice);
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
    currency: currency || "EUR"
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
  const price = sourcePrice > 0 ? roundMoney(sourcePrice * (1 + markupRate)) : 0;
  const nameOriginal = cleanText(cacheItem?.nameOriginal || product.nameOriginal || product.name);

  return {
    ...product,
    nameOriginal,
    name: cleanText(nameOriginal || product.name),
    sourcePrice,
    price,
    currency: cacheItem?.currency || product.currency || "EUR",
    stock: sourcePrice > 0 ? "Цена обновлена с BartsParts" : product.stock || "Цена уточняется"
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

  if (cached && getCacheEntryFresh(cached) && (cached.nameOriginal || Number(cached.sourcePrice) > 0)) {
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
      currency: details.currency || "EUR",
      status: "ok",
      errorCount: 0,
      nextRetryAt: null,
      lastFetchedAt: nowIso
    };

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
