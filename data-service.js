// data-service.js
import { db, auth, storage } from "./firebase-config.js"; 
import { onSnapshot, collection, doc, updateDoc, query, where, orderBy, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, renderUserReport, renderContactInfo, updateHeaderColor, toggleSponsorsNavLink, renderProfileInfo, showModal, isAdminLoggedIn, renderSiteSettings, renderCompetitions, renderHomeAchievements, renderClassesAdmin, renderShooterSelector, renderPublicShooterSelector, renderTopLists, renderShootersAdmin, renderSelectableClasses, renderDocumentArchive } from "./ui-handler.js";
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ver. 1.4
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
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    const newsQuery = query(collection(db, 'news'), orderBy('date', 'desc'));
    onSnapshot(newsQuery, (snapshot) => {
        newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.dispatchEvent(new CustomEvent('news-updated'));
    });

    const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'));
    onSnapshot(eventsQuery, (snapshot) => {
        eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.dispatchEvent(new CustomEvent('events-updated'));
    });
    
    const imagesQuery = query(collection(db, 'images'), orderBy('uploadedAt', 'desc'));
    onSnapshot(imagesQuery, (snapshot) => {
        imagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.dispatchEvent(new CustomEvent('images-updated'));
    });

    // Listener för skyttar
    const shootersQuery = query(collection(db, 'shooters'), orderBy('name', 'asc'));
    onSnapshot(shootersQuery, (snapshot) => {
        allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.dispatchEvent(new CustomEvent('shooters-updated'));
    });

    if (auth.currentUser) {
        // --- SKYTTAR ---
        onSnapshot(collection(db, 'shooters'), (snapshot) => { 
            allShootersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            
            // Uppdatera den publika sök-listan (Topplistor)
            renderPublicShooterSelector(allShootersData); 

            if (isAdminLoggedIn) {
                renderShootersAdmin(allShootersData); 
            }
            
            if (latestResultsCache.length > 0) {
                 renderHomeAchievements(latestResultsCache, allShootersData, usersData);
                 renderTopLists(competitionClasses, latestResultsCache, allShootersData, usersData);
            }
        });

        // --- KLASSER (Topplistor) ---
        onSnapshot(collection(db, 'competitionClasses'), (snapshot) => {
            competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Sortera klasserna (t.ex. efter min-ålder)
            competitionClasses.sort((a, b) => a.minAge - b.minAge);
    
            // Rendera admin-listan om vi är admin
            if (isAdminLoggedIn) {
                renderClassesAdmin(competitionClasses);
            }
            
            // Rendera topplistorna
            renderTopLists(competitionClasses, latestResultsCache, allShootersData);
        });

        // --- RESULTAT ---
        onSnapshot(collection(db, 'results'), (snapshot) => {
            const allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            latestResultsCache = allResults; // Spara i en variabel för återanvändning
            
            // Rendera startsidan och topplistor om vi har skytt-data
            if (allShootersData.length > 0) {
                 // VIKTIGT: Skicka med usersData här
                 renderHomeAchievements(latestResultsCache, allShootersData, usersData);
                 renderTopLists(competitionClasses, latestResultsCache, allShootersData, usersData);
            }
        });
    }
    // --- KLASSER (Topplistor) ---
        onSnapshot(collection(db, 'competitionClasses'), (snapshot) => {
            competitionClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            competitionClasses.sort((a, b) => a.minAge - b.minAge);
    
            // Om vi är admin, uppdatera både admin-listan OCH väljaren i "Skapa tävling"
            if (isAdminLoggedIn) {
                renderClassesAdmin(competitionClasses);
                renderSelectableClasses(competitionClasses); // <--- NYTT ANROP HÄR
            }
            
            renderTopLists(competitionClasses, latestResultsCache, allShootersData);
        });
        // --- DOKUMENTARKIV ---
        onSnapshot(collection(db, 'documents'), (snapshot) => {
            documentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Sortera: Kategori A-Ö, sen Datum Nyast-Äldst
            documentsData.sort((a, b) => {
                const catA = a.category || '';
                const catB = b.category || '';
                if (catA === catB) {
                    return new Date(b.uploadedAt?.toDate()) - new Date(a.uploadedAt?.toDate());
                }
                return catA.localeCompare(catB);
            });
            
            // Vi försöker rendera oavsett admin-status. 
            // Om elementet inte finns i HTML (för vanliga users) så händer inget, vilket är helt okej.
            renderDocumentArchive(documentsData);
        });
         // --- ÖVRIGA LYSSNARE ---
        onSnapshot(collection(db, 'news'), (snapshot) => { newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderNews(newsData, isAdminLoggedIn, uid); });
        onSnapshot(collection(db, 'events'), (snapshot) => { eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderEvents(eventsData, isAdminLoggedIn); });
        onSnapshot(collection(db, 'competitions'), (snapshot) => { competitionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderCompetitions(competitionsData, isAdminLoggedIn); });
    
        onSnapshot(collection(db, 'users'), async (snapshot) => { 
        usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderAdminsAndUsers(usersData, isAdminLoggedIn, uid); 
        renderUserReport(usersData);

        if (uid) {
            const myProfile = usersData.find(u => u.id === uid);
            const myShooters = await getMyShooters(uid); // Hämtar dina skyttar
            
            const fakeDocSnap = { exists: () => !!myProfile, data: () => myProfile };
            renderProfileInfo(fakeDocSnap, myShooters); 
            
            // HÄR ÄR NYCKELN: Rendera din dropdown på "Mina Resultat"
            renderShooterSelector(myShooters); 
            
            if (latestResultsCache.length > 0 && allShootersData.length > 0) {
                renderHomeAchievements(latestResultsCache, allShootersData, usersData);
                renderTopLists(competitionClasses, latestResultsCache, allShootersData, usersData);
            }
        }
    });

    onSnapshot(collection(db, 'history'), (snapshot) => { historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderHistory(historyData, isAdminLoggedIn, uid); });
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

