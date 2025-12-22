function showTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

/* ================= OVERVIEW ================= */
async function loadOverview(){
  const r = await fetch("/api/admin/overview");
  const d = await r.json();
  statOrders.textContent = d.orders;
  statPending.textContent = d.pending;
  statRevenue.textContent = d.revenue;
}

/* ================= PRODUCTS ================= */
async function loadProducts(){
  const r = await fetch("/api/admin/products");
  const list = await r.json();

  productsList.innerHTML = list.map(p=>`
    <div class="item">
      <b>${p.title}</b> — $${p.price}
      <div style="opacity:.7">${p.description||""}</div>
    </div>
  `).join("");
}

async function addProduct(){
  await fetch("/api/admin/products",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      title:pTitle.value,
      price:pPrice.value,
      description:pDesc.value
    })
  });
  pTitle.value=pPrice.value=pDesc.value="";
  loadProducts();
}

/* ================= ORDERS ================= */
async function loadOrders(){
  const r = await fetch("/api/admin/orders");
  const list = await r.json();

  ordersList.innerHTML = list.map(o=>`
    <div class="item">
      <b>${o.userEmail}</b> — ${o.status}
      <div>$${o.finalTotal}</div>
    </div>
  `).join("");
}

/* INIT */
loadOverview();
loadProducts();
loadOrders();
