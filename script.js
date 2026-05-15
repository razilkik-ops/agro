const demoParts = [
  {
    id: "oil-filter-jd",
    name: "Фильтр масляный John Deere",
    sku: "RE504836",
    brand: "John Deere",
    brandSlug: "john-deere",
    category: "Фильтры",
    brief: "Масляный фильтр для планового обслуживания тракторов и комбайнов.",
    description:
      "Фильтр для защиты двигателя от загрязнений масла. Подбирается по артикулу, модели техники и типу двигателя.",
    compatibility: "John Deere 6M, 6R, 7030, 8R; аналоги по артикулу RE504836",
    status: "В наличии по запросу",
    specs:
      "Тип: масляный; назначение: двигатель; поставка: оригинал или аналог",
    price: 0,
    currency: "EUR",
  },
  {
    id: "drive-belt-claas",
    name: "Ремень приводной усиленный",
    sku: "AG-BLT-1450",
    brand: "Claas",
    brandSlug: "claas",
    category: "Приводные ремни",
    brief: "Ремень для приводов жатки, вентилятора и вспомогательных узлов.",
    description:
      "Усиленный приводной ремень для сезонных нагрузок. Перед заказом сверяем профиль, длину и применяемость.",
    compatibility: "Claas Dominator, Lexion; John Deere 9500; New Holland CX",
    status: "Под заказ",
    specs: "Профиль: клиновой; длина: по подбору; устойчивость к нагреву",
    price: 0,
    currency: "EUR",
  },
  {
    id: "hydraulic-pump-mtz",
    name: "Гидронасос шестерённый",
    sku: "HYD-NSh-32",
    brand: "Case IH",
    brandSlug: "case-ih",
    category: "Гидравлика",
    brief:
      "Гидронасос для навесного оборудования, рулевого управления и гидросистем.",
    description:
      "Шестерённый насос для ремонта гидравлических систем. Помогаем подобрать направление вращения, объём и посадку.",
    compatibility:
      "МТЗ 80, МТЗ 82, Беларус 920, Case IH JX, навесное оборудование",
    status: "В наличии по запросу",
    specs:
      "Рабочий объём: 32 см3; исполнение: левое/правое; гарантия: по партии",
    price: 0,
    currency: "EUR",
  },
  {
    id: "hub-bearing",
    name: "Подшипник ступицы",
    sku: "BRG-32008",
    brand: "Fendt",
    brandSlug: "fendt",
    category: "Подшипники",
    brief: "Подшипник для ремонта ступиц, ходовой и прицепной техники.",
    description:
      "Подбирается по размеру, посадочному месту, артикулу или серийному номеру узла. Доступны оригиналы и проверенные аналоги.",
    compatibility: "МТЗ, культиваторы, дисковые бороны, прицепная техника",
    status: "Под заказ",
    specs: "Тип: роликовый конический; подбор: по размеру или номеру",
    price: 0,
    currency: "EUR",
  },
  {
    id: "gasket-kit",
    name: "Комплект прокладок двигателя",
    sku: "GSK-6068",
    brand: "John Deere",
    brandSlug: "john-deere",
    category: "Двигатель",
    brief: "Комплект прокладок для ремонта двигателя и обслуживания ГБЦ.",
    description:
      "Набор прокладок для ремонта двигателя. Состав комплекта уточняется под конкретную модификацию мотора.",
    compatibility: "John Deere 6068, 6090; тракторы 6R, 7R; комбайны серии W",
    status: "Под заказ",
    specs: "Состав: ГБЦ и уплотнения; подбор: по двигателю и серийному номеру",
    price: 0,
    currency: "EUR",
  },
  {
    id: "starter-case",
    name: "Стартер редукторный",
    sku: "STR-12V-3.2",
    brand: "New Holland",
    brandSlug: "new-holland",
    category: "Электрика",
    brief: "Стартер для тракторов и комбайнов с дизельными двигателями.",
    description:
      "Редукторный стартер для уверенного запуска техники. Сверяем мощность, напряжение, количество зубьев и крепление.",
    compatibility: "Case IH, New Holland, John Deere, Fendt; двигатели 12 В",
    status: "В наличии по запросу",
    specs: "Напряжение: 12 В; мощность: 3.2 кВт; состояние: новый",
    price: 0,
    currency: "EUR",
  },
  {
    id: "radiator-new-holland",
    name: "Радиатор охлаждения",
    sku: "RAD-NH-T7",
    brand: "New Holland",
    brandSlug: "new-holland",
    category: "Охлаждение",
    brief: "Радиатор для системы охлаждения тракторов и комбайнов.",
    description:
      "Радиатор охлаждения для замены изношенного или повреждённого узла. Проверяем габариты, патрубки и совместимость.",
    compatibility: "New Holland T6, T7; Case IH Puma; аналоги по размерам",
    status: "Под заказ",
    specs: "Материал: алюминий/пластик; проверка: по VIN или размерам",
    price: 0,
    currency: "EUR",
  },
];

