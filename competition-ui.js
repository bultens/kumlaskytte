// competition-ui.js
import { auth } from "./firebase-config.js";
import { 
    competitionClasses, allShootersData, getMyShooters 
} from "./data-service.js";
import { createCompetition, getAllCompetitions, signupForCompetition, 
    getMySignups, submitCompetitionResult, getPendingSignups, approveSignupPayment, 
    updateCompetition, getCompetitionEntries, deleteCompetitionFull,
    createOnlineClass, getOnlineClasses, deleteOnlineClass
} from "./competition-service.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Håller koll på laddad data lokalt för UI-uppdateringar
let editingCompId = null;
let activeCompetitions = [];
let mySignups = [];
let roundsCounter = 0;
let onlineClassesCache = [];

export async function initCompetitionSystem() {
    console.log("Initierar Tävlingssystemet...");
    setupEventListeners();
    
    // Ladda tävlingar
    activeCompetitions = await getAllCompetitions();
    
    // NYTT: Ladda online-klasser
    onlineClassesCache = await getOnlineClasses();
    
    if (auth.currentUser) {
        mySignups = await getMySignups();
        renderUserLobby();
    }
    
    if (isAdminLoggedIn) {
        renderAdminView();
        populateClassCheckboxes(); // Använder nu onlineClassesCache
        renderOnlineClassesList(); // NY: Ritar admin-listan för klasser
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

    // --- ADMIN: SKAPA KLASS ---
    const createClassForm = document.getElementById('create-online-class-form');
    if (createClassForm) {
        createClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newClass = {
                name: document.getElementById('new-class-name').value,
                discipline: document.getElementById('new-class-disc').value,
                minAge: parseInt(document.getElementById('new-class-min').value) || 0,
                maxAge: parseInt(document.getElementById('new-class-max').value) || 99
            };
            
            const success = await createOnlineClass(newClass);
            if(success) {
                createClassForm.reset();
                onlineClassesCache = await getOnlineClasses(); // Ladda om
                renderOnlineClassesList();
                populateClassCheckboxes();
            }
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
    
    if (onlineClassesCache.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500">Inga klasser skapade än.</p>';
        return;
    }

    // Sortera på ålder
    onlineClassesCache.sort((a, b) => a.minAge - b.minAge);

    onlineClassesCache.forEach(cls => {
        const label = document.createElement('label');
        label.className = "flex items-center space-x-2 text-sm p-1 hover:bg-gray-50 rounded";
        label.innerHTML = `
            <input type="checkbox" value="${cls.id}" class="comp-class-checkbox w-4 h-4 text-blue-600 rounded">
            <span>${cls.name} (${cls.discipline})</span>
        `;
        container.appendChild(label);
    });
}

// NY FUNKTION: Ritar listan i "Hantera Klasser"
function renderOnlineClassesList() {
    const container = document.getElementById('online-classes-list');
    if(!container) return;
    
    container.innerHTML = '';
    onlineClassesCache.sort((a, b) => a.minAge - b.minAge);

    onlineClassesCache.forEach(cls => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white p-2 rounded border text-sm";
        div.innerHTML = `
            <span><b>${cls.name}</b> (${cls.minAge}-${cls.maxAge} år)</span>
            <button class="del-class-btn text-red-500 font-bold px-2 hover:bg-red-50 rounded" data-id="${cls.id}">×</button>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.del-class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(confirm("Ta bort klassen?")) {
                await deleteOnlineClass(e.target.dataset.id);
                onlineClassesCache = await getOnlineClasses();
                renderOnlineClassesList();
                populateClassCheckboxes();
            }
        });
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
        resultsCount: parseInt(document.getElementById('new-comp-count-results').value) || 0,
        signupDeadline: document.getElementById('new-comp-signup-deadline').value, 
        cost: parseInt(document.getElementById('new-comp-cost').value) || 0,
        extraCost: parseInt(document.getElementById('new-comp-extra-cost').value) || 0, 
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
            <div class="flex space-x-2">
                <button class="edit-comp-btn text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200" 
                    data-id="${comp.id}">
                    Redigera
                </button>
                <button class="delete-comp-custom-btn text-xs bg-red-100 text-red-700 px-3 py-1 rounded font-bold hover:bg-red-200" 
                    data-id="${comp.id}" data-name="${comp.name}">
                    Ta bort
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    // Lyssna på edit
    container.querySelectorAll('.edit-comp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => loadCompetitionForEdit(e.target.dataset.id));
    });

    // NYTT: Lyssna på delete
    container.querySelectorAll('.delete-comp-custom-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const name = e.target.dataset.name;
            
            // Vi återanvänder din befintliga confirmationModal men lägger in egen logik på knappen
            showModal('deleteConfirmationModal', `⚠️ VARNING! <br>Är du säker på att du vill radera <strong>"${name}"</strong>?<br><br>Detta tar även bort alla anmälningar och resultat kopplade till tävlingen.`);
            
            const confirmBtn = document.getElementById('confirm-delete-btn');
            // Klona knappen för att bli av med gamla event listeners
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            
            newBtn.addEventListener('click', async () => {
                await deleteCompetitionFull(id);
                document.getElementById('deleteConfirmationModal').classList.remove('active');
                // Uppdatera listan
                activeCompetitions = await getAllCompetitions();
                renderAdminCompetitionsList();
                renderUserLobby();
            });
            
            // Koppla även "Avbryt"-knappen för säkerhets skull (oftast redan kopplad globalt, men skadar inte)
            document.getElementById('cancel-delete-btn').onclick = () => {
                document.getElementById('deleteConfirmationModal').classList.remove('active');
            };
        });
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
    // NYTT: Ladda in extra kostnad
    document.getElementById('new-comp-extra-cost').value = comp.extraCost || 0;
    document.getElementById('new-comp-visibility').value = comp.resultsVisibility || 'public';
    document.getElementById('new-comp-count-results').value = comp.resultsCount || '';
    
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
    document.getElementById('price-summary').textContent = "Totalt: 0 kr";

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
            opt.dataset.birthyear = s.birthyear; // Spara födelseår för uträkning
            shooterSelect.appendChild(opt);
        });
    }

    // --- NY LOGIK FÖR KLASSER (CHECKBOXAR) ---
    const container = document.getElementById('signup-class-checkboxes');
    container.innerHTML = '';
    
    // Funktion för att rendera klasser baserat på vald skytt
    const renderClassesForShooter = () => {
        container.innerHTML = '';
        const selectedShooterOpt = shooterSelect.selectedOptions[0];
        const birthYear = selectedShooterOpt ? parseInt(selectedShooterOpt.dataset.birthyear) : null;
        const currentYear = new Date().getFullYear();
        const shooterAge = birthYear ? currentYear - birthYear : null;

        if (comp.allowedClasses && comp.allowedClasses.length > 0) {
            const allowed = onlineClassesCache.filter(c => comp.allowedClasses.includes(c.id));
            
            allowed.forEach(c => {
                const wrapper = document.createElement('div');
                // Markera om skytten är i "rätt" ålder (visuellt hjälpmedel)
                const isOptimalAge = shooterAge !== null && shooterAge >= c.minAge && shooterAge <= c.maxAge;
                
                const styleClass = isOptimalAge 
                    ? "bg-blue-50 border-blue-200 font-bold" 
                    : "bg-white border-gray-200 text-gray-500";

                wrapper.className = `flex items-center p-2 border rounded ${styleClass}`;
                
                wrapper.innerHTML = `
                    <input type="checkbox" id="cls-${c.id}" value="${c.id}" class="signup-class-cb w-5 h-5 mr-2">
                    <label for="cls-${c.id}" class="cursor-pointer flex-grow text-sm">
                        ${c.name} <span class="text-xs font-normal">(${c.discipline})</span>
                        ${isOptimalAge ? '<span class="ml-1 text-blue-600 text-xs">★</span>' : ''}
                    </label>
                `;
                container.appendChild(wrapper);
            });
        } else {
            container.innerHTML = '<p class="text-sm text-gray-500 p-2">Inga specifika klasser (Öppen)</p>';
        }
        
        // Lägg på lyssnare för prisuppdatering
        container.querySelectorAll('.signup-class-cb').forEach(cb => {
            cb.addEventListener('change', updatePrice);
        });
    };

    // Funktion för att räkna pris
    const updatePrice = () => {
        const checkedCount = container.querySelectorAll('.signup-class-cb:checked').length;
        if (checkedCount === 0) {
            document.getElementById('price-summary').textContent = "Totalt: 0 kr";
            document.getElementById('price-summary').dataset.total = 0;
            return;
        }
        
        const basePrice = comp.cost || 0;
        const extraPrice = (comp.extraCost !== undefined && comp.extraCost !== null) ? comp.extraCost : basePrice;
        
        // Formel: Första klassen kostar Grundpris, resten kostar Extrapris
        const total = basePrice + ((checkedCount - 1) * extraPrice);
        
        document.getElementById('price-summary').textContent = `Totalt: ${total} kr`;
        document.getElementById('price-summary').dataset.total = total; // Spara värdet
    };

    // Uppdatera klasslistan när man byter skytt (för att visa åldersmarkering)
    shooterSelect.addEventListener('change', renderClassesForShooter);
    
    // Kör en gång vid start
    renderClassesForShooter();

    document.getElementById('compSignupModal').classList.add('active');
}

async function handleSignupSubmit() {
    const compId = document.getElementById('signup-comp-id').value;
    const shooterId = document.getElementById('signup-shooter-select').value;
    const clubName = document.getElementById('signup-club-name').value;
    
    // Hämta valda klasser
    const selectedClasses = [];
    document.querySelectorAll('.signup-class-cb:checked').forEach(cb => {
        selectedClasses.push(cb.value);
    });

    if (selectedClasses.length === 0) {
        // Om inga klasser finns definierade (Öppen tävling), skicka tom array eller dummy
        // Men om klasser FINNS, kräv val
        const checkboxes = document.querySelectorAll('.signup-class-cb');
        if (checkboxes.length > 0) {
            showModal('errorModal', "Du måste välja minst en klass.");
            return;
        }
    }

    const comp = activeCompetitions.find(c => c.id === compId);
    
    // Hämta uträknat pris (eller räkna om för säkerhets skull)
    const priceText = document.getElementById('price-summary').dataset.total;
    const totalPrice = priceText ? parseInt(priceText) : comp.cost; // Fallback

    const result = await signupForCompetition(compId, shooterId, selectedClasses, clubName, totalPrice);
    
    if (result.success) {
        if (totalPrice > 0) {
            const swishData = `C${comp.swishNumber};${totalPrice};${result.refCode};0`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(swishData)}`;
            
            document.getElementById('swish-qr-code').src = qrUrl;
            document.getElementById('swish-msg-ref').textContent = result.refCode;
            
            // Visa Swish-boxen och dölj resten
            document.getElementById('swish-info-box').classList.remove('hidden');
            document.getElementById('confirm-signup-btn').classList.add('hidden');
            document.getElementById('signup-class-checkboxes').classList.add('hidden'); // Dölj valen så det ser rent ut
            
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

        // Hämta klassnamn från IDs i signup.classIds
        let classNames = "";
        if (signup.classIds && signup.classIds.length > 0) {
            const names = signup.classIds.map(id => {
                const cls = onlineClassesCache.find(c => c.id === id);
                return cls ? cls.name : id; // Visa namn om hittat, annars ID
            });
            classNames = ` (${names.join(', ')})`;
        } else if (signup.classId) {
            // Bakåtkompatibilitet om gamla anmälningar finns
            const cls = onlineClassesCache.find(c => c.id === signup.classId);
            classNames = cls ? ` (${cls.name})` : "";
        }

        const opt = document.createElement('option');
        opt.value = signup.id;
        // HÄR ÄR FIXEN: Vi lägger till klassnamnen i texten
        opt.textContent = `${comp.name} - ${shooterName}${classNames}`;
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

    // 1. Hämta alla resultat
    const allEntries = await getCompetitionEntries(comp.id);
    
    // --- FÖRBERED DATA FÖR LOGIKEN ---
    
    // Gruppera resultat per skytt och omgång
    // Struktur: { shooterId: { name: "Namn", rounds: { "Omgång 1": [102.4, 101.0] } } }
    const shooterStats = {};
    const uniqueRounds = new Set();

    // Först, identifiera alla unika omgångar som finns i datan för att bygga kolumner
    allEntries.forEach(entry => {
        let rId = entry.roundId || 'Öppen';
        // Om det är "open", använd datum som kolumnrubrik om det inte finns omgångsnamn
        if (rId === 'open') rId = entry.date; 
        uniqueRounds.add(rId);
    });
    
    // Sortera omgångarna logiskt (Omgång 1, Omgång 2...)
    const sortedRounds = Array.from(uniqueRounds).sort((a, b) => {
        // Försök sortera på nummer i strängen "Omgång X"
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b); // Fallback till bokstavsordning (eller datum)
    });

    // Bygg upp shooterStats
    allEntries.forEach(entry => {
        const sId = entry.shooterId;
        const shooter = allShootersData.find(s => s.id === sId);
        const name = shooter ? shooter.name : "Okänd";
        let rId = entry.roundId || 'Öppen';
        if (rId === 'open') rId = entry.date;

        if (!shooterStats[sId]) {
            shooterStats[sId] = { name: name, rounds: {} };
        }
        if (!shooterStats[sId].rounds[rId]) {
            shooterStats[sId].rounds[rId] = [];
        }
        // Spara hela objektet så vi har ID och status
        shooterStats[sId].rounds[rId].push(entry);
    });

    // Räkna ut poäng och vilka som räknas
    const leaderboardData = Object.keys(shooterStats).map(sId => {
        const data = shooterStats[sId];
        const roundBestScores = []; // Håller reda på bästa poängen per omgång

        // För varje omgång, hitta bästa resultatet
        sortedRounds.forEach(rKey => {
            const entries = data.rounds[rKey];
            if (entries && entries.length > 0) {
                // Sortera fallande för att hitta högsta i denna omgång
                entries.sort((a, b) => b.score - a.score);
                const bestEntry = entries[0];
                roundBestScores.push({ 
                    round: rKey, 
                    score: bestEntry.score, 
                    entryId: bestEntry.id // Viktigt för att kunna markera det
                });
            }
        });

        // Sortera alla omgångsbästa för att hitta de X bästa totalt (om begränsning finns)
        roundBestScores.sort((a, b) => b.score - a.score);
        
        const countLimit = comp.resultsCount || roundBestScores.length;
        const countingEntries = roundBestScores.slice(0, countLimit);
        
        // Skapa ett Set med IDn på de resultat som faktiskt räknas i totalen
        const countingIds = new Set(countingEntries.map(e => e.entryId));
        
        const totalScore = countingEntries.reduce((sum, val) => sum + val.score, 0);
        
        return {
            name: data.name,
            shooterId: sId,
            total: Math.round(totalScore * 10) / 10,
            countingIds: countingIds, // IDn på de resultat som bygger totalen
            roundData: data.rounds // Alla resultat för att rita tabellen
        };
    });

    leaderboardData.sort((a, b) => b.total - a.total);

    // --- 1. VISA HISTORIK (Mina inskickade) ---
    // Nu kan vi markera vilka av MINA resultat som räknas!
    const myData = leaderboardData.find(d => d.shooterId === shooterId);
    const myCountingIds = myData ? myData.countingIds : new Set();

    const myEntries = allEntries.filter(e => e.shooterId === shooterId);
    historyContainer.innerHTML = '';
    
    if (myEntries.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm italic text-gray-500">Inga resultat inskickade än.</p>';
    } else {
        myEntries.sort((a, b) => new Date(b.submittedAt.seconds * 1000) - new Date(a.submittedAt.seconds * 1000));
        
        myEntries.forEach(entry => {
            const date = new Date(entry.submittedAt.seconds * 1000).toLocaleDateString();
            const statusIcon = entry.status === 'approved' ? '✅' : '⏳';
            let rId = entry.roundId || 'Öppen';
            if (rId === 'open') rId = entry.date;
            
            // Kolla om detta resultat är med i de "räknade"
            const isCounting = myCountingIds.has(entry.id);
            const countingBadge = isCounting 
                ? '<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded border border-green-200">Räknas</span>' 
                : '<span class="text-xs text-gray-400">(Räknas ej)</span>';

            historyContainer.innerHTML += `
                <div class="flex justify-between items-center p-3 bg-white border rounded text-sm ${isCounting ? 'border-l-4 border-green-500' : ''}">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-lg">${entry.score}p</span>
                            ${countingBadge}
                        </div>
                        <span class="text-gray-500 text-xs">${rId} (${date})</span>
                    </div>
                    <span title="${entry.status}">${statusIcon}</span>
                </div>
            `;
        });
    }

    // --- 2. HANTERA SYNLIGHET (Dölj tabellen om "Blind") ---
    const today = new Date().toISOString().split('T')[0];
    const isEnded = comp.endDate < today;
    const isHidden = comp.resultsVisibility === 'hidden';
    
    if (isHidden && !isEnded) {
        visibilityBadge.textContent = "🔒 Resultat dolda tills tävlingens slut";
        leaderboardContainer.innerHTML = `... (samma dolda meddelande som förut) ...`;
        return; 
    }
    visibilityBadge.textContent = "🌐 Live Resultat";

    // --- 3. RITA TABELLEN (Liknande PDFen) ---
    
    // Bygg header-raden dynamiskt baserat på omgångar
    let headerCols = '';
    sortedRounds.forEach(r => {
        // Förkorta rubriker om de är långa (t.ex. "Omgång 1" -> "Omg 1")
        const label = r.replace('Omgång', 'Omg');
        headerCols += `<th class="p-2 text-center text-xs sm:text-sm whitespace-nowrap">${label}</th>`;
    });

    let tableHtml = `
        <div class="overflow-x-auto">
        <table class="w-full text-sm text-left border-collapse">
            <thead class="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
                <tr>
                    <th class="p-2 w-8">#</th>
                    <th class="p-2 min-w-[120px]">Skytt</th>
                    ${headerCols}
                    <th class="p-2 text-right border-l bg-gray-50 min-w-[80px]">Total</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
    `;

    leaderboardData.forEach((row, index) => {
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}.`));
        const isMe = row.shooterId === shooterId ? "bg-blue-50 font-bold" : "hover:bg-gray-50";
        
        let roundCells = '';
        sortedRounds.forEach(rKey => {
            const entries = row.roundData[rKey];
            let cellContent = '-';
            let cellClass = 'text-gray-400'; // Grå för tomma/strukna

            if (entries && entries.length > 0) {
                // Hitta bästa i denna omgång
                entries.sort((a, b) => b.score - a.score);
                const best = entries[0];
                
                // Är detta resultat med i totalen? (Finns IDt i countingIds?)
                if (row.countingIds.has(best.id)) {
                    cellContent = `<strong>${best.score}</strong>`; // Fetstil för räknade
                    cellClass = 'text-gray-900 bg-green-50/50'; // Liten grön ton
                } else {
                    cellContent = `<span class="line-through decoration-gray-400">${best.score}</span>`; // Överstruket för strukna resultat
                    cellClass = 'text-gray-500';
                }
                
                // Om de skjutit flera serier i samma omgång, visa en liten asterisk *
                if (entries.length > 1) {
                    cellContent += `<span class="text-[9px] align-top text-blue-500 cursor-help" title="${entries.length} försök">*</span>`;
                }
            }
            
            roundCells += `<td class="p-2 text-center border-r border-gray-100 ${cellClass}">${cellContent}</td>`;
        });

        tableHtml += `
            <tr class="${isMe}">
                <td class="p-2 font-bold text-gray-500">${medal}</td>
                <td class="p-2 truncate max-w-[150px]" title="${row.name}">${row.name}</td>
                ${roundCells}
                <td class="p-2 text-right font-bold text-blue-900 border-l bg-gray-50/50">${row.total}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table></div>';
    
    const countInfo = comp.resultsCount > 0 
        ? `<div class="flex justify-between items-center mt-2 text-xs text-gray-500">
             <span>Resultat i <strong>fet stil</strong> räknas i totalen.</span>
             <span>* Totalsumman baseras på de ${comp.resultsCount} bästa omgångarna.</span>
           </div>` 
        : '';

    leaderboardContainer.innerHTML = tableHtml + countInfo;
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