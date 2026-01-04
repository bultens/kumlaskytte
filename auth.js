// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getFirestore, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc, arrayRemove, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showModal, hideModal, showDeleteProfileModal } from "./ui-handler.js";

// Ver. 2.11 (Fixad dubblett av toggleProfileUI och listeners)
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
    const mobileResultsLink = document.getElementById('mobile-results-nav-link');
    // Om user finns (inloggad)
    if (user) {
        if (profilePanel) profilePanel.classList.remove('hidden');
        if (userLoginPanel) userLoginPanel.classList.add('hidden');
        if (registerPanel) registerPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.remove('hidden');
        if (resultsNavLink) resultsNavLink.classList.remove('hidden');
        if (userNavLink) userNavLink.classList.add('hidden');
        if (showLoginLink) showLoginLink.classList.add('hidden'); // Göm "Logga in"-knappen i menyn
        if (mobileResultsLink) mobileResultsLink.classList.remove('hidden');
    } else {
        // Utloggad
        if (profilePanel) profilePanel.classList.add('hidden');
        if (userLoginPanel) userLoginPanel.classList.add('hidden'); // Göm panelen, visa bara knappen
        if (registerPanel) registerPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.add('hidden');
        if (resultsNavLink) resultsNavLink.classList.add('hidden');
        if (userNavLink) userNavLink.classList.remove('hidden');
        if (showLoginLink) showLoginLink.classList.remove('hidden'); // Visa "Logga in"-knappen
        if (mobileResultsLink) mobileResultsLink.classList.add('hidden');
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
                email: emailVal,
                isAdmin: false
            });
            showModal('confirmationModal', 'Konto skapat! Du är nu inloggad.');
            // Göm modalen efter lyckad reg
            if (registerPanel) registerPanel.classList.add('hidden');
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
        // Matcha IDn mot din index.html modal (user-email, user-password)
        const emailVal = document.getElementById('user-email').value;
        const passVal = document.getElementById('user-password').value;

        try {
            await signInWithEmailAndPassword(auth, emailVal, passVal);
            showModal('confirmationModal', 'Inloggning lyckades!');
             // Göm modalen efter lyckad login
             if (userLoginPanel) userLoginPanel.classList.add('hidden');
        } catch (error) {
            let userMessage = 'Ett fel uppstod vid inloggning. Vänligen försök igen.';
            if (error.code === 'auth/invalid-credential') {
                userMessage = 'E-post eller lösenord är felaktigt.';
            }
            showModal('errorModal', userMessage);
        }
    });
}

const logoutProfileBtn = document.getElementById('logout-btn'); // Ändrat till logout-btn (finns i header)
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

// Hantera länkarna mellan Login och Register inuti modalerna
const linkToReg = document.getElementById('show-register-link');
const linkToLogin = document.getElementById('show-login-link-from-reg');

if (linkToReg) {
    linkToReg.addEventListener('click', (e) => {
        e.preventDefault();
        if (userLoginPanel) userLoginPanel.classList.add('hidden');
        if (registerPanel) registerPanel.classList.remove('hidden');
    });
}

if (linkToLogin) {
    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (registerPanel) registerPanel.classList.add('hidden');
        if (userLoginPanel) userLoginPanel.classList.remove('hidden');
    });
}

// Logik för att öppna login-modalen från headern
if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (userLoginPanel) {
            userLoginPanel.classList.remove('hidden');
            registerPanel.classList.add('hidden');
        }
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
        // Stäng modalen direkt
        hideModal('deleteProfileModal');
        
        const user = auth.currentUser;
        if (!user) return;
        const userId = user.uid;

        try {
            // 1. Hitta alla skyttar som denna användare är "förälder" till
            const shootersRef = collection(db, "shooters");
            const q = query(shootersRef, where("parentUserIds", "array-contains", userId));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(db);

            // 2. Loopa igenom skyttarna och ta bort kopplingen
            querySnapshot.forEach((docSnap) => {
                const shooterData = docSnap.data();
                const parents = shooterData.parentUserIds || [];
                
                // Om användaren är den ENDA föräldern -> Flagga för admin
                if (parents.length === 1 && parents.includes(userId)) {
                    batch.update(docSnap.ref, {
                        parentUserIds: arrayRemove(userId),
                        requiresAdminAction: true, 
                        adminNote: "Föräldern raderade sitt konto. Profilen är nu föräldralös."
                    });
                } else {
                    // Om det finns fler föräldrar -> Bara ta bort denna användare
                    batch.update(docSnap.ref, {
                        parentUserIds: arrayRemove(userId)
                    });
                }
            });

            // 3. Ta bort användardatan i 'users'
            const userDocRef = doc(db, "users", userId);
            batch.delete(userDocRef);

            // Kör alla databasändringar
            await batch.commit();

            // 4. Ta bort inloggningen (Auth) - Detta loggar ut användaren automatiskt
            await deleteUser(user);

            showModal('confirmationModal', "Ditt konto har tagits bort.");
            
        } catch (error) {
            console.error("Fel vid borttagning av konto:", error);
            if (error.code === 'auth/requires-recent-login') {
                showModal('errorModal', "Av säkerhetsskäl måste du logga ut och logga in igen innan du kan ta bort kontot.");
            } else {
                showModal('errorModal', "Ett fel uppstod: " + error.message);
            }
        }
    });
}