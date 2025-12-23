/* ===================== GLOM STORE - FRONT ===================== */

const productsEl = document.getElementById("products");
const categoriesEl = document.getElementById("categories");
const userBox = document.getElementById("userBox");
const searchInput = document.getElementById("searchInput");

let currentCategory = "all";
let productsCache = [];
let filteredCache = [];

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);
const open = (id) => $(id)?.classList.remove("hidden");
const close = (id) => $(id)?.classList.add("hidden");

function toast(msg) {
  alert(msg);
}

function safeImg(url) {
  const fallback =
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop";
  return url || fallback;
}

/* ========= USER ========= */
function getUser() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  return token && email ? { token, email, name } : null;
}

function logout() {
  localStorage.clear();
  renderUser();
}

function renderUser() {
  const u = getUser();
  if (!userBox) return;

  if (!u) {
    userBox.innerHTML = `
      <button class="btn ghost" onclick="openAuth()">Login</button>
    `;
    return;
  }

  const letter = (u.name || u.email)[0].toUpperCase();

  userBox.innerHTML = `
    <div class="avatarBox">
      <div class="avatar" onclick="toggleUserMenu()">${letter}</div>
      <div id="userMenu" class="userMenu hidden">
        <div class="itm" onclick="location.href='/account'">حسابي + طلباتي</div>
        <div class="itm" onclick="logout()">تسجيل خروج</div>
      </div>
    </div>
  `;
}

window.toggleUserMenu = () => {
  $("userMenu")?.classList.toggle("hidden");
};

renderUser();

/* ========= CATEGORIES ========= */
async function loadCategories() {
  if (!categoriesEl) return;

  try {
    const r = await fetch("/api/store/categories");
    const cats = await r.json();

    categoriesEl.innerHTML = `
      <button class="catBtn ${currentCategory === "all" ? "active" : ""}"
        onclick="pickCat('all')">الكل</button>
      ${cats.map(c => `
        <button class="catBtn ${currentCategory === c.slug ? "active" : ""}"
          onclick="pickCat('${c.slug}')">${c.name}</button>
      `).join("")}
    `;
  } catch {
    categoriesEl.innerHTML = `
      <button class="catBtn active">الكل</button>
    `;
  }
}

window.pickCat = async (slug) => {
  currentCategory = slug;
  await loadCategories();
  filterAndRender();
};

/* ========= PRODUCTS ========= */
async function loadProducts() {
  try {
    const r = await fetch("/api/store/products");
    productsCache = await r.json();
    filteredCache = [...productsCache];
    filterAndRender();
  } catch (e) {
    console.error(e);
    productsEl.innerHTML = "تعذر تحميل المنتجات";
  }
}

/* ========= SEARCH + FILTER ========= */
function filterAndRender() {
  const q = (searchInput?.value || "").toLowerCase();

  filteredCache = productsCache.filter(p => {
    const matchCat =
      currentCategory === "all" || p.categorySlug === currentCategory;
    const matchSearch =
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  renderProducts(filteredCache);
}

if (searchInput) {
  searchInput.addEventListener("input", filterAndRender);
}

/* ========= RENDER ========= */
function renderProducts(list) {
  if (!Array.isArray(list) || !list.length) {
    productsEl.innerHTML = `<div class="small">لا توجد منتجات</div>`;
    return;
  }

  productsEl.innerHTML = list.map((p, i) => {
    const img = safeImg(p?.images?.[0]);
    const plans = Array.isArray(p.plans) ? p.plans : [];
    const pills = plans.slice(0, 3).map(pl => {
      const stock = Array.isArray(pl.keys) ? pl.keys.length : 0;
      return `<span class="pill">${pl.name} • ${pl.price}$ • ${stock}</span>`;
    }).join("");

    return `
      <article class="card animate"
        style="animation-delay:${i * 70}ms"
        onclick="openProduct('${p._id}')">

        <img src="${img}" onerror="this.src='${safeImg()}'">

        <div class="pad">
          <div class="title">${p.title}</div>
          <div class="desc">${p.description || ""}</div>
          <div class="meta">
            ${pills || `<span class="pill">بدون فترات</span>`}
          </div>
        </div>
      </article>
    `;
  }).join("");

  observeCards();
}

/* ========= ANIMATION ========= */
function observeCards() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) en.target.classList.add("show");
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".card").forEach(c => obs.observe(c));
}

/* ========= NAV ========= */
window.openProduct = (id) => {
  location.href = `/product.html?id=${id}`;
};

/* ========= INIT ========= */
(async function init() {
  await loadCategories();
  await loadProducts();
})();
