document.addEventListener("DOMContentLoaded", () => {

  const productsDiv = document.getElementById("products");
  const tabsDiv = document.getElementById("tabs");
  const accountBtn = document.getElementById("accountBtn");
  const accountMenu = document.getElementById("accountMenu");

  let allProducts = [];
  let categories = [];
  let currentCat = "ALL";

  /* ===== ACCOUNT MENU ===== */
  accountBtn.onclick = () => {
    accountMenu.classList.toggle("hidden");
  };

  document.addEventListener("click", e => {
    if (!accountMenu.contains(e.target) && !accountBtn.contains(e.target)) {
      accountMenu.classList.add("hidden");
    }
  });

  /* ===== LOAD DATA ===== */
  async function loadAll() {
    const [cats, prods] = await Promise.all([
      fetch("/api/categories").then(r => r.json()),
      fetch("/api/products").then(r => r.json())
    ]);

    categories = cats;
    allProducts = prods;

    renderTabs();
    renderProducts();
  }

  /* ===== TABS ===== */
  function renderTabs() {
    tabsDiv.innerHTML = "";

    const all = document.createElement("div");
    all.className = `tab ${currentCat === "ALL" ? "active" : ""}`;
    all.textContent = "All";
    all.onclick = () => setCat("ALL");
    tabsDiv.appendChild(all);

    categories.forEach(c => {
      const t = document.createElement("div");
      t.className = `tab ${currentCat === c.slug ? "active" : ""}`;
      t.textContent = c.name;
      t.onclick = () => setCat(c.slug);
      tabsDiv.appendChild(t);
    });
  }

  function setCat(slug) {
    currentCat = slug;
    renderTabs();
    renderProducts();
  }

  /* ===== PRODUCTS ===== */
  function renderProducts() {
    productsDiv.innerHTML = "";

    let list = allProducts;
    if (currentCat !== "ALL") {
      list = list.filter(p => p.categorySlug === currentCat);
    }

    list.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "product";
      card.innerHTML = `
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <div class="price">${p.price} SAR</div>
        <button class="btn">Buy</button>
      `;
      productsDiv.appendChild(card);

      setTimeout(() => card.classList.add("reveal"), i * 70);
    });
  }

  loadAll();
});
