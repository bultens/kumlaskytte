// data-service.js
import { db, auth, storage } from "./firebase-config.js"; 
import { onSnapshot, collection, doc, updateDoc, query, where, orderBy, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// FIX: Tog bort 'renderPublicShooterStats' från importen nedan
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, renderUserReport, renderContactInfo, updateHeaderColor, toggleSponsorsNavLink, renderProfileInfo, showModal, isAdminLoggedIn, renderSiteSettings, renderCompetitions, renderHomeAchievements, renderClassesAdmin, renderShooterSelector, renderPublicShooterSelector, renderTopLists, renderShootersAdmin, renderSelectableClasses, renderDocumentArchive } from "./ui-handler.js";
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ver. 1.91 (Fixad importkrasch)
export let newsData = [];
export let eventsData = [];
export let competitionsData = [];
export let historyData = [];
export let usersData = []; 
export let sponsorsData = [];
export let allShootersData = [];
export let latestResultsCache = [];
export let competitionClasses = [];
export let documentsData = [];
export let imagesData = []; 

export function initializeDataListeners() {
    const user = auth.currentUser;
    const uid = user ? user.uid : null;

    // --- 1. PUBLIK DATA (Laddas alltid) ---

    // Nyheter
    onSnapshot(query(collection(db, "news"), orderBy("date", "desc")), (snapshot) => {
        newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNews(newsData, isAdminLoggedIn, uid);
    });

    // Kalender
    onSnapshot(query(collection(db, "events"), orderBy("date", "asc")), (snapshot) => {
        eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents(eventsData, isAdminLoggedIn);
    });

    // Historia
    onSnapshot(collection(db, "history"), (snapshot) => {
        historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistory(historyData, isAdminLoggedIn, uid);
    });

    // Bilder
    onSnapshot(query(collection(db, "images"), orderBy("priority", "desc")), (snapshot) => {
        imagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderImages(imagesData, isAdminLoggedIn);
    });

    // Sponsorer
    onSnapshot(collection(db, "sponsors"), (snapshot) => {
        sponsorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSponsors(sponsorsData, isAdminLoggedIn);
    });

    // Tävlingar (Online)
    onSnapshot(query(collection(db, "online_competitions"), orderBy("startDate", "desc")), (snapshot) => {
        competitionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof renderCompetitions === 'function') renderCompetitions(competitionsData, isAdminLoggedIn);
    });
    
    // Tävlingsklasser (Visas i inställningar)
    onSnapshot(collection(db, "online_competition_classes"), (snapshot) => {
        competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof renderClassesAdmin === 'function') renderClassesAdmin(competitionClasses);
        if (typeof renderSelectableClasses === 'function') renderSelectableClasses(competitionClasses);
        // Uppdatera även topplistor om resultat finns
        if (latestResultsCache.length > 0 && typeof renderTopLists === 'function') {
            renderTopLists(competitionClasses, latestResultsCache, allShootersData, usersData);
        }
    });

    // Inställningar (Färg, Adress etc.)
    onSnapshot(collection(db, "settings"), (snapshot) => {
        const settings = {};
        snapshot.forEach(doc => { settings[doc.id] = doc.data(); });
        
        if (settings.design) {
            updateHeaderColor(settings.design.headerColor);
            toggleSponsorsNavLink(settings.design.showSponsors);
        }
        // VIKTIGT: Rendera alltid inställningarna så formuläret fylls i
        if (typeof renderSiteSettings === 'function') renderSiteSettings(settings);
        renderContactInfo(); 
    });
    
    // Senaste Resultat (Publikt men kräver att vi sorterar på 'date' eller 'registeredAt')
    // Vi sorterar på datum för själva skyttet (date) för att det är mest logiskt för besökaren
    const resultsQuery = query(collection(db, "results"), orderBy("date", "desc"));
    onSnapshot(resultsQuery, (snapshot) => {
        latestResultsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Uppdatera startsidan
        if (typeof renderHomeAchievements === 'function') {
            renderHomeAchievements(latestResultsCache, allShootersData, usersData);
        }
    }, (error) => console.log("Kunde inte ladda publika resultat:", error.message));


    // --- 2. SKYDDAD DATA (Bara om inloggad) ---
    if (user) {
        // Användare
        onSnapshot(collection(db, "users"), (snapshot) => {
            usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAdminsAndUsers(usersData, isAdminLoggedIn, uid);
        });

        // Skyttar
        onSnapshot(collection(db, "shooters"), (snapshot) => {
            allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (typeof renderShooterSelector === 'function') renderShooterSelector(allShootersData);
            if (typeof renderPublicShooterSelector === 'function') renderPublicShooterSelector(allShootersData);
            if (typeof renderShootersAdmin === 'function') renderShootersAdmin(allShootersData);
            
            // Uppdatera resultatvyer som behöver skyttnamn
            if (latestResultsCache.length > 0 && typeof renderHomeAchievements === 'function') {
                renderHomeAchievements(latestResultsCache, allShootersData, usersData);
            }
        });

        // Dokumentarkiv
        if (isAdminLoggedIn) {
             onSnapshot(query(collection(db, "documents"), orderBy("uploadedAt", "desc")), (snapshot) => {
                documentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (typeof renderDocumentArchive === 'function') renderDocumentArchive(documentsData);
            });
        }
    }
}

