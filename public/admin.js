// حماية بسيطة: لازم يكون فيه token
const token = localStorage.getItem("token");
if (!token) location.href = "/login.html";

const sideItems = document.querySelectorAll(".side-item");
const views = document.querySelectorAll(".view");

sideItems.forEach(i=>{
  i.onclick=()=>{
    sideItems.forEach(x=>x.classList.remove("active"));
    i.classList.add("active");
    views.forEach(v=>v.classList.add("hidden"));
    document.getElementById(i.dataset.view).classList.remove("hidden");
  };
});

document.getElementById("logoutBtn").onclick=()=>{
  localStorage.removeItem("token");
  location.href="/";
};

// بيانات وهمية مؤقتًا (إلى ما نربط API)
document.getElementById("statUsers").textContent="—";
document.getElementById("statOrders").textContent="—";
document.getElementById("statRevenue").textContent="—";

// أمثلة إضافة عناصر (واجهة فقط الآن)
const productsList = document.getElementById("productsList");
document.getElementById("addProduct").onclick=()=>{
  const n=document.getElementById("pName").value;
  const p=document.getElementById("pPrice").value;
  if(!n||!p) return;
  const row=document.createElement("div");
  row.className="row";
  row.innerHTML=`<span>${n}</span><span>${p}</span>`;
  productsList.appendChild(row);
};
