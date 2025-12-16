// competition-ui.js
import { auth } from "./firebase-config.js";
import { 
    competitionClasses, allShootersData, getMyShooters 
} from "./data-service.js";
import { 
    createCompetition, getAllCompetitions, signupForCompetition, 
    getMySignups, submitCompetitionResult, getPendingSignups, approveSignupPayment 
} from "./competition-service.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Håller koll på laddad data lokalt för UI-uppdateringar
let activeCompetitions = [];
let mySignups = [];
let roundsCounter = 0;

export async function initCompetitionSystem() {
    console.log("Initierar Tävlingssystemet...");
    setupEventListeners();
    
    // Ladda data
    activeCompetitions = await getAllCompetitions();
    
    if (auth.currentUser) {
        mySignups = await getMySignups();
        renderUserLobby();
    }
    
    if (isAdminLoggedIn) {
        renderAdminView();
        populateClassCheckboxes(); // Fyller i klasserna i "Skapa tävling"
    }
}

function setupEventListeners() {
    // --- ADMIN: SKAPA TÄVLING ---
    const addRoundBtn = document.getElementById('add-round-btn');
    if (addRoundBtn) {
        addRoundBtn.addEventListener('click', () => addRoundInput());
    }

    const createCompForm = document.getElementById('create-comp-form');
    if (createCompForm) {
        createCompForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleCreateCompetition();
        });
    }

    // --- ADMIN: TABBAR ---
    const tabSignups = document.getElementById('tab-admin-signups');
    const tabReviews = document.getElementById('tab-admin-reviews');
    if (tabSignups && tabReviews) {
        tabSignups.addEventListener('click', () => {
            document.getElementById('admin-signups-list').classList.remove('hidden');
            document.getElementById('admin-reviews-list').classList.add('hidden');
            tabSignups.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            tabReviews.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            renderAdminSignupsList();
        });
        tabReviews.addEventListener('click', () => {
            document.getElementById('admin-signups-list').classList.add('hidden');
            document.getElementById('admin-reviews-list').classList.remove('hidden');
            tabReviews.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            tabSignups.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            // Här kan vi lägga till renderAdminReviewsList() senare
        });
    }

    // --- USER: ANMÄLAN ---
    const signupForm = document.getElementById('comp-signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSignupSubmit();
        });
    }

    const closeSignupModal = document.getElementById('close-signup-modal');
    if (closeSignupModal) {
        closeSignupModal.addEventListener('click', () => {
            document.getElementById('compSignupModal').classList.remove('active');
        });
    }

    // --- USER: RAPPORTERING ---
    const userCompSelect = document.getElementById('user-comp-select');
    if (userCompSelect) {
        userCompSelect.addEventListener('change', (e) => {
            updateReportingUI(e.target.value);
        });
    }

    const reportDateInput = document.getElementById('report-date');
    if (reportDateInput) {
        reportDateInput.addEventListener('change', checkDeadlineStatus);
    }

    const reportForm = document.getElementById('submit-comp-result-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleResultSubmit();
        });
    }
}

// ==========================================
//              ADMIN FUNKTIONER
// ==========================================

function addRoundInput() {
    roundsCounter++;
    const container = document.getElementById('comp-rounds-container');
    const div = document.createElement('div');
    div.className = "flex space-x-2 items-center";
    div.innerHTML = `
        <input type="text" placeholder="Namn (t.ex. Omgång ${roundsCounter})" class="round-name w-1/2 p-2 border rounded text-sm">
        <input type="date" class="round-deadline w-1/2 p-2 border rounded text-sm">
        <button type="button" class="text-red-500 font-bold px-2 remove-round-btn">×</button>
    `;
    div.querySelector('.remove-round-btn').onclick = () => div.remove();
    container.appendChild(div);
}

function populateClassCheckboxes() {
    const container = document.getElementById('comp-classes-select-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (competitionClasses.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500">Inga klasser hämtade än.</p>';
        return;
    }

    competitionClasses.forEach(cls => {
        const label = document.createElement('label');
        label.className = "flex items-center space-x-2 text-sm";
        label.innerHTML = `
            <input type="checkbox" value="${cls.id}" class="comp-class-checkbox w-4 h-4 text-blue-600">
            <span>${cls.name} (${cls.discipline})</span>
        `;
        container.appendChild(label);
    });
}

