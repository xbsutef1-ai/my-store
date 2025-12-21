// حماية
if (!localStorage.getItem("token")) {
  location.href = "/login.html";
}

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("token");
  location.href = "/";
};

document.querySelectorAll(".side-item").forEach(item=>{
  item.onclick=()=>{
    document.querySelectorAll(".side-item").forEach(i=>i.classList.remove("active"));
    item.classList.add("active");

    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    document.getElementById(item.dataset.view).classList.remove("hidden");
  };
});

async function api(url, method="GET", body){
  const res = await fetch(url,{
    method,
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+localStorage.getItem("token")
    },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// ===== OVERVIEW =====
async function loadOverview(){
  const d = await api("/api/admin/overview");
  ovSales.textContent = "$"+d.revenue;
  ovOrders.textContent = d.orders;
  ovUsers.textContent = d.users;
  ovPending.textContent = d.pending;
}
loadOverview();

// ===== PRODUCTS =====
async function loadProducts(){
  const products = await api("/api/admin/products");
  productsGrid.innerHTML = products.map(p=>`
    <div class="product-card">
      <img src="${p.image || 'https://via.placeholder.com/300x200'}">
      <div class="product-info">
        <h4>${p.name}</h4>
        <p>$${p.price} • Stock: ${p.stock}</p>
      </div>
      <div class="product-actions">
        <button class="btn danger" onclick="deleteProduct('${p._id}')">Delete</button>
      </div>
    </div>
  `).join("");
}
loadProducts();

async function addProduct(){
  await api("/api/admin/products","POST",{
    name:pName.value,
    price:Number(pPrice.value),
    stock:Number(pStock.value),
    image:pImage.value
  });
  pName.value=pPrice.value=pStock.value=pImage.value="";
  loadProducts();
}

async function deleteProduct(id){
  await api("/api/admin/products/"+id,"DELETE");
  loadProducts();
}

// ===== ORDERS =====
async function loadOrders(){
  const orders = await api("/api/admin/orders");
  ordersList.innerHTML = orders.map(o=>`
    <div class="row">
      <span>${o.userEmail}</span>
      <span>${o.status}</span>
      <button class="btn" onclick="deliver('${o._id}')">Deliver</button>
    </div>
  `).join("");
}
loadOrders();

async function deliver(id){
  const code = prompt("Delivery content:");
  await api("/api/admin/orders/"+id+"/status","POST",{
    status:"delivered",
    delivery:code
  });
  loadOrders();
}

// ===== CUSTOMERS =====
async function loadCustomers(){
  const c = await api("/api/admin/customers");
  customersList.innerHTML = c.map(x=>`
    <div class="row">
      <span>${x.email}</span>
      <span>${x.orders} orders</span>
      <span>$${x.total}</span>
    </div>
  `).join("");
}
loadCustomers();
