// data-service.js
import { db, auth, storage } from "./firebase-config.js"; 
import { onSnapshot, collection, doc, updateDoc, query, where, orderBy, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, updateHeaderColor, toggleSponsorsNavLink, renderProfileInfo, showModal, isAdminLoggedIn, renderSiteSettings, renderClassesAdmin, renderShooterSelector, renderShootersAdmin, renderDocumentArchive, renderHomeAchievements } from "./ui-handler.js";
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ver. CLEAN 1.0
export let newsData = [];
export let eventsData = [];
export let historyData = [];
export let usersData = []; 
export let sponsorsData = [];
export let allShootersData = [];
export let latestResultsCache = [];
export let standardClasses = []; // De vanliga klasserna
export let documentsData = [];
export let imagesData = []; 

export function initializeDataListeners() {
    const user = auth.currentUser;
    const uid = user ? user.uid : null;

    // --- PUBLIK DATA ---
    onSnapshot(query(collection(db, "news"), orderBy("date", "desc")), (snap) => {
        newsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNews(newsData, isAdminLoggedIn, uid);
    });

    onSnapshot(query(collection(db, "events"), orderBy("date", "asc")), (snap) => {
        eventsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents(eventsData, isAdminLoggedIn);
    });

    onSnapshot(collection(db, "history"), (snap) => {
        historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistory(historyData, isAdminLoggedIn, uid);
    });

    onSnapshot(query(collection(db, "images"), orderBy("priority", "desc")), (snap) => {
        imagesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderImages(imagesData, isAdminLoggedIn);
    });

    onSnapshot(collection(db, "sponsors"), (snap) => {
        sponsorsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSponsors(sponsorsData, isAdminLoggedIn);
    });
    
    // Hämta SKYTTEKLASSER (Vanliga systemet)
    onSnapshot(query(collection(db, "competitionClasses"), orderBy("minAge")), (snap) => {
        standardClasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof renderClassesAdmin === 'function') renderClassesAdmin(standardClasses);
    });

    // Inställningar
    onSnapshot(collection(db, "settings"), (snap) => {
        const settings = {};
        snap.forEach(doc => { settings[doc.id] = doc.data(); });
        if (settings.design) {
            updateHeaderColor(settings.design.headerColor);
            toggleSponsorsNavLink(settings.design.showSponsors);
        }
        if (typeof renderSiteSettings === 'function') renderSiteSettings(settings);
    });
    
    // Resultat (Publika, kopplade till vanliga klasser)
    const resultsQuery = query(collection(db, "results"), orderBy("date", "desc"));
    onSnapshot(resultsQuery, (snap) => {
        latestResultsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof renderHomeAchievements === 'function') {
            renderHomeAchievements(latestResultsCache, allShootersData, usersData);
        }
    });

    // --- SKYDDAD DATA ---
    if (user) {
        onSnapshot(collection(db, "users"), (snap) => {
            usersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAdminsAndUsers(usersData, isAdminLoggedIn, uid);
        });

        onSnapshot(collection(db, "shooters"), (snap) => {
            allShootersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (typeof renderShooterSelector === 'function') renderShooterSelector(allShootersData);
            if (typeof renderShootersAdmin === 'function') renderShootersAdmin(allShootersData);
            
            // Uppdatera resultatvyer (behöver skyttnamn)
            if (latestResultsCache.length > 0 && typeof renderHomeAchievements === 'function') {
                renderHomeAchievements(latestResultsCache, allShootersData, usersData);
            }
        });

        if (isAdminLoggedIn) {
             onSnapshot(query(collection(db, "documents"), orderBy("uploadedAt", "desc")), (snap) => {
                documentsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (typeof renderDocumentArchive === 'function') renderDocumentArchive(documentsData);
            });
        }
    }
}

// --- KLASS-HANTERING (Endast för 'competitionClasses') ---

export async function createClass(classData) {
    if (!isAdminLoggedIn) return;
    try {
        await addDoc(collection(db, 'competitionClasses'), classData);
        showModal('confirmationModal', "Ny klass skapad!");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte skapa klass.");
        return false;
    }
}

export async function updateClass(classId, classData) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'competitionClasses', classId), classData);
        showModal('confirmationModal', "Klassen uppdaterad!");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte uppdatera klassen.");
        return false;
    }
}

export async function deleteClass(classId) {
    if (!isAdminLoggedIn) return;
    try {
        await deleteDoc(doc(db, 'competitionClasses', classId));
        showModal('confirmationModal', "Klassen borttagen.");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte ta bort klassen.");
        return false;
    }
}

