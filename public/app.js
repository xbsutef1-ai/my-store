document.addEventListener("DOMContentLoaded",()=>{

  const accountBtn=document.getElementById("accountBtn");
  const accountMenu=document.getElementById("accountMenu");
  const token=localStorage.getItem("token");

  function updateMenu(){
    accountMenu.querySelectorAll("a").forEach(a=>a.style.display="none");
    if(token){
      accountMenu.querySelector('[href="/account.html"]').style.display="block";
      accountMenu.querySelector('[href="/invoices.html"]').style.display="block";
      accountMenu.querySelector('[onclick="logout()"]').style.display="block";
    }else{
      accountMenu.querySelector('[href="/login.html"]').style.display="block";
      accountMenu.querySelector('[href="/register.html"]').style.display="block";
    }
  }

  updateMenu();

  accountBtn.onclick=()=>accountMenu.classList.toggle("hidden");
  document.addEventListener("click",e=>{
    if(!accountMenu.contains(e.target)&&!accountBtn.contains(e.target)){
      accountMenu.classList.add("hidden");
    }
  });

  window.logout=()=>{
    localStorage.removeItem("token");
    location.reload();
  };

});
