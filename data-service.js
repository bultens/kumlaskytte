console.log("📊 DATA-SERVICE.JS LADDAD");
import { db, auth } from "./firebase-config.js"; 
import { onSnapshot, collection, doc, updateDoc, query, where, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, renderUserReport, renderContactInfo, updateHeaderColor, toggleSponsorsNavLink, renderProfileInfo, showModal, renderSiteSettings, renderCompetitions, renderHomeAchievements, renderClassesAdmin, renderTopLists, renderShootersAdmin, appState } from "./ui-handler.js";
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ver. 1.6 (storage fix)
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
// Funktion för att uppdatera admin-vyer när auth-status ändras
export function refreshAdminViews() {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    if (!uid || !appState.isAdminLoggedIn) {
        console.log("❌ refreshAdminViews: Inte admin eller ingen UID");
        return;
    }
    
    console.log("🔄 Uppdaterar admin-vyer...");
    
    // Rendera om alla admin-vyer med korrekt status
    renderAdminsAndUsers(usersData, true, uid);
    
    // VIKTIGT: Rendera shooters om vi har data
    if (allShootersData.length > 0) {
        renderShootersAdmin(allShootersData);
    }
    
    // Rendera klasser om vi har data
    if (competitionClasses.length > 0) {
        renderClassesAdmin(competitionClasses);
    }
    
    // Visa edit-sektioner om de är dolda
    const adminSections = [
        'news-edit-section', 'competition-edit-section', 
        'calendar-edit-section', 'image-edit-section', 
        'history-edit-section', 'sponsors-edit-section'
    ];
    
    adminSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
    
    console.log("✅ Admin-vyer uppdaterade");
}

