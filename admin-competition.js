// admin-competition.js
import { saveCompetition, getCompetitions, deleteCompetition } from "./data-service.js";
import { showModal } from "./ui-handler.js";

let editingCompId = null;

export async function initCompetitionAdmin() {
    const container = document.getElementById('admin-competitions-list');
    if (!container) return;

    // Ladda lista
    await renderCompetitionList();

    // Knappar
    document.getElementById('show-create-competition-btn').addEventListener('click', () => {
        resetForm();
        document.getElementById('create-competition-container').classList.remove('hidden');
        document.getElementById('show-create-competition-btn').classList.add('hidden');
    });

    document.getElementById('cancel-comp-btn').addEventListener('click', () => {
        document.getElementById('create-competition-container').classList.add('hidden');
        document.getElementById('show-create-competition-btn').classList.remove('hidden');
    });

    document.getElementById('add-round-btn').addEventListener('click', () => addRoundRow());
    document.getElementById('add-class-btn').addEventListener('click', () => addClassRow());
    
    document.getElementById('comp-count-best').addEventListener('change', (e) => {
        const input = document.getElementById('comp-best-rounds-count');
        if (e.target.checked) input.classList.remove('hidden');
        else input.classList.add('hidden');
    });

    document.getElementById('save-comp-btn').addEventListener('click', async () => {
        await handleSave();
    });
}

async function renderCompetitionList() {
    const container = document.getElementById('admin-competitions-list');
    container.innerHTML = 'Laddar...';
    
    const competitions = await getCompetitions();
    container.innerHTML = '';

    if (competitions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga tävlingar skapade än.</p>';
        return;
    }

    competitions.forEach(comp => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded border flex justify-between items-center shadow-sm";
        
        let statusColor = 'bg-gray-200 text-gray-700';
        if (comp.status === 'active') statusColor = 'bg-green-100 text-green-800';
        if (comp.status === 'open') statusColor = 'bg-blue-100 text-blue-800';

        div.innerHTML = `
            <div>
                <h4 class="font-bold text-lg">${comp.name}</h4>
                <div class="flex gap-2 text-sm mt-1">
                    <span class="px-2 py-0.5 rounded text-xs font-bold uppercase ${statusColor}">${comp.status}</span>
                    <span class="text-gray-600">📅 ${comp.startDate} - ${comp.endDate}</span>
                    <span class="text-gray-600">🎯 ${comp.rounds ? comp.rounds.length : 0} omg</span>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="edit-comp-btn px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-bold text-sm" data-id="${comp.id}">Redigera</button>
                <button class="delete-comp-btn px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded font-bold text-sm" data-id="${comp.id}">Ta bort</button>
            </div>
        `;
        
        // Event listeners för knapparna direkt på elementet (för att slippa global delegation om vi vill)
        div.querySelector('.edit-comp-btn').addEventListener('click', () => loadCompetitionForEdit(comp));
        div.querySelector('.delete-comp-btn').addEventListener('click', async () => {
            await deleteCompetition(comp.id);
            await renderCompetitionList();
        });

        container.appendChild(div);
    });
}

