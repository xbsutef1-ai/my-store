const productsEl=document.getElementById("products");
const categoriesEl=document.getElementById("categories");
const userBox=document.getElementById("userBox");

let currentCategory="all";
let productsCache=[];
let selectedProduct=null;
let selectedPlan=null;

/* helpers */
const $=id=>document.getElementById(id);
const open=id=>$(id).classList.remove("hidden");
const close=id=>$(id).classList.add("hidden");

/* user */
function getUser(){
  const token=localStorage.getItem("token");
  const email=localStorage.getItem("email");
  const name=localStorage.getItem("name");
  return token&&email?{token,email,name}:null;
}
function setUser(u){
  localStorage.setItem("token",u.token);
  localStorage.setItem("email",u.email);
  localStorage.setItem("name",u.name||"");
}
function logout(){
  localStorage.clear();renderUser();
}
function renderUser(){
  const u=getUser();
  if(!u){
    userBox.innerHTML=`<button class="btn ghost" onclick="openAuth()">Login</button>`;
    return;
  }
  const letter=(u.name||u.email)[0].toUpperCase();
  userBox.innerHTML=`
    <div style="position:relative">
      <div class="avatar" onclick="toggleUserMenu()">${letter}</div>
      <div id="userMenu" class="userMenu hidden">
        <div class="itm" onclick="location.href='/account'">حسابي</div>
        <div class="itm" onclick="logout()">خروج</div>
      </div>
    </div>`;
}
window.toggleUserMenu=()=>{const m=$("userMenu");m&&m.classList.toggle("hidden")};
renderUser();

/* categories */
async function loadCategories(){
  const r=await fetch("/api/store/categories");
  const cats=await r.json();
  categoriesEl.innerHTML=
    `<button class="catBtn ${currentCategory==='all'?'active':''}" onclick="pickCat('all')">الكل</button>`+
    cats.map(c=>`<button class="catBtn ${currentCategory===c.slug?'active':''}" onclick="pickCat('${c.slug}')">${c.name}</button>`).join("");
}
window.pickCat=async slug=>{currentCategory=slug;await loadCategories();await loadProducts()};

/* products */
async function loadProducts(){
  const r=await fetch(`/api/store/products?category=${encodeURIComponent(currentCategory)}`);
  productsCache=await r.json(); renderProducts(productsCache);
}
function renderProducts(list){
  productsEl.innerHTML=list.map(p=>{
    const img=(p.images&&p.images[0])||"https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop";
    return `
    <article class="card">
      <img src="${img}">
      <div class="pad">
        <div class="title">${p.title}</div>
        <div class="desc">${p.description||""}</div>
        <button class="btn" onclick="openCheckout('${p._id}')">شراء</button>
      </div>
    </article>`;
  }).join("");

  document.querySelectorAll(".card").forEach(card=>{
    card.addEventListener("mousemove",e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty("--mx",((e.clientX-r.left)/r.width*100)+"%");
      card.style.setProperty("--my",((e.clientY-r.top)/r.height*100)+"%");
    });
  });

  const obs=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add("show")),{threshold:.1});
  document.querySelectorAll(".card").forEach(c=>obs.observe(c));
}

/* auth */
let authMode="login";
window.openAuth=()=>{authMode="login";updateAuthUI();open("authModal")};
window.switchAuth=()=>{authMode=authMode==="login"?"register":"login";updateAuthUI()};
function updateAuthUI(){
  $("authTitle").textContent=authMode==="login"?"تسجيل الدخول":"إنشاء حساب";
  $("authSubmit").textContent=authMode==="login"?"دخول":"تسجيل";
  $("authSwitchText").textContent=authMode==="login"?"ما عندك حساب؟":"عندك حساب؟";
  $("rgName").classList.toggle("hidden",authMode!=="register");
}
$("authSubmit").onclick=async()=>{
  const email=$("rgEmail").value.trim().toLowerCase();
  const pass=$("rgPass").value.trim();
  const name=$("rgName").value.trim();
  if(authMode==="login"){
    const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
    const d=await r.json(); if(!r.ok)return alert("خطأ");
    setUser(d); close("authModal"); renderUser();
  }else{
    if(!name)return alert("اكتب اسم");
    await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pass,name})});
    close("authModal");
  }
};

/* init */
(async()=>{await loadCategories();await loadProducts()})();