const brandLogos = {
  "john-deere": "assets/brands/cropped/john-deere.png",
  fendt: "assets/brands/cropped/fendt.png",
  "case-ih": "assets/brands/cropped/case-ih.png",
  "new-holland": "assets/brands/cropped/new-holland.png",
  claas: "assets/brands/cropped/claas.png",
  krone: "assets/brands/cropped/krone.png",
};
const brandLogoBaseUrl =
  "https://store-77uyis7lbs.mybigcommerce.com/content/images/brands";

const searchIndexUrl = "data/catalog/search/index.json";
const catalogIndexUrl = "data/catalog/index.json";
const apiCatalogIndexUrl = "/api/catalog-index";
const apiCatalogPageUrl = "/api/catalog-page";
const apiSearchUrl = "/api/search";
const productsPerPage = 20;
const desktopPaginationButtonCount = 10;
const mobilePaginationButtonCount = 5;
const mobilePaginationQuery = window.matchMedia("(max-width: 640px)");
const searchResultLimit = productsPerPage * desktopPaginationButtonCount;

const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");
const homePage = document.querySelector("#homePage");
const brandPage = document.querySelector("#brandPage");
const brandPageLogoWrap = document.querySelector("#brandPageLogoWrap");
const brandPageLogo = document.querySelector("#brandPageLogo");
const backToHome = document.querySelector("#backToHome");
const brandList = document.querySelector("#brandList");
const catalogGrid = document.querySelector("#catalogGrid");
const catalogPaginationTop = document.querySelector("#catalogPaginationTop");
const catalogPaginationBottom = document.querySelector("#catalogPaginationBottom");
const catalogPaginationBlocks = [catalogPaginationTop, catalogPaginationBottom];
const emptyState = document.querySelector("#emptyState");
const resultMeta = document.querySelector("#resultMeta");
const heroSearchForm = document.querySelector("#heroSearchForm");
const searchInput = document.querySelector("#searchInput");
const detailSection = document.querySelector("#detail");
const closeDetailButton = document.querySelector("#closeDetail");
const orderForm = document.querySelector("#orderForm");
const orderPart = document.querySelector("#orderPart");
const formSuccess = document.querySelector("#formSuccess");
const toast = document.querySelector("#toast");

let allVisibleParts = [...demoParts];
let selectedPart = null;
let activeBrandSlug = "";
let catalogIndex = null;
let searchIndex = null;
let searchShardByPrefix = new Map();
let searchShardCache = new Map();
let toastTimer = null;
let paginationState = {
  mode: "none",
  brandSlug: "",
  query: "",
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  metaText: "",
  pageItemsAlreadySliced: false,
};

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function normalize(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ё/g, "е")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(part) {
  if (!Number(part.price)) {
    return "Цена по запросу";
  }

  return `${Number(part.price).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  })} ${part.currency || "EUR"}`;
}

function getSearchText(part) {
  return normalize(
    [
      part.name,
      part.nameOriginal,
      part.sku,
      part.brand,
      part.brandSlug,
      part.category,
      part.compatibility,
      part.brief,
    ].join(" "),
  );
}

function productFromSearchRow(row, fields = []) {
  if (!Array.isArray(row)) {
    return normalizePart(row);
  }

  return normalizePart(
    fields.reduce((product, field, index) => {
      product[field] = row[index];
      return product;
    }, {}),
  );
}