export function initializeDataListeners() {
    const uid = auth.currentUser ? auth.currentUser.uid : null;

    // VIKTIGT: Bestäm admin-status direkt från datan
    const determineIfAdmin = () => {
        const currentUser = usersData.find(u => u.id === uid);
        return currentUser ? currentUser.isAdmin === true : false;
    };

    if (auth.currentUser) {
        onSnapshot(collection(db, 'shooters'), (snapshot) => { 
            allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            console.log("📊 Shooters laddade:", allShootersData.length);
            if (appState.isAdminLoggedIn) {
                console.log("👤 Renderar shooters som admin");
                renderShootersAdmin(allShootersData);
            }
            
            if (latestResultsCache.length > 0) {
                renderHomeAchievements(latestResultsCache, allShootersData);
                renderTopLists(competitionClasses, latestResultsCache, allShootersData);
            }
        });

        onSnapshot(collection(db, 'competitionClasses'), (snapshot) => {
            competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            competitionClasses.sort((a, b) => a.minAge - b.minAge);
            if (appState.isAdminLoggedIn) renderClassesAdmin(competitionClasses);
            renderTopLists(competitionClasses, latestResultsCache, allShootersData);
        });

        onSnapshot(collection(db, 'results'), (snapshot) => {
            const allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            latestResultsCache = allResults; 
            if (allShootersData.length > 0) {
                renderHomeAchievements(latestResultsCache, allShootersData);
                renderTopLists(competitionClasses, latestResultsCache, allShootersData);
            }
        });
    }

    onSnapshot(collection(db, 'news'), (snapshot) => { 
        newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderNews(newsData, appState.isAdminLoggedIn, uid); 
    });
    
    onSnapshot(collection(db, 'events'), (snapshot) => { 
        eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderEvents(eventsData, appState.isAdminLoggedIn); 
    });
    
    onSnapshot(collection(db, 'competitions'), (snapshot) => { 
        competitionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderCompetitions(competitionsData, appState.isAdminLoggedIn); 
    });
    
    onSnapshot(collection(db, 'users'), (snapshot) => {
        usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Uppdatera admin-status om vi har en användare
        const currentUser = usersData.find(u => u.id === uid);
        if (currentUser && currentUser.isAdmin) {
            setAdminStatus(true);
        }
        
        // Använd appState.isAdminLoggedIn istället för determineIfAdmin()
        renderAdminsAndUsers(usersData, appState.isAdminLoggedIn, uid);
    });

    onSnapshot(collection(db, 'history'), (snapshot) => { 
        historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderHistory(historyData, appState.isAdminLoggedIn, uid); 
    });
    
    onSnapshot(collection(db, 'images'), (snapshot) => { 
        imageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderImages(imageData, appState.isAdminLoggedIn); 
    });
    
    onSnapshot(collection(db, 'sponsors'), (snapshot) => { 
        sponsorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderSponsors(sponsorsData, appState.isAdminLoggedIn); 
    });
    
    onSnapshot(doc(db, 'settings', 'siteSettings'), (docSnap) => {
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

export function startAdminListeners() {
    if (!auth.currentUser) {
        console.log("❌ Ingen användare inloggad, kan inte starta admin-lyssnare");
        return;
    }
    
    console.log("🎧 Startar admin-lyssnare...");
    
   /* // Shooters
    onSnapshot(collection(db, 'shooters'), (snapshot) => { 
        allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        console.log("📊 Shooters laddade:", allShootersData.length);
        
        if (appState.isAdminLoggedIn) {
            renderShootersAdmin(allShootersData);
        }
    });

    // Competition Classes
    onSnapshot(collection(db, 'competitionClasses'), (snapshot) => {
        competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        competitionClasses.sort((a, b) => a.minAge - b.minAge);
        if (appState.isAdminLoggedIn) renderClassesAdmin(competitionClasses);
    });

    // Results (för achievements/topplistor)
    onSnapshot(collection(db, 'results'), (snapshot) => {
        const allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        latestResultsCache = allResults; 
        if (allShootersData.length > 0) {
            renderHomeAchievements(latestResultsCache, allShootersData);
            renderTopLists(competitionClasses, latestResultsCache, allShootersData);
        }
    });*/
}
export async function getUserRole(uid) {
    try {
        // Vi letar i kollektionen 'users' efter ett dokument med namnet [uid]
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data().role; // Returnerar t.ex. 'admin' eller 'parent'
        } else {
            console.warn("Ingen användarprofil hittades i Firestore för UID:", uid);
            return null;
        }
    } catch (error) {
        console.error("Fel vid hämtning av användarroll:", error);
        return null;
    }
}
    
    // Visa edit-sektioner om de är dolda
    const adminSections = [
        'news-edit-section', 'competition-edit-section', 
        'calendar-edit-section', 'image-edit-section', 
        'history-edit-section', 'sponsors-edit-section'
    ];
    
    adminSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });

