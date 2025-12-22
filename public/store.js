const productsEl = document.getElementById("products");
const categoriesEl = document.getElementById("categories");

let authMode = "login";

/* ================= USER ================= */
function renderUser(){
  const email = localStorage.getItem("userEmail");
  const box = document.getElementById("userBox");

  if(!email){
    box.innerHTML = `<button class="icon-btn" onclick="openAuth()">Login</button>`;
  }else{
    box.innerHTML = `
      <div class="avatar" onclick="toggleUserMenu()">
        ${email[0].toUpperCase()}
      </div>
      <div id="userMenu" class="hidden" style="
        position:absolute;top:60px;right:20px;
        background:#0b0014;border:1px solid var(--border);
        border-radius:12px;padding:10px;z-index:5000
      ">
        <div onclick="location.href='/account.html'">حسابي</div>
        <div onclick="logout()">تسجيل خروج</div>
      </div>
    `;
  }
}
function toggleUserMenu(){
  document.getElementById("userMenu").classList.toggle("hidden");
}
function logout(){
  localStorage.removeItem("userEmail");
  renderUser();
}
renderUser();

/* ================= AUTH ================= */
function openAuth(){
  authMode = "login";
  updateAuthUI();
  authModal.classList.remove("hidden");
}

function switchAuth(){
  authMode = authMode === "login" ? "register" : "login";
  updateAuthUI();
}

function updateAuthUI(){
  if(authMode === "login"){
    authTitle.textContent = "تسجيل الدخول";
    authSubmit.textContent = "دخول";
    authSwitchText.textContent = "ما عندك حساب؟";
    rgName.classList.add("hidden");
  }else{
    authTitle.textContent = "إنشاء حساب";
    authSubmit.textContent = "تسجيل";
    authSwitchText.textContent = "عندك حساب؟";
    rgName.classList.remove("hidden");
  }
}

authSubmit.onclick = async ()=>{
  const email = rgEmail.value.trim();
  const pass = rgPass.value.trim();

  if(!email || !pass) return alert("البيانات ناقصة");

  if(authMode === "login"){
    const r = await fetch("/api/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password:pass})
    });
    if(!r.ok) return alert("بيانات غير صحيحة أو الحساب غير مفعّل");
    localStorage.setItem("userEmail", email);
    authModal.classList.add("hidden");
    renderUser();
  }else{
    const name = rgName.value.trim();
    if(!name) return alert("اكتب اسم للحساب");

    const r = await fetch("/api/auth/register",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password:pass,name})
    });
    if(!r.ok) return alert("فشل إنشاء الحساب");

    localStorage.setItem("tmpEmail", email);
    authModal.classList.add("hidden");
    verifyModal.classList.remove("hidden");
  }
};

async function verifyAccount(){
  const code = vfCode.value.trim();
  const email = localStorage.getItem("tmpEmail");
  if(!code) return alert("اكتب رمز التحقق");

  const r = await fetch("/api/auth/verify",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email,code})
  });
  if(!r.ok) return alert("رمز غير صحيح");

  localStorage.setItem("userEmail", email);
  localStorage.removeItem("tmpEmail");
  verifyModal.classList.add("hidden");
  renderUser();
}
