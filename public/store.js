/* ===================== GLOM STORE - FRONT ===================== */

const productsEl = document.getElementById("products");
const categoriesEl = document.getElementById("categories");
const userBox = document.getElementById("userBox");

let currentCategory = "all";
let productsCache = [];
let selectedProduct = null;
let selectedPlan = null;
let couponData = null;
let currentOrderId = null;

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);
const open = (id) => $(id).classList.remove("hidden");
const close = (id) => $(id).classList.add("hidden");

function toast(msg) {
  alert(msg);
}

function getUser() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  return token && email ? { token, email, name } : null;
}

function setUser(u) {
  localStorage.setItem("token", u.token);
  localStorage.setItem("email", u.email);
  localStorage.setItem("name", u.name || "");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  localStorage.removeItem("name");
  localStorage.removeItem("tmpEmail");
  renderUser();
}

function safeImg(url) {
  // لو ما فيه صورة أو كان /uploads (غالبًا ما تشتغل)، نخلي fallback
  const fallback =
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop";
  if (!url) return fallback;

  // إذا كانت صورة relative مثل /uploads/.. ممكن تكون 404 حسب مشروعك
  // نخليها تشتغل إذا عندك static للـ uploads، وإلا fallback وقت الخطأ
  return url;
}

/* ========= Avatar + Menu ========= */
function renderUser() {
  const u = getUser();

  if (!userBox) return;

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
        <div class="itm" onclick="location.href='/account'">حسابي + طلباتي</div>
        <div class="itm" onclick="logout()">تسجيل خروج</div>
      </div>
    </div>
  `;
}

window.toggleUserMenu = () => {
  const m = document.getElementById("userMenu");
  if (m) m.classList.toggle("hidden");
};

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
async function loadProducts() {
  if (!productsEl) return;

  try {
    const r = await fetch(
      `/api/store/products?category=${encodeURIComponent(currentCategory)}`
    );
    const list = await r.json();

    console.log("STORE PRODUCTS:", list); // تشخيص مهم

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

      // ✅ آمن 100%: لا نفترض keys موجودة
      const plans = Array.isArray(p.plans) ? p.plans : [];
      const planPills = plans.slice(0, 3).map((pl) => {
        const price = Number(pl?.price || 0);
        const stock = Array.isArray(pl?.keys) ? pl.keys.length : Number(pl?.stock || 0) || 0;
        const name = String(pl?.name || "Plan");
        return `<span class="pill">${name} • ${price}$ • ${stock}✅</span>`;
      }).join("");

      const plansCount = plans.length;

      return `
      <article class="card" data-id="${p._id}">
        <img src="${img}" alt="" onerror="this.src='https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop'">
        <div class="pad">
          <div class="title">${p.title || "Product"}</div>
          <div class="desc">${p.description || ""}</div>

          <div class="meta">
            ${plansCount ? planPills : `<span class="pill">⚠️ بدون فترات</span>`}
          </div>

          <button class="btn" onclick="openCheckout('${p._id}')">
            ${plansCount ? "شراء" : "عرض المنتج"}
          </button>
        </div>
      </article>
    `;
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

  if (!$("coProduct") || !$("coPlan")) {
    return toast("واجهة Checkout غير موجودة في index.html");
  }

  $("coProduct").textContent = selectedProduct.title || "Product";

  const sel = $("coPlan");
  sel.innerHTML = plans
    .map((pl) => {
      const name = String(pl?.name || "Plan");
      const price = Number(pl?.price || 0);
      const stock = Array.isArray(pl?.keys) ? pl.keys.length : Number(pl?.stock || 0) || 0;
      return `
        <option value="${name}" data-price="${price}" data-stock="${stock}">
          ${name} — ${price}$ (Stock: ${stock})
        </option>
      `;
    })
    .join("");

  // لو ما فيه خطط، نفتح المودال بس بدون اختيار
  couponData = null;
  if ($("coCoupon")) $("coCoupon").value = "";
  if ($("coDiscount")) $("coDiscount").textContent = "0";

  if (plans.length) {
    updatePlanFromSelect();
    sel.onchange = () => {
      couponData = null;
      if ($("coDiscount")) $("coDiscount").textContent = "0";
      updatePlanFromSelect();
    };
  } else {
    selectedPlan = null;
    if ($("coStock")) $("coStock").textContent = "-";
    if ($("coPrice")) $("coPrice").textContent = "-";
    if ($("coFinal")) $("coFinal").textContent = "-";
  }

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

  if ($("coStock")) $("coStock").textContent = selectedPlan.stock;
  if ($("coPrice")) $("coPrice").textContent = `${selectedPlan.price}$`;
  if ($("coFinal")) $("coFinal").textContent = `${selectedPlan.price}$`;
}

window.createOrder = async () => {
  const u = getUser();
  if (!u) return openAuth();

  if (!selectedProduct) return toast("اختر منتج");
  if (!selectedPlan) return toast("هذا المنتج ما له فترات. ارجع للداشبورد وأضف Plan.");

  if (selectedPlan.stock <= 0) return toast("Out of stock");

  let couponCode = $("coCoupon") ? $("coCoupon").value.trim() : "";
  let discount = 0;

  // Preview coupon
  if (couponCode) {
    try {
      const rr = await fetch(`/api/store/coupon/${encodeURIComponent(couponCode.toUpperCase())}`);
      if (rr.ok) {
        couponData = await rr.json();
        if (couponData.type === "percent")
          discount = +(selectedPlan.price * (couponData.value / 100)).toFixed(2);
        if (couponData.type === "amount")
          discount = Math.min(selectedPlan.price, couponData.value);
      }
    } catch {}
  }

  const r = await fetch("/api/store/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${u.token}`
    },
    body: JSON.stringify({
      productId: selectedProduct._id,
      planName: selectedPlan.name,
      couponCode: couponCode || null
    })
  });

  const data = await r.json();
  if (!r.ok) return toast(data.error || "ORDER_FAILED");

  close("checkoutModal");

  currentOrderId = data.orderId;

  if ($("prOrder")) $("prOrder").textContent = currentOrderId;

  try {
    const bank = await fetch("/api/store/bank").then((x) => x.json());
    if ($("bankBox")) {
      $("bankBox").innerHTML = `
        <b>بيانات التحويل البنكي</b><br>
        البنك: ${bank.bankName}<br>
        IBAN: <b>${bank.iban}</b><br>
        Account: <b>${bank.account}</b><br>
        <span style="opacity:.8">بعد التحويل: ارفع الإثبات + رقم العملية (المرجع)</span>
      `;
    }
  } catch {}

  if ($("prRef")) $("prRef").value = "";
  if ($("prUrl")) $("prUrl").value = "";
  if ($("prMsg")) $("prMsg").textContent = "";

  open("proofModal");
};

