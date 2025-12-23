// main.js
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeDataListeners } from "./data-service.js";
import { handleAdminUI, navigate, renderProfileInfo, showModal, hideModal, isAdminLoggedIn } from "./ui-handler.js";
import { setupEventListeners } from "./event-listeners.js";
import { getDoc as getFirestoreDoc, doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// OBS: Vi har tagit bort importen av competition-ui.js

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
    return false;
}

export async function initializeAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const isAdmin = await checkAdminStatus(user);
            await handleAdminUI(user); 
            
            renderProfileInfo({
                email: user.email,
                username: user.displayName || '', 
                role: isAdmin ? 'Admin' : 'Medlem'
            });

            document.getElementById('user-login-panel').classList.add('hidden');
            document.getElementById('profile-panel').classList.remove('hidden');
            
        } else {
            currentUserId = null;
            handleAdminUI(null);
            document.getElementById('user-login-panel').classList.remove('hidden');
            document.getElementById('profile-panel').classList.add('hidden');
        }
        
        // Starta lyssnare OAVSETT om man är inloggad eller ej (publik data visas alltid)
        initializeDataListeners();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAuthListener();
    setupEventListeners();
    
    // Hantera direktlänkar (t.ex. #nyheter)
    if(window.location.hash) {
        setTimeout(() => navigate(window.location.hash), 100);
    }
});