function normalizePart(product = {}) {
  const name = product.name || product.nameOriginal || product.sku || "Деталь";
  const sku = product.sku || "Артикул уточняется";
  const stock = product.stock || "В наличии по запросу";

  return {
    id:
      product.id ||
      `${normalize(product.brand || "brand").replace(/\s+/g, "-")}-${normalize(sku).replace(/\s+/g, "-")}`,
    name,
    nameOriginal: product.nameOriginal || name,
    sku,
    brand: product.brand || "Бренд уточняется",
    brandSlug:
      product.brandSlug || normalize(product.brand).replace(/\s+/g, "-"),
    category: product.category || "Запчасти",
    brief:
      product.brief ||
      `${product.brand || "Запчасть"} ${sku}. Подберём совместимость и сроки поставки.`,
    description:
      product.description ||
      `${name}. Деталь доступна для заказа, совместимость уточняется по модели техники, артикулу или серийному номеру.`,
    compatibility:
      product.compatibility ||
      product.compatible ||
      "Проверяется по модели техники и серийному номеру",
    status: stock === "Цена обновлена" ? "В наличии по запросу" : stock,
    specs:
      product.specs ||
      `Категория: ${product.category || "запчасти"}; артикул: ${sku}`,
    price: product.price || 0,
    oldPrice: product.oldPrice || 0,
    sourcePrice: product.sourcePrice || 0,
    oldSourcePrice: product.oldSourcePrice || 0,
    currency: product.currency || "EUR",
    image: product.image || "",
    availability: product.availability || "",
    priceUpdatedAt: product.priceUpdatedAt || "",
    lastFetchedAt: product.lastFetchedAt || "",
    url: product.url || "",
  };
}

