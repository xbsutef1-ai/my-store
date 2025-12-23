/* ===================== GLOM STORE - FRONT (FULL) ===================== */

const productsEl = document.getElementById("products");
const categoriesEl = document.getElementById("categories");
const userBox = document.getElementById("userBox");

let currentCategory = "all";
let productsCache = [];
let selectedProduct = null;
let selectedPlan = null;

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);
const open = (id) => $(id)?.classList.remove("hidden");
const close = (id) => $(id)?.classList.add("hidden");

function toast(msg) {
  alert(msg);
}

function setUser(u) {
  localStorage.setItem("token", u.token);
  localStorage.setItem("email", u.email);
  localStorage.setItem("name", u.name || "");
  localStorage.setItem("role", u.role || "user");
  renderUser(); // ✅ مهم عشان الافتار يظهر مباشرة
}

function getUser() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  return token && email ? { token, email, name, role } : null;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  localStorage.removeItem("name");
  localStorage.removeItem("role");
  renderUser();
  // لو كنت فاتح مودال/منيو
  $("userMenu")?.classList.add("hidden");
}

/* ========= Avatar + Menu ========= */
function renderUser() {
  if (!userBox) return;
  const u = getUser();

  if (!u) {
    userBox.innerHTML = `
      <button class="btn ghost" style="margin:0;padding:10px 14px" onclick="openAuth()">
        Login
      </button>
    `;
    return;
  }

  const letter = (u.name || u.email || "U")[0].toUpperCase();

  userBox.innerHTML = `
    <div style="position:relative">
      <div class="avatar" onclick="toggleUserMenu()">${letter}</div>
      <div id="userMenu" class="userMenu hidden">
        <div class="itm" onclick="goAccount()">حسابي</div>
        ${u.role === "admin" ? `<div class="itm" onclick="goAdmin()">Dashboard</div>` : ``}
        <div class="itm" onclick="logout()">تسجيل خروج</div>
      </div>
    </div>
  `;
}

window.toggleUserMenu = () => {
  const m = $("userMenu");
  if (!m) return;
  m.classList.toggle("hidden");
};

window.goAdmin = () => {
  location.href = "/admin.html";
};

window.goAccount = () => {
  // إذا عندك صفحة حساب لاحقًا
  toast("صفحة حسابي لسه بنكمّلها بعدين (My Orders UI)");
};

document.addEventListener("click", (e) => {
  const menu = $("userMenu");
  if (!menu) return;
  // اقفل المنيو لو ضغط خارج الافتار/القائمة
  const avatar = document.querySelector(".avatar");
  if (!menu.contains(e.target) && !avatar?.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

renderUser();

/* ========= Categories ========= */
async function loadCategories() {
  if (!categoriesEl) return;

  try {
    const r = await fetch("/api/store/categories");
    const cats = await r.json();

    const allBtn = `
      <button class="catBtn ${currentCategory === "all" ? "active" : ""}"
              onclick="pickCat('all')">كل المنتجات</button>
    `;

    const btns = (cats || [])
      .map(
        (c) => `
        <button class="catBtn ${currentCategory === c.slug ? "active" : ""}"
                onclick="pickCat('${c.slug}')">${c.name}</button>
      `
      )
      .join("");

    categoriesEl.innerHTML = allBtn + btns;
  } catch (e) {
    console.error("Categories load error:", e);
    categoriesEl.innerHTML = `
      <button class="catBtn active" onclick="pickCat('all')">كل المنتجات</button>
    `;
  }
}

window.pickCat = async (slug) => {
  currentCategory = slug;
  await loadCategories();
  await loadProducts();
};

/* ========= Products ========= */
function safeImg(url) {
  const fallback =
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop";
  return url || fallback;
}

async function loadProducts() {
  if (!productsEl) return;

  try {
    const r = await fetch(
      `/api/store/products?category=${encodeURIComponent(currentCategory)}`
    );
    const list = await r.json();

    productsCache = Array.isArray(list) ? list : [];
    renderProducts(productsCache);
  } catch (e) {
    console.error("Products load error:", e);
    productsEl.innerHTML = `<div class="small">تعذر تحميل المنتجات</div>`;
  }
}

function renderProducts(list) {
  if (!Array.isArray(list)) list = [];

  productsEl.innerHTML = list
    .map((p) => {
      const img = safeImg(p?.images?.[0]);
      const plans = Array.isArray(p.plans) ? p.plans : [];

      const planPills = plans.slice(0, 3).map((pl) => {
        const price = Number(pl?.price || 0);
        const stock = Array.isArray(pl?.keys) ? pl.keys.length : Number(pl?.stock || 0) || 0;
        const name = String(pl?.name || "Plan");
        return `<span class="pill">${name} • ${price}$ • ${stock}✅</span>`;
      }).join("");

      return `
      <article class="card" data-id="${p._id}">
        <img src="${img}" alt=""
             onerror="this.src='https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop'">
        <div class="pad">
          <div class="title">${p.title || "Product"}</div>
          <div class="desc">${p.description || ""}</div>

          <div class="meta">
            ${plans.length ? planPills : `<span class="pill">⚠️ بدون فترات</span>`}
          </div>

          <button class="btn" onclick="openCheckout('${p._id}')">شراء</button>
        </div>
      </article>`;
    })
    .join("");

  // hover glow follow mouse
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    });
  });

  // entry animation
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) en.target.classList.add("show");
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".card").forEach((c) => obs.observe(c));
}

