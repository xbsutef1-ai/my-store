const id = new URLSearchParams(location.search).get("id");
const box = document.getElementById("productBox");

async function loadProduct(){
  const r = await fetch(`/api/store/product/${id}`);
  const p = await r.json();

  box.innerHTML = `
    <div class="gallery">
      ${p.images.map(img => `<img src="${img}">`).join("")}
    </div>

    <h1>${p.title}</h1>
    <p>${p.description}</p>

    <h3>الفترات</h3>
    ${p.plans.map(pl => `
      <div class="planRow">
        <b>${pl.name}</b>
        <span>${pl.price}$</span>
        <span>Stock: ${pl.keys.length}</span>
        <button class="btn">شراء</button>
      </div>
    `).join("")}
  `;
}

loadProduct();