function renderBrandList(brands = []) {
  const items = brands.length
    ? brands
    : [
        {
          brand: "John Deere",
          brandSlug: "john-deere",
          count: 0,
        },
        { brand: "Fendt", brandSlug: "fendt", count: 0 },
        { brand: "Case IH", brandSlug: "case-ih", count: 0 },
        { brand: "New Holland", brandSlug: "new-holland", count: 0 },
        { brand: "Claas", brandSlug: "claas", count: 0 },
        { brand: "Krone", brandSlug: "krone", count: 0 },
      ];

  brandList.innerHTML = items
    .map(
      (brand) => {
        const logo = getBrandLogo(brand);

        return `
        <button class="brand-row ${brand.brandSlug === activeBrandSlug ? "is-active" : ""}" type="button" data-brand-slug="${escapeHtml(brand.brandSlug)}">
          <span class="brand-logo-wrap ${logo ? "has-logo" : ""}">
            ${
              logo
                ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" onerror="this.closest('.brand-logo-wrap').hidden=true;" />`
                : `<i data-lucide="tractor"></i>`
            }
          </span>
          <span class="brand-text">
            <strong>${escapeHtml(brand.brand)}</strong>
            <small>${Number(brand.count || 0).toLocaleString("ru-RU")}</small>
          </span>
        </button>
      `;
      },
    )
    .join("");
  renderIcons();
}

function getBrandLogo(brand = "") {
  const brandSlug =
    typeof brand === "string" ? brand : brand?.brandSlug || normalize(brand?.brand || "").replace(/\s+/g, "-");

  if (!brandSlug) {
    return "";
  }

  return brandLogos[brandSlug] || `${brandLogoBaseUrl}/${encodeURIComponent(brandSlug)}.png`;
}

function getBrandName(brandSlug = "") {
  const brand = catalogIndex?.brands?.find(
    (item) => item.brandSlug === brandSlug,
  );
  const fallback = demoParts.find((part) => part.brandSlug === brandSlug);

  return brand?.brand || fallback?.brand || "Каталог";
}

function getBrandInfo(brandSlug = "") {
  return catalogIndex?.brands?.find((item) => item.brandSlug === brandSlug);
}

function showHomePage() {
  homePage.hidden = false;
  brandPage.hidden = true;
  searchInput.value = "";
  activeBrandSlug = "";
  closeDetail();
  renderBrandList(catalogIndex?.brands || []);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showBrandPage(brandSlug = "") {
  homePage.hidden = true;
  brandPage.hidden = false;
  activeBrandSlug = brandSlug;

  const logo = getBrandLogo({ brandSlug, brand: getBrandName(brandSlug) });
  brandPageLogoWrap.hidden = !logo;
  if (logo) {
    brandPageLogo.src = logo;
  } else {
    brandPageLogo.removeAttribute("src");
  }
  brandPageLogo.alt = logo ? getBrandName(brandSlug) : "";

  renderIcons();
}

function scrollToCatalogResults() {
  requestAnimationFrame(() => {
    resultMeta.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function clampPage(page, totalPages) {
  return Math.min(Math.max(1, Number(page) || 1), Math.max(1, totalPages));
}

function getPaginationButtonCount() {
  return mobilePaginationQuery.matches
    ? mobilePaginationButtonCount
    : desktopPaginationButtonCount;
}

function getPageWindow(currentPage, totalPages) {
  const visibleCount = Math.min(getPaginationButtonCount(), totalPages);
  let start = currentPage - Math.floor(visibleCount / 2);
  start = Math.max(1, Math.min(start, totalPages - visibleCount + 1));

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

function renderPagination() {
  const { currentPage, totalPages, totalCount } = paginationState;

  if (!totalCount || totalPages <= 1) {
    catalogPaginationBlocks.forEach((block) => {
      block.hidden = true;
      block.innerHTML = "";
    });
    return;
  }

  const start = (currentPage - 1) * productsPerPage + 1;
  const end = Math.min(currentPage * productsPerPage, totalCount);
  const pages = getPageWindow(currentPage, totalPages);

  const html = `
    <div class="pagination-summary">
      <span class="pagination-kicker">Каталог</span>
      <strong>Показано ${start}-${end}</strong>
      <span>из ${totalCount.toLocaleString("ru-RU")} товаров</span>
    </div>
    <div class="pagination-controls" role="group" aria-label="Выбор страницы">
      <button class="pagination-button pagination-arrow" type="button" data-page="${currentPage - 1}" aria-label="Предыдущая страница" ${currentPage === 1 ? "disabled" : ""}>
        <i data-lucide="chevron-left"></i>
      </button>
      <div class="pagination-pages">
        ${pages
          .map(
            (page) => `
              <button class="pagination-button ${page === currentPage ? "is-active" : ""}" type="button" data-page="${page}" aria-label="Страница ${page}" ${page === currentPage ? 'aria-current="page"' : ""}>
                ${page}
              </button>
            `,
          )
          .join("")}
      </div>
      <button class="pagination-button pagination-arrow" type="button" data-page="${currentPage + 1}" aria-label="Следующая страница" ${currentPage === totalPages ? "disabled" : ""}>
        <i data-lucide="chevron-right"></i>
      </button>
    </div>
  `;
  catalogPaginationBlocks.forEach((block) => {
    block.hidden = false;
    block.innerHTML = html;
  });
  renderIcons();
}

function renderCatalog(items, metaText = "Популярные позиции", options = {}) {
  allVisibleParts = items.map(normalizePart);
  brandPage.hidden = false;

  const totalCount = Number(options.totalCount || allVisibleParts.length);
  const totalPages = Math.max(
    1,
    Number(options.totalPages || Math.ceil(totalCount / productsPerPage)),
  );
  const currentPage = clampPage(options.currentPage || 1, totalPages);
  const pageItems = options.pageItemsAlreadySliced
    ? allVisibleParts
    : allVisibleParts.slice(
        (currentPage - 1) * productsPerPage,
        currentPage * productsPerPage,
      );

  paginationState = {
    mode: options.mode || "local",
    brandSlug: options.brandSlug || activeBrandSlug,
    query: options.query || "",
    currentPage,
    totalPages,
    totalCount,
    metaText,
    pageItemsAlreadySliced: Boolean(options.pageItemsAlreadySliced),
  };

  catalogGrid.innerHTML = pageItems
    .map(
      (part) => `
        <article class="part-row">
          ${
            part.image
              ? `<img class="part-image" src="${escapeHtml(part.image)}" alt="" loading="lazy" />`
              : `<span class="part-image part-image-placeholder"><i data-lucide="package"></i></span>`
          }
          <div class="part-main">
            <span class="part-brand">${escapeHtml(part.brand)}</span>
            <h3>${escapeHtml(part.name)}</h3>
            <p>${escapeHtml(part.brief)}</p>
            <div class="part-meta">
              <span><strong>Артикул:</strong> ${escapeHtml(part.sku)}</span>
              <span><strong>Категория:</strong> ${escapeHtml(part.category)}</span>
              <span><strong>Совместимость:</strong> ${escapeHtml(part.compatibility)}</span>
            </div>
          </div>
          <div class="part-side">
            ${Number(part.oldPrice) > Number(part.price) ? `<span class="part-old-price">${escapeHtml(formatPrice({ ...part, price: part.oldPrice }))}</span>` : ""}
            <strong>${escapeHtml(formatPrice(part))}</strong>
            <button class="button secondary" type="button" data-detail="${escapeHtml(part.id)}">Подробнее</button>
            <button class="button primary" type="button" data-order="${escapeHtml(part.id)}">Заказать</button>
          </div>
        </article>
      `,
    )
    .join("");

  resultMeta.textContent = `${metaText}: ${totalCount.toLocaleString("ru-RU")}`;
  emptyState.hidden = totalCount > 0;
  catalogGrid.hidden = totalCount === 0;
  renderPagination();
}

function clearCatalog(metaText = "Выберите фирму или введите артикул") {
  allVisibleParts = [];
  catalogGrid.innerHTML = "";
  catalogGrid.hidden = true;
  catalogPaginationBlocks.forEach((block) => {
    block.hidden = true;
    block.innerHTML = "";
  });
  emptyState.hidden = true;
  resultMeta.textContent = metaText;
  paginationState = {
    mode: "none",
    brandSlug: "",
    query: "",
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    metaText,
    pageItemsAlreadySliced: false,
  };
}

function setLoading(message) {
  brandPage.hidden = false;
  resultMeta.textContent = message;
  catalogPaginationBlocks.forEach((block) => {
    block.hidden = true;
  });
  emptyState.hidden = true;
}

function findVisiblePart(id) {
  return allVisibleParts.find((part) => part.id === id);
}

async function loadJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${url}`);
  }

  return response.json();
}