async function handleCreateCompetition() {
    // Samla in rounds
    const rounds = [];
    document.querySelectorAll('#comp-rounds-container > div').forEach(div => {
        const name = div.querySelector('.round-name').value;
        const deadline = div.querySelector('.round-deadline').value;
        if (name && deadline) rounds.push({ name, deadline });
    });

    // Samla in klasser
    const selectedClasses = [];
    document.querySelectorAll('.comp-class-checkbox:checked').forEach(cb => {
        selectedClasses.push(cb.value);
    });

    const compData = {
        name: document.getElementById('new-comp-name').value,
        swishNumber: document.getElementById('new-comp-swish').value,
        startDate: document.getElementById('new-comp-start').value,
        endDate: document.getElementById('new-comp-end').value,
        cost: parseInt(document.getElementById('new-comp-cost').value) || 0,
        rules: {
            allowDecimals: document.getElementById('rule-decimals').checked,
            requireImageAlways: document.getElementById('rule-image-req').checked
        },
        rounds: rounds,
        allowedClasses: selectedClasses
    };

    await createCompetition(compData);
    document.getElementById('create-comp-form').reset();
    document.getElementById('comp-rounds-container').innerHTML = '';
    activeCompetitions = await getAllCompetitions(); // Uppdatera listan
    renderUserLobby(); // Uppdatera för användaren direkt
}

async function renderAdminSignupsList() {
    const container = document.getElementById('admin-signups-list');
    container.innerHTML = '<p class="text-gray-500">Laddar...</p>';
    
    const pending = await getPendingSignups();
    container.innerHTML = '';

    if (pending.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga väntande betalningar.</p>';
        return;
    }

    pending.forEach(signup => {
        // Hitta tävlingsnamn och skyttnamn (kräver att vi har datan laddad, förenklat här)
        const comp = activeCompetitions.find(c => c.id === signup.competitionId);
        const compName = comp ? comp.name : 'Okänd tävling';
        // För shooterName behöver vi egentligen slå upp IDt, men vi visar ID/Ref så länge
        
        const div = document.createElement('div');
        div.className = "p-3 border rounded flex justify-between items-center bg-white";
        div.innerHTML = `
            <div>
                <p class="font-bold text-gray-800">${compName}</p>
                <p class="text-sm text-gray-600">Referens: <span class="font-mono font-bold bg-yellow-100 px-1">${signup.paymentReference}</span></p>
                <p class="text-xs text-gray-500">Klubb: ${signup.clubName || '-'}</p>
            </div>
            <button class="approve-payment-btn bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-600" data-id="${signup.id}">
                Godkänn
            </button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.approve-payment-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await approveSignupPayment(e.target.dataset.id);
            renderAdminSignupsList(); // Ladda om listan
        });
    });
}

function renderAdminView() {
    renderAdminSignupsList();
}


// ==========================================
//              USER FUNKTIONER
// ==========================================

function renderUserLobby() {
    const container = document.getElementById('active-competitions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    // Filtrera fram aktiva tävlingar
    const active = activeCompetitions.filter(c => c.isActive && c.endDate >= today);

    if (active.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full text-center">Inga aktiva tävlingar just nu.</p>';
        return;
    }

    active.forEach(comp => {
        const div = document.createElement('div');
        div.className = "card border-l-4 border-green-500 p-4 hover:shadow-lg transition";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-bold text-blue-900">${comp.name}</h3>
                <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Pris: ${comp.cost} kr</span>
            </div>
            <p class="text-sm text-gray-600 mb-4">Pågår till: ${comp.endDate}</p>
            <button class="signup-modal-btn w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700" data-id="${comp.id}">
                Anmäl dig här
            </button>
        `;
        container.appendChild(div);
    });

    // Koppla knappar
    document.querySelectorAll('.signup-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openSignupModal(e.target.dataset.id));
    });

    // Uppdatera även dropdown för rapportering
    populateUserReportingDropdown();
}

