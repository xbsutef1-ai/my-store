document.addEventListener("DOMContentLoaded", () => {

  const productsDiv = document.getElementById("products");
  const modal = document.getElementById("modal");
  const priceInfo = document.getElementById("priceInfo");
  const couponInput = document.getElementById("coupon");
  const couponMsg = document.getElementById("couponMsg");

  const accountBtn = document.getElementById("accountBtn");
  const accountMenu = document.getElementById("accountMenu");

  let selectedProduct = null;
  let finalPrice = 0;
  let allProducts = [];

  /* ===== Account Dropdown ===== */
  accountBtn.onclick = () => {
    accountMenu.classList.toggle("hidden");
  };

  window.logout = () => {
    localStorage.removeItem("token");
    location.reload();
  };

  /* ===== Load Products ===== */
  async function loadProducts() {
    const res = await fetch("/api/products");
    const products = await res.json();
    allProducts = products;
    renderProducts(products);
  }

  function renderProducts(list) {
    productsDiv.innerHTML = "";

    if (list.length === 0) {
      productsDiv.innerHTML = "<p>No products available</p>";
      return;
    }

    list.forEach(p => {
      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <p><b>${p.price} SAR</b></p>
        <button class="primary">Buy</button>
      `;
      div.querySelector("button").onclick = () => openOrder(p);
      productsDiv.appendChild(div);
    });
  }

  window.filterCategory = cat => {
    if (cat === "ALL") renderProducts(allProducts);
    else renderProducts(allProducts.filter(p => p.category === cat));
  };

  function openOrder(product) {
    selectedProduct = product;
    finalPrice = product.price;
    priceInfo.innerText = `Price: ${finalPrice} SAR`;
    couponMsg.innerText = "";
    couponInput.value = "";
    modal.classList.remove("hidden");
  }

  window.applyCoupon = async () => {
    const code = couponInput.value.trim();
    if (!code) return;

    const res = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, price: selectedProduct.price })
    });

    const data = await res.json();
    if (!data.valid) {
      couponMsg.innerText = "Invalid code";
      return;
    }

    finalPrice = data.finalPrice;
    priceInfo.innerText = `Price after discount: ${finalPrice} SAR`;
    couponMsg.innerText = "Discount applied";
  };

  window.confirmOrder = async () => {
    await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProduct._id,
        couponCode: couponInput.value.trim()
      })
    });

    alert("Order created successfully");
    closeModal();
  };

  window.closeModal = () => {
    modal.classList.add("hidden");
  };

  loadProducts();
});