export async function addOrUpdateDocument(collectionName, docId, data, successMessage, errorMessage) {
    if (!appState.isAdminLoggedIn) {
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
    // Tillåt medlemmar att ta bort sina egna resultat och skyttar
    const userOwnedCollections = ['results', 'shooters'];
    
    if (!appState.isAdminLoggedIn && !userOwnedCollections.includes(collectionName)) {
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
                    try { await deleteObject(fileRef); } catch (error) { console.warn("Kunde inte ta bort filen från Storage:", error); }
                }
            }
            await deleteDoc(doc(db, collectionName, docId));
            showModal('confirmationModal', `Posten har tagits bort från ${collectionName}.`);
        }
    } catch (error) {
        console.error("Fel vid borttagning av post:", error);
        showModal('errorModal', "Ett fel uppstod när posten skulle tas bort.");
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
                updatedLikes = { ...likes };
                delete updatedLikes[userId];
            } else {
                updatedLikes = { ...likes, [userId]: true };
            }
            await updateDoc(docRef, { likes: updatedLikes });
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
    if (!appState.isAdminLoggedIn) {
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
    if (!appState.isAdminLoggedIn) {
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
    if (!appState.isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    try {
        await updateDoc(doc(db, 'users', userId), { isAdmin: true });
        showModal('confirmationModal', "Användaren har nu administratörsrättigheter!");
    } catch (error) {
        console.error("Fel vid tillägg av admin:", error);
        showModal('errorModal', "Ett fel uppstod när användaren skulle läggas till som admin.");
    }
}

export async function deleteAdmin(adminId) {
    if (!appState.isAdminLoggedIn) {
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
        await updateDoc(doc(db, 'users', adminId), { isAdmin: false });
        showModal('confirmationModal', "Admin har tagits bort.");
    } catch (error) {
        console.error("Fel vid borttagning av admin:", error);
        showModal('errorModal', "Ett fel uppstod när admin skulle tas bort.");
    }
}

export async function createShooterProfile(userId, name, birthyear) {
    if (!userId) return;
    try {
        await addDoc(collection(db, 'shooters'), {
            name: name,
            birthyear: parseInt(birthyear), // Sparas som siffra i DB
            parentUserIds: [userId],        // Kopplas till din inloggning
            settings: { 
                trackMedals: true, 
                defaultShareResults: false 
            },
            createdAt: serverTimestamp()
        });
        showModal('confirmationModal', `Profil för ${name} skapad!`);
    } catch (error) {
        console.error("Fel vid skapande av skytt:", error);
        showModal('errorModal', "Kunde inte skapa profil.");
    }
}

export async function getMyShooters(userId) {
    if (!userId) return [];
    try {
        const q = query(collection(db, 'shooters'), where('parentUserIds', 'array-contains', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Fel vid hämtning av skyttar:", error);
        return [];
    }
}

export async function saveResult(resultData) {
    try {
        await addDoc(collection(db, 'results'), {
            ...resultData,
            createdAt: serverTimestamp()
        });
        showModal('confirmationModal', "Resultat sparat!");
    } catch (error) {
        console.error("Fel vid sparande av resultat:", error);
        showModal('errorModal', "Kunde inte spara resultatet.");
    }
}

export async function getShooterResults(shooterId) {
    try {
        const q = query(
            collection(db, 'results'), 
            where('shooterId', '==', shooterId),
            where('registeredBy', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("Fel vid hämtning av resultat:", error);
        return [];
    }
}

export async function updateUserResult(resultId, data) {
    if (!auth.currentUser) return;
    try {
        const docRef = doc(db, 'results', resultId);
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        showModal('confirmationModal', "Resultatet har uppdaterats!");
    } catch (error) {
        console.error("Fel vid uppdatering av resultat:", error);
        showModal('errorModal', "Kunde inte uppdatera resultatet.");
    }
}

export async function updateShooterProfile(shooterId, data) {
    if (!auth.currentUser) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), data);
        showModal('confirmationModal', "Skyttprofilen uppdaterad!");
    } catch (error) {
        console.error("Fel vid uppdatering av skytt:", error);
        showModal('errorModal', "Kunde inte spara. Kontrollera att du har rättigheter.");
    }
}

export async function linkUserToShooter(shooterId, userId) {
    if (!appState.isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), { parentUserIds: arrayUnion(userId) });
        showModal('confirmationModal', "Användaren har kopplats till skytten!");
    } catch (error) {
        console.error("Fel vid koppling:", error);
        showModal('errorModal', "Kunde inte koppla användaren.");
    }
}

export async function unlinkUserFromShooter(shooterId, userId) {
    if (!appState.isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), { 
            parentUserIds: arrayRemove(userId) 
        });
        showModal('confirmationModal', "Kopplingen har tagits bort!");
    } catch (error) {
        console.error("Fel vid bortkoppling:", error);
        showModal('errorModal', "Kunde inte ta bort kopplingen.");
    }
}