async function openSignupModal(compId) {
    const comp = activeCompetitions.find(c => c.id === compId);
    if (!comp) return;

    document.getElementById('signup-comp-name').textContent = comp.name;
    document.getElementById('signup-comp-id').value = comp.id;
    document.getElementById('swish-info-box').classList.add('hidden');
    document.getElementById('confirm-signup-btn').classList.remove('hidden');

    // Fyll skyttar
    const shooterSelect = document.getElementById('signup-shooter-select');
    shooterSelect.innerHTML = '';
    const myShooters = await getMyShooters(auth.currentUser.uid);
    
    if (myShooters.length === 0) {
        shooterSelect.innerHTML = '<option>Inga profiler (skapa en först)</option>';
    } else {
        myShooters.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            shooterSelect.appendChild(opt);
        });
    }

    // Fyll klasser
    const classSelect = document.getElementById('signup-class-select');
    classSelect.innerHTML = '';
    if (comp.allowedClasses && comp.allowedClasses.length > 0) {
        // Filtrera globala klasser mot tävlingens tillåtna IDn
        const allowed = competitionClasses.filter(c => comp.allowedClasses.includes(c.id));
        allowed.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.discipline})`;
            classSelect.appendChild(opt);
        });
    } else {
        classSelect.innerHTML = '<option value="open">Öppen klass</option>';
    }

    document.getElementById('compSignupModal').classList.add('active');
}

async function handleSignupSubmit() {
    const compId = document.getElementById('signup-comp-id').value;
    const shooterId = document.getElementById('signup-shooter-select').value;
    const classId = document.getElementById('signup-class-select').value;
    const clubName = document.getElementById('signup-club-name').value;
    
    const comp = activeCompetitions.find(c => c.id === compId);
    
    const result = await signupForCompetition(compId, shooterId, classId, clubName, comp.cost);
    
    if (result.success) {
        if (comp.cost > 0) {
            // Visa Swish
            const swishData = `C${comp.swishNumber};${comp.cost};${result.refCode};0`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(swishData)}`;
            
            document.getElementById('swish-qr-code').src = qrUrl;
            document.getElementById('swish-msg-ref').textContent = result.refCode;
            document.getElementById('swish-info-box').classList.remove('hidden');
            document.getElementById('confirm-signup-btn').classList.add('hidden'); // Göm anmäl-knappen så man inte klickar igen
            
            // Uppdatera lokal lista så vi kan rapportera när betalning är klar
            mySignups = await getMySignups(); 
        } else {
            showModal('confirmationModal', 'Anmälan klar!');
            document.getElementById('compSignupModal').classList.remove('active');
            mySignups = await getMySignups();
            populateUserReportingDropdown();
        }
    }
}

function populateUserReportingDropdown() {
    const select = document.getElementById('user-comp-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Välj Tävling --</option>';
    
    // Hitta tävlingar där jag har en godkänd anmälan
    const approvedSignups = mySignups.filter(s => s.paymentStatus === 'approved');

    if (approvedSignups.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = "(Inga godkända anmälningar än)";
        opt.disabled = true;
        select.appendChild(opt);
        return;
    }

    approvedSignups.forEach(signup => {
        const comp = activeCompetitions.find(c => c.id === signup.competitionId);
        if (!comp) return;
        
        // Hitta skyttens namn
        const shooter = allShootersData.find(s => s.id === signup.shooterId);
        const shooterName = shooter ? shooter.name : 'Okänd';

        const opt = document.createElement('option');
        opt.value = signup.id; // Vi använder anmälnings-IDt som nyckel
        opt.textContent = `${comp.name} - ${shooterName}`;
        opt.dataset.compId = comp.id;
        opt.dataset.shooterId = signup.shooterId;
        select.appendChild(opt);
    });
}

function updateReportingUI(signupId) {
    const area = document.getElementById('comp-reporting-area');
    if (!signupId) {
        area.classList.add('hidden');
        return;
    }

    const signup = mySignups.find(s => s.id === signupId);
    const comp = activeCompetitions.find(c => c.id === signup.competitionId);
    
    if (!signup || !comp) return;

    document.getElementById('reporting-comp-name').textContent = comp.name;
    document.getElementById('report-comp-id').value = comp.id;
    document.getElementById('report-shooter-id').value = signup.shooterId;
    
    // Statusbadge
    const badge = document.getElementById('reporting-status-badge');
    badge.textContent = "Klar att rapportera";
    badge.className = "bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded";

    // Omgångsinfo
    let roundInfo = "Öppen tävling (inga delmoment)";
    let currentRoundId = "open";
    
    if (comp.rounds && comp.rounds.length > 0) {
        // Hitta aktuell omgång baserat på datum
        const today = new Date().toISOString().split('T')[0];
        const currentRound = comp.rounds.find(r => r.deadline >= today) || comp.rounds[comp.rounds.length - 1]; // Eller sista omgången
        
        roundInfo = `Aktuell omgång: ${currentRound.name} (Deadline: ${currentRound.deadline})`;
        currentRoundId = currentRound.name;
        
        // Sätt deadline på datumväljaren
        document.getElementById('report-date').max = currentRound.deadline;
        document.getElementById('report-date').dataset.deadline = currentRound.deadline;
    }
    
    document.getElementById('reporting-round-info').textContent = roundInfo;
    document.getElementById('report-round-id').value = currentRoundId;

    // Generera serie-inputs (standard 4 serier för tävling ofta, men vi kan göra det dynamiskt senare)
    const seriesContainer = document.getElementById('report-series-container');
    seriesContainer.innerHTML = '';
    for(let i=1; i<=4; i++) {
        const inp = document.createElement('input');
        inp.type = "number";
        inp.placeholder = `S${i}`;
        inp.className = "p-2 border rounded text-center series-score-input";
        if(comp.rules.allowDecimals) inp.step = "0.1";
        seriesContainer.appendChild(inp);
    }
    
    // Uppdatera total live
    seriesContainer.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
            let tot = 0;
            seriesContainer.querySelectorAll('input').forEach(i => tot += parseFloat(i.value) || 0);
            document.getElementById('report-score').value = Number(tot.toFixed(1));
        });
    });

    area.classList.remove('hidden');
}

