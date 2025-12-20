document.addEventListener("DOMContentLoaded", () => {

  // ===== DOM =====
  const productsDiv = document.getElementById("products");
  const modal = document.getElementById("modal");
  const priceInfo = document.getElementById("priceInfo");
  const couponInput = document.getElementById("coupon");
  const couponMsg = document.getElementById("couponMsg");

  let selectedProduct = null;
  let finalPrice = 0;
  let allProducts = [];

  // ===== LOAD PRODUCTS =====
  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      const products = await res.json();

      if (!Array.isArray(products)) {
        productsDiv.innerHTML = "<p>خطأ في تحميل المنتجات</p>";
        return;
      }

      allProducts = products;
      renderProducts(products);

    } catch (err) {
      console.error(err);
      productsDiv.innerHTML = "<p>فشل تحميل المنتجات</p>";
    }
  }

  // ===== RENDER =====
  function renderProducts(list) {
    productsDiv.innerHTML = "";

    if (list.length === 0) {
      productsDiv.innerHTML = "<p>لا توجد منتجات</p>";
      return;
    }

    list.forEach(p => {
      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <p><b>${p.price} SAR</b></p>
        <button>شراء</button>
      `;
      div.querySelector("button").onclick = () => openOrder(p);
      productsDiv.appendChild(div);
    });
  }

  // ===== FILTER CATEGORY =====
  window.filterCategory = function (cat) {
    if (cat === "ALL") {
      renderProducts(allProducts);
    } else {
      renderProducts(allProducts.filter(p => p.category === cat));
    }
  };

  // ===== OPEN ORDER =====
  function openOrder(product) {
    selectedProduct = product;
    finalPrice = product.price;

    priceInfo.innerText = `السعر: ${finalPrice} SAR`;
    couponInput.value = "";
    couponMsg.innerText = "";

    modal.classList.remove("hidden");
  }

  // ===== APPLY COUPON =====
  window.applyCoupon = async function () {
    const code = couponInput.value.trim();
    if (!code) return;

    const res = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        price: selectedProduct.price
      })
    });

    const data = await res.json();

    if (!data.valid) {
      couponMsg.innerText = "كود الخصم غير صالح";
      return;
    }

    finalPrice = data.finalPrice;
    priceInfo.innerText = `السعر بعد الخصم: ${finalPrice} SAR`;
    couponMsg.innerText = "تم تطبيق الخصم بنجاح";
  };

  // ===== CONFIRM ORDER =====
  window.confirmOrder = async function () {
    await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProduct._id,
        couponCode: couponInput.value.trim()
      })
    });

    alert("تم إنشاء الطلب بالسعر: " + finalPrice + " SAR");
    closeModal();
  };

  // ===== CLOSE MODAL =====
  window.closeModal = function () {
    modal.classList.add("hidden");
  };

  // ===== START =====
  loadProducts();
});
