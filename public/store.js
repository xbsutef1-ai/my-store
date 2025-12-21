const productsDiv = document.getElementById("products");

fetch("/api/products")
  .then(r => r.json())
  .then(products => {
    productsDiv.innerHTML = products.map(p => `
      <div class="product-card">
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        ${p.plans.map(pl => `
          <div>${pl.name} - $${pl.price}</div>
        `).join("")}
        <button class="buy-btn">Buy</button>
      </div>
    `).join("");
  });
