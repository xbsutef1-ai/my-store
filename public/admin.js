const token = localStorage.getItem("token");
if (!token) location.href = "/login.html";

async function api(url, method="GET", body){
  const res = await fetch(url,{
    method,
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+token
    },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// ================= OVERVIEW =================
async function loadOverview(){
  const d = await api("/api/admin/overview");
  ovSales.textContent = "$"+d.revenue;
  ovOrders.textContent = d.orders;
  ovUsers.textContent = d.users;
  ovPending.textContent = d.pending;
}
loadOverview();

// ================= PRODUCTS =================
async function loadProducts(){
  const p = await api("/api/admin/products");
  productsList.innerHTML = p.map(x=>`
    <div class="row">
      <span>${x.name}</span>
      <span>$${x.price}</span>
      <button onclick="deleteProduct('${x._id}')">❌</button>
    </div>
  `).join("");
}
loadProducts();

async function addProduct(){
  await api("/api/admin/products","POST",{
    name:pName.value,
    price:Number(pPrice.value),
    stock:10
  });
  loadProducts();
}

async function deleteProduct(id){
  await api("/api/admin/products/"+id,"DELETE");
  loadProducts();
}

// ================= ORDERS =================
async function loadOrders(){
  const o = await api("/api/admin/orders");
  ordersList.innerHTML = o.map(x=>`
    <div class="row">
      <span>${x.userEmail}</span>
      <span>${x.status}</span>
      <button onclick="deliver('${x._id}')">Deliver</button>
    </div>
  `).join("");
}
loadOrders();

async function deliver(id){
  const code = prompt("Delivery code:");
  await api("/api/admin/orders/"+id+"/status","POST",{
    status:"delivered",
    delivery:code
  });
  loadOrders();
}

// ================= CUSTOMERS =================
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
