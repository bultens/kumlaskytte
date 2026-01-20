// main.js
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeDataListeners } from "./data-service.js";
import { handleAdminUI, navigate, renderProfileInfo, showModal, hideModal, isAdminLoggedIn, scrollToNewsIfNeeded} from "./ui-handler.js";
import { setupEventListeners } from "./event-listeners.js";
import { getDoc as getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initFileManager } from "./admin-documents.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'kumla-skytte-app';

// Ver. 3.11
export { auth, db, firebaseSignOut as signOut, getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp };

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

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initFileManager();
    
    const currentHash = window.location.hash || '#hem';
    navigate(currentHash);
    scrollToNewsIfNeeded(); // <--- Lägg till här också för direktlänkar
    
    window.addEventListener('hashchange', () => {
        navigate(window.location.hash || '#hem');
        scrollToNewsIfNeeded();
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