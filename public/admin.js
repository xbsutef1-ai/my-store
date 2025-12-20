const ADMIN_KEY = prompt("أدخل كلمة مرور الأدمن:");

const couponsDiv = document.getElementById("coupons");

// ================= Load Coupons =================
async function loadCoupons() {
  if (!couponsDiv) return;

  const res = await fetch("/api/admin/coupons", {
    headers: { "x-admin-key": ADMIN_KEY }
  });
  const coupons = await res.json();

  couponsDiv.innerHTML = "";
  coupons.forEach(c => {
    couponsDiv.innerHTML += `
      <div class="product">
        <h3>${c.code}</h3>
        <p>
          الخصم:
          ${c.type === "percent" ? c.value + "%" : c.value + " SAR"}
        </p>
        <p>الاستخدام: ${c.used}/${c.maxUses || "∞"}</p>
        <p>الحالة: ${c.active ? "✅ فعال" : "❌ معطل"}</p>
        <button onclick="toggleCoupon('${c._id}')">
          ${c.active ? "تعطيل" : "تفعيل"}
        </button>
        <button onclick="deleteCoupon('${c._id}')">
          حذف
        </button>
      </div>
    `;
  });
}

// ================= Create Coupon =================
const couponForm = document.getElementById("couponForm");
if (couponForm) {
  couponForm.addEventListener("submit", async e => {
    e.preventDefault();

    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY
      },
      body: JSON.stringify({
        code: code.value,
        type: type.value,
        value: value.value,
        maxUses: maxUses.value || null,
        expiresAt: expiresAt.value || null
      })
    });

    couponForm.reset();
    loadCoupons();
  });
}

// ================= Actions =================
async function toggleCoupon(id) {
  await fetch(`/api/admin/coupons/${id}/toggle`, {
    method: "POST",
    headers: { "x-admin-key": ADMIN_KEY }
  });
  loadCoupons();
}

async function deleteCoupon(id) {
  if (!confirm("متأكد من حذف الكوبون؟")) return;

  await fetch(`/api/admin/coupons/${id}`, {
    method: "DELETE",
    headers: { "x-admin-key": ADMIN_KEY }
  });
  loadCoupons();
}

loadCoupons();