// --- ÖVRIGA CRUD ---
export async function addOrUpdateDocument(collectionName, docId, data, successMessage, errorMessage) {
    try {
        if (docId) await updateDoc(doc(db, collectionName, docId), data);
        else await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
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
    if (!userId) { showModal('errorModal', "Du måste vara inloggad."); return; }
    const newsRef = doc(db, "news", newsId);
    if (likedBy && likedBy.includes(userId)) await updateDoc(newsRef, { likes: currentLikes - 1, likedBy: arrayRemove(userId) });
    else await updateDoc(newsRef, { likes: currentLikes + 1, likedBy: arrayUnion(userId) });
}

export async function updateProfile(userId, email, username) {
    try {
        await updateDoc(doc(db, "users", userId), { email, username });
        showModal('confirmationModal', "Profil uppdaterad!");
        renderProfileInfo({ email, username, role: isAdminLoggedIn ? 'Admin' : 'Medlem' }); 
    } catch (error) { showModal('errorModal', "Fel vid profiluppdatering."); }
}

export async function updateProfileByAdmin(userId, data) {
    try { await updateDoc(doc(db, "users", userId), data); showModal('confirmationModal', "Användare uppdaterad!"); } 
    catch (error) { showModal('errorModal', "Fel vid uppdatering."); }
}

export async function toggleMemberStatus(userId, currentStatus) {
    try { await updateDoc(doc(db, "users", userId), { isMember: !currentStatus }); } 
    catch (error) { showModal('errorModal', "Fel vid statusändring."); }
}

export async function addAdminFromUser(userId) {
    try { await updateDoc(doc(db, "users", userId), { isAdmin: true }); showModal('confirmationModal', "Användare är nu Admin."); } 
    catch (error) { showModal('errorModal', "Kunde inte ändra roll."); }
}

export async function deleteAdmin(userId) {
    try { await updateDoc(doc(db, "users", userId), { isAdmin: false }); showModal('confirmationModal', "Admin borttagen."); } 
    catch (error) { showModal('errorModal', "Kunde inte ändra roll."); }
}

export async function updateSiteSettings(settings) {
    try { await setDoc(doc(db, "settings", "design"), settings); showModal('confirmationModal', "Inställningar sparade!"); } 
    catch (error) { showModal('errorModal', "Kunde inte spara."); }
}

export async function createShooterProfile(name, birthYear, club) {
    if (!auth.currentUser) return;
    try {
        const docRef = await addDoc(collection(db, 'shooters'), {
            name, birthYear: parseInt(birthYear), club: club || 'Kumla Skytteförening',
            createdBy: auth.currentUser.uid, parentUserIds: [auth.currentUser.uid], createdAt: serverTimestamp()
        });
        showModal('confirmationModal', "Skyttprofil skapad!"); return docRef.id;
    } catch (error) { showModal('errorModal', "Fel vid skapande."); }
}

export async function updateShooterProfile(shooterId, data) {
    try { await updateDoc(doc(db, 'shooters', shooterId), data); showModal('confirmationModal', "Uppdaterad!"); return true; } 
    catch (e) { showModal('errorModal', "Fel vid uppdatering."); return false; }
}

export async function linkUserToShooter(userId, shooterId) {
    try { await updateDoc(doc(db, 'shooters', shooterId), { parentUserIds: arrayUnion(userId) }); showModal('confirmationModal', "Kopplad!"); } 
    catch (error) { showModal('errorModal', "Fel vid koppling."); }
}

export function getMyShooters() {
    if (!auth.currentUser) return [];
    return allShootersData.filter(s => s.parentUserIds && s.parentUserIds.includes(auth.currentUser.uid));
}

export async function saveResult(resultData) {
    try { await addDoc(collection(db, "results"), { ...resultData, registeredBy: auth.currentUser.uid, registeredAt: serverTimestamp() }); return true; } 
    catch (error) { console.error("Save error:", error); throw error; }
}

export async function updateUserResult(resultId, data) {
    try { await updateDoc(doc(db, 'results', resultId), data); showModal('confirmationModal', "Uppdaterat!"); return true; } 
    catch (e) { showModal('errorModal', "Fel vid uppdatering."); return false; }
}

export async function uploadDocumentFile(file, name, category) {
    try {
        const storagePath = `documents/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snap) => {
                    const el = document.getElementById('doc-upload-progress');
                    if (el) el.classList.remove('hidden');
                    const bar = document.getElementById('doc-upload-progress-bar');
                    if (bar) bar.style.width = (snap.bytesTransferred / snap.totalBytes) * 100 + '%';
                }, 
                (err) => reject(err), 
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    await addDoc(collection(db, 'documents'), {
                        name, category, url, storagePath: uploadTask.snapshot.ref.fullPath,
                        fileType: file.type, uploadedAt: serverTimestamp(), uploadedBy: auth.currentUser.uid
                    });
                    resolve(true);
                }
            );
        });
    } catch (error) { console.error(error); throw error; }
}

export async function deleteDocumentFile(docId, storagePath) {
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        await deleteDoc(doc(db, 'documents', docId));
        return true;
    } catch (error) { return false; }
}

export async function getDocuments() { return documentsData; }