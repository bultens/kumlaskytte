// main.js
import { db, auth } from "./firebase-config.js";
import { initializeDataListeners } from "./data-service.js";
import { navigate, scrollToNewsIfNeeded, hideModal } from "./ui-handler.js";
import { setupEventListeners } from "./event-listeners.js";
import { initFileManager } from "./admin-documents.js";

console.log("🚀 MAIN.JS STARTAR");
window.addEventListener('error', (e) => console.error("💥 GLOBALT FEL:", e.message, e.filename, e.lineno));

document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOMContentLoaded - initierar...");
    
    // Initiera event listeners för knappar, formulär etc.
    setupEventListeners();
    
    // Initiera filhanteraren
    initFileManager();
    
    // VIKTIGT: Starta data-lyssnare direkt för att ladda nyheter/events även för icke-inloggade
    try {
        initializeDataListeners();
        console.log("✅ Data-lyssnare startade");
    } catch (e) {
        console.error("❌ Fel vid start av data-lyssnare:", e);
    }
    
    // Hantera navigation
    const currentHash = window.location.hash || '#hem';
    navigate(currentHash);
    scrollToNewsIfNeeded();
    
    window.addEventListener('hashchange', () => {
        navigate(window.location.hash || '#hem');
        scrollToNewsIfNeeded();
    });
    
    // Setup modal close buttons
    setupModalCloseButtons();
});

function setupModalCloseButtons() {
    // Error modal
    const closeErrorModal = document.getElementById('close-error-modal');
    if (closeErrorModal) {
        closeErrorModal.addEventListener('click', () => hideModal('errorModal'));
    }
    
    const errorModal = document.getElementById('errorModal');
    if (errorModal) {
        errorModal.addEventListener('click', (e) => { 
            if (e.target === e.currentTarget) hideModal('errorModal');
        });
    }
    
    // Confirmation modal
    const confirmationModal = document.getElementById('confirmationModal');
    if (confirmationModal) {
        confirmationModal.addEventListener('click', (e) => { 
            if (e.target === e.currentTarget) hideModal('confirmationModal');
        });
    }
    
    // Share modal
    const closeShareModalBtn = document.getElementById('close-share-modal');
    if (closeShareModalBtn) {
        closeShareModalBtn.addEventListener('click', () => hideModal('shareModal'));
    }
    
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
        shareModal.addEventListener('click', (e) => { 
            if (e.target === e.currentTarget) hideModal('shareModal');
        });
    }
    
    // User info modal
    const closeUserInfoModal = document.getElementById('close-user-info-modal');
    if (closeUserInfoModal) {
        closeUserInfoModal.addEventListener('click', () => hideModal('userInfoModal'));
    }
    
    const userInfoModal = document.getElementById('userInfoModal');
    if (userInfoModal) {
        userInfoModal.addEventListener('click', (e) => { 
            if (e.target === e.currentTarget) hideModal('userInfoModal');
        });
    }
}

// Export för bakåtkompatibilitet
export { auth, db };