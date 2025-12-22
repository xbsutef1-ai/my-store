let ADMIN_TOKEN = localStorage.getItem("adminToken") || "";

const $ = (id) => document.getElementById(id);
function tab(id){
  document.querySelectorAll(".sec").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
tab("ov");

async function api(path, opts={}){
  const r = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers||{}),
      "Content-Type":"application/json",
      "x-admin-token": ADMIN_TOKEN
    }
  });
  const d = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(d.error || "API_ERROR");
  return d;
}

window.adminLogin = async () => {
  try{
    const pass = $("adminPass").value.trim();
    const r = await fetch("/api/admin/login", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password: pass })
    });
    const d = await r.json();
    if(!r.ok) return alert("Wrong password");
    ADMIN_TOKEN = d.token;
    localStorage.setItem("adminToken", ADMIN_TOKEN);
    alert("Logged in ✅");
    await loadAll();
  }catch(e){
    alert(e.message);
  }
};

async function loadAll(){
  await loadOverview();
  await loadCategories();
  await loadProducts();
  await loadCoupons();
  await loadOrders();
}

async function loadOverview(){
  try{
    const d = await api("/api/admin/overview");
    $("stOrders").textContent = d.orders;
    $("stPending").textContent = d.pending;
    $("stAwaiting").textContent = d.awaiting;
    $("stDelivered").textContent = d.delivered;
    $("stRevenue").textContent = d.revenue;
  }catch(e){}
}

/* Categories */
window.addCategory = async () => {
  try{
    const name = $("catName").value.trim();
    const slug = $("catSlug").value.trim();
    const order = $("catOrder").value.trim();
    if(!name) return alert("اكتب اسم القائمة");
    await api("/api/admin/categories", { method:"POST", body: JSON.stringify({ name, slug, order })});
    $("catName").value = $("catSlug").value = $("catOrder").value = "";
    await loadCategories();
  }catch(e){ alert(e.message); }
};

async function loadCategories(){
  try{
    const list = await api("/api/admin/categories");
    $("catsList").innerHTML = list.map(c=>`
      <div class="item">
        <div class="row">
          <b>${c.name}</b>
          <div>
            <span class="small">slug: ${c.slug}</span>
            <button class="btn ghost" onclick="delCat('${c._id}')">Delete</button>
          </div>
        </div>
      </div>
    `).join("");
  }catch(e){}
}
window.delCat = async (id) => {
  if(!confirm("Delete category?")) return;
  await api(`/api/admin/categories/${id}`, { method:"DELETE" });
  await loadCategories();
};

/* Products */
window.openProductModal = (p=null) => {
  $("pm").classList.remove("hidden");
  if(!p){
    $("pmTitle").textContent = "Add Product";
    $("pId").value = "";
    $("pTitle").value = "";
    $("pDesc").value = "";
    $("pCat").value = "";
    $("pImg").value = "";
    $("pActive").checked = true;
    $("pPlans").value = "";
    return;
  }
  $("pmTitle").textContent = "Edit Product";
  $("pId").value = p._id;
  $("pTitle").value = p.title || "";
  $("pDesc").value = p.description || "";
  $("pCat").value = p.categorySlug || "";
  $("pImg").value = (p.images||[]).join("\n");
  $("pActive").checked = p.active !== false;

  // serialize plans
  let txt = "";
  (p.plans||[]).forEach(pl=>{
    txt += `${pl.name}|${pl.price}\n`;
    (pl.keys||[]).forEach(k => txt += `${k}\n`);
    txt += `\n`;
  });
  $("pPlans").value = txt.trim();
};
window.closePM = () => $("pm").classList.add("hidden");

function parsePlans(text){
  // Format blocks:
  // Name|Price
  // KEY
  // KEY
  // (blank line)
  const lines = String(text||"").split("\n");
  let plans = [];
  let cur = null;

  function pushCur(){
    if(cur && cur.name){
      cur.keys = (cur.keys||[]).filter(Boolean);
      plans.push(cur);
    }
  }

  for(const raw of lines){
    const line = raw.trim();
    if(!line){
      pushCur(); cur = null;
      continue;
    }
    if(!cur){
      const [name, price] = line.split("|");
      cur = { name: (name||"").trim(), price: Number(price||0), keys: [] };
      continue;
    }
    cur.keys.push(line);
  }
  pushCur();
  return plans;
}

