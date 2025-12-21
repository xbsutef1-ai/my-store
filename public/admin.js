fetch("/api/admin/products")
  .then(r => r.json())
  .then(d => list.innerHTML = JSON.stringify(d, null, 2));
