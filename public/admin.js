const productsBox = document.getElementById("productsBox");
const ordersBox = document.getElementById("ordersBox");

async function loadStats(){
  const orders = await fetch("/api/admin/orders").then(r=>r.json());
  const products = await fetch("/api/admin/products").then(r=>r.json());

  document.getElementById("stOrders").textContent = orders.length;
  document.getElementById("stPending").textContent =
    orders.filter(o=>o.status==="waiting_discord").length;
  document.getElementById("stProducts").textContent = products.length;
}

async function loadProducts(){
  const list = await fetch("/api/admin/products").then(r=>r.json());
  productsBox.innerHTML = list.map(p=>`
    <div class="card show">
      <div class="pad">
        <div class="title">${p.title}</div>
        <div class="desc">${p.description||""}</div>
        <div class="pill">${p.categorySlug||"no-category"}</div>
      </div>
    </div>
  `).join("");
}

async function loadOrders(){
  const list = await fetch("/api/admin/orders").then(r=>r.json());
  ordersBox.innerHTML = list.map(o=>`
    <div class="card show">
      <img src="${o.proof||''}">
      <div class="pad">
        <div class="title">Order ${o._id}</div>
        <div class="desc">Ref: ${o.reference}</div>
        <div class="pill">${o.status}</div>
      </div>
    </div>
  `).join("");
}

async function addProduct(){
  const title = pTitle.value.trim();
  if(!title) return alert("اكتب اسم المنتج");

  await fetch("/api/admin/product",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      title,
      description:pDesc.value,
      categorySlug:pCat.value
    })
  });

  pTitle.value=pDesc.value=pCat.value="";
  loadProducts();
  loadStats();
}

(async function(){
  await loadStats();
  await loadProducts();
  await loadOrders();
})();
