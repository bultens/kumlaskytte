// main.js - Ver. 3.13 (Integrerad besöksstatistik)
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeDataListeners, trackVisitor } from "./data-service.js";
import { 
    handleAdminUI, 
    navigate, 
    renderProfileInfo, 
    showModal, 
    hideModal, 
    isAdminLoggedIn,
    setupVisitorChartControls // Importera den nya funktionen
} from "./ui-handler.js";
import { setupEventListeners } from "./event-listeners.js";
import { getDoc as getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initFileManager } from "./admin-documents.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'kumla-skytte-app';

export { auth, db, firebaseSignOut as signOut, getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp };

let currentUserId = null;

async function checkAdminStatus(user) {
    if (user) {
        currentUserId = user.uid;
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getFirestoreDoc(docRef);
            return docSnap.exists() && docSnap.data().isAdmin === true;
        } catch (error) {
            console.error("Admin-check misslyckades:", error);
        }
    }
    currentUserId = null;
    return false;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initiera dropdown-kontrollerna för besöksgrafen
    setupVisitorChartControls();
    
    // 2. Sätt upp alla generella event listeners
    setupEventListeners();
    
    // 3. Initiera datalyssnare (inklusive den nya för besöksstatistik)
    initializeDataListeners();

    onAuthStateChanged(auth, async (user) => {
        const isAdmin = await checkAdminStatus(user);
        handleAdminUI(isAdmin);
        
        if (user) {
            renderProfileInfo(user);
        }
    });

    // Hantera navigation baserat på URL-hash
    window.addEventListener('hashchange', () => navigate(window.location.hash));
    navigate(window.location.hash);

    // Registrera besökaren (endast en gång per session per dag)
    trackVisitor();
    
    // Setup modal close buttons
    const setupModalClose = (btnId, modalId) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', () => hideModal(modalId));
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) hideModal(modalId);
            });
        }
    };

    setupModalClose('close-error-modal', 'errorModal');
    setupModalClose('close-confirmation-modal', 'confirmationModal');
    setupModalClose('close-share-modal', 'shareModal');
    setupModalClose('close-user-info-modal', 'userInfoModal');
});