window.sendProof = async () => {
  const u = getUser();
  if (!u) return openAuth();

  const reference = $("prRef") ? $("prRef").value.trim() : "";
  const proofUrl = $("prUrl") ? $("prUrl").value.trim() : "";
  if (!reference || !proofUrl) return toast("اكتب رقم العملية + رابط الإثبات");

  const r = await fetch(`/api/store/order/${currentOrderId}/proof`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${u.token}`
    },
    body: JSON.stringify({ reference, proofUrl })
  });

  const data = await r.json();
  if (!r.ok) return toast(data.error || "PROOF_FAILED");

  if ($("prMsg")) {
    if (data.flag === "fraud") $("prMsg").textContent = "⚠️ الإثبات مشكوك بأنه مكرر/مزور — يحتاج تحقق يدوي.";
    else if (data.flag === "suspicious") $("prMsg").textContent = "⚠️ المرجع قصير/غير واضح — قد يحتاج تحقق.";
    else $("prMsg").textContent = "✅ تم إرسال الإثبات. يرجى انتظار المراجعة.";
  }
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

  if ($("rgName")) {
    if (authMode === "register") $("rgName").classList.remove("hidden");
    else $("rgName").classList.add("hidden");
  }
}

if ($("authSubmit")) {
  $("authSubmit").onclick = async () => {
    const email = $("rgEmail") ? $("rgEmail").value.trim().toLowerCase() : "";
    const pass = $("rgPass") ? $("rgPass").value.trim() : "";
    const name = $("rgName") ? $("rgName").value.trim() : "";

    if (!email || !pass) return toast("اكتب الإيميل والباسورد");

    if (authMode === "login") {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await r.json();

      if (!r.ok) {
        if (data.error === "NOT_VERIFIED") {
          localStorage.setItem("tmpEmail", email);
          close("authModal");
          open("verifyModal");
          return;
        }
        return toast("بيانات خاطئة");
      }

      setUser(data);
      close("authModal");
      renderUser();
      return;
    }

    // register
    if (!name) return toast("اكتب اسم للحساب");

    const rr = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name })
    });

    const dd = await rr.json();
    if (!rr.ok) return toast(dd.error || "فشل التسجيل");

    localStorage.setItem("tmpEmail", email);
    close("authModal");
    open("verifyModal");
    if ($("vfMsg")) $("vfMsg").textContent = "✅ تم إرسال كود التحقق إلى الإيميل";
  };
}

window.verifyAccount = async () => {
  const email = localStorage.getItem("tmpEmail");
  const code = $("vfCode") ? $("vfCode").value.trim() : "";

  if (!email) return toast("رجع سجّل من جديد");
  if (!code) return toast("اكتب الكود");

  const r = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });

  const data = await r.json();
  if (!r.ok) return toast("كود غير صحيح");

  setUser(data);
  localStorage.removeItem("tmpEmail");
  close("verifyModal");
  renderUser();
};

window.resendCode = async () => {
  const email = localStorage.getItem("tmpEmail");
  if (!email) return toast("رجع سجّل من جديد");

  if ($("vfMsg")) $("vfMsg").textContent = "جارٍ الإرسال...";

  const r = await fetch("/api/auth/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  if (!r.ok) {
    if ($("vfMsg")) $("vfMsg").textContent = "فشل الإرسال";
    return;
  }
  if ($("vfMsg")) $("vfMsg").textContent = "✅ تم إرسال كود جديد";
};

/* ========= Init ========= */
(async function init() {
  await loadCategories();
  await loadProducts();
})();
