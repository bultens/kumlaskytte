// data-service.js - Ver. 1.11 (Besöksgraf-stöd)
import { db, auth } from "./firebase-config.js"; 
import { 
    increment, limit, orderBy, onSnapshot, collection, doc, updateDoc, query, where, getDocs, 
    writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, 
    getDoc as getFirestoreDoc, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    renderNews, renderEvents, renderHistory, renderImages, renderSponsors, 
    renderAdminsAndUsers, renderUserReport, renderContactInfo, updateHeaderColor, 
    toggleSponsorsNavLink, renderProfileInfo, showModal, isAdminLoggedIn, 
    renderSiteSettings, renderCompetitions, renderHomeAchievements, 
    renderClassesAdmin, renderTopLists, renderShootersAdmin,
    renderVisitorChart
} from "./ui-handler.js";

import { 
    getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// --- GLOBALA DATALAGER ---
export let newsData = [];
export let eventsData = [];
export let competitionsData = [];
export let historyData = [];
export let imageData = [];
export let usersData = []; 
export let sponsorsData = [];
export let allShootersData = [];
export let latestResultsCache = [];
export let competitionClasses = [];
export let currentUserId = null;

export function setCurrentUserId(id) {
    currentUserId = id;
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'kumla-skytte-app';

/**
 * INITIERA DATALYSSNARE
 * Sköter realtidsuppdatering av hemsidan när databasen ändras.
 */
export function initializeDataListeners() {
    const uid = auth.currentUser ? auth.currentUser.uid : null;

    // 1. INLOGGADE ANVÄNDARE - SPECIFIK DATA
    if (auth.currentUser) {
        // Skyttar (Klubbens medlemmar)
        onSnapshot(collection(db, 'shooters'), (snapshot) => { 
            allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            if (isAdminLoggedIn) {
                renderShootersAdmin(allShootersData);
            }
            refreshMultiDependentViews();
        });

        // Tävlingsklasser (Junior, Senior, etc)
        onSnapshot(collection(db, 'competitionClasses'), (snapshot) => {
            competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            competitionClasses.sort((a, b) => a.minAge - b.minAge);
            if (isAdminLoggedIn) {
                renderClassesAdmin(competitionClasses);
            }
            refreshMultiDependentViews();
        });

        // Resultat (Alla sparade resultat)
        onSnapshot(collection(db, 'results'), (snapshot) => {
            latestResultsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            refreshMultiDependentViews();
        });

        // Besöksstatistik (Realtid för Admin)
        if (isAdminLoggedIn) {
            onSnapshot(doc(db, 'statistics', 'visitors'), (docSnap) => {
                const todayEl = document.getElementById('visitor-count-today');
                const totalEl = document.getElementById('visitor-count-total');
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const today = getTodayString();
                    const isNewDay = data.lastVisitDate !== today;
                    
                    const todayCount = isNewDay ? 0 : (data.todayUniqueSessions || 0);
                    if (todayEl) todayEl.textContent = todayCount.toLocaleString('sv-SE');
                    if (totalEl) totalEl.textContent = (data.totalVisits || 0).toLocaleString('sv-SE');
                    
                    // Rendera grafen i realtid för admin
                    renderVisitorChart(data.dailyStats || {}, todayCount);
                }
            });
        }
    }

    // 2. PUBLIK DATA (ALLTID TILLGÄNGLIG)
    
    // Nyheter
    onSnapshot(collection(db, 'news'), (snapshot) => {
        newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNews(newsData, isAdminLoggedIn, uid);
    });

    // Kalenderhändelser
    onSnapshot(collection(db, 'events'), (snapshot) => {
        eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents(eventsData, isAdminLoggedIn);
    });

    // Tävlingsinfo (Uppdaterad för att stödja gilla/dela)
    onSnapshot(collection(db, 'competitions'), (snapshot) => { 
        competitionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderCompetitions(competitionsData, isAdminLoggedIn, uid);
    });
    
    // Användarlistan (för admin)
    onSnapshot(collection(db, 'users'), (snapshot) => {
        usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminsAndUsers(usersData, toggleClubMemberStatus);
    });

    // Föreningens Historia
    onSnapshot(collection(db, 'history'), (snapshot) => {
        historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistory(historyData, isAdminLoggedIn, uid);
    });

    // Bildgalleri
    onSnapshot(collection(db, 'images'), (snapshot) => {
        imageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderImages(imageData, isAdminLoggedIn);
    });

    // Sponsorer
    onSnapshot(collection(db, 'sponsors'), (snapshot) => {
        sponsorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSponsors(sponsorsData, isAdminLoggedIn);
    });
    
    // Webbplatsinställningar (Färg, Logo, Kontaktinfo)
    onSnapshot(doc(db, 'settings', 'siteSettings'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const siteLogoElement = document.getElementById('site-logo');
            const faviconLink = document.getElementById('favicon-link');
            
            if (siteLogoElement) siteLogoElement.src = data.logoUrl || "logo.png";
            if (faviconLink) faviconLink.href = data.logoUrl || "logo.png";
            
            renderContactInfo();
            updateHeaderColor(data.headerColor);
            toggleSponsorsNavLink(data.showSponsors);
            renderSiteSettings(data);
        }
    });
}

