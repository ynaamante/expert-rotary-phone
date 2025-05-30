document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  const addDoctorModal = document.getElementById("addDoctorModal");
  const showAddDoctorBtn = document.getElementById("showAddDoctorBtn");
  const closeAddDoctorModal = document.getElementById("closeAddDoctorModal");
  const addDoctorForm = document.getElementById("addDoctorForm");
  const addDoctorErrorMsg = document.getElementById("add-doctor-error-message");
  const photoPreview = document.getElementById("photoPreview");
  const photoInput = document.getElementById("addDoctorPhoto");

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.textContent = "";

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      loginError.textContent = "Please enter both username and password.";
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/doctors/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        loginError.textContent = data.error || "Login failed.";
        return;
      }

      localStorage.setItem("doctorId", data.doctor_id);
      localStorage.setItem("doctorName", data.display_name);
      localStorage.setItem("doctorUsername", data.username);

      // ✅ Set full photo URL in localStorage
      const photoURL = data.photo ? `http://localhost:5000/uploads/${data.photo}` : "";
      localStorage.setItem("doctorPhoto", photoURL);

      window.location.href = "dashboard.html";
    } catch (err) {
      loginError.textContent = "Cannot connect to server. " + err.message;
    }
  });

  showAddDoctorBtn.onclick = () => {
    addDoctorModal.style.display = "block";
    addDoctorErrorMsg.innerText = "";
    addDoctorForm.reset();
    photoPreview.style.display = "none";
  };

  closeAddDoctorModal.onclick = () => {
    addDoctorModal.style.display = "none";
  };

  addDoctorModal.onclick = function (e) {
    if (e.target === addDoctorModal) addDoctorModal.style.display = "none";
  };

  photoInput.onchange = function () {
    const file = this.files[0];
    if (file) {
      photoPreview.src = URL.createObjectURL(file);
      photoPreview.style.display = "block";
    } else {
      photoPreview.style.display = "none";
    }
  };

  addDoctorForm.onsubmit = async function (e) {
    e.preventDefault();
    addDoctorErrorMsg.innerText = "";

    const formData = new FormData();
    formData.append("username", document.getElementById("addDoctorUsername").value.trim());
    formData.append("password", document.getElementById("addDoctorPassword").value);
    formData.append("display_name", document.getElementById("addDoctorDisplayName").value.trim());
    formData.append("photo", document.getElementById("addDoctorPhoto").files[0]);

    try {
      const res = await fetch("http://localhost:5000/doctors", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      addDoctorModal.style.display = "none";
      alert("Account created! You may now log in.");
    } catch (e) {
      addDoctorErrorMsg.innerText = e.message;
    }
  };
});
