function getUser(){
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  return token && email ? { token, email, name } : null;
}

async function loadMyOrders(){
  const u = getUser();
  if(!u){ alert("سجّل دخول أول"); location.href="/"; return; }

  const r = await fetch("/api/store/my/orders", {
    headers: { "Authorization": `Bearer ${u.token}` }
  });
  const list = await r.json();

  const el = document.getElementById("orders");
  el.innerHTML = list.map(o => `
    <div class="modalBox" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <b>${o.productTitle}</b>
        <span style="opacity:.8">${o.status}</span>
      </div>
      <div class="small">الفترة: <b>${o.planName}</b> — السعر: <b>${o.finalTotal}$</b></div>
      ${o.payment?.proofUrl ? `<div class="small">إثبات: <a href="${o.payment.proofUrl}" target="_blank" style="color:#b66bff">فتح</a></div>` : ""}
      ${o.delivery?.key ? `<div class="small">✅ المفتاح: <b style="color:#b66bff">${o.delivery.key}</b></div>` : ""}
      <div class="small">Order ID: ${o._id}</div>
    </div>
  `).join("");
}

loadMyOrders();
