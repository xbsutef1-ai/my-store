const userBox = document.getElementById("userBox");

function setUser(u){
  localStorage.setItem("token", u.token);
  localStorage.setItem("email", u.email);
  localStorage.setItem("name", u.name);
  localStorage.setItem("role", u.role);
  renderUser();
}

function getUser(){
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  return token && email ? { token, email, name, role } : null;
}

function logout(){
  localStorage.clear();
  renderUser();
}

function renderUser(){
  const u = getUser();
  if(!u){
    userBox.innerHTML = `<button onclick="openAuth()">Login</button>`;
    return;
  }
  userBox.innerHTML = `
    <span>${u.name}</span>
    ${u.role==="admin" ? `<button onclick="goAdmin()">Dashboard</button>`:""}
    <button onclick="logout()">Logout</button>
  `;
}

function goAdmin(){
  location.href="/admin.html";
}

// ===== AUTH =====
let mode="login";

function openAuth(){
  document.getElementById("authModal").classList.remove("hidden");
}

function switchAuth(){
  mode = mode==="login"?"register":"login";
  document.getElementById("rgName").classList.toggle("hidden", mode!=="register");
  document.getElementById("authSubmit").innerText =
    mode==="login"?"Login":"Register";
}

async function submitAuth(){
  const email = rgEmail.value.trim();
  const password = rgPass.value.trim();
  const name = rgName.value.trim();

  const url = mode==="login"?"/api/auth/login":"/api/auth/register";
  const body = mode==="login"
    ? { email, password }
    : { email, password, name };

  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });

  const d = await r.json();
  if(!r.ok){ alert(d.error); return; }

  setUser(d);
  document.getElementById("authModal").classList.add("hidden");
}

renderUser();
