const productsDiv = document.getElementById("products");
const modal = document.getElementById("modal");
const priceInfo = document.getElementById("priceInfo");
const couponMsg = document.getElementById("couponMsg");

let selectedProduct = null;
let finalPrice = 0;

// Load products
async function loadProducts() {
  const res = await fetch("/api/products");
  const products = await res.json();

  productsDiv.innerHTML = "";
  products.forEach(p => {
    productsDiv.innerHTML += `
      <div class="product">
        <h3>${p.name}</h3>
        <p>${p.price} SAR</p>
        <button onclick='openOrder(${JSON.stringify(p)})'>شراء</button>
      </div>
    `;
  });
}

function openOrder(product) {
  selectedProduct = product;
  finalPrice = product.price;
  priceInfo.innerText = `السعر: ${finalPrice} SAR`;
  couponMsg.innerText = "";
  modal.classList.remove("hidden");
}

async function applyCoupon() {
  const code = coupon.value.trim();
  if (!code) return;

  const res = await fetch("/api/coupon/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, price: selectedProduct.price })
  });

  const data = await res.json();
  if (!data.valid) {
    couponMsg.innerText = "كود الخصم غير صالح";
    return;
  }

  finalPrice = data.finalPrice;
  priceInfo.innerText = `السعر بعد الخصم: ${finalPrice} SAR`;
  couponMsg.innerText = "تم تطبيق الخصم بنجاح";
}

async function confirmOrder() {
  await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: selectedProduct._id,
      couponCode: coupon.value.trim()
    })
  });

  alert("تم إنشاء الطلب بالسعر النهائي: " + finalPrice + " SAR");
  closeModal();
}

function closeModal() {
  modal.classList.add("hidden");
}

loadProducts();

