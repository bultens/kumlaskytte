// admin-competition.js
import { db } from "./firebase-config.js";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { uploadCompetitionInvite, getCompetitions, deleteCompetition, saveCompetition } from "./data-service.js";

let competitions = [];
let currentInviteUrl = null; // För att hålla koll på uppladdad fil URL
let currentInvitePath = null; // För att hålla koll på storage path

export async function initCompetitionAdmin() {
    const addBtn = document.getElementById('btn-add-online-comp'); // Knappen "Skapa ny"
    
    // Ladda lista vid start
    await renderCompetitionList();

    // Lyssnare för "Skapa ny tävling"-knappen
    if (addBtn) {
        // Klona för att rensa gamla listeners
        const newBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newBtn, addBtn);
        
        newBtn.addEventListener('click', () => {
            openCompetitionModal(); 
        });
    }

    // Lyssnare för Modalens "Spara"-knapp
    const saveBtn = document.getElementById('save-online-comp-btn');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

        newSaveBtn.addEventListener('click', saveCompetitionFromModal);
    }

    // Lyssnare för knappar inuti modalen (Lägg till omg/klass)
    document.getElementById('add-round-btn')?.addEventListener('click', () => addRoundRow());
    document.getElementById('add-class-btn')?.addEventListener('click', () => addClassRow());

    // --- NYTT: FILUPPLADDNING (INBJUDAN) ---
    const fileInput = document.getElementById('online-comp-invite-upload');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Visa att det laddar (enkel UI-feedback)
            const label = document.getElementById('online-comp-invite-label');
            if(label) label.textContent = "Laddar upp...";

            try {
                // Anropa data-service
                const result = await uploadCompetitionInvite(file);
                currentInviteUrl = result.url;
                currentInvitePath = result.path;
                
                if(label) label.textContent = `Fil vald: ${file.name}`;
            } catch (error) {
                console.error("Uppladdning misslyckades", error);
                if(label) label.textContent = "Fel vid uppladdning";
                alert("Kunde inte ladda upp filen.");
            }
        });
    }
}

async function renderCompetitionList() {
    const container = document.getElementById('admin-competitions-list');
    if (!container) return;

    container.innerHTML = '<p class="text-gray-500">Laddar tävlingar...</p>';
    
    try {
        competitions = await getCompetitions();
    } catch (error) {
        console.error("Fel vid hämtning av tävlingar:", error);
        container.innerHTML = '<p class="text-red-500">Kunde inte hämta tävlingar.</p>';
        return;
    }

    container.innerHTML = '';

    if (competitions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga onlinetävlingar skapade än.</p>';
        return;
    }

    competitions.forEach(comp => {
        const div = document.createElement('div');
        div.className = "bg-white border rounded p-3 flex justify-between items-center mb-2 shadow-sm";
        div.innerHTML = `
            <div>
                <h4 class="font-bold text-blue-900">${comp.name}</h4>
                <div class="text-xs text-gray-500 flex gap-2">
                    <span>${comp.status === 'active' ? '🟢 Aktiv' : '🔴 Avslutad'}</span>
                    <span>• ${comp.rounds ? comp.rounds.length : 0} omgångar</span>
                    ${comp.inviteUrl ? `<a href="${comp.inviteUrl}" target="_blank" class="text-blue-500 hover:underline">📄 Inbjudan</a>` : ''}
                </div>
            </div>
            <div class="flex gap-2">
                <button class="edit-comp-btn text-blue-600 hover:bg-blue-50 p-2 rounded" title="Redigera">✎</button>
                <button class="delete-comp-btn text-red-600 hover:bg-red-50 p-2 rounded" title="Ta bort">🗑️</button>
            </div>
        `;
        
        // Koppla events säkert med JS
        const editBtn = div.querySelector('.edit-comp-btn');
        editBtn.addEventListener('click', () => openCompetitionModal(comp));

        const deleteBtn = div.querySelector('.delete-comp-btn');
        deleteBtn.addEventListener('click', () => handleDeleteCompetition(comp.id));
        
        container.appendChild(div);
    });
}

// --- MODAL HANTERING ---