/**
 * Hjälpfunktion för att uppdatera vyer som kräver data från flera olika samlingar
 */
function refreshMultiDependentViews() {
    if (allShootersData.length > 0 && latestResultsCache.length > 0) {
        renderHomeAchievements(latestResultsCache, allShootersData);
        renderTopLists(competitionClasses, latestResultsCache, allShootersData);
    }
}

// --- CRUD OPERATIONER (SKAPA, LÄSA, UPPDATERA, RADERA) ---

export async function addOrUpdateDocument(collectionName, docId, data, successMessage, errorMessage) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet.");
        return;
    }
    try {
        if (docId) {
            await updateDoc(doc(db, collectionName, docId), data);
        } else {
            await addDoc(collection(db, collectionName), data);
        }
        showModal('confirmationModal', successMessage);
    } catch (error) {
        console.error(`Fel vid hantering av ${collectionName}:`, error);
        showModal('errorModal', errorMessage);
    }
}

export async function deleteDocument(docId, collectionName, seriesId) {
    const userOwnedCollections = ['results', 'shooters'];
    if (!isAdminLoggedIn && !userOwnedCollections.includes(collectionName)) {
        showModal('errorModal', "Behörighet saknas.");
        return;
    }

    try {   
        // Specialhantering för återkommande händelser i kalendern
        if (collectionName === 'events' && seriesId) {
            const q = query(collection(db, collectionName), where("seriesId", "==", seriesId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
            await batch.commit();
            showModal('confirmationModal', "Hela serien har raderats.");
        } else {
            // Rensa filer från Storage vid radering av bilder, sponsorer, nyheter eller TÄVLINGAR
            const storageLinkedCollections = ['images', 'sponsors', 'news', 'competitions'];
            if (storageLinkedCollections.includes(collectionName)) {
                const docSnap = await getFirestoreDoc(doc(db, collectionName, docId));
                if (docSnap.exists() && docSnap.data().storagePath) {
                    const storage = getStorage();
                    const fileRef = ref(storage, docSnap.data().storagePath);
                    try { await deleteObject(fileRef); } catch (e) { console.warn("Filen fanns inte i Storage."); }
                }
            }
            await deleteDoc(doc(db, collectionName, docId));
            showModal('confirmationModal', "Posten har raderats.");
        }
    } catch (error) {
        console.error("Fel vid borttagning:", error);
        showModal('errorModal', "Ett fel uppstod.");
    }
}

// --- MEDLEMS- OCH PROFILFUNKTIONER ---

export async function toggleLike(docId, docType, userId) {
    try {
        const docRef = doc(db, docType, docId);
        const docSnap = await getFirestoreDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const likes = data.likes || {};
            if (likes[userId]) {
                delete likes[userId];
            } else {
                likes[userId] = true;
            }
            await updateDoc(docRef, { likes: likes });
        }
    } catch (error) {
        console.error("Fel vid gilla-markering:", error);
    }
}

export async function updateProfile(uid, data) {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    try {
        await updateDoc(doc(db, 'users', uid), data);
        showModal('confirmationModal', "Profilen har uppdaterats!");
    } catch (error) {
        showModal('errorModal', "Kunde inte spara profilen.");
    }
}

export async function updateProfileByAdmin(uid, data) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'users', uid), data);
        showModal('confirmationModal', "Användarens profil har sparats.");
    } catch (error) {
        showModal('errorModal', "Fel vid uppdatering.");
    }
}

export async function updateSiteSettings(data) {
    if (!isAdminLoggedIn) return;
    try {
        await setDoc(doc(db, 'settings', 'siteSettings'), data);
        showModal('confirmationModal', "Inställningarna sparade!");
    } catch (error) {
        showModal('errorModal', "Kunde inte spara inställningar.");
    }
}

export async function addAdminFromUser(userId) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'users', userId), { isAdmin: true });
        showModal('confirmationModal', "Ny administratör tillagd.");
    } catch (error) { console.error(error); }
}

