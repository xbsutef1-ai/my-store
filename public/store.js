const productsDiv=document.getElementById("products");

async function loadStore(category=""){
  const url=category?`/api/store/products?category=${category}`:`/api/store/products`;
  const res=await fetch(url);
  const products=await res.json();

  productsDiv.innerHTML=products.map(p=>`
    <div class="product-card">
      <img src="${p.images?.[0]||'https://via.placeholder.com/400'}">
      <div class="product-info">
        <h3>${p.title}</h3>
        <p>${p.description||""}</p>
        ${p.plans.map(pl=>{
          const stock=pl.keys.length;
          return `
            <div class="plan ${stock===0?'disabled':''}">
              ${pl.name} – $${pl.price}
              <div class="plan-stock">
                ${stock>0?`🟢 ${stock} in stock`:`🔴 Out of stock`}
              </div>
            </div>`;
        }).join("")}
      </div>
    </div>
  `).join("");

  animateCards();
  enableGlow();
}

function animateCards(){
  document.querySelectorAll(".product-card").forEach((c,i)=>{
    setTimeout(()=>c.classList.add("show"),i*80);
  });
}

function enableGlow(){
  document.querySelectorAll(".product-card").forEach(card=>{
    card.addEventListener("mousemove",e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty("--x",`${(e.clientX-r.left)/r.width*100}%`);
      card.style.setProperty("--y",`${(e.clientY-r.top)/r.height*100}%`);
    });
  });
}

loadStore();
