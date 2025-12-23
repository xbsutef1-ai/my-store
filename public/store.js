/* ===================== GLOM STORE - FRONT ===================== */

const productsEl = document.getElementById("products");
const categoriesEl = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const userBox = document.getElementById("userBox");

let currentCategory = "all";
let productsCache = [];

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);

function safeImg(url) {
  return url || "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb";
}

/* ========= User ========= */
function getUser() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  return token && email ? { token, email, name } : null;
}

function renderUser() {
  const u = getUser();
  if (!userBox) return;

  if (!u) {
    userBox.innerHTML = `<button class="btn ghost" onclick="openAuth()">Login</button>`;
    return;
  }

  const l = (u.name || u.email)[0].toUpperCase();
  userBox.innerHTML = `
    <div class="avatarBox">
      <div class="avatar">${l}</div>
    </div>
  `;
}
renderUser();

/* ========= Categories ========= */
async function loadCategories() {
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
}

window.pickCat = (slug) => {
  currentCategory = slug;
  filterRender();
};

/* ========= Products ========= */
async function loadProducts() {
  const r = await fetch("/api/store/products");
  productsCache = await r.json();
  filterRender();
}

function filterRender() {
  const q = (searchInput.value || "").toLowerCase();

  const list = productsCache.filter(p => {
    const catOk = currentCategory === "all" || p.categorySlug === currentCategory;
    const searchOk =
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);
    return catOk && searchOk;
  });

  renderProducts(list);
}

searchInput.addEventListener("input", filterRender);

function renderProducts(list) {
  if (!list.length) {
    productsEl.innerHTML = `<div class="small">لا توجد منتجات</div>`;
    return;
  }

  productsEl.innerHTML = list.map((p,i) => `
    <article class="card show" style="animation-delay:${i*70}ms"
      onclick="location.href='/product.html?id=${p._id}'">

      <img src="${safeImg(p.images?.[0])}">
      <div class="pad">
        <div class="title">${p.title}</div>
        <div class="desc">${p.description || ""}</div>
      </div>
    </article>
  `).join("");
}

/* ========= Init ========= */
(async function(){
  await loadCategories();
  await loadProducts();
})();
