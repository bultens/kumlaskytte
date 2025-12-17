// competition-ui.js
import { auth } from "./firebase-config.js";
import { 
    competitionClasses, allShootersData, getMyShooters 
} from "./data-service.js";
import { 
    createCompetition, getAllCompetitions, signupForCompetition, 
    getMySignups, submitCompetitionResult, getPendingSignups, approveSignupPayment, updateCompetition, getCompetitionEntries
} from "./competition-service.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Håller koll på laddad data lokalt för UI-uppdateringar
let editingCompId = null;
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
        populateClassCheckboxes(); 
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

function addRoundInput(valName = '', valDate = '') {
    roundsCounter++;
    const container = document.getElementById('comp-rounds-container');
    const div = document.createElement('div');
    div.className = "flex space-x-2 items-center mb-2";
    div.innerHTML = `
        <input type="text" value="${valName}" placeholder="Namn (t.ex. Omgång ${roundsCounter})" class="round-name w-1/2 p-2 border rounded text-sm">
        <input type="date" value="${valDate}" class="round-deadline w-1/2 p-2 border rounded text-sm">
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
        label.className = "flex items-center space-x-2 text-sm p-1 hover:bg-gray-50 rounded";
        label.innerHTML = `
            <input type="checkbox" value="${cls.id}" class="comp-class-checkbox w-4 h-4 text-blue-600 rounded">
            <span>${cls.name} (${cls.discipline})</span>
        `;
        container.appendChild(label);
    });
}

async function handleCreateCompetition() {
    const rounds = [];
    document.querySelectorAll('#comp-rounds-container > div').forEach(div => {
        const name = div.querySelector('.round-name').value;
        const deadline = div.querySelector('.round-deadline').value;
        if (name && deadline) rounds.push({ name, deadline });
    });

    const selectedClasses = [];
    document.querySelectorAll('.comp-class-checkbox:checked').forEach(cb => {
        selectedClasses.push(cb.value);
    });

    const compData = {
        name: document.getElementById('new-comp-name').value,
        swishNumber: document.getElementById('new-comp-swish').value,
        startDate: document.getElementById('new-comp-start').value,
        endDate: document.getElementById('new-comp-end').value,
        resultsVisibility: document.getElementById('new-comp-visibility').value,
        signupDeadline: document.getElementById('new-comp-signup-deadline').value, 
        cost: parseInt(document.getElementById('new-comp-cost').value) || 0,
        rules: { 
            allowDecimals: document.getElementById('rule-decimals').checked,
            requireImageAlways: document.getElementById('rule-image-req').checked
        },
        rounds: rounds,
        allowedClasses: selectedClasses
    };

    if (editingCompId) {
        await updateCompetition(editingCompId, compData);
        editingCompId = null;
        
        const btn = document.querySelector('#create-comp-form button[type="submit"]');
        btn.textContent = "Skapa Tävling";
        btn.classList.replace('bg-blue-600', 'bg-green-600');
        btn.classList.replace('hover:bg-blue-700', 'hover:bg-green-700');
    } else {
        await createCompetition(compData);
    }

    document.getElementById('create-comp-form').reset();
    document.getElementById('comp-rounds-container').innerHTML = '';
    
    activeCompetitions = await getAllCompetitions(); 
    renderAdminCompetitionsList();
    renderUserLobby();
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
        const comp = activeCompetitions.find(c => c.id === signup.competitionId);
        const compName = comp ? comp.name : 'Okänd tävling';
        
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
            renderAdminSignupsList(); 
        });
    });
}

function renderAdminView() {
    renderAdminSignupsList();
    renderAdminCompetitionsList(); 
}

function renderAdminCompetitionsList() {
    const container = document.getElementById('admin-competitions-list');
    if (!container) return;
    
    container.innerHTML = '';
    const sorted = [...activeCompetitions].sort((a, b) => b.createdAt - a.createdAt);

    sorted.forEach(comp => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50";
        
        const statusDot = comp.isActive ? '🟢' : '🔴';
        const visibilityIcon = comp.resultsVisibility === 'hidden' ? '🙈' : '👁️';

        div.innerHTML = `
            <div>
                <span class="font-bold text-sm">${statusDot} ${comp.name}</span>
                <div class="text-xs text-gray-500">
                    ${comp.startDate} till ${comp.endDate} | ${visibilityIcon}
                </div>
            </div>
            <button class="edit-comp-btn text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200" 
                data-id="${comp.id}">
                Redigera
            </button>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.edit-comp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => loadCompetitionForEdit(e.target.dataset.id));
    });
}