function openCompetitionModal(comp = null) {
    const modal = document.getElementById('onlineCompetitionModal');
    const title = document.getElementById('online-comp-modal-title');
    
    // Nollställ formulärdata
    document.getElementById('online-comp-id').value = comp ? comp.id : '';
    document.getElementById('online-comp-name').value = comp ? comp.name : '';
    document.getElementById('online-comp-desc').value = comp ? comp.description : '';
    document.getElementById('online-comp-status').value = comp ? comp.status : 'active';
    
    // Nollställ inbjudan
    currentInviteUrl = comp ? comp.inviteUrl : null;
    currentInvitePath = comp ? comp.invitePath : null;
    const fileLabel = document.getElementById('online-comp-invite-label');
    const fileInput = document.getElementById('online-comp-invite-upload');
    if(fileInput) fileInput.value = ''; // Rensa input
    
    if (fileLabel) {
        if (currentInviteUrl) {
            fileLabel.innerHTML = `Sparad fil: <a href="${currentInviteUrl}" target="_blank" class="text-blue-600 underline">Visa</a> (Ladda upp ny för att byta)`;
        } else {
            fileLabel.textContent = "Ingen fil vald (PDF)";
        }
    }

    // Rensa dynamiska listor
    document.getElementById('comp-rounds-container').innerHTML = '';
    document.getElementById('comp-classes-container').innerHTML = '';

    if (comp) {
        title.textContent = 'Redigera Tävling';
        if (comp.rounds) comp.rounds.forEach(r => addRoundRow(r));
        if (comp.classes) comp.classes.forEach(c => addClassRow(c));
    } else {
        title.textContent = 'Skapa Ny Tävling';
        // Lägg till tomma rader som starthjälp
        addRoundRow();
        addClassRow();
    }

    modal.classList.add('active');
    
    // Hantera stängning
    const closeBtn = document.getElementById('close-online-comp-modal');
    // Använd onclick här för enkelhetens skull då elementet inte byts ut, 
    // eller addEventListener med {once: true} om man vill vara strikt.
    closeBtn.onclick = () => modal.classList.remove('active');
}

function addRoundRow(data = null) {
    const container = document.getElementById('comp-rounds-container');
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center round-row mb-2";
    
    div.innerHTML = `
        <input type="text" placeholder="Namn (t.ex. Omg 1)" class="round-name flex-grow p-2 border rounded text-sm" value="${data ? data.name : ''}">
        <input type="date" class="round-end p-2 border rounded text-sm" value="${data ? data.endDate : ''}" title="Sista datum">
    `;

    // Skapa knapp med JS för att undvika CSP-fel
    const btn = document.createElement('button');
    btn.type = "button";
    btn.className = "text-red-500 hover:text-red-700 font-bold px-2 text-xl";
    btn.innerHTML = "&times;";
    btn.title = "Ta bort rad";
    btn.addEventListener('click', () => div.remove());

    div.appendChild(btn);
    container.appendChild(div);
}

function addClassRow(data = null) {
    const container = document.getElementById('comp-classes-container');
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center class-row mb-2";
    
    div.innerHTML = `
        <input type="text" placeholder="Klassnamn (t.ex. C3)" class="class-name flex-grow p-2 border rounded text-sm" value="${data ? data.name : ''}">
        <input type="text" placeholder="Vapengrupp" class="class-group w-24 p-2 border rounded text-sm" value="${data ? data.group : ''}">
    `;

    const btn = document.createElement('button');
    btn.type = "button";
    btn.className = "text-red-500 hover:text-red-700 font-bold px-2 text-xl";
    btn.innerHTML = "&times;";
    btn.title = "Ta bort rad";
    btn.addEventListener('click', () => div.remove());

    div.appendChild(btn);
    container.appendChild(div);
}

async function saveCompetitionFromModal() {
    const id = document.getElementById('online-comp-id').value;
    const name = document.getElementById('online-comp-name').value;
    const desc = document.getElementById('online-comp-desc').value;
    const status = document.getElementById('online-comp-status').value;

    if (!name) {
        alert("Ange ett namn på tävlingen.");
        return;
    }

    // Samla in Omgångar
    const rounds = [];
    document.querySelectorAll('.round-row').forEach(row => {
        const rName = row.querySelector('.round-name').value;
        const rEnd = row.querySelector('.round-end').value;
        if (rName) rounds.push({ name: rName, endDate: rEnd });
    });

    // Samla in Klasser
    const classes = [];
    document.querySelectorAll('.class-row').forEach(row => {
        const cName = row.querySelector('.class-name').value;
        const cGroup = row.querySelector('.class-group').value;
        if (cName) classes.push({ name: cName, group: cGroup });
    });

    const compData = {
        name,
        description: desc,
        status,
        rounds,
        classes,
        // Lägg till inbjudan om den finns
        inviteUrl: currentInviteUrl || null,
        invitePath: currentInvitePath || null
    };

    // Spara
    await saveCompetition(compData, id || null);
    
    document.getElementById('onlineCompetitionModal').classList.remove('active');
    renderCompetitionList();
}

async function handleDeleteCompetition(id) {
    if(confirm("Vill du ta bort tävlingen? Alla resultat kopplade till den försvinner.")) {
        await deleteCompetition(id);
        renderCompetitionList();
    }
}