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

const searchIndexUrl = "data/catalog/search/index.json";
const catalogIndexUrl = "data/catalog/index.json";
const apiCatalogIndexUrl = "/api/catalog-index";
const apiCatalogPageUrl = "/api/catalog-page";
const apiSearchUrl = "/api/search";
const resultLimit = 60;

const homePage = document.querySelector("#homePage");
const brandPage = document.querySelector("#brandPage");
const brandPageLogoWrap = document.querySelector("#brandPageLogoWrap");
const brandPageLogo = document.querySelector("#brandPageLogo");
const backToHome = document.querySelector("#backToHome");
const brandList = document.querySelector("#brandList");
const catalogGrid = document.querySelector("#catalogGrid");
const emptyState = document.querySelector("#emptyState");
const resultMeta = document.querySelector("#resultMeta");
const heroSearchForm = document.querySelector("#heroSearchForm");
const searchInput = document.querySelector("#searchInput");
const brandSearchForm = document.querySelector("#brandSearchForm");
const brandSearchInput = document.querySelector("#brandSearchInput");
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
let searchTimer = null;

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
    currency: product.currency || "EUR",
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
      (brand) => `
        <button class="brand-row ${brand.brandSlug === activeBrandSlug ? "is-active" : ""}" type="button" data-brand-slug="${escapeHtml(brand.brandSlug)}">
          <span class="brand-logo-wrap">
            ${
              brandLogos[brand.brandSlug]
                ? `<img src="${escapeHtml(brandLogos[brand.brandSlug])}" alt="" loading="lazy" />`
                : `<i data-lucide="tractor"></i>`
            }
          </span>
          <strong class="sr-only">${escapeHtml(brand.brand)}</strong>
        </button>
      `,
    )
    .join("");
  renderIcons();
}

function getBrandLogo(brandSlug = "") {
  return brandLogos[brandSlug] || "";
}

function getBrandName(brandSlug = "") {
  const brand = catalogIndex?.brands?.find(
    (item) => item.brandSlug === brandSlug,
  );
  const fallback = demoParts.find((part) => part.brandSlug === brandSlug);

  return brand?.brand || fallback?.brand || "Каталог";
}

function showHomePage() {
  homePage.hidden = false;
  brandPage.hidden = true;
  searchInput.value = "";
  brandSearchInput.value = "";
  activeBrandSlug = "";
  closeDetail();
  renderBrandList(catalogIndex?.brands || []);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showBrandPage(brandSlug = "") {
  homePage.hidden = true;
  brandPage.hidden = false;
  activeBrandSlug = brandSlug;

  const logo = getBrandLogo(brandSlug);
  brandPageLogoWrap.hidden = !logo;
  if (logo) {
    brandPageLogo.src = logo;
  } else {
    brandPageLogo.removeAttribute("src");
  }
  brandPageLogo.alt = logo ? getBrandName(brandSlug) : "";

  window.scrollTo({ top: 0, behavior: "smooth" });
  renderIcons();
}

function renderCatalog(items, metaText = "Популярные позиции") {
  allVisibleParts = items.map(normalizePart);
  brandPage.hidden = false;

  catalogGrid.innerHTML = allVisibleParts
    .slice(0, resultLimit)
    .map(
      (part) => `
        <article class="part-row">
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
            <span class="part-status">${escapeHtml(part.status)}</span>
            <strong>${escapeHtml(formatPrice(part))}</strong>
            <button class="button secondary" type="button" data-detail="${escapeHtml(part.id)}">Подробнее</button>
            <button class="button primary" type="button" data-order="${escapeHtml(part.id)}">Заказать</button>
          </div>
        </article>
      `,
    )
    .join("");

  const limitedText =
    allVisibleParts.length > resultLimit ? `, показано ${resultLimit}` : "";
  resultMeta.textContent = `${metaText}: ${allVisibleParts.length}${limitedText}`;
  emptyState.hidden = allVisibleParts.length > 0;
  catalogGrid.hidden = allVisibleParts.length === 0;
}

function clearCatalog(metaText = "Выберите фирму или введите артикул") {
  allVisibleParts = [];
  catalogGrid.innerHTML = "";
  catalogGrid.hidden = true;
  emptyState.hidden = true;
  resultMeta.textContent = metaText;
}

function setLoading(message) {
  brandPage.hidden = false;
  resultMeta.textContent = message;
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
      limit: String(resultLimit),
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

    renderCatalog(merged, `По запросу «${query.trim()}» найдено`);
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

    renderCatalog(merged, `По запросу «${query.trim()}» найдено`);
  } catch {
    renderCatalog(localResults, `По запросу «${query.trim()}» найдено`);
  }
}

async function showBrandProducts(brandSlug) {
  showBrandPage(brandSlug);
  brandSearchInput.value = "";
  renderBrandList(catalogIndex?.brands || []);
  setLoading("Загружаем детали фирмы...");

  try {
    const params = new URLSearchParams({
      brand: brandSlug,
      page: "1",
    });
    const data = await loadFirstJson([
      `${apiCatalogPageUrl}?${params.toString()}`,
      `data/catalog/${brandSlug}/page-1.json`,
    ]);
    const brandName = data.metadata?.brand || "Выбранная фирма";
    const products = (data.products || []).map(normalizePart);
    renderCatalog(products, `${brandName}, первая страница каталога`);
  } catch {
    const fallback = demoParts.filter((part) => part.brandSlug === brandSlug);
    renderCatalog(fallback, "Демо-детали фирмы");
  }
}

function fillDetail(part) {
  selectedPart = part;
  document.querySelector("#detailSku").textContent = `Артикул ${part.sku}`;
  document.querySelector("#detailTitle").textContent = part.name;
  document.querySelector("#detailDescription").textContent = part.description;
  document.querySelector("#detailBrand").textContent = part.brand;
  document.querySelector("#detailCompatibility").textContent =
    part.compatibility;
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
  detailSection.scrollIntoView({ behavior: "smooth", block: "start" });

  if (shouldFocusForm) {
    setTimeout(() => {
      orderForm.querySelector("input[name='name']")?.focus();
    }, 420);
  }
}

function closeDetail() {
  detailSection.hidden = true;
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

heroSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  activeBrandSlug = "";
  brandSearchInput.value = searchInput.value;
  searchParts(searchInput.value);
});

brandSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchParts(brandSearchInput.value);
});

brandSearchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchParts(brandSearchInput.value);
  }, 220);
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

closeDetailButton.addEventListener("click", closeDetail);

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
  if (event.key === "Escape" && !detailSection.hidden) {
    closeDetail();
  }
});

renderBrandList();
clearCatalog();
renderIcons();
loadCatalogIndex();
