document.addEventListener("DOMContentLoaded", function () {
  const userProfile = document.getElementById("userProfile");
  const dropdownBtn = document.getElementById("profileDropdownBtn");
  const dropdownMenu = document.getElementById("profileDropdownMenu");
  const doctorNameElem = document.getElementById('doctorName');
  const arrow = dropdownBtn ? dropdownBtn.querySelector(".profile-arrow") : null;

  // Set doctor name from localStorage or default
  if (doctorNameElem) {
    const doctorName = localStorage.getItem('doctorName') || 'Dra.Amante';
    doctorNameElem.textContent = doctorName;
  }

  if (dropdownBtn && userProfile && dropdownMenu) {
    dropdownBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      userProfile.classList.toggle("show");
      if (arrow) {
        arrow.style.transform = userProfile.classList.contains("show") ? "rotate(180deg)" : "rotate(0)";
      }
    });

    document.addEventListener("click", function () {
      userProfile.classList.remove("show");
      if (arrow) arrow.style.transform = "rotate(0)";
    });

    dropdownMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    // Profile Settings & Logout
    const settings = document.getElementById('profileSettings');
    const logout = document.getElementById('logoutBtn');
    if (settings) settings.addEventListener("click", function (e) {
      e.preventDefault();
      alert("Settings coming soon!");
    });
    if (logout) logout.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("doctorName");
      window.location.href = "index.html";
    });
  }
});