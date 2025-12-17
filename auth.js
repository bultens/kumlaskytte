import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc, arrayRemove, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showModal, hideModal, showDeleteProfileModal } from "./ui-handler.js";

// Ver. 2.15
let currentUserId = null;

const profilePanel = document.getElementById('profile-panel');
const profileWelcomeMessage = document.getElementById('profile-welcome-message');
const userNavLink = document.getElementById('user-nav-link');
const profileNavLink = document.getElementById('profile-nav-link');
const resultsNavLink = document.getElementById('results-nav-link');
const competitionNavLink = document.getElementById('competition-nav-link'); // NY
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');
const registerPanel = document.getElementById('register-panel');
const userLoginPanel = document.getElementById('user-login-panel');
const registerForm = document.getElementById('register-form');
const userLoginForm = document.getElementById('user-login-form');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const navMyPages = document.getElementById('nav-my-pages'); // Desktop dropdown
const navAdminLink = document.getElementById('nav-admin-link'); // Länken i dropdownen
const mobileMyPages = document.getElementById('mobile-my-pages'); // Mobil-sektionen
const mobileLoginContainer = document.getElementById('mobile-login-btn-container'); // Mobil login-knapp
const mobileAdminLink = document.getElementById('mobile-admin-link'); // Mobil admin-länk


function toggleProfileUI(user) {
    if (user) {
        // --- INLOGGAD ---
        
        // UI Paneler
        profilePanel.classList.remove('hidden');
        userLoginPanel.classList.add('hidden');
        registerPanel.classList.add('hidden');
        
        // Desktop Meny
        if (navMyPages) navMyPages.classList.remove('hidden'); // Visa "Mina Sidor"
        if (userNavLink) userNavLink.classList.add('hidden');  // Dölj "Logga in"
        
        // Mobil Meny
        if (mobileMyPages) mobileMyPages.classList.remove('hidden');
        if (mobileLoginContainer) mobileLoginContainer.classList.add('hidden');

        // Admin Check (Visar admin-länken i dropdown om man är admin)
        // Vi gör en snabbkoll mot usersData om den finns laddad, 
        // annars hanteras detta av ui-handler.js senare.
        // Men för säkerhets skull gömmer vi dem default och låter ui-handler tända dem.
        
    } else {
        // --- UTLOGGAD ---
        
        // UI Paneler
        profilePanel.classList.add('hidden');
        
        // Desktop Meny
        if (navMyPages) navMyPages.classList.add('hidden'); // Dölj "Mina Sidor"
        if (userNavLink) userNavLink.classList.remove('hidden'); // Visa "Logga in"
        
        // Mobil Meny
        if (mobileMyPages) mobileMyPages.classList.add('hidden');
        if (mobileLoginContainer) mobileLoginContainer.classList.remove('hidden');
    }
}

onAuthStateChanged(auth, async (user) => {
    currentUserId = user ? user.uid : null;
    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const name = userData.name || userData.email;
                if (profileWelcomeMessage) {
                    profileWelcomeMessage.textContent = `Välkommen, ${name}`;
                }
            }
        } catch (error) {
            console.error("Fel vid hämtning av användardata:", error);
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
                console.error(error);
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
            // Vid lyckad inloggning kommer onAuthStateChanged att triggas och hantera UI
            window.location.hash = '#profil'; // Skicka användaren till profilsidan
            // Vi visar inte modal här för att det kan störa flödet, men det går om man vill.
        } catch (error) {
            let userMessage = 'Ett fel uppstod vid inloggning. Vänligen försök igen.';
            if (error.code === 'auth/invalid-credential') {
                userMessage = 'E-post eller lösenord är felaktigt.';
            } else if (error.code === 'auth/too-many-requests') {
                 userMessage = 'För många misslyckade försök. Försök igen senare.';
            }
            console.error(error);
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
            showModal('confirmationModal', 'Du har loggats ut.');
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
        if (!user) return;
        const userId = user.uid;

        try {
            const shootersRef = collection(db, "shooters");
            const q = query(shootersRef, where("parentUserIds", "array-contains", userId));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(db);

            querySnapshot.forEach((docSnap) => {
                const shooterData = docSnap.data();
                const parents = shooterData.parentUserIds || [];
                
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

            const userDocRef = doc(db, "users", userId);
            batch.delete(userDocRef);

            await batch.commit();
            await deleteUser(user);

            showModal('confirmationModal', "Ditt konto har tagits bort.");
            window.location.hash = '#hem';
            
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