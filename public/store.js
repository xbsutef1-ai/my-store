const userBox = document.getElementById("userBox");

function setUser(u){
  localStorage.setItem("token", u.token);
  localStorage.setItem("email", u.email);
  localStorage.setItem("name", u.name || "");
  localStorage.setItem("role", u.role || "user");
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
    userBox.innerHTML = `
      <button class="btn ghost" onclick="openAuth()">Login</button>
    `;
    return;
  }
  const letter = (u.name || u.email)[0].toUpperCase();
  userBox.innerHTML = `
    <div style="position:relative">
      <div class="avatar" onclick="toggleMenu()">${letter}</div>
      <div id="uMenu" class="userMenu hidden">
        ${u.role==="admin"?`<div class="itm" onclick="location.href='/admin.html'">Dashboard</div>`:""}
        <div class="itm" onclick="logout()">Logout</div>
      </div>
    </div>
  `;
}

function toggleMenu(){
  document.getElementById("uMenu")?.classList.toggle("hidden");
}

let mode = "login";
function openAuth(){
  document.getElementById("authModal").classList.remove("hidden");
}
function closeAuth(){
  document.getElementById("authModal").classList.add("hidden");
}
function switchAuth(){
  mode = mode==="login"?"register":"login";
  document.getElementById("rgName").classList.toggle("hidden", mode!=="register");
}

async function submitAuth(){
  const email = rgEmail.value.trim().toLowerCase();
  const password = rgPass.value.trim();
  const name = rgName.value.trim();

  if(!email || !password) return alert("Missing");

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
  if(!r.ok) return alert(d.error || "FAILED");

  setUser(d);
  closeAuth();
}

renderUser();
