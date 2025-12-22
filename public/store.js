const productsEl = document.getElementById("products");
const sideMenu = document.getElementById("sideMenu");
const menuBtn = document.getElementById("menuBtn");

/* Sidebar */
menuBtn.onclick = () => {
  sideMenu.classList.toggle("show");
};

/* Load products */
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
            <div class="plan ${stock === 0 ? "disabled" : ""}">
              ${pl.name} – $${pl.price}
              <div style="font-size:12px;opacity:.7">
                ${stock > 0 ? `🟢 ${stock} متوفر` : `🔴 غير متوفر`}
              </div>
            </div>
          `;
        }).join("")}

        <button class="btn">شراء</button>
      </div>
    </div>
  `).join("");

  animateCards();
  enableGlow();
}

/* Animations */
function animateCards() {
  document.querySelectorAll(".product-card").forEach((c, i) => {
    setTimeout(() => c.classList.add("show"), i * 80);
  });
}

/* Glow follow mouse */
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
