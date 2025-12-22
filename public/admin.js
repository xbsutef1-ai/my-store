const productsList = document.getElementById("productsList");
const form = document.getElementById("productForm");

/* ================= ADD PRODUCT ================= */
form.onsubmit = async (e)=>{
  e.preventDefault();
  const fd = new FormData(form);

  const r = await fetch("/api/admin/products",{
    method:"POST",
    body:fd
  });

  if(!r.ok){
    alert("فشل إضافة المنتج");
    return;
  }

  form.reset();
  loadProducts();
};

/* ================= LOAD PRODUCTS ================= */
async function loadProducts(){
  const r = await fetch("/api/admin/products");
  const products = await r.json();

  productsList.innerHTML = products.map(p=>`
    <div class="product">
      <b>${p.title}</b>
      <div style="opacity:.7">${p.description||""}</div>

      <div style="margin:6px 0">
        ${p.images.map(img=>`<img src="${img}">`).join("")}
      </div>

      <button onclick="openPlans('${p._id}')">⚙️ الفترات + المفاتيح</button>
    </div>
  `).join("");
}

/* ================= PLANS & KEYS ================= */
function openPlans(id){
  const name = prompt("اسم الفترة (مثال: شهر)");
  if(!name) return;

  const price = prompt("السعر");
  if(!price) return;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".txt";

  fileInput.onchange = async ()=>{
    const file = fileInput.files[0];
    const text = await file.text();
    const keys = text.split("\n").map(k=>k.trim()).filter(Boolean);

    await fetch(`/api/admin/products/${id}`,{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        $push:{
          plans:{
            name,
            price:Number(price),
            keys
          }
        }
      })
    });

    loadProducts();
  };

  fileInput.click();
}

/* INIT */
loadProducts();
