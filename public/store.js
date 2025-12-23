/* ===================== GLOM STORE - FRONT ===================== */

const productsEl = document.getElementById("products");
const categoriesEl = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");

let currentCategory = "all";
let productsCache = [];
let currentOrderId = null;

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);
function safeImg(u){
  return u || "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb";
}

/* ===== Categories ===== */
async function loadCategories(){
  const r = await fetch("/api/store/categories");
  const cats = await r.json();

  categoriesEl.innerHTML = `
    <button class="catBtn ${currentCategory==="all"?"active":""}"
      onclick="pickCat('all')">الكل</button>
    ${cats.map(c=>`
      <button class="catBtn ${currentCategory===c.slug?"active":""}"
        onclick="pickCat('${c.slug}')">${c.name}</button>
    `).join("")}
  `;
}
window.pickCat = (c)=>{ currentCategory=c; render(); };

/* ===== Products ===== */
async function loadProducts(){
  const r = await fetch("/api/store/products");
  productsCache = await r.json();
  render();
}

function render(){
  const q = searchInput.value.toLowerCase();
  const list = productsCache.filter(p=>{
    const cOk = currentCategory==="all" || p.categorySlug===currentCategory;
    const sOk = p.title.toLowerCase().includes(q);
    return cOk && sOk;
  });

  productsEl.innerHTML = list.map((p,i)=>`
    <article class="card show" style="animation-delay:${i*60}ms"
      onclick="createOrder('${p._id}')">
      <img src="${safeImg(p.images?.[0])}">
      <div class="pad">
        <div class="title">${p.title}</div>
        <div class="desc">${p.description||""}</div>
      </div>
    </article>
  `).join("");
}

searchInput.oninput = render;

/* ===== Order ===== */
async function createOrder(pid){
  const r = await fetch("/api/store/order",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ productId: pid })
  });
  const d = await r.json();

  currentOrderId = d.orderId;
  $("prOrder").textContent = currentOrderId;
  $("proofModal").classList.remove("hidden");
}

/* ===== Proof Upload ===== */
window.sendProof = async ()=>{
  const ref = $("prRef").value.trim();
  const file = $("prFile").files[0];
  if(!ref || !file) return alert("اكتب المرجع وارفع الصورة");

  const fd = new FormData();
  fd.append("reference", ref);
  fd.append("proof", file);

  const r = await fetch(`/api/store/order/${currentOrderId}/proof`,{
    method:"POST",
    body:fd
  });

  if(!r.ok) return alert("فشل الإرسال");
  $("prMsg").textContent = "✅ تم إرسال الإثبات للإدارة";
};

(async function(){
  await loadCategories();
  await loadProducts();
})();
