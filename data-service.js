// data-service.js
import { db, auth } from "./firebase-config.js";
import { onSnapshot, collection, doc, updateDoc, query, where, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, renderUserReport, renderContactInfo, updateHeaderColor, toggleSponsorsNavLink, renderProfileInfo, showModal, isAdminLoggedIn, renderSiteSettings, renderCompetitions } from "./ui-handler.js";
import { currentUserId } from "./main.js";
import { getStorage, ref, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ver. 1.11
export let newsData = [];
export let eventsData = [];
export let competitionsData = [];
export let historyData = [];
export let imageData = [];
export let usersData = []; 
export let sponsorsData = [];

export function initializeDataListeners() {
    onSnapshot(collection(db, 'news'), (snapshot) => { newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderNews(newsData, isAdminLoggedIn, currentUserId); });
    
    // Tävlingar
    onSnapshot(collection(db, 'competitions'), (snapshot) => { 
        competitionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderCompetitions(competitionsData, isAdminLoggedIn); 
    });

    onSnapshot(collection(db, 'events'), (snapshot) => { eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderEvents(eventsData, isAdminLoggedIn); });
    onSnapshot(collection(db, 'users'), (snapshot) => { usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderAdminsAndUsers(usersData, isAdminLoggedIn, currentUserId); renderUserReport(usersData); });
    onSnapshot(collection(db, 'history'), (snapshot) => { historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderHistory(historyData, isAdminLoggedIn, currentUserId); });
    onSnapshot(collection(db, 'images'), (snapshot) => { imageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderImages(imageData, isAdminLoggedIn); });
    onSnapshot(collection(db, 'sponsors'), (snapshot) => { sponsorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderSponsors(sponsorsData, isAdminLoggedIn); });
    onSnapshot(doc(db, 'settings', 'siteSettings'), (docSnap) => {
        const pageTitleElement = document.getElementById('page-title');
        const faviconLink = document.getElementById('favicon-link');
        const siteLogoElement = document.getElementById('site-logo');
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (siteLogoElement) siteLogoElement.src = data.logoUrl || "logo.png";
            if (faviconLink) faviconLink.href = data.logoUrl || "logo.png";
            renderContactInfo();
            updateHeaderColor(data.headerColor);
            toggleSponsorsNavLink(data.showSponsors);
            renderSiteSettings();
        }
    });
}

export async function addOrUpdateDocument(collectionName, docId, data, successMessage, errorMessage) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }

    try {
        if (docId) {
            await updateDoc(doc(db, collectionName, docId), data);
            showModal('confirmationModal', successMessage);
        } else {
            await addDoc(collection(db, collectionName), data);
            showModal('confirmationModal', successMessage);
        }
    } catch (error) {
        console.error(`Fel vid hantering av ${collectionName}:`, error);
        showModal('errorModal', errorMessage);
    }
}

export async function deleteDocument(docId, collectionName, seriesId) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    
    try {
        if (collectionName === 'events' && seriesId) {
            const q = query(collection(db, collectionName), where("seriesId", "==", seriesId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            showModal('confirmationModal', "Hela evenemangs-serien har tagits bort.");
        } else {
            if (collectionName === 'images' || collectionName === 'sponsors') {
                const docSnap = await getFirestoreDoc(doc(db, collectionName, docId));
                if (docSnap.exists() && docSnap.data().storagePath) {
                    const storage = getStorage();
                    const fileRef = ref(storage, docSnap.data().storagePath);
                    try {
                        await deleteObject(fileRef);
                    } catch (error) {
                        console.warn("Kunde inte ta bort filen från Storage:", error);
                    }
                }
            }
            await deleteDoc(doc(db, collectionName, docId));
            showModal('confirmationModal', `Posten har tagits bort från ${collectionName}.`);
        }
    } catch (error) {
        console.error("Fel vid borttagning av post:", error);
        showModal('errorModal', "Ett fel uppstod när posten skulle tas bort. Kontrollera dina Firebase Security Rules.");
    }
}

export async function toggleLike(docId, docType, userId) {
    try {
        const docRef = doc(db, docType, docId);
        const docSnap = await getFirestoreDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const likes = data.likes || {};
            let updatedLikes;
            if (likes[userId]) {
                // Ta bort like
                updatedLikes = { ...likes };
                delete updatedLikes[userId];
                await updateDoc(docRef, { likes: updatedLikes });
            } else {
                // Lägg till like
                updatedLikes = { ...likes, [userId]: true };
                await updateDoc(docRef, { likes: updatedLikes });
            }
        }
    } catch (error) {
        console.error("Fel vid hantering av like:", error);
        showModal('errorModal', "Kunde inte spara din gillamarkering.");
    }
}

export async function updateProfile(uid, data) {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    try {
        await updateDoc(doc(db, 'users', uid), data);
        showModal('confirmationModal', "Din profil har sparats!");
    } catch (error) {
        console.error("Fel vid sparande av profil:", error);
        showModal('errorModal', "Ett fel uppstod när din profil skulle sparas.");
    }
}

export async function updateProfileByAdmin(uid, data) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    try {
        await updateDoc(doc(db, 'users', uid), data);
        showModal('confirmationModal', "Användarens profil har sparats!");
    } catch (error) {
        console.error("Fel vid sparande av användarprofil:", error);
        showModal('errorModal', "Ett fel uppstod när användarens profil skulle sparas.");
    }
}

export async function updateSiteSettings(data) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    try {
        await setDoc(doc(db, 'settings', 'siteSettings'), data);
        showModal('confirmationModal', "Inställningarna har sparats!");
    } catch (error) {
        console.error("Fel vid sparande av inställningar:", error);
        showModal('errorModal', "Ett fel uppstod när inställningarna skulle sparas.");
    }
}

export async function addAdminFromUser(userId) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    try {
        await updateDoc(doc(db, 'users', userId), {
            isAdmin: true
        });
        showModal('confirmationModal', "Användaren har nu administratörsrättigheter!");
    } catch (error) {
        console.error("Fel vid tillägg av admin:", error);
        showModal('errorModal', "Ett fel uppstod när användaren skulle läggas till som admin.");
    }
}

export async function deleteAdmin(adminId) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    if (usersData.filter(u => u.isAdmin).length <= 1) {
        showModal('errorModal', "Kan inte ta bort den sista administratören.");
        return;
    }
    if (adminId === auth.currentUser.uid) {
        showModal('errorModal', "Du kan inte ta bort dig själv.");
        return;
    }
    try {
        await updateDoc(doc(db, 'users', adminId), {
            isAdmin: false
        });
        showModal('confirmationModal', "Admin har tagits bort.");
    } catch (error) {
        console.error("Fel vid borttagning av admin:", error);
        showModal('errorModal', "Ett fel uppstod när admin skulle tas bort.");
    }
}