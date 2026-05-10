const searchInput = document.querySelector("#quickSearch");
const searchForm = document.querySelector(".search-form");
const headerSearchForm = document.querySelector("#headerSearchForm");
const productSearchInputs = document.querySelectorAll("[data-product-search]");
const filterButtons = document.querySelectorAll(".filter-button");
const brandButtons = document.querySelectorAll("[data-brand-filter]");
const productGrid = document.querySelector("#productGrid");
const sortSelect = document.querySelector("#sortSelect");
const catalogMetaTitle = document.querySelector("#catalogMetaTitle");
const catalogMetaText = document.querySelector("#catalogMetaText");
const pagePrev = document.querySelector("#pagePrev");
const pageNext = document.querySelector("#pageNext");
const pageInfo = document.querySelector("#pageInfo");
const pageNumbers = document.querySelector("#pageNumbers");
const allBrandsCount = document.querySelector("#allBrandsCount");
const catalogPagination = document.querySelector("#catalogPagination");
const favoritesOnly = document.querySelector("#favoritesOnly");
const favoritesCount = document.querySelector("#favoritesCount");
const compareOpen = document.querySelector("#compareOpen");
const compareClose = document.querySelector("#compareClose");
const compareModal = document.querySelector("#compareModal");
const compareTable = document.querySelector("#compareTable");
const compareEmpty = document.querySelector("#compareEmpty");
const compareCount = document.querySelector("#compareCount");
const emptyResults = document.querySelector("#emptyResults");
const cartCount = document.querySelector("#cartCount");
const cartOpen = document.querySelector("#cartOpen");
const cartClose = document.querySelector("#cartClose");
const cartDrawer = document.querySelector("#cartDrawer");
const cartList = document.querySelector("#cartList");
const cartEmpty = document.querySelector("#cartEmpty");
const cartTotal = document.querySelector("#cartTotal");
const cartClear = document.querySelector("#cartClear");
const checkoutForm = document.querySelector("#checkoutForm");
const requestForm = document.querySelector("#requestForm");
const productModal = document.querySelector("#productModal");
const detailClose = document.querySelector("#detailClose");
const detailVisual = document.querySelector("#detailVisual");
const detailBrandLogo = document.querySelector("#detailBrandLogo");
const detailSku = document.querySelector("#detailSku");
const detailTitle = document.querySelector("#detailTitle");
const detailDescription = document.querySelector("#detailDescription");
const detailCompatible = document.querySelector("#detailCompatible");
const detailStock = document.querySelector("#detailStock");
const detailPrice = document.querySelector("#detailPrice");
const detailAdd = document.querySelector("#detailAdd");
const toast = document.querySelector("#toast");

const storageKey = "agrodetal-cart";
const favoritesKey = "agrodetal-favorites";
const compareKey = "agrodetal-compare";
const catalogUrl = "data/catalog.json";
const catalogIndexUrl = "data/catalog/index.json";
const searchIndexUrl = "data/catalog/search/index.json";
const searchResultLimit = 120;
const searchDebounceMs = 180;
const productsPerPage = 20;
const maxVisiblePageButtons = 10;
const catalogApiBase = `${window.location.origin}/api`;

let activeFilter = "all";
let activeBrand = "all";
let activeBrandSlug = "all";
let currentPage = 1;
let cards = [...document.querySelectorAll(".product-card")];
let cart = loadCart();
let favorites = loadList(favoritesKey);
let compareList = loadList(compareKey);
let showFavoritesOnly = false;
let selectedProduct = null;
let toastTimer;
let catalogIndex = null;
let searchIndex = null;
let searchShardMap = new Map();
let searchShardCache = new Map();
let searchDebounceTimer;
let searchRequestId = 0;
let isSearchMode = false;
let isSearchLoading = false;
let activeSearchQuery = "";
let activeSearchTotal = 0;
let activeSearchShown = 0;
let activeCatalogTotalCount = 0;
let backendApiAvailable = true;
const brandLogoMap = {
  "john deere": "assets/brands/john-deere.png",
  fendt: "assets/brands/fendt.png",
  "case ih": "assets/brands/case-ih.png",
  "new holland": "assets/brands/new-holland.png",
  claas: "assets/brands/claas.png",
  krone: "assets/brands/krone.png"
};

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(value, currency = "BYN") {
  if (!Number(value)) {
    return `по запросу`;
  }

  return `${Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} ${currency}`;
}

function formatCatalogPrice(value, currency = "BYN", options = {}) {
  const { withPrefix = true, emptyLabel = "Цена уточняется" } = options;

  if (!Number(value)) {
    return emptyLabel;
  }

  const formatted = formatPrice(value, currency);
  return withPrefix ? `от ${formatted}` : formatted;
}

