// data-service.js
import { db, auth, storage } from "./firebase-config.js"; 
import { onSnapshot, collection, doc, updateDoc, query, where, orderBy, getDocs, writeBatch, setDoc, serverTimestamp, addDoc, deleteDoc, getDoc as getFirestoreDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderNews, renderEvents, renderHistory, renderImages, renderSponsors, renderAdminsAndUsers, renderProfileInfo, showModal, isAdminLoggedIn, renderSiteSettings, renderClassesAdmin, renderShooterSelector, renderShootersAdmin, renderDocumentArchive, renderHomeAchievements, renderTopLists, renderProfilePage } from "./ui-handler.js";
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

export let newsData = [], eventsData = [], historyData = [], usersData = [], sponsorsData = [], allShootersData = [], latestResultsCache = [], standardClasses = [], documentsData = [], imagesData = [];

export function initializeDataListeners() {
    const uid = auth.currentUser ? auth.currentUser.uid : null;

    onSnapshot(query(collection(db, "news"), orderBy("date", "desc")), (s) => { newsData = s.docs.map(d=>({id:d.id,...d.data()})); renderNews(newsData, isAdminLoggedIn, uid); });
    onSnapshot(query(collection(db, "events"), orderBy("date", "asc")), (s) => { eventsData = s.docs.map(d=>({id:d.id,...d.data()})); renderEvents(eventsData, isAdminLoggedIn); });
    onSnapshot(collection(db, "history"), (s) => { historyData = s.docs.map(d=>({id:d.id,...d.data()})); renderHistory(historyData, isAdminLoggedIn, uid); });
    onSnapshot(query(collection(db, "images"), orderBy("priority", "desc")), (s) => { imagesData = s.docs.map(d=>({id:d.id,...d.data()})); renderImages(imagesData, isAdminLoggedIn); });
    onSnapshot(collection(db, "sponsors"), (s) => { sponsorsData = s.docs.map(d=>({id:d.id,...d.data()})); renderSponsors(sponsorsData, isAdminLoggedIn); });
    
    // Klasser (Standard)
    onSnapshot(query(collection(db, "competitionClasses"), orderBy("minAge")), (s) => { 
        standardClasses = s.docs.map(d=>({id:d.id,...d.data()})); 
        if(typeof renderClassesAdmin === 'function') renderClassesAdmin(standardClasses);
        updateCalculations();
    });

    // Settings
    onSnapshot(collection(db, "settings"), (s) => {
        const set = {}; s.forEach(d=>set[d.id]=d.data());
        if(typeof renderSiteSettings === 'function') renderSiteSettings(set);
        if(set.design) {
            import("./ui-handler.js").then(mod => {
                mod.updateHeaderColor(set.design.headerColor);
                mod.toggleSponsorsNavLink(set.design.showSponsors);
            });
        }
    });
    
    // Resultat
    onSnapshot(query(collection(db, "results"), orderBy("date", "desc")), (s) => {
        latestResultsCache = s.docs.map(d=>({id:d.id,...d.data()}));
        if(typeof renderHomeAchievements === 'function') renderHomeAchievements(latestResultsCache, allShootersData);
        updateCalculations();
    });

    if (uid) {
        onSnapshot(collection(db, "users"), (s) => { usersData = s.docs.map(d=>({id:d.id,...d.data()})); renderAdminsAndUsers(usersData, isAdminLoggedIn, uid); });
        onSnapshot(collection(db, "shooters"), (s) => { 
            allShootersData = s.docs.map(d=>({id:d.id,...d.data()})); 
            renderShooterSelector(allShootersData); 
            renderShootersAdmin(allShootersData);
            updateCalculations();
        });
        if (isAdminLoggedIn) {
             onSnapshot(query(collection(db, "documents"), orderBy("uploadedAt", "desc")), (s) => { documentsData = s.docs.map(d=>({id:d.id,...d.data()})); renderDocumentArchive(documentsData); });
        }
    }
}

function updateCalculations() {
    if(latestResultsCache.length > 0 && standardClasses.length > 0 && allShootersData.length > 0) {
        renderTopLists(standardClasses, latestResultsCache, allShootersData);
        if(auth.currentUser) renderProfilePage(latestResultsCache, allShootersData);
    }
}

// CRUD & UPLOAD
export async function createClass(data) { await addDoc(collection(db, 'competitionClasses'), data); return true; }
export async function updateClass(id, data) { await updateDoc(doc(db, 'competitionClasses', id), data); return true; }
export async function addOrUpdateDocument(col, id, data, msg) {
    if(id) await updateDoc(doc(db, col, id), data); else await addDoc(collection(db, col), {...data, createdAt: serverTimestamp()});
    showModal('confirmationModal', msg);
}
export async function deleteDocument(col, id) { await deleteDoc(doc(db, col, id)); showModal('confirmationModal', "Borttaget."); }
export async function toggleLike(id, count, likes) {
    const ref = doc(db, "news", id);
    if(likes.includes(auth.currentUser.uid)) await updateDoc(ref, { likes: count-1, likedBy: arrayRemove(auth.currentUser.uid) });
    else await updateDoc(ref, { likes: count+1, likedBy: arrayUnion(auth.currentUser.uid) });
}
export async function toggleMemberStatus(id, status) { await updateDoc(doc(db, "users", id), { isMember: !status }); }
export async function addAdminFromUser(id) { await updateDoc(doc(db, "users", id), { isAdmin: true }); }
export async function deleteAdmin(id) { await updateDoc(doc(db, "users", id), { isAdmin: false }); }
export async function updateSiteSettings(s) { await setDoc(doc(db, "settings", "design"), s); showModal('confirmationModal', "Sparat."); }
export async function linkUserToShooter(uid, sid) { await updateDoc(doc(db, 'shooters', sid), { parentUserIds: arrayUnion(uid) }); showModal('confirmationModal', "Kopplad."); }
export async function saveResult(data) { await addDoc(collection(db, "results"), {...data, registeredBy: auth.currentUser.uid, registeredAt: serverTimestamp()}); }
export async function uploadDocumentFile(file, name, cat) {
    const refPtr = ref(storage, `documents/${Date.now()}_${file.name}`);
    const snap = await uploadBytesResumable(refPtr, file);
    const url = await getDownloadURL(snap.ref);
    await addDoc(collection(db, 'documents'), { name, category: cat, url, uploadedAt: serverTimestamp(), uploadedBy: auth.currentUser.uid });
    return true;
}
export async function addSponsor(name, file, website, id=null) {
    let url = '';
    if(file) {
        const refPtr = ref(storage, `sponsors/${Date.now()}_${file.name}`);
        const snap = await uploadBytesResumable(refPtr, file);
        url = await getDownloadURL(snap.ref);
    }
    const data = { name, website };
    if(url) data.imageUrl = url;
    if(id) await updateDoc(doc(db, 'sponsors', id), data);
    else await addDoc(collection(db, 'sponsors'), {...data, imageUrl: url || ''});
    showModal('confirmationModal', "Sponsor sparad!");
}