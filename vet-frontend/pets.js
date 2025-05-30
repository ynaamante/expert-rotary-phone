document.addEventListener("DOMContentLoaded", function () {
  // --- PROFILE DROPDOWN LOGIC ---
  const doctorName = localStorage.getItem('doctorName') || 'Dra.Amante';
  document.getElementById('doctorName').textContent = doctorName;

  const userProfile = document.getElementById("userProfile");
  const dropdownArrow = document.getElementById("dropdownArrow");
  const dropdownMenu = document.getElementById("profileDropdownMenu");

  userProfile.addEventListener("click", function (e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
    userProfile.classList.toggle("active");
    dropdownArrow.style.transform = dropdownMenu.classList.contains("show") ? "rotate(180deg)" : "rotate(0deg)";
  });

  document.addEventListener("click", function () {
    dropdownMenu.classList.remove("show");
    userProfile.classList.remove("active");
    dropdownArrow.style.transform = "rotate(0deg)";
  });

  dropdownMenu.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  document.getElementById('profileSettings').addEventListener("click", function (e) {
    e.preventDefault();
    alert("Settings coming soon!");
  });

  document.getElementById('logoutBtn').addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("doctorName");
    window.location.href = "index.html";
  });

  // --- MODAL VARIABLES ---
  const addPetModal = document.getElementById('addPetModal');
  const addPetBtn = document.getElementById('addPetBtn');
  const closeAddPetModal = document.getElementById('closeAddPetModal');
  const cancelAddPetBtn = document.getElementById('cancelAddPetBtn');
  const addPetForm = document.getElementById('addPetForm');

  const editPetModal = document.getElementById('editPetModal');
  const closeEditPetModal = document.getElementById('closeEditPetModal');
  const cancelEditPetBtn = document.getElementById('cancelEditPetBtn');
  const editPetForm = document.getElementById('editPetForm');

  const viewPetModal = document.getElementById('viewPetModal');
  const closeViewPetModal = document.getElementById('closeViewPetModal');

  const deletePetModal = document.getElementById('deletePetModal');
  const closeDeletePetModal = document.getElementById('closeDeletePetModal');
  const cancelDeletePetBtn = document.getElementById('cancelDeletePetBtn');
  const confirmDeletePetBtn = document.getElementById('confirmDeletePetBtn');
  const deletePetMsg = document.getElementById('deletePetMsg');
  let deletePetId = null;

  // --- TABLE, SEARCH, PAGINATION ---
  let allPets = [];
  let allOwners = [];
  let currentPage = 1;
  const pageSize = 8;
  const searchPetsInput = document.getElementById("searchPetsInput");
  const prevPetsPageBtn = document.getElementById("prevPetsPageBtn");
  const nextPetsPageBtn = document.getElementById("nextPetsPageBtn");
  const petsPageIndicator = document.getElementById("petsPageIndicator");
  const petsTableBody = document.getElementById('petsTableBody');

  // --- OWNER LOGIC ---
  async function fetchOwners() {
    const r = await fetch('http://localhost:5000/owners');
    allOwners = await r.json();
    return allOwners;
  }
  function ownerNameById(owner_id) {
    const owner = allOwners.find(o => Number(o.owner_id) === Number(owner_id));
    return owner ? owner.name : '';
  }
  function ownerIdByName(name) {
    const owner = allOwners.find(o => o.name.trim().toLowerCase() === name.trim().toLowerCase());
    return owner ? owner.owner_id : null;
  }
  function populateOwnerDatalist(inputId) {
    const datalistId = inputId + "List";
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = datalistId;
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = "";
    allOwners.forEach(owner => {
      const opt = document.createElement('option');
      opt.value = owner.name;
      datalist.appendChild(opt);
    });
    document.getElementById(inputId).setAttribute('list', datalistId);
  }

  // --- MODAL LOGIC: ADD ---
  if (addPetBtn) addPetBtn.onclick = async function () {
    await fetchOwners();
    populateOwnerDatalist('addPetOwner');
    addPetModal.style.display = 'block';
    addPetForm.reset();
  };
  if (closeAddPetModal) closeAddPetModal.onclick = function () {
    addPetModal.style.display = 'none';
    addPetForm.reset();
  };
  if (cancelAddPetBtn) cancelAddPetBtn.onclick = function () {
    addPetModal.style.display = 'none';
    addPetForm.reset();
  };
  if (addPetModal) addPetModal.onclick = function(e) {
    if (e.target === addPetModal) {
      addPetModal.style.display = 'none';
      addPetForm.reset();
    }
  };
  if (addPetForm) addPetForm.onsubmit = async function(e) {
    e.preventDefault();
    await fetchOwners();
    const ownerName = document.getElementById('addPetOwner').value.trim();
    const owner_id = ownerIdByName(ownerName);
    if (!owner_id) {
      alert("Owner not found. Please add the owner first or use an existing name.");
      return;
    }
    const payload = {
      name: document.getElementById('addPetName').value.trim(),
      species: document.getElementById('addPetSpecies').value.trim(),
      breed: document.getElementById('addPetBreed').value.trim(),
      age: document.getElementById('addPetAge').value,
      owner_id: owner_id,
      last_visit: document.getElementById('addVisit').value,
      medical_notes: document.getElementById('addPetNotes') ? document.getElementById('addPetNotes').value.trim() : ""
    };
    const res = await fetch('http://localhost:5000/pets', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      addPetModal.style.display = 'none';
      addPetForm.reset();
      loadPets();
      alert("Pet added!");
    } else {
      alert("Failed to add pet.");
    }
  };

  // --- MODAL LOGIC: EDIT ---
  if (closeEditPetModal) closeEditPetModal.onclick = cancelEditPetBtn.onclick = function () {
    editPetModal.style.display = 'none';
    editPetForm.reset();
  };
  if (editPetModal) editPetModal.onclick = function(e) {
    if (e.target === editPetModal) {
      editPetModal.style.display = 'none';
      editPetForm.reset();
    }
  };
  if (editPetForm) editPetForm.onsubmit = async function(e) {
    e.preventDefault();
    await fetchOwners();
    const id = document.getElementById('editPetId').value;
    const ownerName = document.getElementById('editPetOwner').value.trim();
    const owner_id = ownerIdByName(ownerName);
    if (!owner_id) {
      alert("Owner not found. Please add the owner first or use an existing name.");
      return;
    }
    const payload = {
      name: document.getElementById('editPetName').value.trim(),
      species: document.getElementById('editPetSpecies').value.trim(),
      breed: document.getElementById('editPetBreed').value.trim(),
      age: document.getElementById('editPetAge').value,
      owner_id: owner_id,
      last_visit: document.getElementById('editVisit').value.trim(),
      medical_notes: document.getElementById('editPetNotes') ? document.getElementById('editPetNotes').value.trim() : ""
    };
    const res = await fetch(`http://localhost:5000/pets/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editPetModal.style.display = 'none';
      editPetForm.reset();
      loadPets();
      alert("Pet updated!");
    } else {
      alert("Failed to update pet.");
    }
  };

  // --- MODAL LOGIC: VIEW ---
  function showViewPetModal(pet) {
    document.getElementById('viewPetName').textContent = pet.name || '';
    document.getElementById('viewPetSpecies').textContent = pet.species || '';
    document.getElementById('viewPetBreed').textContent = pet.breed || '';
    document.getElementById('viewPetOwner').textContent = ownerNameById(pet.owner_id) || '';
    document.getElementById('viewPetAge').textContent = pet.age || '';
    document.getElementById('viewVisit').textContent = pet.last_visit ? pet.last_visit.replace('T', ' ').slice(0, 16) : '';
    document.getElementById('viewPetNotes').textContent = pet.medical_notes || '';
    viewPetModal.style.display = 'block';
  }
  if (closeViewPetModal) {
    closeViewPetModal.onclick = function () {
      viewPetModal.style.display = 'none';
    };
  }
  if (viewPetModal) {
    viewPetModal.onclick = function(e) {
      if (e.target === viewPetModal)
        viewPetModal.style.display = 'none';
    };
  }

  // --- MODAL LOGIC: DELETE ---
  if (closeDeletePetModal) closeDeletePetModal.onclick = cancelDeletePetBtn.onclick = function () {
    deletePetModal.style.display = 'none';
    deletePetId = null;
  };
  if (deletePetModal) deletePetModal.onclick = function(e) {
    if (e.target === deletePetModal) {
      deletePetModal.style.display = 'none';
      deletePetId = null;
    }
  };
  if (confirmDeletePetBtn) confirmDeletePetBtn.onclick = async function() {
    if (!deletePetId) return;
    const res = await fetch(`http://localhost:5000/pets/${deletePetId}`, { method: 'DELETE' });
    if (res.ok) {
      deletePetModal.style.display = 'none';
      loadPets();
      alert("Pet deleted!");
    } else {
      alert("Failed to delete pet.");
    }
    deletePetId = null;
  };

  // --- TABLE DISPLAY HELPERS ---
  function getFilteredPets() {
    const q = (searchPetsInput && searchPetsInput.value) ? searchPetsInput.value.trim().toLowerCase() : "";
    return allPets.filter(pet =>
      (!q ||
        (pet.name || '').toLowerCase().includes(q) ||
        (pet.species || '').toLowerCase().includes(q) ||
        (pet.breed || '').toLowerCase().includes(q) ||
        (ownerNameById(pet.owner_id) || '').toLowerCase().includes(q) ||
        (pet.last_visit || '').toLowerCase().includes(q) ||
        (pet.medical_notes || '').toLowerCase().includes(q)
      )
    );
  }
  function renderPetsTable() {
    if (!petsTableBody) return;
    const pets = getFilteredPets();
    petsTableBody.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(pets.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pagePets = pets.slice(startIdx, startIdx + pageSize);

    pagePets.forEach(pet => {
      petsTableBody.innerHTML += `
        <tr>
          <td>${pet.pet_id || ''}</td>
          <td>${pet.name || ''}</td>
          <td>${pet.species || ''}</td>
          <td>${pet.breed || ''}</td>
          <td>${ownerNameById(pet.owner_id) || ''}</td>
          <td>${pet.age || ''}</td>
          <td>${pet.last_visit ? pet.last_visit.replace('T', ' ').slice(0, 16) : ''}</td>
          <td>${pet.medical_notes || ''}</td>
          <td class="actions">
            <button class="action-btn view-btn" title="View" data-id="${pet.pet_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <ellipse cx="16" cy="16" rx="11" ry="7" stroke="#4285f4" stroke-width="2"/>
                <circle cx="16" cy="16" r="3" stroke="#4285f4" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn edit-btn" title="Edit" data-id="${pet.pet_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="20" y="10" width="3.8" height="13" rx="1" transform="rotate(45 20 10)" fill="#34a853" fill-opacity="0.18"/>
                <path d="M10 26v-3.7a1 1 0 0 1 .3-.7l13-13a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 1 0 1.4l-13 13a1 1 0 0 1-.7.3H10z" stroke="#34a853" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete" data-id="${pet.pet_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="10" y="14" width="12" height="10" rx="2" stroke="#ea4335" stroke-width="2"/>
                <path d="M14 18v4m4-4v4M12 10v4h8v-4" stroke="#ea4335" stroke-width="2"/>
                <path d="M8 14h16" stroke="#ea4335" stroke-width="2"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });
    if (petsPageIndicator) petsPageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    petsTableBody.querySelectorAll('.view-btn').forEach(btn => {
      btn.onclick = function () {
        const id = btn.dataset.id;
        const pet = allPets.find(p => p.pet_id == id);
        if (!pet) return;
        showViewPetModal(pet);
      };
    });
    petsTableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const pet = allPets.find(p => p.pet_id == id);
        if (!pet) return;
        await fetchOwners();
        populateOwnerDatalist('editPetOwner');
        document.getElementById('editPetId').value = pet.pet_id;
        document.getElementById('editPetName').value = pet.name || '';
        document.getElementById('editPetSpecies').value = pet.species || '';
        document.getElementById('editPetBreed').value = pet.breed || '';
        document.getElementById('editPetOwner').value = ownerNameById(pet.owner_id) || '';
        document.getElementById('editPetAge').value = pet.age || '';
        document.getElementById('editVisit').value = pet.last_visit ? pet.last_visit.slice(0, 16) : '';
        document.getElementById('editPetNotes').value = pet.medical_notes || '';
        editPetModal.style.display = 'block';
      };
    });
    petsTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = function () {
        deletePetId = btn.dataset.id;
        deletePetMsg.textContent = `Are you sure you want to delete pet #${btn.dataset.id}?`;
        deletePetModal.style.display = 'block';
      };
    });
  }

  async function loadPets() {
    await fetchOwners();
    try {
      const res = await fetch('http://localhost:5000/pets');
      allPets = (await res.json()) || [];
      renderPetsTable();
    } catch (err) {
      allPets = [];
      renderPetsTable();
      alert("Failed to load pets. Check your backend.");
    }
  }

  // --- SEARCH FILTER EVENT ---
  searchPetsInput.addEventListener("input", function () {
    currentPage = 1;
    renderPetsTable();
  });

  // --- PAGINATION ---
  // Already handled by prevPetsPageBtn/nextPetsPageBtn

  // --- INITIAL LOAD ---
  loadPets();
});