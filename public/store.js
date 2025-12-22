const productsEl = document.getElementById("products");

/* ================= LOAD PRODUCTS ================= */
async function loadProducts() {
  const res = await fetch("/api/store/products");
  const products = await res.json();

  productsEl.innerHTML = products.map(p => `
    <div class="product-card">
      <img src="${p.images?.[0] || 'https://via.placeholder.com/400'}">
      <div class="product-info">
        <h3>${p.title}</h3>
        <p>${p.description || ""}</p>

        ${p.plans.map(pl => {
          const stock = pl.keys.length;
          return `
            <div class="plan ${stock === 0 ? "disabled" : ""}"
              data-title="${p.title}"
              data-plan="${pl.name}"
              data-price="${pl.price}">
              ${pl.name} – $${pl.price}
              <div style="font-size:12px;opacity:.7">
                ${stock > 0 ? `🟢 ${stock} متوفر` : `🔴 غير متوفر`}
              </div>
            </div>
          `;
        }).join("")}

        <button class="btn buy-btn" disabled>اختر فترة</button>
      </div>
    </div>
  `).join("");

  setupPlans();
  animateCards();
  enableGlow();
}

/* ================= PLAN SELECT ================= */
function setupPlans() {
  document.querySelectorAll(".product-card").forEach(card => {
    let selected = null;
    const btn = card.querySelector(".buy-btn");

    card.querySelectorAll(".plan:not(.disabled)").forEach(plan => {
      plan.onclick = () => {
        card.querySelectorAll(".plan").forEach(p => p.classList.remove("active"));
        plan.classList.add("active");
        selected = plan;
        btn.disabled = false;
      };
    });

    btn.onclick = () => openCheckout(selected);
  });
}

/* ================= CHECKOUT ================= */
function openCheckout(plan) {
  const email = prompt("اكتب إيميلك:");
  if (!email) return;

  createOrder({
    email,
    productTitle: plan.dataset.title,
    plan: plan.dataset.plan,
    price: plan.dataset.price
  });
}

async function createOrder(data) {
  const res = await fetch("/api/store/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const order = await res.json();

  alert(`تم إنشاء الطلب ✅\nرقم الطلب:\n${order._id}`);
  openProof(order._id);
}

/* ================= PAYMENT PROOF ================= */
function openProof(orderId) {
  const ref = prompt("اكتب رقم العملية / المرجع:");
  const proofUrl = prompt("حط رابط صورة إثبات التحويل:");

  if (!ref || !proofUrl) return alert("البيانات ناقصة");

  fetch(`/api/store/order/${orderId}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference: ref, proofUrl })
  }).then(() => {
    alert("تم إرسال الإثبات ⏳ سيتم المراجعة");
  });
}

/* ================= ANIMATIONS ================= */
function animateCards() {
  document.querySelectorAll(".product-card").forEach((c, i) => {
    setTimeout(() => c.classList.add("show"), i * 80);
  });
}

function enableGlow() {
  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--y", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });
}

loadProducts();
