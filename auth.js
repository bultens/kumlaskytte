// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getFirestore, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc, arrayRemove, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showModal, hideModal, showDeleteProfileModal } from "./ui-handler.js";

// Ver. 2.12 (Fixad registrering)
let currentUserId = null;
let isAdminLoggedIn = false;
let loggedInAdminUsername = '';

const profilePanel = document.getElementById('profile-panel');
const profileWelcomeMessage = document.getElementById('profile-welcome-message');
const userNavLink = document.getElementById('user-nav-link');
const profileNavLink = document.getElementById('profile-nav-link');
const resultsNavLink = document.getElementById('results-nav-link');
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');
const registerPanel = document.getElementById('register-panel');
const userLoginPanel = document.getElementById('user-login-panel');
const registerForm = document.getElementById('register-form');
const userLoginForm = document.getElementById('user-login-form');
const logoutBtn = document.getElementById('logout-btn');
const closeRegisterBtn = document.getElementById('close-register-btn');
const closeLoginBtn = document.getElementById('close-login-btn');
const deleteProfileBtn = document.getElementById('delete-profile-btn');

// --- HÄR VAR FELET FIXAT (register-email istället för reg-email) ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailVal = document.getElementById('register-email').value;
        const passVal = document.getElementById('register-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailVal, passVal);
            const user = userCredential.user;
            
            await setDoc(doc(db, "users", user.uid), {
                email: emailVal,
                isAdmin: false,
                createdAt: serverTimestamp()
            });
            
            showModal('confirmationModal', 'Konto skapat! Du är nu inloggad.');
            if (registerPanel) registerPanel.classList.add('hidden');
            
        } catch (error) {
            console.error("Registreringsfel:", error);
            if (error.code === 'auth/email-already-in-use') {
                showModal('errorModal', 'Denna e-postadress är redan registrerad. Vänligen logga in istället.');
            } else {
                showModal('errorModal', "Kunde inte skapa konto: " + error.message);
            }
        }
    });
}

if (userLoginForm) {
    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = document.getElementById('login-email').value;
        const passVal = document.getElementById('login-password').value;

        try {
            await signInWithEmailAndPassword(auth, emailVal, passVal);
            if (userLoginPanel) userLoginPanel.classList.add('hidden');
            // showModal('confirmationModal', 'Inloggning lyckades!'); // Valfritt
        } catch (error) {
            console.error("Inloggningsfel:", error);
            showModal('errorModal', "Fel e-post eller lösenord.");
        }
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (registerPanel) registerPanel.classList.add('hidden');
        if (userLoginPanel) userLoginPanel.classList.remove('hidden');
    });
}

if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (userLoginPanel) userLoginPanel.classList.add('hidden');
        if (registerPanel) registerPanel.classList.remove('hidden');
    });
}

if (closeRegisterBtn) {
    closeRegisterBtn.addEventListener('click', () => {
        if (registerPanel) registerPanel.classList.add('hidden');
    });
}

if (closeLoginBtn) {
    closeLoginBtn.addEventListener('click', () => {
        if (userLoginPanel) userLoginPanel.classList.add('hidden');
    });
}

if (deleteProfileBtn) {
    deleteProfileBtn.addEventListener('click', () => {
        showDeleteProfileModal();
    });
}

// Logik för att bekräfta borttagning av profil
const confirmDeleteProfileBtn = document.getElementById('confirm-delete-profile-btn');
if (confirmDeleteProfileBtn) {
    confirmDeleteProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            const userId = user.uid;
            const batch = writeBatch(db);

            // 1. Ta bort kopplingen till skyttar (förälder)
            const shootersQuery = query(collection(db, "shooters"), where("parentUserIds", "array-contains", userId));
            const shootersSnap = await getDocs(shootersQuery);
            
            shootersSnap.forEach((docSnap) => {
                const parents = docSnap.data().parentUserIds || [];
                if (parents.length === 1 && parents.includes(userId)) {
                    batch.update(docSnap.ref, {
                        parentUserIds: arrayRemove(userId),
                        requiresAdminAction: true, 
                        adminNote: "Föräldern raderade sitt konto. Profilen är nu föräldralös."
                    });
                } else {
                    batch.update(docSnap.ref, {
                        parentUserIds: arrayRemove(userId)
                    });
                }
            });

            // 2. Ta bort användardatan i 'users'
            const userDocRef = doc(db, "users", userId);
            batch.delete(userDocRef);

            await batch.commit();

            // 3. Ta bort kontot i Auth
            await deleteUser(user);

            hideModal('deleteProfileModal');
            showModal('confirmationModal', "Ditt konto har tagits bort.");
            
        } catch (error) {
            console.error("Fel vid borttagning av konto:", error);
            if (error.code === 'auth/requires-recent-login') {
                showModal('errorModal', "Av säkerhetsskäl måste du logga ut och logga in igen innan du kan ta bort kontot.");
            } else {
                showModal('errorModal', "Ett fel uppstod: " + error.message);
            }
            hideModal('deleteProfileModal');
        }
    });
}

// Hantera UI baserat på inloggningsstatus (körs av main.js via auth-lyssnare)
export function toggleProfileUI(user) {
    const mobileResultsLink = document.getElementById('mobile-results-nav-link');
    
    if (user) {
        if (profilePanel) profilePanel.classList.remove('hidden');
        if (showLoginLink) showLoginLink.classList.add('hidden');
        if (userNavLink) userNavLink.classList.remove('hidden'); 
        if (profileNavLink) profileNavLink.classList.remove('hidden');
        if (resultsNavLink) resultsNavLink.classList.remove('hidden');
        if (mobileResultsLink) mobileResultsLink.classList.remove('hidden');
    } else {
        if (profilePanel) profilePanel.classList.add('hidden');
        if (showLoginLink) showLoginLink.classList.remove('hidden');
        if (userNavLink) userNavLink.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.add('hidden');
        if (resultsNavLink) resultsNavLink.classList.add('hidden');
        if (mobileResultsLink) mobileResultsLink.classList.add('hidden');
    }
}