// UPPATERAD STATISTIKFUNKTION (100 skott + TargetYear support)
// Parametern 'year' styr vilket år som räknas som "Årsbästa". Default är innevarande år.
export function calculateShooterStats(results, targetYear = new Date().getFullYear()) {
    
    const stats = {
        year: { series: 0, s20: 0, s40: 0, s60: 0, s100: 0 },
        allTime: { series: 0, s20: 0, s40: 0, s60: 0, s100: 0 },
        medals: {
            'Guld 3': 0, 'Guld 2': 0, 'Guld 1': 0,
            'Guld': 0, 'Silver': 0, 'Brons': 0
        }
    };

    results.forEach(res => {
        const resYear = new Date(res.date).getFullYear();
        const isTargetYear = resYear === targetYear;
        const total = parseFloat(res.total) || 0;
        const bestSeries = parseFloat(res.bestSeries) || 0;
        const count = parseInt(res.shotCount);

        // All Time Series
        if (bestSeries > stats.allTime.series) stats.allTime.series = bestSeries;
        // Target Year Series
        if (isTargetYear && bestSeries > stats.year.series) stats.year.series = bestSeries;

        if (count === 20) {
            if (total > stats.allTime.s20) stats.allTime.s20 = total;
            if (isTargetYear && total > stats.year.s20) stats.year.s20 = total;
        } else if (count === 40) {
            if (total > stats.allTime.s40) stats.allTime.s40 = total;
            if (isTargetYear && total > stats.year.s40) stats.year.s40 = total;
        } else if (count === 60) {
            if (total > stats.allTime.s60) stats.allTime.s60 = total;
            if (isTargetYear && total > stats.year.s60) stats.year.s60 = total;
        } else if (count === 100) {
            if (total > stats.allTime.s100) stats.allTime.s100 = total;
            if (isTargetYear && total > stats.year.s100) stats.year.s100 = total;
        }

        if (res.seriesMedals && Array.isArray(res.seriesMedals)) {
            res.seriesMedals.forEach(medalName => {
                if (medalName && stats.medals[medalName] !== undefined) {
                    stats.medals[medalName]++;
                }
            });
        }
    });

    return stats;
}
// --- DOKUMENTHANTERING (VIRTUELLT FILSYSTEM) ---

// Hämta innehåll (mappar och filer) för en specifik mapp
export async function getFolderContents(folderId = null) {
    try {
        // Hämta mappar
        const folderQ = query(
            collection(db, 'folders'), 
            where('parentId', '==', folderId)
        );
        const folderSnap = await getDocs(folderQ);
        const folders = folderSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'folder' }));
        
        // Sortera mappar A-Ö
        folders.sort((a, b) => a.name.localeCompare(b.name));

        // Hämta filer
        const fileQ = query(
            collection(db, 'adminDocuments'), 
            where('folderId', '==', folderId)
        );
        const fileSnap = await getDocs(fileQ);
        const files = fileSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'file' }));
        
        // Sortera filer A-Ö
        files.sort((a, b) => a.name.localeCompare(b.name));

        return { folders, files };
    } catch (error) {
        console.error("Fel vid hämtning av mappinnehåll:", error);
        return { folders: [], files: [] };
    }
}

// Skapa en ny mapp
export async function createFolder(name, parentId = null) {
    if (!appState.isAdminLoggedIn) return;
    try {
        await addDoc(collection(db, 'folders'), {
            name: name,
            parentId: parentId,
            createdAt: serverTimestamp()
        });
        showModal('confirmationModal', `Mappen "${name}" har skapats.`);
    } catch (error) {
        console.error("Kunde inte skapa mapp:", error);
        showModal('errorModal', "Kunde inte skapa mapp.");
    }
}

