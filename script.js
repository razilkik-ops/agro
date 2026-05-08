const searchInput = document.querySelector("#quickSearch");
const searchForm = document.querySelector(".search-form");
const headerSearchForm = document.querySelector("#headerSearchForm");
const productSearchInputs = document.querySelectorAll("[data-product-search]");
const filterButtons = document.querySelectorAll(".filter-button");
const brandButtons = document.querySelectorAll("[data-brand-filter]");
const productGrid = document.querySelector("#productGrid");
const sortSelect = document.querySelector("#sortSelect");
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

let activeFilter = "all";
let activeBrand = "all";
let cards = [...document.querySelectorAll(".product-card")];
let cart = loadCart();
let favorites = loadList(favoritesKey);
let compareList = loadList(compareKey);
let showFavoritesOnly = false;
let selectedProduct = null;
let toastTimer;

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

  return `${Number(value).toLocaleString("ru-RU")} ${currency}`;
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
  return {
    id: card.dataset.id,
    name: card.dataset.name,
    price: Number(card.dataset.price),
    currency: card.dataset.currency || "BYN",
    brand: card.dataset.brand,
    category: card.dataset.category,
    sku: card.dataset.sku,
    description: card.dataset.description,
    compatible: card.dataset.compatible,
    stock: card.dataset.stock,
    visual: card.dataset.visual,
    weight: card.dataset.weight,
    warranty: card.dataset.warranty
  };
}

function productCardTemplate(product) {
  const visual = product.visual || "green";
  const icon = product.icon || "package";
  const price = Number(product.price) || 0;
  const currency = product.currency || "EUR";
  const stockLabel = product.stock && product.stock !== "Наличие уточняется" ? "В наличии" : "Под заказ";

  return `
    <article
      class="product-card"
      data-id="${escapeHtml(product.id)}"
      data-brand="${escapeHtml(product.brand)}"
      data-category="${escapeHtml(product.category || "tractor")}"
      data-name="${escapeHtml(product.name)}"
      data-price="${price}"
      data-currency="${escapeHtml(currency)}"
      data-sku="${escapeHtml(product.sku)}"
      data-stock="${escapeHtml(product.stock || "Наличие уточняется")}"
      data-visual="${escapeHtml(visual)}"
      data-description="${escapeHtml(product.description)}"
      data-compatible="${escapeHtml(product.compatible || product.brand)}"
      data-weight="${escapeHtml(product.weight || "Уточняется")}"
      data-warranty="${escapeHtml(product.warranty || "По условиям поставщика")}"
      data-url="${escapeHtml(product.url || "")}"
    >
      <div class="product-visual ${escapeHtml(visual)}">
        <i data-lucide="${escapeHtml(icon)}"></i>
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
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-bottom">
          <strong>от ${formatPrice(price, currency)}</strong>
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

async function loadCatalog() {
  try {
    const response = await fetch(`${catalogUrl}?v=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`Catalog request failed: ${response.status}`);
    }

    const catalog = await response.json();
    const products = Array.isArray(catalog.products) ? catalog.products : [];

    if (products.length > 0) {
      productGrid.innerHTML = products.map(productCardTemplate).join("");
      refreshCards();
    }
  } catch (error) {
    console.warn(error);
  }
}

function applyFilters() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach((card) => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const brandMatch = activeBrand === "all" || card.dataset.brand === activeBrand;
    const favoriteMatch = !showFavoritesOnly || favorites.includes(card.dataset.id);
    const searchable = [
      card.dataset.name,
      card.dataset.brand,
      card.dataset.sku,
      card.dataset.description,
      card.dataset.compatible
    ].join(" ").toLowerCase();
    const nameMatch = searchable.includes(query);
    const isVisible = categoryMatch && brandMatch && favoriteMatch && nameMatch;

    if (isVisible) {
      visibleCount += 1;
    }

    card.classList.toggle("is-hidden", !isVisible);
  });

  emptyResults.classList.toggle("is-visible", visibleCount === 0);
}

function syncSearch(value, sourceInput) {
  productSearchInputs.forEach((input) => {
    if (input !== sourceInput) {
      input.value = value;
    }
  });

  applyFilters();
}

function getCartTotalQty() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotalPrice() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  cartCount.textContent = getCartTotalQty();
  cartTotal.textContent = formatPrice(getCartTotalPrice(), cart[0]?.currency || "BYN");
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
        <p>${formatPrice(item.price, item.currency)} за шт.</p>
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
    ["Цена", products.map((item) => `от ${formatPrice(item.price, item.currency)}`)],
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

  detailVisual.className = `detail-visual ${selectedProduct.visual}`;
  detailSku.textContent = `Артикул ${selectedProduct.sku}`;
  detailTitle.textContent = selectedProduct.name;
  detailDescription.textContent = selectedProduct.description;
  detailCompatible.textContent = selectedProduct.compatible;
  detailStock.textContent = selectedProduct.stock;
  detailPrice.textContent = `от ${formatPrice(selectedProduct.price, selectedProduct.currency)}`;

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
    applyFilters();
  });
});

searchForm?.addEventListener("submit", (event) => event.preventDefault());
headerSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth" });
});

productSearchInputs.forEach((input) => {
  input.addEventListener("input", () => {
    syncSearch(input.value, input);
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
  await loadCatalog();
  renderIcons();
  renderCart();
  renderSavedStates();
  renderCompare();
  applyFilters();
});
