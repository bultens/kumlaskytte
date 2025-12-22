// data-service.js
import { db, auth, storage } from "./firebase-config.js"; 
// FIX: Lagt till 'orderBy' i importen här nedan
import { onSnapshot, collection, doc, updateDoc, query, where, orderBy, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, renderUserReport, renderContactInfo, updateHeaderColor, toggleSponsorsNavLink, renderProfileInfo, showModal, isAdminLoggedIn, renderSiteSettings, renderCompetitions, renderHomeAchievements, renderClassesAdmin, renderShooterSelector, renderPublicShooterSelector, renderTopLists, renderShootersAdmin, renderSelectableClasses, renderDocumentArchive } from "./ui-handler.js";
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ver. 1.5 (Korrigerad)
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
export let documentsData = [];
export let imagesData = []; 

export function initializeDataListeners() {
    const user = auth.currentUser;

    // --- 1. PUBLIK DATA (Hämtas alltid, oavsett inloggning) ---

    // Nyheter (Sorterat på datum)
    const newsQuery = query(collection(db, "news"), orderBy("date", "desc"));
    onSnapshot(newsQuery, (snapshot) => {
        newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNews();
    });

    // Kalender (Sorterat på datum)
    const eventsQuery = query(collection(db, "events"), orderBy("date", "asc"));
    onSnapshot(eventsQuery, (snapshot) => {
        eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents();
    });

    // Historia
    onSnapshot(collection(db, "history"), (snapshot) => {
        historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistory();
    });

    // Bilder (Sorterat på prioritet)
    const imagesQuery = query(collection(db, "images"), orderBy("priority", "desc"));
    onSnapshot(imagesQuery, (snapshot) => {
        imagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderImages();
    });

    // Sponsorer
    onSnapshot(collection(db, "sponsors"), (snapshot) => {
        sponsorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSponsors();
    });

    // Tävlingar (Online) - Sorterade på startdatum
    const compQuery = query(collection(db, "online_competitions"), orderBy("startDate", "desc"));
    onSnapshot(compQuery, (snapshot) => {
        competitionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof renderCompetitions === 'function') renderCompetitions(); 
    });
    
    // Tävlingsklasser (Online)
    onSnapshot(collection(db, "online_competition_classes"), (snapshot) => {
        competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // Site Settings
    onSnapshot(collection(db, "settings"), (snapshot) => {
        const settings = {};
        snapshot.forEach(doc => { settings[doc.id] = doc.data(); });
        
        if (settings.design) {
            updateHeaderColor(settings.design.headerColor);
            toggleSponsorsNavLink(settings.design.showSponsors);
        }
        if (isAdminLoggedIn && typeof renderSiteSettings === 'function') {
            renderSiteSettings(settings);
        }
    });

    // --- 2. SKYDDAD DATA (Hämtas BARA om man är inloggad) ---
    if (user) {
        // Användare (Hämtas bara för inloggade, hanterar Admin-vyer)
        onSnapshot(collection(db, "users"), (snapshot) => {
            usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (isAdminLoggedIn) renderAdminsAndUsers();
        }, (error) => {
            // Ignorera fel om vanliga användare inte får läsa hela users-listan (beroende på regler)
            console.log("Not loaded users (insufficient permissions or not needed):", error.code);
        });

        // Skyttar (Behövs för att koppla ihop konto med skytt)
        onSnapshot(collection(db, "shooters"), (snapshot) => {
            allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (typeof renderShooterSelector === 'function') renderShooterSelector();
            if (typeof renderPublicShooterSelector === 'function') renderPublicShooterSelector();
            if (isAdminLoggedIn && typeof renderShootersAdmin === 'function') renderShootersAdmin();
        });

        // Dokumentarkiv (Endast Admin får se detta enligt reglerna)
        if (isAdminLoggedIn) {
             const docQuery = query(collection(db, "documents"), orderBy("uploadedAt", "desc"));
             onSnapshot(docQuery, (snapshot) => {
                documentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (typeof renderDocumentArchive === 'function') renderDocumentArchive();
            });
        }
    }
}

// --- HJÄLPFUNKTIONER FÖR DATABAS (CRUD) ---

export async function addOrUpdateDocument(collectionName, docId, data, successMessage, errorMessage) {
    try {
        if (docId) {
            await updateDoc(doc(db, collectionName, docId), data);
        } else {
            await addDoc(collection(db, collectionName), {
                ...data,
                createdAt: serverTimestamp() // Lägg till tidsstämpel vid ny
            });
        }
        showModal('confirmationModal', successMessage);
    } catch (error) {
        console.error("Database Error:", error);
        showModal('errorModal', errorMessage + " " + error.message);
    }
}

export async function deleteDocument(collectionName, docId, successMessage, errorMessage) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        showModal('confirmationModal', successMessage);
    } catch (error) {
        console.error("Delete Error:", error);
        showModal('errorModal', errorMessage + " " + error.message);
    }
}

export async function toggleLike(newsId, currentLikes, likedBy) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        showModal('errorModal', "Du måste vara inloggad för att gilla.");
        return;
    }

    const newsRef = doc(db, "news", newsId);
    
    if (likedBy && likedBy.includes(userId)) {
        await updateDoc(newsRef, {
            likes: currentLikes - 1,
            likedBy: arrayRemove(userId)
        });
    } else {
        await updateDoc(newsRef, {
            likes: currentLikes + 1,
            likedBy: arrayUnion(userId)
        });
    }
}

