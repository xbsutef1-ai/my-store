let currentProduct=null;
let currentPlan=null;

async function loadProducts(){
  const res=await fetch("/api/admin/products");
  const data=await res.json();

  productsList.innerHTML=data.map(p=>`
    <div style="border:1px solid #444;padding:10px;margin:10px">
      <b>${p.title}</b>
      ${p.plans.map(pl=>`
        <div>
          ${pl.name} ($${pl.price}) – ${pl.keys.length} keys
          <button onclick="openKeys('${p._id}','${pl.name}')">Keys</button>
        </div>
      `).join("")}
      <button onclick="openPlan('${p._id}')">➕ Add Plan</button>
    </div>
  `).join("");
}

function openPlan(pid){
  currentProduct=pid;
  planModal.classList.remove("hidden");
}
async function savePlan(){
  await fetch(`/api/admin/products/${currentProduct}/plan`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      name:planName.value,
      price:planPrice.value
    })
  });
  planModal.classList.add("hidden");
  loadProducts();
}

function openKeys(pid,plan){
  currentProduct=pid;
  currentPlan=plan;
  keysModal.classList.remove("hidden");
}
async function uploadKeys(){
  const f=document.getElementById("keysFile").files[0];
  const fd=new FormData();
  fd.append("file",f);

  await fetch(`/api/admin/products/${currentProduct}/plan/${currentPlan}/upload-keys`,{
    method:"POST",
    body:fd
  });
  keysModal.classList.add("hidden");
  loadProducts();
}

async function loadOrders(){
  const res=await fetch("/api/admin/orders");
  const data=await res.json();

  ordersList.innerHTML=data.map(o=>`
    <div style="border:1px solid #333;padding:10px;margin:10px">
      ${o.userEmail} – ${o.status}
      (${o.payment?.flag||"-"})
      ${o.status==="waiting_review"
        ? `<button onclick="approve('${o._id}')">Approve</button>`
        : ""}
    </div>
  `).join("");
}

async function approve(id){
  await fetch(`/api/admin/orders/${id}/approve`,{method:"POST"});
  loadOrders();
}

loadProducts();
loadOrders();