function loadCompetitionForEdit(compId) {
    const comp = activeCompetitions.find(c => c.id === compId);
    if (!comp) return;

    editingCompId = compId;

    document.getElementById('new-comp-name').value = comp.name;
    document.getElementById('new-comp-swish').value = comp.swishNumber || '';
    document.getElementById('new-comp-start').value = comp.startDate;
    document.getElementById('new-comp-end').value = comp.endDate;
    document.getElementById('new-comp-signup-deadline').value = comp.signupDeadline || '';
    document.getElementById('new-comp-cost').value = comp.cost;
    document.getElementById('new-comp-visibility').value = comp.resultsVisibility || 'public';
    
    if(comp.rules) {
        document.getElementById('rule-decimals').checked = comp.rules.allowDecimals || false;
        document.getElementById('rule-image-req').checked = comp.rules.requireImageAlways || false;
    }

    const roundsContainer = document.getElementById('comp-rounds-container');
    roundsContainer.innerHTML = '';
    if (comp.rounds) {
        comp.rounds.forEach(r => addRoundInput(r.name, r.deadline));
    }

    const submitBtn = document.querySelector('#create-comp-form button[type="submit"]');
    submitBtn.textContent = "Spara Ändringar";
    submitBtn.classList.replace('bg-green-600', 'bg-blue-600');
    submitBtn.classList.replace('hover:bg-green-700', 'hover:bg-blue-700');

    document.getElementById('create-comp-form').scrollIntoView({ behavior: 'smooth' });
}


// ==========================================
//              USER FUNKTIONER
// ==========================================

function renderUserLobby() {
    const container = document.getElementById('active-competitions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    const active = activeCompetitions.filter(c => c.isActive && c.endDate >= today);

    if (active.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full text-center">Inga aktiva tävlingar just nu.</p>';
        return;
    }

    active.forEach(comp => {
        const isSignupOpen = !comp.signupDeadline || today <= comp.signupDeadline;
        let buttonHtml = '';
        
        if (isSignupOpen) {
            buttonHtml = `
                <button class="signup-modal-btn w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700" data-id="${comp.id}">
                    Anmäl dig här
                </button>`;
        } else {
            buttonHtml = `
                <button disabled class="w-full bg-gray-300 text-gray-500 font-bold py-2 rounded cursor-not-allowed">
                    Anmälan stängd
                </button>
                <p class="text-xs text-center text-red-500 mt-1 font-bold">Gick ut: ${comp.signupDeadline}</p>`;
        }

        const div = document.createElement('div');
        div.className = "card border-l-4 border-green-500 p-4 hover:shadow-lg transition";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-bold text-blue-900">${comp.name}</h3>
                <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Pris: ${comp.cost} kr</span>
            </div>
            <p class="text-sm text-gray-600">Pågår till: ${comp.endDate}</p>
            ${comp.signupDeadline ? `<p class="text-xs text-red-600 mb-4 font-bold">Anmälan senast: ${comp.signupDeadline}</p>` : '<div class="mb-4"></div>'}
            
            ${buttonHtml}
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.signup-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openSignupModal(e.target.dataset.id));
    });

    populateUserReportingDropdown();
}

