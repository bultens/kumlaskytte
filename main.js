// main.js
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeDataListeners } from "./data-service.js";
import { handleAdminUI, navigate, renderProfileInfo, showModal, hideModal, isAdminLoggedIn } from "./ui-handler.js";
import { setupEventListeners } from "./event-listeners.js";
import { getDoc as getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initFileManager } from "./admin-documents.js";
import { initCompetitionAdmin } from "./admin-competition.js";

// Ver. 3.11
export let currentUserId = null;
export { auth, db, firebaseSignOut as signOut, getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp };

async function checkAdminStatus(user) {
    if (user) {
        currentUserId = user.uid;
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getFirestoreDoc(docRef);
            if (docSnap.exists()) {
                if (docSnap.data().isAdmin) {
                    return true;
                }
            }
        } catch (error) {
            console.error("Fel vid hämtning av admin-status:", error);
        }
    }
    currentUserId = null;
    return false;
}

function initializeAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 1. Spara vem som är inloggad globalt
            currentUserId = user.uid;

            // 2. Kolla Admin-status
            const isAdmin = await checkAdminStatus(user);
            
            // 3. Uppdatera UI för Admin/User
            handleAdminUI(isAdmin);

            // 4. Starta datalyssnare (VIKTIGT: Skicka med isAdmin!)
            initializeDataListeners(isAdmin);

            // 5. Hämta profilinfo för headern
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getFirestoreDoc(docRef);
            
            // Uppdatera profil-ikon och välkomsttext
            renderProfileInfo(docSnap);

            const userData = docSnap.exists() ? docSnap.data() : {};
            const name = userData.name || user.email;
            
            const profileWelcomeMessage = document.getElementById('profile-welcome-message');
            if (profileWelcomeMessage) {
                profileWelcomeMessage.textContent = `Välkommen, ${name}`;
            }

        } else {
            // --- UTLOGGAD ---
            currentUserId = null;
            
            // Ta bort admin-gränssnitt
            handleAdminUI(false);
            
            // Stäng av/rensa lyssnare (skicka false)
            initializeDataListeners(false);
            
            // Töm profilinfo
            renderProfileInfo(null);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAuthListener();
    setupEventListeners();
    initFileManager();
    initCompetitionAdmin();
    navigate(window.location.hash || '#hem');
    window.addEventListener('hashchange', () => {
        navigate(window.location.hash || '#hem');
    });
    
    // Setup modal close buttons
    const closeErrorModal = document.getElementById('close-error-modal');
    if (closeErrorModal) closeErrorModal.addEventListener('click', () => hideModal('errorModal'));
    
    const errorModal = document.getElementById('errorModal');
    if (errorModal) errorModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideModal('errorModal'); });
    
    const confirmationModal = document.getElementById('confirmationModal');
    if (confirmationModal) confirmationModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideModal('confirmationModal'); });
    
    const closeShareModalBtn = document.getElementById('close-share-modal');
    if (closeShareModalBtn) closeShareModalBtn.addEventListener('click', () => hideModal('shareModal'));
    
    const shareModal = document.getElementById('shareModal');
    if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideModal('shareModal'); });
    
    const closeUserInfoModal = document.getElementById('close-user-info-modal');
    if (closeUserInfoModal) closeUserInfoModal.addEventListener('click', () => hideModal('userInfoModal'));
    
    const userInfoModal = document.getElementById('userInfoModal');
    if (userInfoModal) userInfoModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideModal('userInfoModal'); });

});