export async function deleteAdmin(adminId) {
    if (!isAdminLoggedIn || adminId === auth.currentUser.uid) return;
    if (usersData.filter(u => u.isAdmin).length <= 1) {
        showModal('errorModal', "Kan inte ta bort den sista admin.");
        return;
    }
    try {
        await updateDoc(doc(db, 'users', adminId), { isAdmin: false });
        showModal('confirmationModal', "Admin-rättigheter borttagna.");
    } catch (error) { console.error(error); }
}

export async function toggleClubMemberStatus(userId, currentStatus) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'users', userId), { isClubMember: !currentStatus });
    } catch (error) { console.error(error); }
}

// --- RESULTAT OCH SKYTTAR ---

export async function createShooterProfile(userId, name, birthyear) {
    if (!userId) return;
    try {
        await addDoc(collection(db, 'shooters'), {
            name: name,
            birthyear: parseInt(birthyear),
            parentUserIds: [userId],
            settings: { trackMedals: true, defaultShareResults: false },
            createdAt: serverTimestamp()
        });
        showModal('confirmationModal', `Skytten ${name} har lagts till.`);
    } catch (error) { console.error(error); }
}

export async function getMyShooters(userId) {
    if (!userId) return [];
    try {
        const q = query(collection(db, 'shooters'), where('parentUserIds', 'array-contains', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { return []; }
}

export async function saveResult(data) {
    try {
        await addDoc(collection(db, 'results'), { ...data, createdAt: serverTimestamp() });
        showModal('confirmationModal', "Resultatet har registrerats!");
    } catch (error) { showModal('errorModal', "Kunde inte spara."); }
}

export async function getShooterResults(shooterId) {
    try {
        const q = query(collection(db, 'results'), where('shooterId', '==', shooterId), where('registeredBy', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) { return []; }
}

export async function updateUserResult(id, data) {
    try {
        await updateDoc(doc(db, 'results', id), { ...data, updatedAt: serverTimestamp() });
        showModal('confirmationModal', "Resultatet är uppdaterat.");
    } catch (error) { showModal('errorModal', "Kunde inte uppdatera."); }
}

export async function updateShooterProfile(id, data) {
    try {
        await updateDoc(doc(db, 'shooters', id), data);
        showModal('confirmationModal', "Profilen är uppdaterad.");
    } catch (error) { showModal('errorModal', "Kunde inte spara."); }
}

export async function linkUserToShooter(shooterId, userId) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), { parentUserIds: arrayUnion(userId) });
        showModal('confirmationModal', "Användaren har kopplats.");
    } catch (error) { console.error(error); }
}

export async function unlinkUserFromShooter(shooterId, userId) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), { parentUserIds: arrayRemove(userId) });
        showModal('confirmationModal', "Kopplingen har tagits bort.");
    } catch (error) { console.error(error); }
}

// --- STATISTIKBERÄKNINGAR ---

export function calculateShooterStats(results, targetYear = new Date().getFullYear()) {
    const stats = {
        year: { series: 0, s20: 0, s40: 0, s60: 0, s100: 0 },
        allTime: { series: 0, s20: 0, s40: 0, s60: 0, s100: 0 },
        medals: { 'Guld 3': 0, 'Guld 2': 0, 'Guld 1': 0, 'Guld': 0, 'Silver': 0, 'Brons': 0 }
    };

    results.forEach(res => {
        const resYear = new Date(res.date).getFullYear();
        const isTargetYear = resYear === targetYear;
        const total = parseFloat(res.total) || 0;
        const bestSeries = parseFloat(res.bestSeries) || 0;
        const count = parseInt(res.shotCount);

        if (bestSeries > stats.allTime.series) stats.allTime.series = bestSeries;
        if (isTargetYear && bestSeries > stats.year.series) stats.year.series = bestSeries;

        const countKey = `s${count}`;
        if (stats.allTime[countKey] !== undefined) {
            if (total > stats.allTime[countKey]) stats.allTime[countKey] = total;
            if (isTargetYear && total > stats.year[countKey]) stats.year[countKey] = total;
        }

        if (res.seriesMedals) {
            res.seriesMedals.forEach(m => { if (stats.medals[m] !== undefined) stats.medals[m]++; });
        }
    });
    return stats;
}

// --- DOKUMENTARKIV (FILE MANAGER) ---