async function loadFirstJson(urls = []) {
  let lastError = null;

  for (const url of urls) {
    try {
      return await loadJson(url);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Не удалось загрузить данные");
}

async function loadCatalogIndex() {
  try {
    catalogIndex = await loadFirstJson([apiCatalogIndexUrl, catalogIndexUrl]);
    renderBrandList(catalogIndex.brands || []);
  } catch {
    renderBrandList();
  }
}

async function loadSearchIndex() {
  if (searchIndex) {
    return searchIndex;
  }

  searchIndex = await loadJson(searchIndexUrl);
  searchShardByPrefix = new Map(
    (searchIndex.shards || []).map((shard) => [shard.prefix, shard]),
  );
  return searchIndex;
}

function getSearchPrefix(token = "") {
  const prefixLength = searchIndex?.metadata?.prefixLength || 3;

  for (let size = Math.min(prefixLength, token.length); size > 0; size -= 1) {
    const prefix = token.slice(0, size);

    if (searchShardByPrefix.has(prefix)) {
      return prefix;
    }
  }

  return token.slice(0, Math.min(prefixLength, token.length));
}

async function loadSearchShard(prefix) {
  const shard = searchShardByPrefix.get(prefix);

  if (!shard) {
    return [];
  }

  if (!searchShardCache.has(shard.shardId)) {
    searchShardCache.set(
      shard.shardId,
      loadJson(`data/catalog/search/${shard.shardId}.json`).then((data) =>
        (data.products || []).map((row) =>
          productFromSearchRow(row, data.fields || searchIndex.metadata.fields),
        ),
      ),
    );
  }

  return searchShardCache.get(shard.shardId);
}

function localSearch(query) {
  const tokens = normalize(query).split(" ").filter(Boolean);

  if (!tokens.length) {
    return demoParts;
  }

  return allVisibleParts.concat(demoParts).filter((part, index, list) => {
    const isUnique = list.findIndex((item) => item.id === part.id) === index;
    const isBrandMatch = activeBrandSlug
      ? part.brandSlug === activeBrandSlug
      : true;
    return (
      isUnique &&
      isBrandMatch &&
      tokens.every((token) => getSearchText(part).includes(token))
    );
  });
}

async function searchParts(query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    if (activeBrandSlug) {
      showBrandProducts(activeBrandSlug);
    } else {
      showHomePage();
      clearCatalog();
    }
    return;
  }

  showBrandPage(activeBrandSlug);
  setLoading("Ищем по артикулу и названию...");
  const localResults = localSearch(query);

  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(searchResultLimit),
    });

    if (activeBrandSlug) {
      params.set("brand", activeBrandSlug);
    }

    const data = await loadJson(`${apiSearchUrl}?${params.toString()}`);
    const apiResults = (data.products || []).map(normalizePart);
    const merged = [...apiResults, ...localResults].filter(
      (part, index, list) =>
        list.findIndex((item) => item.id === part.id) === index,
    );

    renderCatalog(merged, `По запросу «${query.trim()}» найдено`, {
      mode: "search",
      query,
      currentPage: 1,
    });
    scrollToCatalogResults();
    return;
  } catch {
    // Static files remain the fallback for GitHub Pages and plain file hosting.
  }

  try {
    await loadSearchIndex();
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const prefix = getSearchPrefix(tokens[0]);
    const shardProducts = await loadSearchShard(prefix);
    const shardResults = shardProducts.filter((part) => {
      const isBrandMatch = activeBrandSlug
        ? part.brandSlug === activeBrandSlug
        : true;
      return (
        isBrandMatch &&
        tokens.every((token) => getSearchText(part).includes(token))
      );
    });
    const merged = [...localResults, ...shardResults].filter(
      (part, index, list) =>
        list.findIndex((item) => item.id === part.id) === index,
    );

    renderCatalog(merged, `По запросу «${query.trim()}» найдено`, {
      mode: "search",
      query,
      currentPage: 1,
    });
    scrollToCatalogResults();
  } catch {
    renderCatalog(localResults, `По запросу «${query.trim()}» найдено`, {
      mode: "search",
      query,
      currentPage: 1,
    });
    scrollToCatalogResults();
  }
}

