const productsDiv = document.getElementById("products");

function animateCards() {
  document.querySelectorAll(".product-card").forEach((card, i) => {
    setTimeout(() => card.classList.add("show"), i * 90);
  });
}

function enableGlow() {
  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty("--y", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

async function loadStore() {
  const res = await fetch("/api/store/products");
  const products = await res.json();

  productsDiv.innerHTML = products.map(p => `
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
              <div class="plan-stock">
                ${stock > 0 ? `🟢 ${stock} in stock` : `🔴 Out of stock`}
              </div>
            </div>
          `;
        }).join("")}

        <button class="buy-btn" disabled>Select a plan</button>
      </div>
    </div>
  `).join("");

  animateCards();
  enableGlow();
}

loadStore();
