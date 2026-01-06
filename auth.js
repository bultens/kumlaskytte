// auth.js
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, query, where, getDocs, arrayRemove, writeBatch, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showModal, hideModal, showDeleteProfileModal } from "./ui-handler.js";

// Ver. 2.18 (Automatisk korrigering av admin-datatyp och utökad loggning)
let currentUserId = null;

const profilePanel = document.getElementById('profile-panel');
const profileWelcomeMessage = document.getElementById('profile-welcome-message');
const profileNavLink = document.getElementById('profile-nav-link');
const resultsNavLink = document.getElementById('results-nav-link');
const showLoginLink = document.getElementById('show-login-link');
const registerPanel = document.getElementById('register-panel');
const userLoginPanel = document.getElementById('user-login-panel');
const registerForm = document.getElementById('register-form');
const userLoginForm = document.getElementById('user-login-form');

function toggleProfileUI(user) {
    const mobileResultsLink = document.getElementById('mobile-results-nav-link');
    if (user) {
        if (profilePanel) profilePanel.classList.remove('hidden');
        if (userLoginPanel) userLoginPanel.classList.add('hidden');
        if (registerPanel) registerPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.remove('hidden');
        if (resultsNavLink) resultsNavLink.classList.remove('hidden');
        if (showLoginLink) showLoginLink.classList.add('hidden'); 
        if (mobileResultsLink) mobileResultsLink.classList.remove('hidden');
    } else {
        if (profilePanel) profilePanel.classList.add('hidden');
        if (userLoginPanel) userLoginPanel.classList.add('hidden'); 
        if (registerPanel) registerPanel.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.add('hidden');
        if (resultsNavLink) resultsNavLink.classList.add('hidden');
        if (showLoginLink) showLoginLink.classList.remove('hidden'); 
        if (mobileResultsLink) mobileResultsLink.classList.add('hidden');
    }
}

onAuthStateChanged(auth, async (user) => {
    currentUserId = user ? user.uid : null;
    
    if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const isAdminValue = userData.isAdmin;
                const isAdminType = typeof isAdminValue;
                
                console.log(`--- Autentiseringskontroll ---`);
                console.log(`Email: ${userData.email}`);
                console.log(`UID: ${user.uid}`);
                console.log(`isAdmin värde:`, isAdminValue);
                console.log(`isAdmin datatyp: ${isAdminType}`);

                // AUTOMATISK KORRIGERING: 
                // Om isAdmin är strängen "true", ändra till boolean true i databasen.
                // Detta krävs för att Firebase Security Rules ska godkänna isAdmin() kontrollen.
                if (isAdminValue === "true" || (isAdminType === "string" && isAdminValue.toLowerCase() === "true")) {
                    console.warn("KORRIGERAR: isAdmin är en sträng. Konverterar till boolean för att matcha Security Rules...");
                    await updateDoc(docRef, { isAdmin: true });
                    console.log("KORRIGERING KLART: Ladda om sidan för att aktivera reglerna.");
                }

                const name = userData.name || userData.email;
                if (profileWelcomeMessage) {
                    profileWelcomeMessage.textContent = `Välkommen, ${name}`;
                }
            } else {
                console.error("KRITISKT FEL: Inget dokument hittades i /users/ med ID: " + user.uid);
                console.log("Kontrollera att dokumentets namn i Firestore matchar UID ovan exakt.");
            }
        } catch (err) {
            console.error("Fel vid hämtning av användardata:", err);
        }
    }
    toggleProfileUI(user);
});

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailVal = document.getElementById('reg-email').value.trim();
        const passVal = document.getElementById('reg-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailVal, passVal);
            const user = userCredential.user;
            
            const userDocRef = doc(db, 'users', user.uid);
            
            // Säkerställ att vi skickar med booleans (false) och inte strängar
            await setDoc(userDocRef, {
                uid: user.uid,
                email: emailVal,
                isAdmin: false,
                isClubMember: false, 
                createdAt: serverTimestamp(),
                name: '',
                phone: '',
                address: '',
                birthyear: '',
                mailingList: false,
                settings: {}
            });
            
            showModal('confirmationModal', 'Konto skapat! Du är nu inloggad.');
            if (registerPanel) registerPanel.classList.add('hidden');
        } catch (error) {
            console.error("Registreringsfel:", error);
            showModal('errorModal', 'Ett fel uppstod: ' + error.message);
        }
    });
}

if (userLoginForm) {
    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = document.getElementById('user-email').value.trim();
        const passVal = document.getElementById('user-password').value;

        try {
            await signInWithEmailAndPassword(auth, emailVal, passVal);
            showModal('confirmationModal', 'Inloggning lyckades!');
            if (userLoginPanel) userLoginPanel.classList.add('hidden');
        } catch (error) {
            showModal('errorModal', 'E-post eller lösenord är felaktigt.');
        }
    });
}

const logoutProfileBtn = document.getElementById('logout-btn'); 
if (logoutProfileBtn) {
    logoutProfileBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.hash = '#hem';
        } catch (error) {
            showModal('errorModal', "Ett fel uppstod vid utloggning.");
        }
    });
}

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

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (userLoginPanel) {
            userLoginPanel.classList.remove('hidden');
            registerPanel.classList.add('hidden');
        }
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
            const shootersRef = collection(db, 'shooters');
            const q = query(shootersRef, where("parentUserIds", "array-contains", userId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);

            querySnapshot.forEach((docSnap) => {
                batch.update(docSnap.ref, { parentUserIds: arrayRemove(userId) });
            });

            batch.delete(doc(db, 'users', userId));
            await batch.commit();
            await deleteUser(user);
            showModal('confirmationModal', "Ditt konto har tagits bort.");
        } catch (error) {
            showModal('errorModal', "Ett fel uppstod: " + error.message);
        }
    });
}