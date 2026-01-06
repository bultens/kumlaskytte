// auth.js
import { db, auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initializeDataListeners, setCurrentUserId } from "./data-service.js";
import { handleAdminUI, toggleProfileUI, renderProfileInfo, navigate } from "./ui-handler.js";

// Ver. 3.17 - Fixat importfelet genom att lägga till toggleProfileUI i ui-handler
const profileWelcomeMessage = document.getElementById('profile-welcome-message');

onAuthStateChanged(auth, async (user) => {
    let isAdmin = false;
    
    if (user) {
        if (typeof setCurrentUserId === 'function') {
            setCurrentUserId(user.uid);
        }
        
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                isAdmin = userData.isAdmin === true;
                
                if (profileWelcomeMessage) {
                    const name = userData.name || userData.email;
                    profileWelcomeMessage.textContent = `Välkommen, ${name}`;
                }
            }
            await renderProfileInfo(user);
        } catch (err) {
            console.error("Fel vid hämtning av användarprofil:", err);
        }
    } else {
        if (typeof setCurrentUserId === 'function') {
            setCurrentUserId(null);
        }
        
        if (window.location.hash !== '#hem' && window.location.hash !== '') {
            const publicHashes = ['#hem', '#nyheter', '#kalender', '#bilder', '#omoss', '#topplistor', '#tavlingar'];
            if (!publicHashes.some(h => window.location.hash.startsWith(h))) {
                navigate('#hem');
            }
        }
    }

    // Dessa körs alltid för att säkerställa att rätt UI visas för admin/besökare
    handleAdminUI(isAdmin); 
    initializeDataListeners(); 
    toggleProfileUI(user, isAdmin); 
});

// --- AUTH FUNKTIONER ---
export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            isAdmin: false,
            mailingList: false,
            createdAt: serverTimestamp()
        });
        return user;
    } catch (error) {
        console.error("Registreringsfel:", error);
        throw error;
    }
}

export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Inloggningsfel:", error);
        throw error;
    }
}

export async function signOut() {
    try {
        await firebaseSignOut(auth);
        navigate('#hem');
    } catch (error) {
        console.error("Utloggningsfel:", error);
    }
}

// --- FORM HANTERING ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('user-login-form');
    const registerForm = document.getElementById('register-form');
    const loginPanel = document.getElementById('user-login-panel');
    const registerPanel = document.getElementById('register-panel');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value;
            const pass = document.getElementById('user-password').value;
            try {
                await signIn(email, pass);
                if (loginPanel) loginPanel.classList.add('hidden');
                loginForm.reset();
            } catch (err) {
                alert("Inloggning misslyckades: " + err.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            try {
                await signUp(email, pass);
                if (registerPanel) registerPanel.classList.add('hidden');
                registerForm.reset();
                alert("Konto skapat! Du är nu inloggad.");
            } catch (err) {
                alert("Registrering misslyckades: " + err.message);
            }
        });
    }

    const showRegisterLink = document.getElementById('show-register-link');
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginPanel) loginPanel.classList.add('hidden');
            if (registerPanel) registerPanel.classList.remove('hidden');
        });
    }

    const showLoginLinkFromReg = document.getElementById('show-login-link-from-reg');
    if (showLoginLinkFromReg) {
        showLoginLinkFromReg.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerPanel) registerPanel.classList.add('hidden');
            if (loginPanel) loginPanel.classList.remove('hidden');
        });
    }

    const showLoginBtn = document.getElementById('show-login-link');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            if (loginPanel) loginPanel.classList.remove('hidden');
        });
    }
});