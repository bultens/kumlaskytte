// competition-service.js
import { db, auth } from "./firebase-config.js";
import { 
    collection, addDoc, updateDoc, doc, query, where, getDocs, 
    serverTimestamp, orderBy , writeBatch, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";

// --- TÄVLINGAR (ADMIN) ---

export async function createCompetition(compData) {
    if (!isAdminLoggedIn) return;
    try {
        await addDoc(collection(db, 'online_competitions'), {
            ...compData,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        showModal('confirmationModal', "Tävlingen har skapats!");
    } catch (error) {
        showModal('errorModal', "Kunde inte skapa tävling: " + error.message);
    }
}

export async function getAllCompetitions() {
    const q = query(collection(db, 'online_competitions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateCompetition(compId, data) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'online_competitions', compId), data);
        showModal('confirmationModal', "Tävlingen uppdaterad!");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte uppdatera tävling.");
        return false;
    }
}

export async function deleteCompetitionFull(compId) {
    if (!isAdminLoggedIn) return;
    try {
        const signupsQ = query(collection(db, 'competition_signups'), where('competitionId', '==', compId));
        const signupsSnap = await getDocs(signupsQ);
        const entriesQ = query(collection(db, 'competition_entries'), where('competitionId', '==', compId));
        const entriesSnap = await getDocs(entriesQ);

        const batch = writeBatch(db);
        batch.delete(doc(db, 'online_competitions', compId));
        signupsSnap.forEach(doc => batch.delete(doc.ref));
        entriesSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        showModal('confirmationModal', "Tävlingen raderad.");
        return true;
    } catch (error) {
        showModal('errorModal', "Fel vid borttagning.");
        return false;
    }
}

// --- ONLINE KLASSER (SYSTEM 2) ---
// Dessa hanterar samlingen 'online_competition_classes'

export async function createOnlineClass(classData) {
    if (!isAdminLoggedIn) return;
    try {
        await addDoc(collection(db, 'online_competition_classes'), classData);
        showModal('confirmationModal', "Ny online-klass skapad!");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte skapa klass.");
        return false;
    }
}

export async function updateOnlineClass(classId, classData) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'online_competition_classes', classId), classData);
        showModal('confirmationModal', "Online-klass uppdaterad!");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte uppdatera klass.");
        return false;
    }
}

export async function deleteOnlineClass(classId) {
    if (!isAdminLoggedIn) return;
    try {
        await deleteDoc(doc(db, 'online_competition_classes', classId));
        showModal('confirmationModal', "Online-klass borttagen.");
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte ta bort klass.");
        return false;
    }
}

export async function getOnlineClasses() {
    const q = query(collection(db, 'online_competition_classes'), orderBy('minAge'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// --- ANMÄLNINGAR & RESULTAT ---

export async function getMySignups() {
    if (!auth.currentUser) return [];
    const q = query(collection(db, 'competition_signups'), where('userId', '==', auth.currentUser.uid));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function submitBulkSignup(signups, totalPrice) {
    if (!auth.currentUser) return false;
    const batch = writeBatch(db);
    signups.forEach(signup => {
        const ref = doc(collection(db, 'competition_signups'));
        batch.set(ref, {
            ...signup, userId: auth.currentUser.uid, registeredAt: serverTimestamp(),
            status: 'pending', paymentStatus: 'pending', totalBatchPrice: totalPrice
        });
    });
    try { await batch.commit(); return true; } 
    catch (e) { showModal('errorModal', "Fel vid anmälan."); return false; }
}

export async function getPendingSignups() {
    const q = query(collection(db, 'competition_signups'), orderBy('registeredAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function approveSignupPayment(signupId) {
    try {
        await updateDoc(doc(db, 'competition_signups', signupId), { paymentStatus: 'paid', status: 'confirmed' });
        return true;
    } catch (e) { return false; }
}

export async function submitCompetitionResult(entryData) {
    try {
        await addDoc(collection(db, 'competition_entries'), { ...entryData, submittedAt: serverTimestamp(), userId: auth.currentUser.uid });
        showModal('confirmationModal', "Resultat inskickat!");
        return true;
    } catch (e) { showModal('errorModal', "Kunde inte skicka resultat."); return false; }
}

export async function getCompetitionEntries(compId) {
    const q = query(collection(db, 'competition_entries'), where('competitionId', '==', compId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}