const ordersDiv = document.getElementById("orders");

fetch("/api/admin/orders")
  .then(r => r.json())
  .then(orders => {
    ordersDiv.innerHTML = orders.map(o => `
      <div style="border:1px solid #444;padding:10px;margin:10px 0">
        <div>📧 ${o.userEmail}</div>
        <div>🛒 ${o.items[0].title}</div>
        <div>⏱️ ${o.items[0].plan}</div>
        <div>💰 $${o.finalTotal}</div>
        <div>📌 الحالة: ${o.status}</div>
        ${o.paymentProof ? `<a href="${o.paymentProof}" target="_blank">إثبات الدفع</a>` : ""}
        ${o.status === "waiting_payment"
          ? `<button onclick="approve('${o._id}')">تسليم</button>`
          : ""}
      </div>
    `).join("");
  });

function approve(id) {
  fetch(`/api/admin/orders/${id}/approve`, { method: "POST" })
    .then(() => location.reload());
}