async function openSignupModal(compId) {
    const comp = activeCompetitions.find(c => c.id === compId);
    if (!comp) return;

    document.getElementById('signup-comp-name').textContent = comp.name;
    document.getElementById('signup-comp-id').value = comp.id;
    document.getElementById('swish-info-box').classList.add('hidden');
    document.getElementById('confirm-signup-btn').classList.remove('hidden');

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

    const classSelect = document.getElementById('signup-class-select');
    classSelect.innerHTML = '';
    if (comp.allowedClasses && comp.allowedClasses.length > 0) {
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
            const swishData = `C${comp.swishNumber};${comp.cost};${result.refCode};0`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(swishData)}`;
            
            document.getElementById('swish-qr-code').src = qrUrl;
            document.getElementById('swish-msg-ref').textContent = result.refCode;
            document.getElementById('swish-info-box').classList.remove('hidden');
            document.getElementById('confirm-signup-btn').classList.add('hidden');
            
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
        
        const shooter = allShootersData.find(s => s.id === signup.shooterId);
        const shooterName = shooter ? shooter.name : 'Okänd';

        const opt = document.createElement('option');
        opt.value = signup.id;
        opt.textContent = `${comp.name} - ${shooterName}`;
        opt.dataset.compId = comp.id;
        opt.dataset.shooterId = signup.shooterId;
        select.appendChild(opt);
    });
}

async function updateReportingUI(signupId) {
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
    
    const badge = document.getElementById('reporting-status-badge');
    badge.textContent = "Klar att rapportera";
    badge.className = "bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded";

 // Omgångsinfo och Deadline-hantering
    let roundInfo = "Öppen tävling (inga delmoment)";
    let currentRoundId = "open";
    let activeDeadline = comp.endDate; // Default: Tävlingens slutdatum

    if (comp.rounds && comp.rounds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const currentRound = comp.rounds.find(r => r.deadline >= today) || comp.rounds[comp.rounds.length - 1];
        
        roundInfo = `Aktuell omgång: ${currentRound.name} (Deadline: ${currentRound.deadline})`;
        currentRoundId = currentRound.name;
        activeDeadline = currentRound.deadline;
    }
    
    // Sätt deadline på datumväljaren (används för att räkna ut isLate)
    const dateInput = document.getElementById('report-date');
    dateInput.max = activeDeadline; 
    dateInput.dataset.deadline = activeDeadline; // VIKTIGT: Nu sätts den alltid
    
    document.getElementById('reporting-round-info').textContent = roundInfo;
    document.getElementById('report-round-id').value = currentRoundId;

    const seriesContainer = document.getElementById('report-series-container');
    seriesContainer.innerHTML = '';
    for(let i=1; i<=4; i++) {
        const inp = document.createElement('input');
        inp.type = "number";
        inp.placeholder = `S${i}`;
        inp.className = "p-2 border rounded text-center series-score-input";
        if(comp.rules && comp.rules.allowDecimals) inp.step = "0.1";
        seriesContainer.appendChild(inp);
    }
    
    seriesContainer.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
            let tot = 0;
            seriesContainer.querySelectorAll('input').forEach(i => tot += parseFloat(i.value) || 0);
            document.getElementById('report-score').value = Number(tot.toFixed(1));
        });
    });

    area.classList.remove('hidden');
    
    // Hämta historik och topplista
    await renderUserCompetitionView(comp, signup.shooterId);
}

// Denna funktion ska ligga utanför updateReportingUI
async function renderUserCompetitionView(comp, shooterId) {
    const historyContainer = document.getElementById('user-entries-history');
    const leaderboardContainer = document.getElementById('competition-leaderboard');
    const visibilityBadge = document.getElementById('results-visibility-badge');
    
    if(!historyContainer || !leaderboardContainer) return;

    historyContainer.innerHTML = '<p class="text-gray-400 text-sm">Laddar...</p>';
    leaderboardContainer.innerHTML = '<p class="text-gray-400 text-sm">Laddar ställning...</p>';

    const allEntries = await getCompetitionEntries(comp.id);
    const myEntries = allEntries.filter(e => e.shooterId === shooterId);
    
    historyContainer.innerHTML = '';
    if (myEntries.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm italic text-gray-500">Inga resultat inskickade än.</p>';
    } else {
        myEntries.sort((a, b) => new Date(b.submittedAt.seconds * 1000) - new Date(a.submittedAt.seconds * 1000));
        
        myEntries.forEach(entry => {
            const date = new Date(entry.submittedAt.seconds * 1000).toLocaleDateString();
            const statusIcon = entry.status === 'approved' ? '✅' : '⏳';
            const roundLabel = entry.roundId !== 'open' ? `Omgång: ${entry.roundId}` : entry.date;
            
            historyContainer.innerHTML += `
                <div class="flex justify-between items-center p-2 bg-white border rounded text-sm">
                    <div>
                        <span class="font-bold">${entry.score}p</span>
                        <span class="text-gray-500">(${roundLabel})</span>
                    </div>
                    <span title="${entry.status}">${statusIcon}</span>
                </div>
            `;
        });
    }

    const today = new Date().toISOString().split('T')[0];
    const isEnded = comp.endDate < today;
    const isHidden = comp.resultsVisibility === 'hidden';
    
    if (isHidden && !isEnded) {
        visibilityBadge.textContent = "🔒 Resultat dolda tills tävlingens slut";
        leaderboardContainer.innerHTML = `
            <div class="p-4 bg-gray-100 rounded text-center text-gray-500 text-sm">
                <p>Tävlingsledningen har valt att dölja andras resultat.</p>
                <p>Resultatlistan publiceras efter ${comp.endDate}.</p>
            </div>
        `;
        return; 
    }

    visibilityBadge.textContent = "🌐 Live Resultat";
    
    allEntries.sort((a, b) => b.score - a.score);

    let tableHtml = `
        <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-700 font-bold">
                <tr>
                    <th class="p-2">Plats</th>
                    <th class="p-2">Skytt</th>
                    <th class="p-2 text-right">Poäng</th>
                </tr>
            </thead>
            <tbody>
    `;

    allEntries.slice(0, 10).forEach((entry, index) => {
        const shooter = allShootersData.find(s => s.id === entry.shooterId);
        const name = shooter ? shooter.name : "Okänd";
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}.`));
        const isMe = entry.shooterId === shooterId ? "bg-blue-50 font-bold" : "";

        tableHtml += `
            <tr class="border-b last:border-0 ${isMe}">
                <td class="p-2">${medal}</td>
                <td class="p-2">${name}</td>
                <td class="p-2 text-right">${entry.score}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
    leaderboardContainer.innerHTML = tableHtml;
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
    const isLate = deadline ? (date > deadline) : false;
    
    const fileInput = document.getElementById('report-image-upload');
    const file = fileInput.files[0];

    if (isLate && !file) {
        showModal('errorModal', "Du MÅSTE ladda upp en bild eftersom deadline passerat.");
        return;
    }
    
    let imageUrl = null;
    if (file) {
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
        
        // Uppdatera vyn direkt
        const currentComp = activeCompetitions.find(c => c.id === compId);
        await renderUserCompetitionView(currentComp, shooterId);
    }
}