// Ladda upp fil till "virtuell" mapp
export async function uploadAdminDocument(file, folderId = null) {
    if (!appState.isAdminLoggedIn) return;
    
    // 1. Ladda upp till Storage
    const storage = getStorage();
    const storagePath = `admin_docs/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Vi väntar på att uppladdningen ska bli klar
        await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    // Här kan man lägga till progress bar logik om man vill
                }, 
                (error) => reject(error), 
                () => resolve()
            );
        });

        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        // 2. Skapa referens i Firestore (adminDocuments)
        await addDoc(collection(db, 'adminDocuments'), {
            name: file.name,
            folderId: folderId, // Kopplingen till den virtuella mappen
            storagePath: storagePath,
            url: downloadURL,
            size: file.size,
            mimeType: file.type,
            uploadedBy: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });

        showModal('confirmationModal', "Filen uppladdad!");
    } catch (error) {
        console.error("Fel vid uppladdning:", error);
        showModal('errorModal', "Uppladdning misslyckades.");
    }
}

// Ta bort en fil (Både från listan och från Storage)
export async function deleteAdminDocument(docId, storagePath) {
    if (!appState.isAdminLoggedIn) return;
    try {
        // 1. Ta bort från Storage
        if (storagePath) {
            const storage = getStorage();
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef).catch(err => console.warn("Filen fanns inte i storage:", err));
        }

        // 2. Ta bort från Firestore
        await deleteDoc(doc(db, 'adminDocuments', docId));
        showModal('confirmationModal', "Filen har raderats.");
    } catch (error) {
        console.error("Kunde inte ta bort fil:", error);
        showModal('errorModal', "Fel vid borttagning av fil.");
    }
}

// Flytta fil till ny mapp
export async function moveAdminDocument(docId, newFolderId) {
    if (!appState.isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'adminDocuments', docId), {
            folderId: newFolderId
        });
        showModal('confirmationModal', "Filen har flyttats.");
    } catch (error) {
        console.error("Kunde inte flytta fil:", error);
        showModal('errorModal', "Kunde inte flytta filen.");
    }
}

// Hämta namnet på en mapp (för brödsmulor)
export async function getFolderName(folderId) {
    if (!folderId) return "Hem";
    const docSnap = await getFirestoreDoc(doc(db, 'folders', folderId));
    return docSnap.exists() ? docSnap.data().name : "Okänd mapp";
}

// Ta bort en mapp (Bara om den är tom)
export async function deleteAdminFolder(folderId) {
    if (!appState.isAdminLoggedIn) return;
    
    try {
        // 1. Kolla om mappen innehåller undermappar
        const subFoldersQ = query(collection(db, 'folders'), where('parentId', '==', folderId));
        const subFoldersSnap = await getDocs(subFoldersQ);
        
        if (!subFoldersSnap.empty) {
            showModal('errorModal', "Mappen är inte tom. Den innehåller andra mappar.");
            return false;
        }

        // 2. Kolla om mappen innehåller filer
        const filesQ = query(collection(db, 'adminDocuments'), where('folderId', '==', folderId));
        const filesSnap = await getDocs(filesQ);
        
        if (!filesSnap.empty) {
            showModal('errorModal', "Mappen är inte tom. Ta bort eller flytta filerna först.");
            return false;
        }

        // 3. Om tom -> Radera
        await deleteDoc(doc(db, 'folders', folderId));
        showModal('confirmationModal', "Mappen har raderats.");
        return true;

    } catch (error) {
        console.error("Kunde inte ta bort mapp:", error);
        showModal('errorModal', "Ett fel uppstod vid borttagning.");
        return false;
    }
}
export async function toggleClubMemberStatus(userId, currentStatus) {
    if (!appState.isAdminLoggedIn) return;
    
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isClubMember: !currentStatus
        });
        return true;
    } catch (error) {
        console.error("Kunde inte uppdatera medlemsstatus:", error);
        return false;
    }
}
export async function addResult(resultData) {
    try {
        await addDoc(collection(db, 'results'), resultData);
        return true;
    } catch (error) {
        console.error("Fel vid sparande av resultat:", error);
        return false;
    }
}

/** Hämtar alla skyttar */
export async function getShooters() {
    const querySnapshot = await getDocs(collection(db, 'shooters'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Hämtar alla användare (för att hitta föräldrar) */
export async function getUsers() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Uppdaterar kopplingen mellan skytt och förälder */
export async function updateShooterParent(shooterId, parentId) {
    try {
        const shooterRef = doc(db, 'shooters', shooterId);
        await updateDoc(shooterRef, { parentId: parentId });
        return true;
    } catch (error) {
        console.error("Fel vid uppdatering av förälder:", error);
        return false;
    }
}