function checkDeadlineStatus() {
    const inputDate = document.getElementById('report-date').value;
    const deadline = document.getElementById('report-date').dataset.deadline;
    const warning = document.getElementById('late-warning');
    const imgLabel = document.getElementById('img-req-label');

    if (deadline && inputDate > deadline) {
        warning.classList.remove('hidden');
        imgLabel.textContent = "(OBLIGATORISKT pga sent datum)";
        imgLabel.classList.add('text-red-600', 'font-bold');
    } else {
        warning.classList.add('hidden');
        imgLabel.textContent = "(Valfritt)";
        imgLabel.classList.remove('text-red-600', 'font-bold');
    }
}

async function handleResultSubmit() {
    const compId = document.getElementById('report-comp-id').value;
    const shooterId = document.getElementById('report-shooter-id').value;
    const roundId = document.getElementById('report-round-id').value;
    const score = parseFloat(document.getElementById('report-score').value);
    const date = document.getElementById('report-date').value;
    
    const deadline = document.getElementById('report-date').dataset.deadline;
    const isLate = deadline && date > deadline;
    
    const fileInput = document.getElementById('report-image-upload');
    const file = fileInput.files[0];

    // Validering
    if (isLate && !file) {
        showModal('errorModal', "Du MÅSTE ladda upp en bild eftersom deadline passerat.");
        return;
    }
    
    let imageUrl = null;
    if (file) {
        // Ladda upp bild logic (förenklad)
        const progressDiv = document.getElementById('report-upload-progress');
        progressDiv.classList.remove('hidden');
        const progressBar = progressDiv.firstElementChild;
        
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `competition_proofs/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snap) => progressBar.style.width = (snap.bytesTransferred/snap.totalBytes)*100 + "%",
                    (err) => reject(err),
                    () => resolve()
                );
            });
            imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        } catch(e) {
            showModal('errorModal', "Bilduppladdning misslyckades.");
            return;
        }
    }

    const series = [];
    document.querySelectorAll('.series-score-input').forEach(i => series.push(parseFloat(i.value)||0));

    const entryData = {
        competitionId: compId,
        shooterId: shooterId,
        roundId: roundId,
        score: score,
        series: series,
        date: date,
        imageUrl: imageUrl,
        isLate: isLate
    };

    const success = await submitCompetitionResult(entryData);
    if (success) {
        document.getElementById('submit-comp-result-form').reset();
        document.getElementById('comp-reporting-area').classList.add('hidden');
        document.getElementById('report-upload-progress').classList.add('hidden');
    }
}