export async function getFolderContents(folderId = null) {
    try {
        const fQ = query(collection(db, 'folders'), where('parentId', '==', folderId));
        const dQ = query(collection(db, 'adminDocuments'), where('folderId', '==', folderId));
        const [fSnap, dSnap] = await Promise.all([getDocs(fQ), getDocs(dQ)]);
        
        return {
            folders: fSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'folder' })).sort((a,b) => a.name.localeCompare(b.name)),
            files: dSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'file' })).sort((a,b) => a.name.localeCompare(b.name))
        };
    } catch (error) { return { folders: [], files: [] }; }
}

export async function createFolder(name, parentId = null) {
    if (!isAdminLoggedIn) return;
    try {
        await addDoc(collection(db, 'folders'), { name, parentId, createdAt: serverTimestamp() });
        showModal('confirmationModal', "Mappen skapad.");
    } catch (error) { console.error(error); }
}

export async function uploadAdminDocument(file, folderId = null) {
    if (!isAdminLoggedIn) return;
    const storage = getStorage();
    const path = `admin_docs/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        await uploadTask;
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'adminDocuments'), { 
            name: file.name, folderId, storagePath: path, url, size: file.size, 
            mimeType: file.type, uploadedBy: auth.currentUser.uid, createdAt: serverTimestamp() 
        });
        showModal('confirmationModal', "Dokumentet har laddats upp.");
    } catch (error) { console.error(error); }
}

export async function deleteAdminDocument(docId, storagePath) {
    if (!isAdminLoggedIn) return;
    try {
        if (storagePath) {
            const storage = getStorage();
            await deleteObject(ref(storage, storagePath)).catch(() => {});
        }
        await deleteDoc(doc(db, 'adminDocuments', docId));
        showModal('confirmationModal', "Filen har raderats.");
    } catch (error) { console.error(error); }
}

export async function moveAdminDocument(docId, newFolderId) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'adminDocuments', docId), { folderId: newFolderId });
        showModal('confirmationModal', "Filen har flyttats.");
    } catch (error) { console.error(error); }
}

export async function deleteAdminFolder(folderId) {
    if (!isAdminLoggedIn) return false;
    try {
        const [f, d] = await Promise.all([
            getDocs(query(collection(db, 'folders'), where('parentId', '==', folderId))),
            getDocs(query(collection(db, 'adminDocuments'), where('folderId', '==', folderId)))
        ]);
        if (!f.empty || !d.empty) {
            showModal('errorModal', "Mappen är inte tom.");
            return false;
        }
        await deleteDoc(doc(db, 'folders', folderId));
        return true;
    } catch (error) { return false; }
}

// --- BESÖKSSTATISTIK LOGIK ---

function getTodayString() { 
    return new Date().toISOString().split('T')[0]; 
}

function getSessionId() {
    let id = sessionStorage.getItem('visitorSessionId');
    if (!id) {
        id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('visitorSessionId', id);
    }
    return id;
}

export async function trackVisitor() {
    try {
        const now = new Date();
        const today = getTodayString();
        const hour = now.getHours().toString(); // Ex: "14"
        const sessionId = getSessionId();
        const sessionKey = `v_${today}_${sessionId}`;
        
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, 'true');

        const batch = writeBatch(db);
        const totalRef = doc(db, 'statistics', 'totals');
        batch.set(totalRef, { totalVisits: increment(1) }, { merge: true });

        const dailyRef = doc(db, 'statistics', 'dailyLog', 'days', today);
        
        // FIX: Använd objekt-syntax för att skapa/merga i en Map
        batch.set(dailyRef, { 
            count: increment(1),
            date: today,
            hourlyDistribution: {
                [hour]: increment(1) // Skapar en Map där timmen är nyckeln
            }
        }, { merge: true });

        await batch.commit();
    } catch (error) {
        console.error("Kunde inte logga besök:", error);
    }
}

export async function getVisitorStats() {
    try {
        const totalSnap = await getFirestoreDoc(doc(db, 'statistics', 'totals'));
        const totalVisits = totalSnap.exists() ? totalSnap.data().totalVisits : 0;

        const dailyQuery = query(
            collection(db, 'statistics', 'dailyLog', 'days'),
            orderBy('date', 'desc'),
            limit(365)
        );
        const dailySnap = await getDocs(dailyQuery);
        
        const dailyStats = {};
        const allDocs = []; // Sparar hela dokumenten för tim-grafen
        let todayVisits = 0;
        const todayStr = getTodayString();

        dailySnap.forEach(d => {
            const data = d.data();
            allDocs.push(d); 
            dailyStats[data.date] = data.count;
            if (data.date === todayStr) todayVisits = data.count;
        });

        return { totalVisits, todayVisits, dailyStats, allDocs };
    } catch (error) { 
        return { totalVisits: 0, todayVisits: 0, dailyStats: {}, allDocs: [] }; 
    }
}