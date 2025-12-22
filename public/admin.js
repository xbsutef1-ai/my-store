const productsDiv = document.getElementById("products");

/* ================= STATS ================= */
async function loadStats(){
  const r = await fetch("/api/admin/orders-stats");
  const d = await r.json();
  stSuspicious.innerText = d.suspicious;
  stApproved.innerText = d.approved;
  stRejected.innerText = d.rejected;
}

/* ================= PRODUCTS ================= */
async function addProduct(){
  const fd = new FormData();
  fd.append("title", title.value);
  fd.append("description", description.value);
  fd.append("categorySlug", category.value);
  fd.append("priceUSD", price.value);
  fd.append("image", image.files[0]);

  await fetch("/api/admin/products", { method:"POST", body:fd });
  loadProducts();
}

async function loadProducts(){
  const r = await fetch("/api/admin/products");
  const products = await r.json();

  productsDiv.innerHTML = products.map(p => `
    <div class="card">
      <b>${p.title}</b><br>
      <img src="${p.images[0]}" style="max-width:120px"><br>

      <button onclick="del('${p._id}')">❌ حذف</button>

      <h4>➕ إضافة فترة</h4>
      <input id="pn-${p._id}" placeholder="اسم الفترة">
      <input id="pp-${p._id}" placeholder="السعر">
      <button onclick="addPlan('${p._id}')">إضافة</button>

      ${p.plans.map(pl => `
        <div>
          <b>${pl.name}</b> (${pl.keys.length} keys)
          <input id="k-${p._id}-${pl.name}" placeholder="Key">
          <button onclick="addKey('${p._id}','${pl.name}')">+</button>
        </div>
      `).join("")}
    </div>
  `).join("");
}

async function del(id){
  await fetch("/api/admin/product/"+id,{ method:"DELETE" });
  loadProducts();
}

async function addPlan(id){
  await fetch(`/api/admin/product/${id}/plan`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      name:document.getElementById("pn-"+id).value,
      price:document.getElementById("pp-"+id).value
    })
  });
  loadProducts();
}

async function addKey(pid,pname){
  await fetch(`/api/admin/product/${pid}/plan/${pname}/key`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      key:document.getElementById(`k-${pid}-${pname}`).value
    })
  });
  loadProducts();
}

/* ================= REVIEW ORDERS ================= */
async function loadReviewOrders(){
  const r = await fetch("/api/admin/review-orders");
  const orders = await r.json();

  reviewOrders.innerHTML = orders.length
    ? orders.map(o => `
      <div class="card">
        <b>${o.items[0].title}</b><br>
        <b>السعر:</b> $${o.items[0].price}<br>
        <b>المطلوب:</b> ${o.payment?.expectedAmount} ريال<br>
        <b>المكتشف:</b> ${o.payment?.detectedAmount ?? "غير واضح"} ريال<br>
        <img src="${o.payment?.proofUrl}" style="max-width:220px"><br>
        <button onclick="approve('${o._id}')">✅ قبول</button>
        <button onclick="reject('${o._id}')">❌ رفض</button>
      </div>
    `).join("")
    : "<p>لا يوجد طلبات</p>";
}

async function approve(id){
  await fetch(`/api/admin/order/${id}/approve`,{ method:"POST" });
  loadReviewOrders(); loadStats();
}

async function reject(id){
  await fetch(`/api/admin/order/${id}/reject`,{ method:"POST" });
  loadReviewOrders(); loadStats();
}

/* ================= INIT ================= */
loadStats();
loadProducts();
loadReviewOrders();
