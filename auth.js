// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getFirestore, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showModal, hideModal, showDeleteProfileModal } from "./ui-handler.js";

// Ver. 2.07
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
const deleteAccountBtn = document.getElementById('delete-account-btn');

function toggleProfileUI(user) {
    if (user) {
        profilePanel.classList.remove('hidden');
        userLoginPanel.classList.add('hidden');
        registerPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.remove('hidden');
	if (resultsNavLink) resultsNavLink.classList.remove('hidden');
        if (userNavLink) userNavLink.classList.add('hidden');
    } else {
        profilePanel.classList.add('hidden');
        userLoginPanel.classList.remove('hidden');
        registerPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.add('hidden');
	if (resultsNavLink) resultsNavLink.classList.add('hidden');
        if (userNavLink) userNavLink.classList.remove('hidden');
    }
}

onAuthStateChanged(auth, async (user) => {
    currentUserId = user ? user.uid : null;
    if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            const name = userData.name || userData.email;
            if (profileWelcomeMessage) {
                profileWelcomeMessage.textContent = `Välkommen, ${name}`;
            }
        }
    }
    toggleProfileUI(user);
});


if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                isAdmin: false
            });
            showModal('confirmationModal', 'Konto skapat! Du är nu inloggad.');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showModal('errorModal', 'Denna e-postadress är redan registrerad. Vänligen logga in istället.');
            } else {
                showModal('errorModal', error.message);
            }
        }
    });
}

if (userLoginForm) {
    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('user-login-email').value;
        const password = document.getElementById('user-login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showModal('confirmationModal', 'Inloggning lyckades!');
        } catch (error) {
            let userMessage = 'Ett fel uppstod vid inloggning. Vänligen försök igen.';
            if (error.code === 'auth/invalid-credential') {
                userMessage = 'E-post eller lösenord är felaktigt.';
            }
            showModal('errorModal', userMessage);
        }
    });
}

const logoutProfileBtn = document.getElementById('logout-profile-btn');
if (logoutProfileBtn) {
    logoutProfileBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.hash = '#hem';
        } catch (error) {
            console.error("Fel vid utloggning:", error);
            showModal('errorModal', "Ett fel uppstod vid utloggning.");
        }
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerPanel.classList.add('hidden');
        userLoginPanel.classList.remove('hidden');
    });
}

if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        userLoginPanel.classList.add('hidden');
        registerPanel.classList.remove('hidden');
    });
}

// Lade till knappen för att ta bort konto
const deleteAccountBtnEl = document.getElementById('delete-account-btn');
if (deleteAccountBtnEl) {
    deleteAccountBtnEl.addEventListener('click', () => {
        showDeleteProfileModal();
    });
}

const confirmDeleteProfileBtn = document.getElementById('confirm-delete-profile-btn');
if (confirmDeleteProfileBtn) {
    confirmDeleteProfileBtn.addEventListener('click', async () => {
        hideModal('deleteProfileModal');
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteDoc(doc(db, "users", user.uid));
                await deleteUser(user);
                showModal('confirmationModal', "Ditt konto har tagits bort.");
            } catch (error) {
                console.error("Fel vid borttagning av konto:", error);
                showModal('errorModal', "Ett fel uppstod när ditt konto skulle tas bort. Vänligen logga in igen för att bekräfta din behörighet.");
            }
        }
    });
}