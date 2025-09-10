// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

let currentUserId = null;
let isAdminLoggedIn = false;
let loggedInAdminUsername = '';

const registerForm = document.getElementById('register-form');
const userLoginForm = document.getElementById('user-login-form');
const logoutProfileBtn = document.getElementById('logout-profile-btn');
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');
const profilePanel = document.getElementById('profile-panel');
const registerPanel = document.getElementById('register-panel');
const userLoginPanel = document.getElementById('user-login-panel');
const profileEmail = document.getElementById('profile-email');

function toggleProfileUI(user) {
    if (user) {
        profilePanel.classList.remove('hidden');
        userLoginPanel.classList.add('hidden');
        registerPanel.classList.add('hidden');
        profileEmail.textContent = user.email;
    } else {
        profilePanel.classList.add('hidden');
        userLoginPanel.classList.remove('hidden');
        registerPanel.classList.add('hidden');
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        toggleProfileUI(user);
    } else {
        currentUserId = null;
        toggleProfileUI(null);
    }
});

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email
            });
            alert('Konto skapat! Du är nu inloggad.');
        } catch (error) {
            alert(error.message);
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

if (logoutProfileBtn) {
    logoutProfileBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            alert('Utloggning lyckades.');
            // Update UI
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

export async function addAdmin(username, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, username, password);
        await setDoc(doc(db, 'admins', userCredential.user.uid), { username: username, password: password });
        return { success: true, message: 'Admin har lagts till!' };
    } catch (error) {
        console.error("Fel vid tillägg av admin:", error);
        return { success: false, message: "Ett fel uppstod när admin skulle läggas till." };
    }
}