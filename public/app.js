document.addEventListener("DOMContentLoaded", () => {
  const accountBtn = document.getElementById("accountBtn");
  const accountMenu = document.getElementById("accountMenu");

  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const verifyLink = document.getElementById("verifyLink");
  const accountLink = document.getElementById("accountLink");
  const logoutLink = document.getElementById("logoutLink");

  const token = localStorage.getItem("token");

  if (token) {
    loginLink.style.display = "none";
    registerLink.style.display = "none";
  } else {
    accountLink.style.display = "none";
    logoutLink.style.display = "none";
  }

  accountBtn.onclick = () => {
    accountMenu.classList.toggle("hidden");
  };

  document.addEventListener("click", (e) => {
    if (!accountBtn.contains(e.target) && !accountMenu.contains(e.target)) {
      accountMenu.classList.add("hidden");
    }
  });

  logoutLink.onclick = () => {
    localStorage.removeItem("token");
    location.href = "/";
  };
});
