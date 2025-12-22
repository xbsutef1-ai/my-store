const productsEl = document.getElementById("products");
let selected = {};

/* ========== LOAD PRODUCTS ========== */
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
              onclick="selectPlan('${p._id}','${p.title}','${pl.name}',${pl.price})">
              ${pl.name} – $${pl.price}
              <div class="plan-stock">
                ${stock > 0 ? `🟢 ${stock}` : `🔴 غير متوفر`}
              </div>
            </div>
          `;
        }).join("")}

        <button class="btn" onclick="openCheckout()">شراء</button>
      </div>
    </div>
  `).join("");

  animateCards();
  enableGlow();
}

/* ========== PLAN SELECT ========== */
function selectPlan(pid, title, plan, price) {
  selected = { pid, title, plan, price };
}

/* ========== CHECKOUT MODAL ========== */
function openCheckout() {
  if (!selected.plan) return alert("اختر فترة أولًا");
  document.getElementById("checkoutModal").classList.remove("hidden");

  document.getElementById("coProduct").innerText = selected.title;
  document.getElementById("coPlan").innerText = selected.plan;
  document.getElementById("coPrice").innerText = `$${selected.price}`;
  document.getElementById("coFinal").innerText = `$${selected.price}`;
}

async function createOrder() {
  const email = document.getElementById("coEmail").value;
  if (!email) return alert("اكتب الإيميل");

  const res = await fetch("/api/store/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      product: {
        productId: selected.pid,
        title: selected.title,
        plan: selected.plan,
        price: selected.price
      },
      price: selected.price
    })
  });

  const data = await res.json();
  document.getElementById("checkoutModal").classList.add("hidden");
  openProof(data.orderId);
}

/* ========== PAYMENT PROOF ========== */
function openProof(orderId) {
  document.getElementById("proofModal").classList.remove("hidden");
  document.getElementById("prOrderId").innerText = orderId;

  document.getElementById("sendProofBtn").onclick = async () => {
    const ref = document.getElementById("prRef").value;
    const url = document.getElementById("prUrl").value;

    await fetch(`/api/store/order/${orderId}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: ref, proofUrl: url })
    });

    alert("تم إرسال الإثبات");
    document.getElementById("proofModal").classList.add("hidden");
  };
}

/* ========== ANIMATION ========== */
function animateCards() {
  document.querySelectorAll(".product-card").forEach((c, i) =>
    setTimeout(() => c.classList.add("show"), i * 80)
  );
}

function enableGlow() {
  document.querySelectorAll(".product-card").forEach(card => {
    card.onmousemove = e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${(e.clientX - r.left) / r.width * 100}%`);
      card.style.setProperty("--y", `${(e.clientY - r.top) / r.height * 100}%`);
    };
  });
}

loadProducts();
