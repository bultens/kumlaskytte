// competition-service.js
import { db, auth } from "./firebase-config.js";
import { 
    collection, addDoc, updateDoc, doc, query, where, getDocs, 
    serverTimestamp, orderBy, getDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";

// --- TÄVLINGAR (ADMIN) ---

// Skapa ny tävling
export async function createCompetition(compData) {
    if (!isAdminLoggedIn) return;

    try {
        await addDoc(collection(db, 'competitions'), {
            ...compData,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        showModal('confirmationModal', "Tävlingen har skapats!");
    } catch (error) {
        console.error("Fel vid skapande av tävling:", error);
        showModal('errorModal', "Kunde inte skapa tävling.");
    }
}

// Hämta alla tävlingar (både aktiva och gamla)
export async function getAllCompetitions() {
    const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ANMÄLAN (USER) ---

// Anmäl en skytt till en tävling
export async function signupForCompetition(compId, shooterId, classId, clubName, cost) {
    try {
        // Generera en unik referens för Swish: "T[CompShort]-S[ShooterShort]"
        // Vi använder en enkel timestamp-hash för demo, men i prod kan man ta de sista tecknen av IDt.
        const refCode = `T${compId.substring(0,3).toUpperCase()}-${shooterId.substring(0,3).toUpperCase()}-${Math.floor(Math.random()*100)}`;
        
        // Sätt status beroende på om det kostar något
        const initialStatus = cost > 0 ? 'pending_payment' : 'approved';

        const docRef = await addDoc(collection(db, 'competition_signups'), {
            competitionId: compId,
            userId: auth.currentUser.uid,
            shooterId: shooterId,
            classId: classId,
            clubName: clubName, // NYTT: Klubbtillhörighet
            paymentStatus: initialStatus,
            paymentReference: refCode,
            signedUpAt: serverTimestamp()
        });

        // Uppdatera Swish-rutan i UI med referenskoden
        return { success: true, refCode: refCode, signupId: docRef.id };

    } catch (error) {
        console.error("Fel vid anmälan:", error);
        showModal('errorModal', "Anmälan misslyckades.");
        return { success: false };
    }
}

// Hämta mina anmälningar
export async function getMySignups() {
    if (!auth.currentUser) return [];
    const q = query(collection(db, 'competition_signups'), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- RESULTATRAPPORTERING ---

export async function submitCompetitionResult(entryData) {
    try {
        // Kolla deadline en gång till backend-side (eller lita på UI för MVP)
        // entryData innehåller: { competitionId, shooterId, roundId, score, series, imageUrl, isLate, ... }
        
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

// --- ADMIN HANTERING ---

// Hämta anmälningar som väntar på betalning (för en viss tävling eller alla)
export async function getPendingSignups() {
    if (!isAdminLoggedIn) return [];
    const q = query(collection(db, 'competition_signups'), where('paymentStatus', '==', 'pending_payment'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Godkänn betalning
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