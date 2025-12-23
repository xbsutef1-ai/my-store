const id = new URLSearchParams(location.search).get("id");
const box = document.getElementById("productBox");

async function loadProduct(){
  const res = await fetch(`/api/store/product/${id}`);
  if(!res.ok){
    box.innerHTML = "❌ المنتج غير موجود";
    return;
  }

  const p = await res.json();

  box.innerHTML = `
    <div class="product-page">
      <img src="${p.images[0]}" class="product-img">

      <div class="product-info">
        <h1>${p.title}</h1>
        <p>${p.description}</p>

        <h3>الفترات المتاحة</h3>

        ${p.plans.map(pl => `
          <div class="plan-card">
            <b>${pl.name}</b>
            <div>السعر: $${pl.price}</div>
            <div>المتوفر: ${pl.keys.length}</div>

            <button class="btn"
              onclick="createOrder('${p._id}','${pl.name}')">
              شراء
            </button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function createOrder(pid, plan){
  const email = prompt("أدخل الإيميل");
  if(!email) return;

  const res = await fetch("/api/store/order",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      email,
      productId: pid,
      planName: plan
    })
  });

  const data = await res.json();
  location.href = `/order.html?id=${data.orderId}`;
}

loadProduct();