window.saveProduct = async () => {
  try{
    const id = $("pId").value.trim();
    const title = $("pTitle").value.trim();
    if(!title) return alert("Title required");
    const description = $("pDesc").value.trim();
    const categorySlug = $("pCat").value.trim();
    const images = $("pImg").value.split("\n").map(s=>s.trim()).filter(Boolean);
    const active = $("pActive").checked;
    const plans = parsePlans($("pPlans").value);

    const payload = { title, description, categorySlug, images, active, plans };

    if(!id) await api("/api/admin/products", { method:"POST", body: JSON.stringify(payload) });
    else await api(`/api/admin/products/${id}`, { method:"PUT", body: JSON.stringify(payload) });

    closePM();
    await loadProducts();
  }catch(e){ alert(e.message); }
};

async function loadProducts(){
  try{
    const list = await api("/api/admin/products");
    $("prodList").innerHTML = list.map(p=>`
      <div class="item">
        <div class="row">
          <div>
            <b>${p.title}</b>
            <div class="small">cat: ${p.categorySlug || "-"} • active: ${p.active!==false}</div>
            <div class="small">plans: ${(p.plans||[]).map(x=>`${x.name}(${(x.keys||[]).length})`).join(" • ") || "-"}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn ghost" onclick='openProductModal(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button>
            <button class="btn ghost" onclick="delProd('${p._id}')">Delete</button>
          </div>
        </div>
      </div>
    `).join("");
  }catch(e){}
}
window.delProd = async (id) => {
  if(!confirm("Delete product?")) return;
  await api(`/api/admin/products/${id}`, { method:"DELETE" });
  await loadProducts();
};

/* Coupons */
window.addCoupon = async () => {
  try{
    const code = $("cpCode").value.trim().toUpperCase();
    const type = $("cpType").value;
    const value = Number($("cpValue").value.trim()||0);
    const exp = $("cpExp").value.trim();
    const expiresAt = exp ? `${exp}T23:59:59.000Z` : null;

    if(!code) return alert("CODE required");
    await api("/api/admin/coupons", { method:"POST", body: JSON.stringify({ code, type, value, expiresAt }) });
    $("cpCode").value = $("cpValue").value = $("cpExp").value = "";
    await loadCoupons();
  }catch(e){ alert(e.message); }
};

async function loadCoupons(){
  try{
    const list = await api("/api/admin/coupons");
    $("cpList").innerHTML = list.map(c=>`
      <div class="item">
        <div class="row">
          <div>
            <b>${c.code}</b>
            <div class="small">${c.type} • ${c.value} • ${c.expiresAt ? ("exp: " + new Date(c.expiresAt).toLocaleDateString()) : "no-exp"}</div>
          </div>
          <button class="btn ghost" onclick="delCoupon('${c._id}')">Delete</button>
        </div>
      </div>
    `).join("");
  }catch(e){}
}
window.delCoupon = async (id) => {
  if(!confirm("Delete coupon?")) return;
  await api(`/api/admin/coupons/${id}`, { method:"DELETE" });
  await loadCoupons();
};

/* Orders */
async function loadOrders(){
  try{
    const f = $("ordFilter").value;
    const url = f ? `/api/admin/orders?status=${encodeURIComponent(f)}` : "/api/admin/orders";
    const list = await api(url);
    $("ordList").innerHTML = list.map(o=>`
      <div class="item">
        <div class="row">
          <div>
            <b>${o.userEmail}</b>
            <div class="small">${o.productTitle} • ${o.planName} • ${o.finalTotal}$</div>
            <div class="small">status: <b>${o.status}</b> • flag: <b>${o.payment?.flag || "-"}</b></div>
            ${o.payment?.proofUrl ? `<div class="small">proof: <a href="${o.payment.proofUrl}" target="_blank" style="color:#b66bff">open</a></div>`:""}
            ${o.delivery?.key ? `<div class="small">delivered key: <b style="color:#b66bff">${o.delivery.key}</b></div>`:""}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:180px">
            <button class="btn ghost" onclick="setStatus('${o._id}','rejected')">Reject</button>
            <button class="btn ghost" onclick="setStatus('${o._id}','waiting_review')">Set waiting_review</button>
            <button class="btn" onclick="deliver('${o._id}')">Deliver Key</button>
          </div>
        </div>
      </div>
    `).join("");
  }catch(e){}
}
window.loadOrders = loadOrders;

window.setStatus = async (id, status) => {
  await api(`/api/admin/orders/${id}/status`, { method:"POST", body: JSON.stringify({ status }) });
  await loadOrders();
  await loadOverview();
};

window.deliver = async (id) => {
  try{
    const d = await api(`/api/admin/orders/${id}/deliver`, { method:"POST" });
    alert("Delivered ✅\nKEY: " + d.key);
    await loadOrders();
    await loadOverview();
  }catch(e){ alert(e.message); }
};

/* INIT */
(async function(){
  if(ADMIN_TOKEN){
    await loadAll();
  }
})();