// --- CRUD & HJÄLPFUNKTIONER ---
export async function addOrUpdateDocument(collectionName, docId, data, successMessage, errorMessage) {
    try {
        if (docId) {
            await updateDoc(doc(db, collectionName, docId), data);
        } else {
            await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
        }
        showModal('confirmationModal', successMessage);
    } catch (error) { showModal('errorModal', errorMessage + " " + error.message); }
}
export async function deleteDocument(collectionName, docId, successMessage, errorMessage) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        showModal('confirmationModal', successMessage);
    } catch (error) { showModal('errorModal', errorMessage + " " + error.message); }
}
export async function toggleLike(newsId, currentLikes, likedBy) {
    const userId = auth.currentUser?.uid;
    if (!userId) { showModal('errorModal', "Du måste vara inloggad för att gilla."); return; }
    const newsRef = doc(db, "news", newsId);
    if (likedBy && likedBy.includes(userId)) await updateDoc(newsRef, { likes: currentLikes - 1, likedBy: arrayRemove(userId) });
    else await updateDoc(newsRef, { likes: currentLikes + 1, likedBy: arrayUnion(userId) });
}
export async function updateProfile(userId, email, username) {
    try {
        await updateDoc(doc(db, "users", userId), { email, username });
        showModal('confirmationModal', "Profil uppdaterad!");
        renderProfileInfo({ email, username, role: isAdminLoggedIn ? 'Admin' : 'Medlem' }); 
    } catch (error) { showModal('errorModal', "Kunde inte uppdatera profil."); }
}
export async function updateProfileByAdmin(userId, data) {
    try { await updateDoc(doc(db, "users", userId), data); showModal('confirmationModal', "Användare uppdaterad!"); } 
    catch (error) { showModal('errorModal', "Kunde inte uppdatera användare."); }
}
export async function toggleMemberStatus(userId, currentStatus) {
    try { await updateDoc(doc(db, "users", userId), { isMember: !currentStatus }); } 
    catch (error) { showModal('errorModal', "Kunde inte ändra medlemsstatus."); }
}
export async function addAdminFromUser(userId) {
    try { await updateDoc(doc(db, "users", userId), { isAdmin: true }); showModal('confirmationModal', "Användaren är nu Admin."); } 
    catch (error) { showModal('errorModal', "Kunde inte göra användaren till admin."); }
}
export async function deleteAdmin(userId) {
    try { await updateDoc(doc(db, "users", userId), { isAdmin: false }); showModal('confirmationModal', "Admin-rättigheter borttagna."); } 
    catch (error) { showModal('errorModal', "Kunde inte ta bort admin-rättigheter."); }
}
export async function updateSiteSettings(settings) {
    try { await setDoc(doc(db, "settings", "design"), settings); showModal('confirmationModal', "Inställningar sparade!"); } 
    catch (error) { showModal('errorModal', "Kunde inte spara inställningar."); }
}
export async function createShooterProfile(name, birthYear, club) {
    if (!auth.currentUser) return;
    try {
        const docRef = await addDoc(collection(db, 'shooters'), {
            name, birthYear: parseInt(birthYear), club: club || 'Kumla Skytteförening',
            createdBy: auth.currentUser.uid, parentUserIds: [auth.currentUser.uid], createdAt: serverTimestamp()
        });
        showModal('confirmationModal', "Ny skyttprofil skapad!"); return docRef.id;
    } catch (error) { showModal('errorModal', "Kunde inte skapa skyttprofil."); }
}
export async function updateShooterProfile(shooterId, data) {
    try { await updateDoc(doc(db, 'shooters', shooterId), data); showModal('confirmationModal', "Skyttprofil uppdaterad!"); return true; } 
    catch (e) { showModal('errorModal', "Misslyckades att uppdatera profil."); return false; }
}
export async function linkUserToShooter(userId, shooterId) {
    try { await updateDoc(doc(db, 'shooters', shooterId), { parentUserIds: arrayUnion(userId) }); showModal('confirmationModal', "Konto kopplat till skytt!"); } 
    catch (error) { showModal('errorModal', "Kunde inte koppla konto."); }
}
export function getMyShooters() {
    if (!auth.currentUser) return [];
    return allShootersData.filter(s => s.parentUserIds && s.parentUserIds.includes(auth.currentUser.uid));
}
export async function saveResult(resultData) {
    try { await addDoc(collection(db, "results"), { ...resultData, registeredBy: auth.currentUser.uid, registeredAt: serverTimestamp() }); return true; } 
    catch (error) { console.error("Save result error:", error); throw error; }
}
export async function updateUserResult(resultId, data) {
    try { await updateDoc(doc(db, 'results', resultId), data); showModal('confirmationModal', "Resultatet uppdaterades!"); return true; } 
    catch (e) { showModal('errorModal', "Kunde inte uppdatera resultatet."); return false; }
}
export async function uploadDocumentFile(file, name, category) {
    try {
        const storagePath = `documents/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const progressBar = document.getElementById('doc-upload-progress-bar');
                    const progressContainer = document.getElementById('doc-upload-progress');
                    if (progressContainer) progressContainer.classList.remove('hidden');
                    if (progressBar) progressBar.style.width = progress + '%';
                }, 
                (error) => { console.error("Upload error:", error); reject(error); }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await addDoc(collection(db, 'documents'), {
                        name, category, url: downloadURL,
                        storagePath: uploadTask.snapshot.ref.fullPath, fileType: file.type,
                        uploadedAt: serverTimestamp(), uploadedBy: auth.currentUser.uid
                    });
                    resolve(true);
                }
            );
        });
    } catch (error) { console.error("Fel vid dokumentuppladdning:", error); throw error; }
}
export async function deleteDocumentFile(docId, storagePath) {
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        await deleteDoc(doc(db, 'documents', docId));
        return true;
    } catch (error) { console.error("Fel vid borttagning av dokument:", error); return false; }
}
export async function getDocuments() { return documentsData; }