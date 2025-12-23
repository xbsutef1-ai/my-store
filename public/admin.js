async function loadOrders(){
  const token = localStorage.getItem("token");
  const el = document.getElementById("ordersList");
  if(!el) return;

  try{
    const r = await fetch("/api/admin/orders", {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await r.json();
    if(!r.ok){
      el.textContent = data.error || "FAILED";
      return;
    }

    if(!Array.isArray(data) || data.length === 0){
      el.textContent = "لا توجد طلبات";
      return;
    }

    el.innerHTML = data.map(o => `
      <div style="padding:10px;border:1px solid #2a0a4a;border-radius:12px;margin:8px 0;background:#0f001a">
        <div><b>Customer:</b> ${o.user?.email || "-"}</div>
        <div><b>Status:</b> ${o.status}</div>
        <div style="opacity:.85">
          <b>Product:</b> ${o.product?.title || "-"} |
          <b>Plan:</b> ${o.plan?.name || "-"}
        </div>
        <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" onclick="approve('${o._id}')">Approve + Deliver Key</button>
        </div>
      </div>
    `).join("");

  }catch(e){
    el.textContent = "ERROR";
  }
}

async function approve(id){
  const token = localStorage.getItem("token");
  const r = await fetch(`/api/admin/order/${id}/approve`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  const d = await r.json();
  if(!r.ok) return alert(d.error || "APPROVE_FAILED");
  alert("✅ Delivered Key: " + d.key);
  loadOrders();
}

loadOrders();
