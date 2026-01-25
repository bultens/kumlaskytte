console.log("🔐 AUTH.JS LADDAD");
import { db, auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    doc, getDoc, setDoc, serverTimestamp, collection, 
    query, where, getDocs, writeBatch, arrayRemove 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initializeDataListeners, setCurrentUserId } from "./data-service.js";
import { handleAdminUI, toggleProfileUI, renderProfileInfo, navigate, showModal, hideModal, showDeleteProfileModal , setClubStatus, setAdminStatus } from "./ui-handler.js";

// Ver. 3.18 - Återställt alla navigationslänkar och kontohantering
const profileWelcomeMessage = document.getElementById('profile-welcome-message');

onAuthStateChanged(auth, async (user) => {
    let isAdmin = false;
    
    if (user) {
        // Sätt användar-ID globalt för tjänster
        if (typeof setCurrentUserId === 'function') {
            setCurrentUserId(user.uid);
        }
        
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // --- VIKTIGT: Spara UID i objektet så att profil-rendering inte kraschar ---
                userData.id = user.uid; 
                isAdmin = userData.isAdmin === true;
                
                // Uppdatera global status för medlemskap
                if (typeof setClubStatus === 'function') {
                    setClubStatus(userData.isClubMember === true);
                }

                // Din välkomsthälsning på sidan
                if (profileWelcomeMessage) {
                    profileWelcomeMessage.textContent = `Välkommen, ${userData.name || userData.email || user.email}!`;
                }
                
                // Anropa din profil-rendering
                renderProfileInfo(userData);
            } else {
                if (typeof setClubStatus === 'function') setClubStatus(false);
            }
        } catch (error) {
            console.error("Fel vid hämtning av användarprofil:", error);
            if (typeof setClubStatus === 'function') setClubStatus(false);
        }

        // Din logik för Admin-menyer
        handleAdminUI(isAdmin);
        setAdminStatus(isAdmin);
        toggleProfileUI(true);

    } else {
        // Logik vid utloggning
        if (typeof setCurrentUserId === 'function') {
            setCurrentUserId(null);
        }
        
        if (typeof setClubStatus === 'function') setClubStatus(false);
        handleAdminUI(false);
        setAdminStatus(false); 
        toggleProfileUI(false);
        
        if (profileWelcomeMessage) {
            profileWelcomeMessage.textContent = '';
        }
    }
});

export async function signUp(email, password) {
    try {
        console.log("Försöker skapa konto i Auth...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Konto skapat i Auth! UID:", user.uid);

        console.log("Försöker skriva till Firestore...");
        // VIKTIGT: Fälten måste matcha dina Firestore Rules exakt!
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            isAdmin: false,
            isClubMember: false, // <--- Detta fält krävs av dina regler!
            mailingList: false,
            createdAt: serverTimestamp()
        });
        
        console.log("Dokument skrivet till Firestore!");
        return user;
    } catch (error) {
        console.error("Detta steg misslyckades:", error.code, error.message);
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

// --- RADERING AV KONTO (Återställd logik) ---

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
            navigate('#hem');
        } catch (error) {
            console.error("Fel vid borttagning av konto:", error);
            showModal('errorModal', "Kunde inte ta bort kontot.");
        }
    });
}

// --- FORM OCH MODAL HANTERING ---

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
                alert("Konto skapat!");
            } catch (err) {
                alert("Registrering misslyckades: " + err.message);
            }
        });
    }

    // Inloggnings-växlare (onclick som du hade tidigare fungerar också här)
    const showRegisterLink = document.getElementById('show-register-link');
    if (showRegisterLink) {
        showRegisterLink.onclick = (e) => {
            e.preventDefault();
            if (loginPanel) loginPanel.classList.add('hidden');
            if (registerPanel) registerPanel.classList.remove('hidden');
        };
    }

    const showLoginLinkFromReg = document.getElementById('show-login-link-from-reg');
    if (showLoginLinkFromReg) {
        showLoginLinkFromReg.onclick = (e) => {
            e.preventDefault();
            if (registerPanel) registerPanel.classList.add('hidden');
            if (loginPanel) loginPanel.classList.remove('hidden');
        };
    }
});
export async function deleteUserAccount() {
    const user = auth.currentUser;
    if (!user) return;

    const confirmFirst = confirm("Är du säker? Din personliga profil raderas direkt.\n\nOBS: Skjutresultat och skyttar sparas för föreningens historik. Vill du ta bort även dessa måste du kontakta admin@bultens.net.");
    
    if (confirmFirst) {
        try {
            const uid = user.uid;
            
            // 1. Radera profildokumentet i Firestore
            // (Detta tar bort namn, e-post, adress etc.)
            await deleteDoc(doc(db, 'users', uid));
            console.log("Firestore-profil raderad.");

            // 2. Radera själva inloggningskontot i Firebase Auth
            await deleteUser(user);
            console.log("Auth-konto raderat.");
            
            alert("Ditt konto har raderats helt enligt GDPR-förfrågan.");
            window.location.hash = "#hem";
            location.reload(); // Ladda om för att rensa alla lokala tillstånd
        } catch (error) {
            console.error("Fel vid radering:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Säkerhetsåtgärd: Du måste logga ut och logga in igen precis innan du raderar ditt konto.");
            } else {
                alert("Ett fel uppstod: " + error.message);
            }
        }
    }
}