/* ========= Checkout ========= */
window.openCheckout = async (productId) => {
  const u = getUser();
  if (!u) return openAuth();

  selectedProduct = productsCache.find((x) => x._id === productId);
  if (!selectedProduct) return toast("المنتج غير موجود");

  const plans = Array.isArray(selectedProduct.plans) ? selectedProduct.plans : [];
  if (!$("coProduct") || !$("coPlan")) return toast("Checkout UI غير موجود");

  $("coProduct").textContent = selectedProduct.title || "Product";

  const sel = $("coPlan");
  sel.innerHTML = plans
    .map((pl) => {
      const name = String(pl?.name || "Plan");
      const price = Number(pl?.price || 0);
      const stock = Array.isArray(pl?.keys) ? pl.keys.length : Number(pl?.stock || 0) || 0;
      return `<option value="${name}" data-price="${price}" data-stock="${stock}">
        ${name} — ${price}$ (Stock: ${stock})
      </option>`;
    })
    .join("");

  if (plans.length) {
    updatePlanFromSelect();
    sel.onchange = updatePlanFromSelect;
  } else {
    selectedPlan = null;
    $("coStock").textContent = "-";
    $("coPrice").textContent = "-";
    $("coFinal").textContent = "-";
  }

  $("coCoupon").value = "";
  $("coDiscount").textContent = "0";

  open("checkoutModal");
};

function updatePlanFromSelect() {
  const sel = $("coPlan");
  const opt = sel.options[sel.selectedIndex];

  selectedPlan = {
    name: opt.value,
    price: Number(opt.getAttribute("data-price")),
    stock: Number(opt.getAttribute("data-stock"))
  };

  $("coStock").textContent = selectedPlan.stock;
  $("coPrice").textContent = `${selectedPlan.price}$`;
  $("coFinal").textContent = `${selectedPlan.price}$`;
}

window.createOrder = async () => {
  const u = getUser();
  if (!u) return openAuth();

  if (!selectedProduct) return toast("اختر منتج");
  if (!selectedPlan) return toast("هذا المنتج بدون فترات");

  if (selectedPlan.stock <= 0) return toast("Out of stock");

  // هذا مكان إنشاء Order الحقيقي لاحقًا (نكمّله مع Orders + Keys UI)
  toast("✅ تم إنشاء الطلب (بنكمّل صفحة طلباتي + التسليم بعدين)");
  close("checkoutModal");
};

/* ========= AUTH UI ========= */
let authMode = "login";

window.openAuth = () => {
  authMode = "login";
  updateAuthUI();
  open("authModal");
};

window.switchAuth = () => {
  authMode = authMode === "login" ? "register" : "login";
  updateAuthUI();
};

function updateAuthUI() {
  if (!$("authTitle")) return;

  $("authTitle").textContent = authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب";
  $("authSubmit").textContent = authMode === "login" ? "دخول" : "تسجيل";
  $("authSwitchText").textContent = authMode === "login" ? "ما عندك حساب؟" : "عندك حساب؟";

  $("rgName").classList.toggle("hidden", authMode !== "register");
}

if ($("authSubmit")) {
  $("authSubmit").onclick = async () => {
    const email = $("rgEmail").value.trim().toLowerCase();
    const pass = $("rgPass").value.trim();
    const name = $("rgName").value.trim();

    if (!email || !pass) return toast("اكتب الإيميل والباسورد");

    if (authMode === "login") {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await r.json();
      if (!r.ok) return toast(data.error || "LOGIN_FAILED");
      setUser(data);
      close("authModal");
      return;
    }

    if (!name) return toast("اكتب اسم للحساب");

    const rr = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name })
    });

    const dd = await rr.json();
    if (!rr.ok) return toast(dd.error || "REGISTER_FAILED");

    setUser(dd);
    close("authModal");
  };
}

/* ========= Init ========= */
(async function init() {
  await loadCategories();
  await loadProducts();
})();