// --- STANDARD CRUD-FUNKTIONER ---

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

// --- SHOOTER & RESULT LOGIC ---

// --- SKYTTAR ---
export async function createShooterProfile(name, birthyear, club) {
    if (!auth.currentUser) return { success: false, error: "Du måste vara inloggad." };
    try {
        await addDoc(collection(db, "shooters"), {
            name: name,
            birthyear: parseInt(birthyear),
            club: club,
            parentUserIds: [auth.currentUser.uid],
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating shooter:", error);
        return { success: false, error: error.message };
    }
}

export async function getMyShooters(userId) {
    if (!userId) return [];
    // Filtrera lokalt från allShootersData istället för ny query (snabbare)
    return allShootersData.filter(s => s.parentUserIds && s.parentUserIds.includes(userId));
}

// Spara resultatet
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

// Hämta historik för en specifik skytt
export async function getShooterResults(shooterId) {
    try {
        const q = query(
            collection(db, 'results'), 
            where('shooterId', '==', shooterId),
            where('registeredBy', '==', auth.currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sortera manuellt tills index finns
        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("Fel vid hämtning av resultat:", error);
        return [];
    }
}

// Uppdatera ett resultat (för vanliga användare)
export async function updateUserResult(resultId, data) {
    if (!auth.currentUser) return;
    
    try {
        const docRef = doc(db, 'results', resultId);
        // Säkerhetskoll görs även av Firestore Rules, men bra att ha här
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        showModal('confirmationModal', "Resultatet har uppdaterats!");
    } catch (error) {
        console.error("Fel vid uppdatering av resultat:", error);
        showModal('errorModal', "Kunde inte uppdatera resultatet. Kontrollera att du äger posten.");
    }
}

// Uppdatera skytt-profil (Namn och inställningar)
export async function updateShooterProfile(shooterId, data) {
    // Enkel säkerhetskoll i frontend, reglerna kollar backend
    if (!auth.currentUser) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), data);
        showModal('confirmationModal', "Skyttprofilen uppdaterad!");
    } catch (error) {
        console.error("Fel vid uppdatering av skytt:", error);
        showModal('errorModal', "Kunde inte spara. Kontrollera att du har rättigheter.");
    }
}

// Admin: Koppla en användare till en skytt
export async function linkUserToShooter(shooterId, userId) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'shooters', shooterId), {
            parentUserIds: arrayUnion(userId)
        });
        showModal('confirmationModal', "Användaren har kopplats till skytten!");
    } catch (error) {
        console.error("Fel vid koppling:", error);
        showModal('errorModal', "Kunde inte koppla användaren.");
    }
}

