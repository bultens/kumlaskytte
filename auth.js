// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getFirestore, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

let currentUserId = null;
let isAdminLoggedIn = false;
let loggedInAdminUsername = '';

const authPanel = document.getElementById('auth-panel');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const logoutProfileBtn = document.getElementById('logout-profile-btn');
const profilePanel = document.getElementById('profile-panel');
const profileEmail = document.getElementById('profile-email');
const userNavLink = document.getElementById('user-nav-link');
const profileNavLink = document.getElementById('profile-nav-link');


function toggleProfileUI(user) {
    if (user) {
        profilePanel.classList.remove('hidden');
        authPanel.classList.add('hidden');
        profileEmail.textContent = user.email;
        if (profileNavLink) profileNavLink.classList.remove('hidden');
        if (userNavLink) userNavLink.classList.add('hidden');
    } else {
        profilePanel.classList.add('hidden');
        authPanel.classList.remove('hidden');
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

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        
        try {
            // Försök logga in
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            // Om inloggning misslyckas, försök att registrera
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    await setDoc(doc(db, "users", user.uid), {
                        email: email
                    });
                    console.log('Konto skapat och inloggning lyckades!');
                } catch (registerError) {
                    console.error("Registrering/Inloggning misslyckades:", registerError);
                    alert("Ett fel uppstod. Kontrollera din e-post och ditt lösenord.");
                }
            } else {
                console.error("Inloggning misslyckades:", error);
                alert("Ett fel uppstod. Kontrollera din e-post och ditt lösenord.");
            }
        }
    });
}

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