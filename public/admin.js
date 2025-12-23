function showTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function loadOrders(){
  const r = await fetch("/api/admin/orders", {
    headers:{ Authorization:"Bearer "+localStorage.getItem("token") }
  });
  const orders = await r.json();
  document.getElementById("ordersList").innerHTML = orders.map(o=>`
    <div>
      ${o.user.email} - ${o.status}
      <button onclick="approve('${o._id}')">Approve</button>
    </div>
  `).join("");
}

async function approve(id){
  await fetch("/api/admin/order/"+id+"/approve", {
    method:"POST",
    headers:{ Authorization:"Bearer "+localStorage.getItem("token") }
  });
  loadOrders();
}

loadOrders();