async function showBrandProducts(brandSlug, page = 1) {
  showBrandPage(brandSlug);
  renderBrandList(catalogIndex?.brands || []);
  setLoading("Загружаем детали фирмы...");

  try {
    const params = new URLSearchParams({
      brand: brandSlug,
      page: String(page),
      perPage: String(productsPerPage),
      fast: "1",
    });
    const data = await loadJson(`${apiCatalogPageUrl}?${params.toString()}`);
    const brandName = data.metadata?.brand || "Выбранная фирма";
    const products = (data.products || []).map(normalizePart);
    renderCatalog(products, `${brandName}, каталог`, {
      mode: "brand-api",
      brandSlug,
      currentPage: Number(data.metadata?.page || page),
      totalPages: Number(data.metadata?.pages || 1),
      totalCount: Number(data.metadata?.count || products.length),
      pageItemsAlreadySliced: true,
    });
    scrollToCatalogResults();
  } catch {
    try {
      await showStaticBrandProducts(brandSlug, page);
    } catch {
      const fallback = demoParts.filter((part) => part.brandSlug === brandSlug);
      renderCatalog(fallback, "Демо-детали фирмы", {
        mode: "brand-static",
        brandSlug,
        currentPage: 1,
      });
      scrollToCatalogResults();
    }
  }
}

async function showStaticBrandProducts(brandSlug, page = 1) {
  const brandInfo = getBrandInfo(brandSlug);
  const totalCount = Number(brandInfo?.count) || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / productsPerPage));
  const currentPage = clampPage(page, totalPages);
  const start = (currentPage - 1) * productsPerPage;
  const chunkSize = Number(catalogIndex?.metadata?.chunkSize || 1000);
  const sourcePage = Math.floor(start / chunkSize) + 1;
  const offset = start % chunkSize;
  const data = await loadJson(`data/catalog/${brandSlug}/page-${sourcePage}.json`);
  const products = (data.products || [])
    .slice(offset, offset + productsPerPage)
    .map(normalizePart);
  const brandName = data.metadata?.brand || brandInfo?.brand || "Выбранная фирма";

  renderCatalog(products, `${brandName}, каталог`, {
    mode: "brand-static",
    brandSlug,
    currentPage,
    totalPages,
    totalCount: totalCount || Number(data.metadata?.count || products.length),
    pageItemsAlreadySliced: true,
  });
  scrollToCatalogResults();
}

