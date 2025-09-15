// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getFirestore, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Ver. 1.97
let currentUserId = null;
let isAdminLoggedIn = false;
let loggedInAdminUsername = '';

const profilePanel = document.getElementById('profile-panel');
const profileEmail = document.getElementById('profile-email');
const userNavLink = document.getElementById('user-nav-link');
const profileNavLink = document.getElementById('profile-nav-link');
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');
const registerPanel = document.getElementById('register-panel');
const userLoginPanel = document.getElementById('user-login-panel');
const registerForm = document.getElementById('register-form');
const userLoginForm = document.getElementById('user-login-form');

function toggleProfileUI(user) {
    if (user) {
        profilePanel.classList.remove('hidden');
        registerPanel.classList.add('hidden');
        userLoginPanel.classList.add('hidden');
        profileEmail.textContent = user.email;
        if (profileNavLink) profileNavLink.classList.remove('hidden');
        if (userNavLink) userNavLink.classList.add('hidden');
    } else {
        profilePanel.classList.add('hidden');
        registerPanel.classList.remove('hidden');
        userLoginPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.add('hidden');
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
            console.log("User data from Firestore:", userData);
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
                isAdmin: false // Lägg till isAdmin-fältet som false som standard
            });
            alert('Konto skapat! Du är nu inloggad.');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                alert('Denna e-postadress är redan registrerad. Vänligen logga in istället.');
            } else {
                alert(error.message);
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
            alert('Inloggning lyckades!');
        } catch (error) {
            alert(error.message);
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
            alert("Ett fel uppstod vid utloggning.");
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