// Lägg till en rad för Omgång
function addRoundRow(data = null) {
    const container = document.getElementById('comp-rounds-container');
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center round-row";
    div.innerHTML = `
        <input type="text" placeholder="Namn (t.ex. Omg 1)" class="round-name flex-grow p-2 border rounded text-sm" value="${data ? data.name : ''}">
        <input type="date" class="round-end p-2 border rounded text-sm" value="${data ? data.endDate : ''}" title="Sista datum">
        <button class="text-red-500 hover:text-red-700 font-bold px-2" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

// Lägg till en rad för Klass
function addClassRow(data = null) {
    const container = document.getElementById('comp-classes-container');
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center class-row bg-gray-100 p-2 rounded";
    
    // Vi lägger till fält för Min/Max ålder för att kunna göra highlight-funktionen senare
    div.innerHTML = `
        <div class="flex-grow grid grid-cols-3 gap-2">
            <input type="text" placeholder="Klassnamn (t.ex. Lsi 11)" class="class-name col-span-3 md:col-span-1 p-2 border rounded text-sm" value="${data ? data.name : ''}">
            <input type="number" placeholder="Min Ålder" class="class-min-age p-2 border rounded text-sm" value="${data ? data.minAge || '' : ''}">
            <input type="number" placeholder="Max Ålder" class="class-max-age p-2 border rounded text-sm" value="${data ? data.maxAge || '' : ''}">
        </div>
        <button class="text-red-500 hover:text-red-700 font-bold px-2" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

async function handleSave() {
    const name = document.getElementById('comp-name').value;
    if (!name) return alert("Ange ett namn!");

    // Samla in Omgångar
    const rounds = [];
    document.querySelectorAll('.round-row').forEach(row => {
        const rName = row.querySelector('.round-name').value;
        const rDate = row.querySelector('.round-end').value;
        if (rName && rDate) rounds.push({ name: rName, endDate: rDate });
    });

    // Samla in Klasser
    const classes = [];
    document.querySelectorAll('.class-row').forEach(row => {
        const cName = row.querySelector('.class-name').value;
        const cMin = row.querySelector('.class-min-age').value;
        const cMax = row.querySelector('.class-max-age').value;
        if (cName) classes.push({ 
            name: cName, 
            minAge: cMin ? parseInt(cMin) : 0, 
            maxAge: cMax ? parseInt(cMax) : 99 
        });
    });

    const competitionData = {
        name: name,
        status: document.getElementById('comp-status').value,
        startDate: document.getElementById('comp-start-date').value,
        endDate: document.getElementById('comp-end-date').value,
        basePrice: parseInt(document.getElementById('comp-base-price').value) || 0,
        extraPrice: parseInt(document.getElementById('comp-extra-price').value) || 0,
        countBestRounds: document.getElementById('comp-count-best').checked,
        bestRoundsCount: parseInt(document.getElementById('comp-best-rounds-count').value) || 0,
        rounds: rounds,
        classes: classes
    };

    await saveCompetition(competitionData, editingCompId);
    
    // Reset UI
    document.getElementById('create-competition-container').classList.add('hidden');
    document.getElementById('show-create-competition-btn').classList.remove('hidden');
    await renderCompetitionList();
}

function loadCompetitionForEdit(comp) {
    editingCompId = comp.id;
    document.getElementById('comp-name').value = comp.name;
    document.getElementById('comp-status').value = comp.status;
    document.getElementById('comp-start-date').value = comp.startDate;
    document.getElementById('comp-end-date').value = comp.endDate;
    document.getElementById('comp-base-price').value = comp.basePrice;
    document.getElementById('comp-extra-price').value = comp.extraPrice;
    
    document.getElementById('comp-count-best').checked = comp.countBestRounds || false;
    const countInput = document.getElementById('comp-best-rounds-count');
    countInput.value = comp.bestRoundsCount || '';
    if (comp.countBestRounds) countInput.classList.remove('hidden');
    else countInput.classList.add('hidden');

    // Rensa och fyll på rounds
    document.getElementById('comp-rounds-container').innerHTML = '';
    if (comp.rounds) comp.rounds.forEach(r => addRoundRow(r));

    // Rensa och fyll på classes
    document.getElementById('comp-classes-container').innerHTML = '';
    if (comp.classes) comp.classes.forEach(c => addClassRow(c));

    document.getElementById('create-competition-container').classList.remove('hidden');
    document.getElementById('show-create-competition-btn').classList.add('hidden');
    
    // Scrolla till formuläret
    document.getElementById('create-competition-container').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    editingCompId = null;
    document.getElementById('comp-name').value = '';
    document.getElementById('comp-status').value = 'draft';
    document.getElementById('comp-start-date').value = '';
    document.getElementById('comp-end-date').value = '';
    document.getElementById('comp-base-price').value = '';
    document.getElementById('comp-extra-price').value = '';
    document.getElementById('comp-rounds-container').innerHTML = '';
    document.getElementById('comp-classes-container').innerHTML = '';
    
    // Lägg till en tom rad av varje som standard för att hjälpa användaren
    addRoundRow();
    addClassRow();
}