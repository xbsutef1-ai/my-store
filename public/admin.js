const token = localStorage.getItem("token") || "";

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* ---------- Overview ---------- */
async function loadOverview() {
  const res = await fetch("/api/admin/overview", {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();

  statOrders.textContent = data.totalOrders;
  statRevenue.textContent = data.revenue;

  new Chart(document.getElementById("revenueChart"), {
    type: "bar",
    data: {
      labels: ["Revenue"],
      datasets: [{
        data: [data.revenue],
        backgroundColor: "#b66bff"
      }]
    }
  });
}

/* ---------- Products ---------- */
async function loadProducts() {
  const res = await fetch("/api/admin/products", {
    headers: { Authorization: "Bearer " + token }
  });
  const products = await res.json();

  productsList.innerHTML = products.map(p => `
    <div class="card">
      <b>${p.title}</b><br>
      <small>${p.plans.length} plans</small>

      <div class="card-actions">
        <button onclick="deleteProduct('${p._id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

async function deleteProduct(id) {
  await fetch(`/api/admin/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });
  loadProducts();
}

/* ---------- Orders ---------- */
async function loadOrders() {
  const res = await fetch("/api/admin/orders", {
    headers: { Authorization: "Bearer " + token }
  });
  const orders = await res.json();

  ordersList.innerHTML = orders.map(o => `
    <div class="card">
      <b>${o.userEmail}</b><br>
      ${o.items[0].title} – ${o.items[0].plan}<br>
      <small>Status: ${o.status}</small><br>
      <small>Proof: ${o.payment?.flag || "—"}</small>

      <div class="card-actions">
        ${o.status === "waiting_review"
          ? `<button onclick="approveOrder('${o._id}')">Approve</button>`
          : ""}
        ${o.invoicePath
          ? `<a href="${o.invoicePath}" target="_blank">Invoice</a>`
          : ""}
      </div>
    </div>
  `).join("");
}

async function approveOrder(id) {
  await fetch(`/api/admin/orders/${id}/approve`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadOrders();
}

/* ---------- Init ---------- */
loadOverview();
loadProducts();
loadOrders();

function logout() {
  localStorage.removeItem("token");
  location.reload();
}
