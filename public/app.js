document.addEventListener("DOMContentLoaded", () => {

  const productsDiv = document.getElementById("products");
  const tabsDiv = document.getElementById("tabs");
  const accountBtn = document.getElementById("accountBtn");
  const accountMenu = document.getElementById("accountMenu");

  let categories = [];
  let products = [];
  let current = "ALL";

  /* ACCOUNT */
  accountBtn.onclick = () => accountMenu.classList.toggle("hidden");
  document.addEventListener("click", e=>{
    if(!accountMenu.contains(e.target)&&!accountBtn.contains(e.target)){
      accountMenu.classList.add("hidden");
    }
  });
  window.logout = ()=>{localStorage.removeItem("token");location.reload();};

  /* LOAD */
  async function load(){
    categories = await fetch("/api/categories").then(r=>r.json());
    products = await fetch("/api/products").then(r=>r.json());
    renderTabs();
    renderProducts();
  }

  /* TABS */
  function renderTabs(){
    tabsDiv.innerHTML="";
    addTab("ALL","All");
    categories.forEach(c=>addTab(c.slug,c.name));
  }
  function addTab(slug,name){
    const t=document.createElement("div");
    t.className=`tab ${current===slug?"active":""}`;
    t.textContent=name;
    t.onclick=()=>{current=slug;renderTabs();renderProducts();};
    tabsDiv.appendChild(t);
  }

  /* PRODUCTS */
  function renderProducts(){
    productsDiv.innerHTML="";
    let list = current==="ALL"?products:products.filter(p=>p.categorySlug===current);
    list.forEach((p,i)=>{
      const c=document.createElement("div");
      c.className="product";
      c.innerHTML=`
        <h3>${p.name}</h3>
        <p>${p.description||""}</p>
        <div class="price">${p.price} SAR</div>
        <button class="btn">Buy</button>
      `;
      productsDiv.appendChild(c);
      setTimeout(()=>c.classList.add("reveal"), i*80);
    });
  }

  load();
});
