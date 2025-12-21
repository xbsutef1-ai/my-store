fetch("/api/admin/products",{
  headers:{Authorization:"Bearer "+localStorage.token}
})
.then(r=>r.json())
.then(d=>{
  products.innerHTML=d.map(p=>`
    <div>
      <b>${p.title}</b>
      (${p.plans.length} plans)
    </div>
  `).join("");
});