function fillDetail(part) {
  selectedPart = part;
  document.querySelector("#detailSku").textContent = `Артикул ${part.sku}`;
  document.querySelector("#detailTitle").textContent = part.name;
  document.querySelector("#detailDescription").textContent = part.description;
  document.querySelector("#detailBrand").textContent = part.brand;
  document.querySelector("#detailCompatibility").textContent =
    part.compatibility;
  document.querySelector("#detailPrice").textContent = formatPrice(part);
  document.querySelector("#detailStatus").textContent = part.status;
  document.querySelector("#detailSpecs").textContent = part.specs;
  orderPart.value = `${part.name} (${part.sku})`;
  formSuccess.hidden = true;
}

function openDetail(partId, shouldFocusForm = false) {
  const part = findVisiblePart(partId);

  if (!part) {
    return;
  }

  fillDetail(part);
  detailSection.hidden = false;
  document.body.classList.add("modal-open");

  if (shouldFocusForm) {
    setTimeout(() => {
      orderForm.querySelector("input[name='name']")?.focus();
    }, 80);
  } else {
    setTimeout(() => {
      closeDetailButton.focus();
    }, 80);
  }
}

function closeDetail() {
  detailSection.hidden = true;
  document.body.classList.remove("modal-open");
  selectedPart = null;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

async function goToCatalogPage(page) {
  const nextPage = clampPage(page, paginationState.totalPages);

  if (nextPage === paginationState.currentPage) {
    return;
  }

  closeDetail();

  if (paginationState.mode === "brand-api" || paginationState.mode === "brand-static") {
    await showBrandProducts(paginationState.brandSlug, nextPage);
    return;
  }

  renderCatalog(allVisibleParts, paginationState.metaText, {
    mode: paginationState.mode,
    brandSlug: paginationState.brandSlug,
    query: paginationState.query,
    currentPage: nextPage,
    totalPages: paginationState.totalPages,
    totalCount: paginationState.totalCount,
  });
  scrollToCatalogResults();
}

heroSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  activeBrandSlug = "";
  searchParts(searchInput.value);
});

brandList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-brand-slug]");

  if (!button) {
    return;
  }

  searchInput.value = "";
  closeDetail();
  showBrandProducts(button.dataset.brandSlug);
});

backToHome.addEventListener("click", () => {
  clearCatalog();
  showHomePage();
});

function setMenuOpen(isOpen) {
  siteHeader.classList.toggle("nav-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(!siteHeader.classList.contains("nav-open"));
});

mainNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setMenuOpen(false);
  }
});

catalogGrid.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-detail]");
  const orderButton = event.target.closest("[data-order]");

  if (detailButton) {
    openDetail(detailButton.dataset.detail);
  }

  if (orderButton) {
    openDetail(orderButton.dataset.order, true);
  }
});

catalogPaginationBlocks.forEach((block) => {
  block.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");

    if (!button || button.disabled) {
      return;
    }

    goToCatalogPage(Number(button.dataset.page));
  });
});

closeDetailButton.addEventListener("click", closeDetail);

function handleMobilePaginationChange() {
  if (!mobilePaginationQuery.matches) {
    setMenuOpen(false);
  }

  renderPagination();
}

if (mobilePaginationQuery.addEventListener) {
  mobilePaginationQuery.addEventListener("change", handleMobilePaginationChange);
} else {
  mobilePaginationQuery.addListener(handleMobilePaginationChange);
}

detailSection.addEventListener("click", (event) => {
  if (event.target === detailSection) {
    closeDetail();
  }
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(orderForm);
  const partName = formData.get("part") || selectedPart?.name || "деталь";

  formSuccess.hidden = false;
  showToast(`Заявка на «${partName}» отправлена`);
  orderForm.reset();
  orderPart.value = selectedPart
    ? `${selectedPart.name} (${selectedPart.sku})`
    : "";
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteHeader.classList.contains("nav-open")) {
    setMenuOpen(false);
  }

  if (event.key === "Escape" && !detailSection.hidden) {
    closeDetail();
  }
});

renderBrandList();
clearCatalog();
renderIcons();
loadCatalogIndex();
