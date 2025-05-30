// Central sync: update all tables/lists on all pages!
export async function syncAllData() {
    if (typeof window.loadPets === "function") await window.loadPets();
    if (typeof window.loadOwners === "function") await window.loadOwners();
    if (typeof window.fetchAppointments === "function") await window.fetchAppointments();
    if (typeof window.loadTreatments === "function") await window.loadTreatments();
    if (typeof window.loadVaccinations === "function") await window.loadVaccinations();
    if (typeof window.loadStats === "function") await window.loadStats();
}