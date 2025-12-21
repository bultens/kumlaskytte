// competition-service.js
import { db, auth } from "./firebase-config.js";
import { 
    collection, addDoc, updateDoc, doc, query, where, getDocs, 
    serverTimestamp, orderBy , writeBatch, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";

// VIKTIGT: Vi byter namn till 'online_competitions' för att inte krocka med vanliga 'competitions'

// --- TÄVLINGAR (ADMIN) ---

// Skapa ny tävling
export async function createCompetition(compData) {
try {
        await addDoc(collection(db, 'online_competitions'), {
            ...compData,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        showModal('confirmationModal', "Tävlingen har skapats!");
    } catch (error) {
        console.error("Fel vid skapande av tävling:", error); // Kolla webbläsarens konsol (F12) om detta sker
        showModal('errorModal', "Kunde inte skapa tävling: " + error.message);
    }
}

// Hämta alla tävlingar
export async function getAllCompetitions() {
    const q = query(collection(db, 'online_competitions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Uppdatera en tävling
export async function updateCompetition(compId, data) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'online_competitions', compId), data);
        showModal('confirmationModal', "Tävlingen har uppdaterats!");
    } catch (error) {
        console.error("Fel vid uppdatering:", error);
        showModal('errorModal', "Kunde inte uppdatera.");
    }
}

// --- ANMÄLAN (USER) ---

// Hanterar gruppanmälan (Batch)
export async function submitBulkSignup(compId, signupsList, clubName, totalOrderCost) {
    try {
        const batch = writeBatch(db);
        
        // Skapa en gemensam referens för hela ordern
        // Format: G (Group) - TävlingID - Random
        const paymentRef = `G${compId.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Status: Om det kostar något är det "pending", annars "approved"
        const initialStatus = totalOrderCost > 0 ? 'pending_payment' : 'approved';
        const timestamp = serverTimestamp();

        // Loopa igenom varje skytt i listan och skapa en anmälan
        signupsList.forEach(item => {
            const docRef = doc(collection(db, 'competition_signups')); // Skapa nytt ID
            
            batch.set(docRef, {
                competitionId: compId,
                userId: auth.currentUser.uid, // Den som gör anmälan (admin för familjen/klubben)
                shooterId: item.shooterId,
                classIds: item.classIds,      // Array av klass-IDn
                clubName: clubName,
                paymentStatus: initialStatus,
                paymentReference: paymentRef, // Alla får samma ref!
                cost: item.cost,              // Vad just denna skytt kostade
                isGroupSignup: true,          // Flagga för admin
                signedUpAt: timestamp
            });
        });

        // Kör allt mot databasen
        await batch.commit();

        return { success: true, refCode: paymentRef };

    } catch (error) {
        console.error("Fel vid gruppanmälan:", error);
        showModal('errorModal', "Kunde inte genomföra anmälan.");
        return { success: false };
    }
}

export async function getMySignups() {
    if (!auth.currentUser) return [];
    const q = query(collection(db, 'competition_signups'), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- RESULTATRAPPORTERING ---

export async function submitCompetitionResult(entryData) {
    try {
        const status = entryData.isLate ? 'pending_review' : 'approved';
        
        await addDoc(collection(db, 'competition_entries'), {
            ...entryData,
            status: status,
            submittedAt: serverTimestamp(),
            submittedBy: auth.currentUser.uid
        });

        const msg = entryData.isLate 
            ? "Resultat inskickat för granskning (pga sen inlämning)." 
            : "Resultat registrerat!";
            
        showModal('confirmationModal', msg);
        return true;
    } catch (error) {
        console.error("Fel vid inskick av resultat:", error);
        showModal('errorModal', "Kunde inte skicka resultat.");
        return false;
    }
}

export async function getCompetitionEntries(compId) {
    try {
        const q = query(collection(db, 'competition_entries'), where('competitionId', '==', compId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Kunde inte hämta tävlingsresultat:", error);
        return [];
    }
}

// --- ADMIN HANTERING ---

export async function getPendingSignups() {
    if (!isAdminLoggedIn) return [];
    const q = query(collection(db, 'competition_signups'), where('paymentStatus', '==', 'pending_payment'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function approveSignupPayment(signupId) {
    if (!isAdminLoggedIn) return;
    try {
        await updateDoc(doc(db, 'competition_signups', signupId), {
            paymentStatus: 'approved'
        });
        showModal('confirmationModal', "Betalning godkänd!");
    } catch (e) {
        showModal('errorModal', "Kunde inte godkänna.");
    }
}

export async function deleteCompetitionFull(compId) {
    if (!isAdminLoggedIn) return;

    try {
        const batch = writeBatch(db);

        // 1. Hämta och radera tävlingen
        const compRef = doc(db, 'online_competitions', compId);
        batch.delete(compRef);

        // 2. Hämta och radera alla anmälningar
        const signupsQ = query(collection(db, 'competition_signups'), where('competitionId', '==', compId));
        const signupsSnap = await getDocs(signupsQ);
        signupsSnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 3. Hämta och radera alla inskickade resultat
        const entriesQ = query(collection(db, 'competition_entries'), where('competitionId', '==', compId));
        const entriesSnap = await getDocs(entriesQ);
        entriesSnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Kör allt
        await batch.commit();
        showModal('confirmationModal', "Tävlingen och all tillhörande data har raderats.");
        return true;

    } catch (error) {
        console.error("Fel vid borttagning av tävling:", error);
        showModal('errorModal', "Kunde inte ta bort tävlingen helt. Kontrollera behörigheter.");
        return false;
    }
}
// --- HANTERA ONLINE-KLASSER ---

export async function createOnlineClass(classData) {
    if (!isAdminLoggedIn) return;
    try {
        await addDoc(collection(db, 'online_competition_classes'), classData);
        showModal('confirmationModal', "Ny tävlingsklass skapad!");
        return true;
    } catch (e) {
        console.error(e);
        showModal('errorModal', "Kunde inte skapa klass.");
        return false;
    }
}

export async function getOnlineClasses() {
    // Hämtar de specifika klasserna för onlinetävlingar
    const q = query(collection(db, 'online_competition_classes'), orderBy('minAge'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteOnlineClass(classId) {
    if (!isAdminLoggedIn) return;
    try {
        await deleteDoc(doc(db, 'online_competition_classes', classId));
        return true;
    } catch (e) {
        showModal('errorModal', "Kunde inte ta bort klass.");
        return false;
    }
}