// Beräkna statistik för en skytt
export function calculateShooterStats(results) {
    const currentYear = new Date().getFullYear();
    
    const stats = {
        year: { series: 0, s20: 0, s40: 0, s60: 0 },
        allTime: { series: 0, s20: 0, s40: 0, s60: 0 },
        // NYTT: Räknare för medaljer
        medals: {
            'Guld 3': 0,
            'Guld 2': 0,
            'Guld 1': 0,
            'Guld': 0,
            'Silver': 0,
            'Brons': 0
        }
    };

    results.forEach(res => {
        const resYear = new Date(res.date).getFullYear();
        const isCurrentYear = resYear === currentYear;
        const total = parseFloat(res.total) || 0;
        const bestSeries = parseFloat(res.bestSeries) || 0;
        const count = parseInt(res.shotCount);

        // Rekord-logik
        if (bestSeries > stats.allTime.series) stats.allTime.series = bestSeries;
        if (isCurrentYear && bestSeries > stats.year.series) stats.year.series = bestSeries;

        if (count === 20) {
            if (total > stats.allTime.s20) stats.allTime.s20 = total;
            if (isCurrentYear && total > stats.year.s20) stats.year.s20 = total;
        } else if (count === 40) {
            if (total > stats.allTime.s40) stats.allTime.s40 = total;
            if (isCurrentYear && total > stats.year.s40) stats.year.s40 = total;
        } else if (count === 60) {
            if (total > stats.allTime.s60) stats.allTime.s60 = total;
            if (isCurrentYear && total > stats.year.s60) stats.year.s60 = total;
        }

        // NYTT: Räkna medaljer från seriesMedals-arrayen
        if (res.seriesMedals && Array.isArray(res.seriesMedals)) {
            res.seriesMedals.forEach(medalName => {
                // Om det finns ett medaljnamn och vi har en räknare för det
                if (medalName && stats.medals[medalName] !== undefined) {
                    stats.medals[medalName]++;
                }
            });
        }
    });

    return stats;
}
export async function toggleMemberStatus(userId, currentStatus) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet.");
        return;
    }
    
    // Invertera statusen (om true -> false, om false -> true)
    const newStatus = !currentStatus;
    
    try {
        await updateDoc(doc(db, 'users', userId), {
            isMember: newStatus
        });
        const msg = newStatus ? "Användaren är nu godkänd som medlem." : "Användarens medlemskap har inaktiverats.";
        showModal('confirmationModal', msg);
    } catch (error) {
        console.error("Fel vid ändring av medlemskap:", error);
        showModal('errorModal', "Kunde inte ändra status.");
    }
}

// --- DOKUMENT (FIXAD FUNKTION) ---
export async function uploadDocumentFile(file, name, category) {
    try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // FIX: Nu är 'storage' definierad via importen högst upp
        const storageRef = ref(storage, `documents/${category}/${timestamp}_${safeName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const progressBar = document.querySelector('#doc-upload-progress div');
                    const progressContainer = document.getElementById('doc-upload-progress');
                    if(progressBar && progressContainer) {
                        progressContainer.classList.remove('hidden');
                        progressBar.style.width = progress + '%';
                    }
                },
                (error) => {
                    console.error("Upload error:", error);
                    reject(error); // Detta gör att koden stannar och visar fel
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
        throw error; // Kasta felet vidare så vi ser det i UI
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
    // Hämtning sker i UI via onSnapshot eller liknande om du vill ha realtid,
    // eller så lägger du till en listener i initializeDataListeners ovan.
    // För nu räcker det att ui-handler.js hanterar visningen.
    return []; 
}