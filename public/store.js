const productsEl=document.getElementById("products");
const categoriesEl=document.getElementById("categories");
let currentCategory=null;
let selected=null;

/* USER BOX */
function renderUser(){
  const email=localStorage.getItem("userEmail");
  const box=document.getElementById("userBox");
  if(!email){
    box.innerHTML=`<button class="icon-btn" onclick="openLogin()">Login</button>`;
  }else{
    box.innerHTML=`
      <div style="width:34px;height:34px;border-radius:50%;background:#b66bff;color:#000;
      display:flex;align-items:center;justify-content:center;font-weight:700">
        ${email[0].toUpperCase()}
      </div>
      <button class="icon-btn" onclick="logout()">Logout</button>
    `;
  }
}
function logout(){
  localStorage.removeItem("userEmail");
  renderUser();
}
renderUser();

/* CATEGORIES */
async function loadCategories(){
  const r=await fetch("/api/store/categories");
  const c=await r.json();
  categoriesEl.innerHTML=`
    <div onclick="selectCategory(null)">كل المنتجات</div>
    ${c.map(x=>`<div onclick="selectCategory('${x.slug}')">${x.name}</div>`).join("")}
  `;
}
function selectCategory(slug){
  currentCategory=slug;
  loadProducts();
}

/* PRODUCTS */
async function loadProducts(){
  const url=currentCategory?`/api/store/products?category=${currentCategory}`:`/api/store/products`;
  const r=await fetch(url);
  const products=await r.json();

  productsEl.innerHTML=products.map(p=>`
    <div class="product-card">
      <img src="${p.images?.[0]||'https://via.placeholder.com/400'}">
      <div class="product-info">
        <h3>${p.title}</h3>
        <p>${p.description||""}</p>

        ${p.plans.map(pl=>{
          const stock=pl.keys.length;
          return `
            <div class="plan ${stock?``:`disabled`}"
              onclick="selectPlan('${p._id}','${p.title}','${pl.name}',${pl.price},this)">
              ${pl.name} – $${pl.price}
              <div class="plan-stock">${stock?`🟢 ${stock}`:`🔴 نفذ`}</div>
            </div>
          `;
        }).join("")}

        <button class="btn" onclick="openCheckout()">شراء</button>
      </div>
    </div>
  `).join("");

  animateCards(); enableGlow();
}

/* PLAN */
function selectPlan(pid,title,plan,price,el){
  document.querySelectorAll(".plan").forEach(p=>p.classList.remove("active"));
  el.classList.add("active");
  selected={pid,title,plan,price};
}

/* CHECKOUT */
function openCheckout(){
  if(!selected) return alert("اختر فترة");
  document.getElementById("checkoutModal").classList.remove("hidden");
  coProduct.textContent=selected.title;
  coPlan.textContent=selected.plan;
  coPrice.textContent=`$${selected.price}`;
  coFinal.textContent=`$${selected.price}`;
}
async function applyCoupon(){
  const code=coCoupon.value;
  if(!code) return;
  const r=await fetch("/api/store/validate-coupon",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      code,price:selected.price,
      productId:selected.pid,planName:selected.plan
    })
  });
  if(!r.ok) return alert("كوبون غير صالح");
  const d=await r.json();
  coFinal.textContent=`$${d.finalPrice}`;
}
async function createOrder(){
  const email=coEmail.value||localStorage.getItem("userEmail");
  if(!email) return alert("اكتب الإيميل");
  const r=await fetch("/api/store/order",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      email,
      product:{productId:selected.pid,title:selected.title,plan:selected.plan,price:selected.price},
      price:selected.price
    })
  });
  const d=await r.json();
  checkoutModal.classList.add("hidden");
  openProof(d.orderId);
}

/* PROOF */
function openProof(id){
  proofModal.classList.remove("hidden");
  prOrderId.textContent=id;
  sendProofBtn.onclick=async()=>{
    await fetch(`/api/store/order/${id}/payment`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({reference:prRef.value,proofUrl:prUrl.value})
    });
    alert("تم الإرسال");
    proofModal.classList.add("hidden");
  };
}

/* AUTH */
function openLogin(){loginModal.classList.remove("hidden");}
async function register(){
  await fetch("/api/auth/register",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email:lgEmail.value,password:lgPass.value})
  });
  localStorage.setItem("tmpEmail",lgEmail.value);
  loginModal.classList.add("hidden");
  verifyModal.classList.remove("hidden");
}
async function verify(){
  const email=localStorage.getItem("tmpEmail");
  await fetch("/api/auth/verify",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email,code:vfCode.value})
  });
  localStorage.setItem("userEmail",email);
  verifyModal.classList.add("hidden");
  renderUser();
}
async function login(){
  const r=await fetch("/api/auth/login",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email:lgEmail.value,password:lgPass.value})
  });
  if(!r.ok) return alert("خطأ دخول");
  localStorage.setItem("userEmail",lgEmail.value);
  loginModal.classList.add("hidden");
  renderUser();
}

/* FX */
function animateCards(){
  document.querySelectorAll(".product-card").forEach((c,i)=>{
    setTimeout(()=>c.classList.add("show"),i*80);
  });
}
function enableGlow(){
  document.querySelectorAll(".product-card").forEach(card=>{
    card.onmousemove=e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty("--x",`${(e.clientX-r.left)/r.width*100}%`);
      card.style.setProperty("--y",`${(e.clientY-r.top)/r.height*100}%`);
    };
  });
}

/* INIT */
loadCategories();
loadProducts();
