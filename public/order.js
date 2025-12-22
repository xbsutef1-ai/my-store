const params = new URLSearchParams(location.search);
const orderId = params.get("id");

const orderBox = document.getElementById("orderBox");
const refCodeEl = document.getElementById("refCode");
const msgEl = document.getElementById("msg");

async function loadOrder(){
  const r = await fetch(`/api/store/order/${orderId}`);
  if(!r.ok){
    orderBox.textContent = "الطلب غير موجود";
    return;
  }
  const o = await r.json();

  refCodeEl.textContent = o.referenceCode;

  let statusText = o.status;
  if(o.status === "waiting_payment") statusText = "🟡 بانتظار الدفع";
  if(o.status === "waiting_admin") statusText = "🟠 بانتظار مراجعة الإدارة";
  if(o.status === "delivered") statusText = "🟢 تم التسليم";
  if(o.status === "rejected") statusText = "🔴 مرفوض";

  orderBox.innerHTML = `
    <b>الحالة:</b> ${statusText}<br>
    <b>المنتج:</b> ${o.items[0].title}<br>
    <b>الفترة:</b> ${o.items[0].plan}<br>
    <b>السعر:</b> $${o.items[0].price}<br>
    ${o.delivery ? `<hr><b>🔑 المفتاح:</b><div>${o.delivery}</div>` : ""}
  `;

  if(o.status === "delivered" || o.status === "rejected"){
    document.getElementById("proofBox").style.display = "none";
  }
}

async function uploadProof(){
  const file = document.getElementById("proofFile").files[0];
  const reference = document.getElementById("refInput").value.trim();
  if(!file || !reference){
    msgEl.textContent = "ارفع الصورة واكتب الرمز";
    return;
  }

  msgEl.textContent = "جاري التحقق...";
  const fd = new FormData();
  fd.append("proof", file);
  fd.append("reference", reference);

  const r = await fetch(`/api/store/order/${orderId}/proof-upload`, {
    method: "POST",
    body: fd
  });

  const d = await r.json();
  if(d.flag === "admin_review") msgEl.textContent = "تم التحويل للإدارة للمراجعة";
  else if(d.delivered) msgEl.textContent = "تم التسليم بنجاح";
  else msgEl.textContent = "تم استلام الإثبات";

  setTimeout(loadOrder, 1500);
}

loadOrder();
