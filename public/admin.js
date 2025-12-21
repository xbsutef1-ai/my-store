// حماية
if (!localStorage.getItem("token")) {
  location.href = "/login.html";
}

// Logout
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("token");
  location.href = "/";
};

// ===== Fake data (مرحلة 1) =====
// لاحقًا نربطها بالـ API الحقيقي
setTimeout(() => {
  document.getElementById("totalSales").textContent = "$ 1,240";
  document.getElementById("totalOrders").textContent = "18";
  document.getElementById("totalUsers").textContent = "9";
  document.getElementById("pendingOrders").textContent = "3";

  const recent = document.getElementById("recentOrders");
  recent.innerHTML = `
    <div class="row"><span>#1021</span><span>Pending</span></div>
    <div class="row"><span>#1020</span><span>Completed</span></div>
    <div class="row"><span>#1019</span><span>Completed</span></div>
  `;
}, 1200);