function buildProductSubtitle(brand, sku) {
  return [brand, sku].filter(Boolean).join(" · ");
}

function normalizeBrandKey(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
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

function stripSupplierMention(value = "") {
  return String(value)
    .replace(/\s+с\s+bartsparts/gi, "")
    .replace(/bartsparts/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchValue(value = "") {
  return normalizeSearchValue(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSearchMinQueryLength() {
  return Number(searchIndex?.metadata?.minQueryLength) || 2;
}

function getSearchPrefixLength() {
  return Number(searchIndex?.metadata?.prefixLength) || 3;
}

function getSearchShardPrefix(token = "") {
  const normalized = normalizeSearchValue(token).replace(/\s+/g, "");

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, Math.min(getSearchPrefixLength(), normalized.length));
}

function encodeSearchShardId(prefix = "") {
  return [...prefix].map((char) => char.codePointAt(0).toString(16)).join("-");
}

function buildSearchableText(product) {
  return normalizeSearchValue(
    [product.sku, product.brand, product.name, product.nameOriginal, product.category].filter(Boolean).join(" ")
  );
}

function shouldUseGlobalSearch(query = "") {
  const normalized = normalizeSearchValue(query);
  return normalized.length >= getSearchMinQueryLength();
}

function getCurrentSearchQuery() {
  return (searchInput?.value || productSearchInputs[0]?.value || "").trim();
}

function getBrandLogoPath(brand) {
  return brandLogoMap[normalizeBrandKey(brand)] || "";
}

function buildApiUrl(path, query = null) {
  const url = new URL(`${catalogApiBase}${path}`);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function loadList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(storageKey, JSON.stringify(cart));
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function getCardData(card) {
  const brand = card.dataset.brand;
  const nameOriginal = card.dataset.nameOriginal || card.dataset.name;
  const displayName = nameOriginal || card.dataset.name;
  return {
    id: card.dataset.id,
    name: displayName,
    nameOriginal,
    price: Number(card.dataset.price),
    sourcePrice: Number(card.dataset.sourcePrice),
    currency: card.dataset.currency || "BYN",
    brand,
    brandSlug: card.dataset.brandSlug || "",
    category: card.dataset.category,
    sku: card.dataset.sku,
    icon: card.dataset.icon || "package",
    description: stripSupplierMention(card.dataset.description) || `Деталь ${brand}. Подробности и совместимость уточняются у менеджера.`,
    compatible: card.dataset.compatible || brand,
    stock: stripSupplierMention(card.dataset.stock) || "Наличие и цена уточняются по запросу",
    visual: card.dataset.visual,
    weight: card.dataset.weight || "Уточняется",
    warranty: card.dataset.warranty || "По условиям поставщика",
    url: card.dataset.url || ""
  };
}

function productCardTemplate(product) {
  const visual = product.visual || "green";
  const icon = product.icon || "package";
  const price = Number(product.price) || 0;
  const sourcePrice = Number(product.sourcePrice) || 0;
  const currency = product.currency || "EUR";
  const brand = product.brand || "Каталог";
  const brandLogo = getBrandLogoPath(brand);
  const nameOriginal = product.nameOriginal || product.name;
  const displayName = nameOriginal || product.name;
  const description =
    stripSupplierMention(product.description) || `Деталь ${brand}. Для цены и совместимости отправьте запрос менеджеру.`;
  const compatible = product.compatible || brand;
  const stock = stripSupplierMention(product.stock) || "Наличие и цена уточняются по запросу";
  const weight = product.weight || "Уточняется";
  const warranty = product.warranty || "По условиям поставщика";
  const subtitle = buildProductSubtitle(brand, product.sku);
  const helperText = description;
  const stockLabel =
    stock && !String(stock).toLowerCase().includes("уточ")
      ? "Цена обновлена"
      : "По запросу";
  const priceLabel = formatCatalogPrice(price, currency, {
    withPrefix: true,
    emptyLabel: "Цена уточняется"
  });

  return `
    <article
      class="product-card"
      data-id="${escapeHtml(product.id)}"
      data-brand="${escapeHtml(brand)}"
      data-brand-slug="${escapeHtml(product.brandSlug || "")}"
      data-category="${escapeHtml(product.category || "tractor")}"
      data-name="${escapeHtml(displayName)}"
      data-name-original="${escapeHtml(nameOriginal)}"
      data-price="${price}"
      data-source-price="${sourcePrice}"
      data-currency="${escapeHtml(currency)}"
      data-sku="${escapeHtml(product.sku)}"
      data-icon="${escapeHtml(icon)}"
      data-stock="${escapeHtml(stock)}"
      data-visual="${escapeHtml(visual)}"
      data-description="${escapeHtml(description)}"
      data-compatible="${escapeHtml(compatible)}"
      data-weight="${escapeHtml(weight)}"
      data-warranty="${escapeHtml(warranty)}"
      data-url="${escapeHtml(product.url || "")}"
    >
      <div class="product-visual ${escapeHtml(visual)}">
        <i data-lucide="${escapeHtml(icon)}"></i>
        ${brandLogo ? `<img class="product-brand-logo" src="${escapeHtml(brandLogo)}" alt="${escapeHtml(brand)}" loading="lazy" />` : ""}
      </div>
      <div class="product-info">
        <div class="card-tools">
          <button class="mini-tool favorite-button" type="button" aria-label="В избранное">
            <i data-lucide="heart"></i>
          </button>
          <button class="mini-tool compare-button" type="button" aria-label="Добавить к сравнению">
            <i data-lucide="scale"></i>
          </button>
        </div>
        <span class="tag">${escapeHtml(stockLabel)}</span>
        <h3>${escapeHtml(displayName)}</h3>
        <div class="product-meta-line">${escapeHtml(subtitle)}</div>
        <p>${escapeHtml(helperText)}</p>
        <div class="product-bottom">
          <strong>${escapeHtml(priceLabel)}</strong>
          <div class="product-actions">
            <button class="icon-button details-button" type="button" aria-label="Посмотреть товар">
              <i data-lucide="eye"></i>
            </button>
            <button class="icon-button add-button" type="button" aria-label="Добавить в корзину">
              <i data-lucide="plus"></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function refreshCards() {
  cards = [...document.querySelectorAll(".product-card")];
}

function getBrandInfo() {
  if (!catalogIndex || activeBrandSlug === "all") {
    return null;
  }

  return catalogIndex.brands.find((brand) => brand.brandSlug === activeBrandSlug) || null;
}

function getCatalogChunkSize() {
  return Number(catalogIndex?.metadata?.chunkSize) || 1000;
}

function clampPage(page, totalPages) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  return Math.min(Math.max(1, Number(page) || 1), safeTotal);
}

function getTotalPagesByCount(count) {
  return Math.max(1, Math.ceil((Number(count) || 0) / productsPerPage));
}

function getCurrentCatalogTotalPages() {
  if (activeBrandSlug === "all") {
    return getTotalPagesByCount(activeCatalogTotalCount);
  }

  const brandInfo = getBrandInfo();
  return getTotalPagesByCount(brandInfo?.count || 0);
}

function getSourcePageForCatalogPage(page) {
  const startIndex = (page - 1) * productsPerPage;
  const chunkSize = getCatalogChunkSize();

  return {
    sourcePage: Math.floor(startIndex / chunkSize) + 1,
    offset: startIndex % chunkSize
  };
}

function getVisiblePageNumbers(current, total) {
  const safeCurrent = Math.max(1, Number(current) || 1);
  const safeTotal = Math.max(1, Number(total) || 1);
  const visible = Math.min(maxVisiblePageButtons, safeTotal);
  let start = safeCurrent - Math.floor(visible / 2);
  let end = start + visible - 1;

  if (start < 1) {
    start = 1;
    end = visible;
  }

  if (end > safeTotal) {
    end = safeTotal;
    start = Math.max(1, end - visible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function renderPageNumbers(totalPages) {
  if (!pageNumbers) {
    return;
  }

  const pages = getVisiblePageNumbers(currentPage, totalPages);
  pageNumbers.innerHTML = pages
    .map((page) => {
      const isActive = page === currentPage;
      return `
        <button
          class="button ghost compact page-number${isActive ? " is-active" : ""}"
          type="button"
          data-page-number="${page}"
          ${isActive ? 'aria-current="page"' : ""}
        >
          ${page}
        </button>
      `;
    })
    .join("");
}

function renderCatalogMeta(visibleCount = null) {
  if (isSearchMode) {
    const minQueryLength = getSearchMinQueryLength();
    const normalizedQuery = normalizeSearchValue(activeSearchQuery);
    const totalText = activeSearchTotal.toLocaleString("ru-RU");
    const shownText = activeSearchShown.toLocaleString("ru-RU");

    catalogMetaTitle.textContent = normalizedQuery
      ? `Поиск: ${activeSearchQuery}`
      : "Глобальный поиск по каталогу";

    if (isSearchLoading) {
      catalogMetaText.textContent = "Ищем товары по всему каталогу...";
      catalogPagination.hidden = true;
      return;
    }

    if (normalizedQuery && normalizedQuery.length < minQueryLength) {
      catalogMetaText.textContent = `Введите минимум ${minQueryLength} символа, чтобы искать по всему каталогу.`;
      catalogPagination.hidden = true;
      return;
    }

    if (!normalizedQuery) {
      catalogMetaText.textContent = "Введите артикул, бренд или название детали, чтобы искать по всему каталогу.";
      catalogPagination.hidden = true;
      return;
    }

    if (activeSearchTotal === 0) {
      catalogMetaText.textContent = "Совпадений не найдено. Попробуйте другой артикул, бренд или название детали.";
      catalogPagination.hidden = true;
      return;
    }

    const filtersText =
      visibleCount !== null && visibleCount !== activeSearchShown
        ? ` После дополнительных фильтров видно ${visibleCount.toLocaleString("ru-RU")}.`
        : "";
    const limitText =
      activeSearchTotal > activeSearchShown
        ? ` Найдено ${totalText} товаров, показаны первые ${shownText}.`
        : ` Найдено ${totalText} товаров.`;

    catalogMetaText.textContent = `${limitText}${filtersText}`.trim();
    catalogPagination.hidden = true;
    return;
  }

  const brandInfo = getBrandInfo();
  const totalPages = getCurrentCatalogTotalPages();

  if (!brandInfo) {
    catalogMetaTitle.textContent = "Витрина брендов";
    catalogMetaText.textContent = `Показаны товары из витрины. На странице ${productsPerPage} позиций.`;
    pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    pagePrev.disabled = currentPage <= 1;
    pageNext.disabled = currentPage >= totalPages;
    renderPageNumbers(totalPages);
    catalogPagination.hidden = false;
    return;
  }

  catalogMetaTitle.textContent = brandInfo.brand;
  catalogMetaText.textContent = `${brandInfo.count.toLocaleString("ru-RU")} товаров в каталоге.`;
  pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
  pagePrev.disabled = currentPage <= 1;
  pageNext.disabled = currentPage >= totalPages;
  renderPageNumbers(totalPages);
  catalogPagination.hidden = false;
}

function updateBrandCounts() {
  if (!catalogIndex) {
    return;
  }

  const total = catalogIndex.brands.reduce((sum, brand) => sum + brand.count, 0);
  allBrandsCount.textContent = `${total.toLocaleString("ru-RU")} товаров`;

  brandButtons.forEach((button) => {
    const slug = button.dataset.brandSlug;

    if (slug === "all") {
      return;
    }

    const brandInfo = catalogIndex.brands.find((brand) => brand.brandSlug === slug);
    const counter = button.querySelector("small");

    if (brandInfo && counter) {
      counter.textContent = `${brandInfo.count.toLocaleString("ru-RU")} товаров`;
    }
  });
}

async function loadCatalogIndex() {
  let response;

  if (backendApiAvailable) {
    try {
      response = await fetch(buildApiUrl("/catalog-index"));

      if (!response.ok) {
        throw new Error(`Catalog API request failed: ${response.status}`);
      }

      catalogIndex = await response.json();
      updateBrandCounts();
      renderCatalogMeta();
      return;
    } catch (error) {
      console.warn(error);
      backendApiAvailable = false;
    }
  }

  response = await fetch(`${catalogIndexUrl}?v=${Date.now()}`);

  if (!response.ok) {
    throw new Error(`Catalog index request failed: ${response.status}`);
  }

  catalogIndex = await response.json();
  updateBrandCounts();
  renderCatalogMeta();
}

function decodeSearchProduct(record) {
  const fields = searchIndex?.metadata?.fields || [];
  return fields.reduce((product, field, index) => {
    product[field] = record[index];
    return product;
  }, {});
}

async function loadSearchIndex() {
  if (searchIndex) {
    return searchIndex;
  }

  const response = await fetch(`${searchIndexUrl}?v=${Date.now()}`);

  if (!response.ok) {
    throw new Error(`Search index request failed: ${response.status}`);
  }

  searchIndex = await response.json();
  searchShardMap = new Map((searchIndex.shards || []).map((item) => [item.prefix, item]));
  return searchIndex;
}

async function loadSearchShard(prefix) {
  await loadSearchIndex();

  if (!prefix) {
    return [];
  }

  if (searchShardCache.has(prefix)) {
    return searchShardCache.get(prefix);
  }

  const shardInfo = searchShardMap.get(prefix);

  if (!shardInfo) {
    searchShardCache.set(prefix, []);
    return [];
  }

  const shardId = shardInfo.shardId || encodeSearchShardId(prefix);
  const response = await fetch(`data/catalog/search/${shardId}.json?v=${Date.now()}`);

  if (!response.ok) {
    throw new Error(`Search shard request failed: ${response.status}`);
  }

  const payload = await response.json();
  const products = Array.isArray(payload.products) ? payload.products.map(decodeSearchProduct) : [];
  searchShardCache.set(prefix, products);
  return products;
}

async function loadCatalogPage() {
  try {
    if (backendApiAvailable) {
      try {
        const response = await fetch(
          buildApiUrl("/catalog-page", {
            brand: activeBrandSlug,
            page: currentPage,
            perPage: productsPerPage
          })
        );

        if (!response.ok) {
          throw new Error(`Catalog API page request failed: ${response.status}`);
        }

        const payload = await response.json();
        const products = Array.isArray(payload.products) ? payload.products : [];
        activeCatalogTotalCount = Number(payload?.metadata?.count) || products.length;
        currentPage = clampPage(Number(payload?.metadata?.page) || currentPage, Number(payload?.metadata?.pages) || 1);

        isSearchMode = false;
        isSearchLoading = false;
        activeSearchTotal = 0;
        activeSearchShown = products.length;
        productGrid.innerHTML = products.map(productCardTemplate).join("");
        refreshCards();
        renderSavedStates();
        if (sortSelect?.value && sortSelect.value !== "default") {
          sortProducts();
        }
        applyFilters();
        renderCatalogMeta();
        renderIcons();
        return;
      } catch (error) {
        console.warn(error);
        backendApiAvailable = false;
      }
    }

    let products = [];

    if (activeBrandSlug === "all") {
      const response = await fetch(`${catalogUrl}?v=${Date.now()}`);

      if (!response.ok) {
        throw new Error(`Catalog request failed: ${response.status}`);
      }

      const catalog = await response.json();
      const allProducts = Array.isArray(catalog.products) ? catalog.products : [];
      activeCatalogTotalCount = allProducts.length;
      currentPage = clampPage(currentPage, getCurrentCatalogTotalPages());
      const startIndex = (currentPage - 1) * productsPerPage;
      products = allProducts.slice(startIndex, startIndex + productsPerPage);
    } else {
      const brandInfo = getBrandInfo();

      if (!brandInfo) {
        throw new Error("Brand info is missing");
      }

      activeCatalogTotalCount = Number(brandInfo.count) || 0;
      currentPage = clampPage(currentPage, getCurrentCatalogTotalPages());
      const { sourcePage, offset } = getSourcePageForCatalogPage(currentPage);
      const response = await fetch(`data/catalog/${activeBrandSlug}/page-${sourcePage}.json?v=${Date.now()}`);

      if (!response.ok) {
        throw new Error(`Catalog request failed: ${response.status}`);
      }

      const catalog = await response.json();
      const sourceProducts = Array.isArray(catalog.products) ? catalog.products : [];
      products = sourceProducts.slice(offset, offset + productsPerPage);
    }

    isSearchMode = false;
    isSearchLoading = false;
    activeSearchTotal = 0;
    activeSearchShown = products.length;
    productGrid.innerHTML = products.map(productCardTemplate).join("");
    refreshCards();
    renderSavedStates();
    if (sortSelect?.value && sortSelect.value !== "default") {
      sortProducts();
    }
    applyFilters();
    renderCatalogMeta();
    renderIcons();
  } catch (error) {
    console.warn(error);
  }
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

async function runGlobalSearch(query) {
  const normalizedQuery = normalizeSearchValue(query);
  const requestId = ++searchRequestId;
  activeSearchQuery = query.trim();

  if (!shouldUseGlobalSearch(query)) {
    if (isSearchMode) {
      await loadCatalogPage();
    } else {
      applyFilters();
      renderCatalogMeta();
    }
    return;
  }

  isSearchMode = true;
  isSearchLoading = true;
  activeSearchTotal = 0;
  activeSearchShown = 0;
  renderCatalogMeta();

  try {
    await loadSearchIndex();

    const tokens = [...new Set(tokenizeSearchValue(normalizedQuery))];
    const prefixes = [...new Set(tokens.map((token) => getSearchShardPrefix(token)).filter(Boolean))];
    const shardProducts = await Promise.all(prefixes.map((prefix) => loadSearchShard(prefix)));

    if (requestId !== searchRequestId) {
      return;
    }

    const merged = new Map();

    shardProducts.flat().forEach((product) => {
      if (!merged.has(product.id)) {
        merged.set(product.id, product);
      }
    });

    let results = [...merged.values()].filter((product) => matchesSearchProduct(product, normalizedQuery, tokens));

    if (activeBrandSlug !== "all") {
      results = results.filter((product) => product.brandSlug === activeBrandSlug);
    }

    results.sort(
      (left, right) =>
        scoreSearchProduct(right, normalizedQuery, tokens) - scoreSearchProduct(left, normalizedQuery, tokens)
    );

    const shownResults = results.slice(0, searchResultLimit);

    isSearchLoading = false;
    activeSearchTotal = results.length;
    activeSearchShown = shownResults.length;
    productGrid.innerHTML = shownResults.map(productCardTemplate).join("");
    refreshCards();
    renderSavedStates();
    if (sortSelect?.value && sortSelect.value !== "default") {
      sortProducts();
    }
    applyFilters();
    renderCatalogMeta();
    renderIcons();
  } catch (error) {
    console.warn(error);

    if (requestId !== searchRequestId) {
      return;
    }

    isSearchLoading = false;
    activeSearchTotal = 0;
    activeSearchShown = 0;
    productGrid.innerHTML = "";
    refreshCards();
    applyFilters();
    renderCatalogMeta();
  }
}

function applyFilters() {
  const query = normalizeSearchValue(searchInput?.value || "");
  let visibleCount = 0;

  cards.forEach((card) => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const brandMatch = activeBrand === "all" || card.dataset.brand === activeBrand;
    const favoriteMatch = !showFavoritesOnly || favorites.includes(card.dataset.id);
    const searchable = normalizeSearchValue(
      [
        card.dataset.name,
        card.dataset.nameOriginal,
        card.dataset.brand,
        card.dataset.sku,
        card.dataset.description,
        card.dataset.compatible
      ].join(" ")
    );
    const nameMatch = searchable.includes(query);
    const isVisible = categoryMatch && brandMatch && favoriteMatch && nameMatch;

    if (isVisible) {
      visibleCount += 1;
    }

    card.classList.toggle("is-hidden", !isVisible);
  });

  emptyResults.classList.toggle("is-visible", visibleCount === 0);
  renderCatalogMeta(visibleCount);
}

function syncSearch(value, sourceInput) {
  productSearchInputs.forEach((input) => {
    if (input !== sourceInput) {
      input.value = value;
    }
  });
}

function queueSearch(query) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    runGlobalSearch(query);
  }, searchDebounceMs);
}

function getCartTotalQty() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotalPrice() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  cartCount.textContent = getCartTotalQty();
  const hasUnknownPrice = cart.some((item) => !Number(item.price));
  cartTotal.textContent = hasUnknownPrice
    ? "Уточняется менеджером"
    : formatPrice(getCartTotalPrice(), cart[0]?.currency || "BYN");
  cartEmpty.classList.toggle("is-visible", cart.length === 0);
  cartList.innerHTML = "";

  cart.forEach((item) => {
    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-icon">
        <i data-lucide="package"></i>
      </div>
      <div>
        <h3>${item.name}</h3>
        <p>${formatCatalogPrice(item.price, item.currency, { withPrefix: false })}${Number(item.price) ? " за шт." : ""}</p>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control" aria-label="Количество ${item.name}">
          <button type="button" data-action="decrease" data-id="${item.id}" aria-label="Уменьшить">-</button>
          <span>${item.qty}</span>
          <button type="button" data-action="increase" data-id="${item.id}" aria-label="Увеличить">+</button>
        </div>
        <button class="remove-item" type="button" data-action="remove" data-id="${item.id}" aria-label="Удалить">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    cartList.append(row);
  });

  saveCart();
  renderIcons();
}

function renderSavedStates() {
  favoritesCount.textContent = favorites.length;
  compareCount.textContent = compareList.length;
  favoritesOnly.classList.toggle("is-active", showFavoritesOnly);

  refreshCards();
  cards.forEach((card) => {
    const id = card.dataset.id;
    card.querySelector(".favorite-button")?.classList.toggle("is-active", favorites.includes(id));
    card.querySelector(".compare-button")?.classList.toggle("is-active", compareList.includes(id));
  });

  renderIcons();
}

function getProductById(id) {
  const card = cards.find((item) => item.dataset.id === id);
  return card ? getCardData(card) : null;
}

function toggleFavorite(card) {
  const id = card.dataset.id;

  if (favorites.includes(id)) {
    favorites = favorites.filter((item) => item !== id);
    showToast("Удалено из избранного");
  } else {
    favorites.push(id);
    showToast(`${card.dataset.name} добавлен в избранное`);
  }

  saveList(favoritesKey, favorites);
  renderSavedStates();
  applyFilters();
}

function toggleCompare(card) {
  const id = card.dataset.id;

  if (compareList.includes(id)) {
    compareList = compareList.filter((item) => item !== id);
    showToast("Удалено из сравнения");
  } else {
    if (compareList.length >= 3) {
      showToast("Можно сравнить до 3 товаров одновременно");
      return;
    }

    compareList.push(id);
    showToast(`${card.dataset.name} добавлен к сравнению`);
  }

  saveList(compareKey, compareList);
  renderSavedStates();
  renderCompare();
}

function sortProducts() {
  const sortedCards = [...cards].sort((a, b) => {
    const mode = sortSelect.value;

    if (mode === "price-asc") {
      return Number(a.dataset.price) - Number(b.dataset.price);
    }

    if (mode === "price-desc") {
      return Number(b.dataset.price) - Number(a.dataset.price);
    }

    if (mode === "name") {
      return a.dataset.name.localeCompare(b.dataset.name, "ru");
    }

    return 0;
  });

  sortedCards.forEach((card) => productGrid.append(card));
}

function renderCompare() {
  const products = compareList.map(getProductById).filter(Boolean);
  compareEmpty.classList.toggle("is-visible", products.length === 0);
  compareTable.style.display = products.length === 0 ? "none" : "table";

  if (products.length === 0) {
    compareTable.innerHTML = "";
    return;
  }

  const rows = [
    ["Товар", products.map((item) => `${item.name}<br><small>${item.sku}</small>`)],
    ["Цена", products.map((item) => formatCatalogPrice(item.price, item.currency))],
    ["Наличие", products.map((item) => item.stock)],
    ["Совместимость", products.map((item) => item.compatible)],
    ["Вес", products.map((item) => item.weight)],
    ["Гарантия", products.map((item) => item.warranty)],
    [
      "Действия",
      products.map(
        (item) =>
          `<button class="compare-remove" type="button" data-compare-remove="${item.id}">Убрать</button>`
      )
    ]
  ];

  compareTable.innerHTML = rows
    .map(
      ([label, values]) => `
        <tr>
          <th>${label}</th>
          ${values.map((value) => `<td>${value}</td>`).join("")}
        </tr>
      `
    )
    .join("");
}

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
  showToast(`${product.name} добавлен в корзину`);
}

function updateCartItem(id, action) {
  const item = cart.find((entry) => entry.id === id);

  if (!item) {
    return;
  }

  if (action === "increase") {
    item.qty += 1;
  }

  if (action === "decrease") {
    item.qty -= 1;
  }

  if (action === "remove" || item.qty <= 0) {
    cart = cart.filter((entry) => entry.id !== id);
  }

  renderCart();
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  updateBodyLock();
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  updateBodyLock();
}

function updateBodyLock() {
  const hasOpenOverlay =
    cartDrawer.classList.contains("is-open") ||
    productModal.classList.contains("is-open") ||
    compareModal.classList.contains("is-open");

  document.body.style.overflow = hasOpenOverlay ? "hidden" : "";
}

function openCompare() {
  renderCompare();
  compareModal.classList.add("is-open");
  compareModal.setAttribute("aria-hidden", "false");
  updateBodyLock();
  renderIcons();
}

function closeCompare() {
  compareModal.classList.remove("is-open");
  compareModal.setAttribute("aria-hidden", "true");
  updateBodyLock();
}

function openProduct(card) {
  selectedProduct = getCardData(card);
  const brandLogo = getBrandLogoPath(selectedProduct.brand);

  detailVisual.className = `detail-visual ${selectedProduct.visual}`;
  detailVisual.innerHTML = `<i data-lucide="${escapeHtml(selectedProduct.icon || "package")}"></i>`;
  if (detailBrandLogo) {
    if (brandLogo) {
      detailBrandLogo.src = brandLogo;
      detailBrandLogo.alt = selectedProduct.brand;
      detailBrandLogo.hidden = false;
    } else {
      detailBrandLogo.hidden = true;
      detailBrandLogo.removeAttribute("src");
      detailBrandLogo.alt = "";
    }
    detailVisual.append(detailBrandLogo);
  }
  detailSku.textContent = `${selectedProduct.brand} · Артикул ${selectedProduct.sku}`;
  detailTitle.textContent = selectedProduct.nameOriginal || selectedProduct.name;
  detailDescription.textContent = selectedProduct.description || `Деталь ${selectedProduct.brand}.`;
  detailCompatible.textContent = selectedProduct.compatible;
  detailStock.textContent = selectedProduct.stock;
  detailPrice.textContent = formatCatalogPrice(selectedProduct.price, selectedProduct.currency);

  productModal.classList.add("is-open");
  productModal.setAttribute("aria-hidden", "false");
  updateBodyLock();
  renderIcons();
}

function closeProduct() {
  productModal.classList.remove("is-open");
  productModal.setAttribute("aria-hidden", "true");
  updateBodyLock();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    activeFilter = button.dataset.filter;
    applyFilters();
  });
});

brandButtons.forEach((button) => {
  button.addEventListener("click", () => {
    brandButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    activeBrand = button.dataset.brandFilter;
    activeBrandSlug = button.dataset.brandSlug;
    currentPage = 1;
    const query = getCurrentSearchQuery();

    if (shouldUseGlobalSearch(query)) {
      queueSearch(query);
      return;
    }

    loadCatalogPage();
  });
});

pagePrev?.addEventListener("click", () => {
  if (currentPage <= 1) {
    return;
  }

  currentPage -= 1;
  loadCatalogPage();
});

pageNext?.addEventListener("click", () => {
  const totalPages = getCurrentCatalogTotalPages();

  if (currentPage >= totalPages) {
    return;
  }

  currentPage += 1;
  loadCatalogPage();
});

pageNumbers?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-number]");

  if (!button) {
    return;
  }

  const targetPage = Number(button.dataset.pageNumber);

  if (!Number.isFinite(targetPage) || targetPage < 1 || targetPage === currentPage) {
    return;
  }

  currentPage = targetPage;
  loadCatalogPage();
});

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  runGlobalSearch(getCurrentSearchQuery());
});
headerSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  runGlobalSearch(getCurrentSearchQuery());
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth" });
});

productSearchInputs.forEach((input) => {
  input.addEventListener("input", () => {
    syncSearch(input.value, input);
    queueSearch(input.value);
  });
});

sortSelect?.addEventListener("change", () => {
  sortProducts();
  applyFilters();
});

favoritesOnly?.addEventListener("click", () => {
  showFavoritesOnly = !showFavoritesOnly;
  renderSavedStates();
  applyFilters();
});

productGrid?.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  const addButton = event.target.closest(".add-button");
  const favoriteButton = event.target.closest(".favorite-button");
  const compareButton = event.target.closest(".compare-button");
  const detailsButton = event.target.closest(".details-button");

  if (addButton) {
    addToCart(getCardData(card));
    addButton.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.9)" },
        { transform: "scale(1)" }
      ],
      { duration: 180, easing: "ease-out" }
    );
    return;
  }

  if (favoriteButton) {
    toggleFavorite(card);
    return;
  }

  if (compareButton) {
    toggleCompare(card);
    return;
  }

  if (detailsButton) {
    openProduct(card);
  }
});

compareOpen?.addEventListener("click", openCompare);
compareClose?.addEventListener("click", closeCompare);

compareModal?.addEventListener("click", (event) => {
  if (event.target === compareModal) {
    closeCompare();
  }
});

compareTable?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-compare-remove]");

  if (!removeButton) {
    return;
  }

  compareList = compareList.filter((id) => id !== removeButton.dataset.compareRemove);
  saveList(compareKey, compareList);
  renderSavedStates();
  renderCompare();
});

detailAdd?.addEventListener("click", () => {
  if (!selectedProduct) {
    return;
  }

  addToCart(selectedProduct);
  closeProduct();
  openCart();
});

detailClose?.addEventListener("click", closeProduct);

productModal?.addEventListener("click", (event) => {
  if (event.target === productModal) {
    closeProduct();
  }
});

cartOpen?.addEventListener("click", openCart);
cartClose?.addEventListener("click", closeCart);

cartDrawer?.addEventListener("click", (event) => {
  if (event.target === cartDrawer) {
    closeCart();
  }
});

cartList?.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");

  if (!control) {
    return;
  }

  updateCartItem(control.dataset.id, control.dataset.action);
});

cartClear?.addEventListener("click", () => {
  cart = [];
  renderCart();
  showToast("Корзина очищена");
});

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (cart.length === 0) {
    showToast("Добавьте хотя бы одну позицию в корзину");
    return;
  }

  const formData = new FormData(checkoutForm);
  const name = formData.get("name").trim();
  const phone = formData.get("phone").trim();

  cart = [];
  checkoutForm.reset();
  renderCart();
  closeCart();
  showToast(`${name}, заявка принята. Мы перезвоним на ${phone}`);
});

requestForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(requestForm);
  const machine = formData.get("machine");
  const model = formData.get("model").trim();

  requestForm.reset();
  showToast(`Заявка по ${machine.toLowerCase()} ${model} отправлена`);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeProduct();
    closeCompare();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadCatalogIndex(), loadSearchIndex().catch(() => null)]);
  await loadCatalogPage();
  renderIcons();
  renderCart();
  renderSavedStates();
  renderCompare();
});
