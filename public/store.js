function setUser(u){
  localStorage.setItem("token", u.token);
  localStorage.setItem("name", u.name);
  localStorage.setItem("email", u.email);
  localStorage.setItem("role", u.role);
}
function getUser(){
  const token = localStorage.getItem("token");
  if (!token) return null;
  return {
    token,
    name: localStorage.getItem("name"),
    email: localStorage.getItem("email"),
    role: localStorage.getItem("role")
  };
}
function logout(){
  localStorage.clear();
  location.reload();
}

/* LOGIN */
async function login(email, password){
  const r = await fetch("/api/auth/login", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ email, password })
  });
  const d = await r.json();
  if(!r.ok) return alert("خطأ تسجيل الدخول");
  setUser(d);
  location.reload();
}

/* REGISTER */
async function register(name, email, password){
  const r = await fetch("/api/auth/register", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ name, email, password })
  });
  const d = await r.json();
  if(!r.ok) return alert("خطأ التسجيل");
  setUser(d);
  location.reload();
}
