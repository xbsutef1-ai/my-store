// حماية
if (!localStorage.getItem("token")) {
  location.href = "/login.html";
}

// Logout
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("token");
  location.href = "/";
};

// Sidebar navigation
document.querySelectorAll(".side-item").forEach(item=>{
  item.onclick=()=>{
    document.querySelectorAll(".side-item").forEach(i=>i.classList.remove("active"));
    item.classList.add("active");

    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    document.getElementById(item.dataset.view).classList.remove("hidden");
  };
});

// ===== Overview (مرحلة 1 بيانات وهمية) =====
document.getElementById("ovSales").textContent = "$1,240";
document.getElementById("ovOrders").textContent = "18";
document.getElementById("ovUsers").textContent = "9";
document.getElementById("ovPending").textContent = "3";

// ===== Products =====
function addProduct(){
  const name=pName.value, price=pPrice.value;
  if(!name||!price) return;
  const row=document.createElement("div");
  row.className="row";
  row.innerHTML=`<span>${name}</span><span>$${price}</span>`;
  productsList.appendChild(row);
  pName.value=pPrice.value="";
}

// ===== Coupons =====
function addCoupon(){
  const row=document.createElement("div");
  row.className="row";
  row.innerHTML=`<span>${cCode.value}</span><span>${cDiscount.value}%</span>`;
  couponsList.appendChild(row);
  cCode.value=cDiscount.value="";
}

// ===== Orders / Customers (Placeholder) =====
ordersList.innerHTML = `<div class="row"><span>#1021</span><span>Pending</span></div>`;
customersList.innerHTML = `<div class="row"><span>user@email.com</span></div>`;