// --- ANVÄNDARHANTERING ---

export async function updateProfile(userId, email, username) {
    try {
        await updateDoc(doc(db, "users", userId), {
            email: email,
            username: username
        });
        showModal('confirmationModal', "Profil uppdaterad!");
        renderProfileInfo({ email, username, role: isAdminLoggedIn ? 'Admin' : 'Medlem' }); 
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte uppdatera profil.");
    }
}

export async function updateProfileByAdmin(userId, data) {
    try {
        await updateDoc(doc(db, "users", userId), data);
        showModal('confirmationModal', "Användare uppdaterad!");
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte uppdatera användare.");
    }
}

export async function toggleMemberStatus(userId, currentStatus) {
    try {
        await updateDoc(doc(db, "users", userId), {
            isMember: !currentStatus
        });
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte ändra medlemsstatus.");
    }
}

// --- ADMINHANTERING ---

export async function addAdminFromUser(userId) {
    try {
        await updateDoc(doc(db, "users", userId), {
            isAdmin: true
        });
        showModal('confirmationModal', "Användaren är nu Admin.");
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte göra användaren till admin.");
    }
}

export async function deleteAdmin(userId) {
    try {
        await updateDoc(doc(db, "users", userId), {
            isAdmin: false
        });
        showModal('confirmationModal', "Admin-rättigheter borttagna.");
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte ta bort admin-rättigheter.");
    }
}

// --- INSTÄLLNINGAR ---

export async function updateSiteSettings(settings) {
    try {
        // Vi sparar allt under ett dokument kallat 'design' i 'settings'-kollektionen
        await setDoc(doc(db, "settings", "design"), settings);
        showModal('confirmationModal', "Inställningar sparade!");
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte spara inställningar.");
    }
}

// --- SKYTTAR (SHOOTERS) ---

export async function createShooterProfile(name, birthYear, club) {
    if (!auth.currentUser) return;
    try {
        const docRef = await addDoc(collection(db, 'shooters'), {
            name: name,
            birthYear: parseInt(birthYear),
            club: club || 'Kumla Skytteförening',
            createdBy: auth.currentUser.uid,
            parentUserIds: [auth.currentUser.uid], // Koppla direkt till skaparen
            createdAt: serverTimestamp()
        });
        showModal('confirmationModal', "Ny skyttprofil skapad!");
        return docRef.id;
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte skapa skyttprofil.");
    }
}

export async function updateShooterProfile(shooterId, data) {
    try {
        await updateDoc(doc(db, 'shooters', shooterId), data);
        showModal('confirmationModal', "Skyttprofil uppdaterad!");
        return true;
    } catch (e) {
        console.error(e);
        showModal('errorModal', "Misslyckades att uppdatera profil.");
        return false;
    }
}

export async function linkUserToShooter(userId, shooterId) {
    try {
        const shooterRef = doc(db, 'shooters', shooterId);
        await updateDoc(shooterRef, {
            parentUserIds: arrayUnion(userId)
        });
        showModal('confirmationModal', "Konto kopplat till skytt!");
    } catch (error) {
        console.error(error);
        showModal('errorModal', "Kunde inte koppla konto.");
    }
}

export function getMyShooters() {
    if (!auth.currentUser) return [];
    return allShootersData.filter(s => s.parentUserIds && s.parentUserIds.includes(auth.currentUser.uid));
}


// --- RESULTAT (Gamla systemet / Träning) ---

export async function saveResult(resultData) {
    try {
        await addDoc(collection(db, "results"), {
            ...resultData,
            registeredBy: auth.currentUser.uid,
            registeredAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Save result error:", error);
        throw error;
    }
}

export async function updateUserResult(resultId, data) {
    try {
        await updateDoc(doc(db, 'results', resultId), data);
        showModal('confirmationModal', "Resultatet uppdaterades!");
        return true;
    } catch (e) {
        console.error(e);
        showModal('errorModal', "Kunde inte uppdatera resultatet.");
        return false;
    }
}

// --- DOKUMENT (PDF mm) ---

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
                (error) => {
                    console.error("Upload error:", error);
                    reject(error);
                }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    await addDoc(collection(db, 'documents'), {
                        name: name,
                        category: category,
                        url: downloadURL,
                        storagePath: uploadTask.snapshot.ref.fullPath,
                        fileType: file.type,
                        uploadedAt: serverTimestamp(),
                        uploadedBy: auth.currentUser.uid
                    });
                    
                    resolve(true);
                }
            );
        });
    } catch (error) {
        console.error("Fel vid dokumentuppladdning:", error);
        throw error; 
    }
}

export async function deleteDocumentFile(docId, storagePath) {
    try {
        // 1. Ta bort från Storage
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);

        // 2. Ta bort från Firestore
        await deleteDoc(doc(db, 'documents', docId));
        return true;
    } catch (error) {
        console.error("Fel vid borttagning av dokument:", error);
        return false;
    }
}

export async function getDocuments() {
    // Denna funktion behövs oftast inte då vi lyssnar i initializeDataListeners,
    // men kan vara bra som fallback eller manuell refresh.
    return documentsData;
}