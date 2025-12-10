// result-handler.js
import { showModal } from "./ui-handler.js";

// Medaljgränser
export const MEDAL_THRESHOLDS = [
    { name: 'Guld 3', min: 100, icon: '🏆', color: 'text-yellow-400' },
    { name: 'Guld 2', min: 99, icon: '🥇', color: 'text-yellow-500' },
    { name: 'Guld 1', min: 98, icon: '🥇', color: 'text-yellow-600' },
    { name: 'Guld',   min: 97, icon: '🥇', color: 'text-yellow-700' },
    { name: 'Silver', min: 89, icon: '🥈', color: 'text-gray-400' },
    { name: 'Brons',  min: 80, icon: '🥉', color: 'text-orange-700' }
];

export function getMedalForScore(score) {
    for (const medal of MEDAL_THRESHOLDS) {
        if (score >= medal.min) {
            return medal;
        }
    }
    return null;
}

export function setupResultFormListeners() {
    const shotCountBtns = document.querySelectorAll('.shot-count-btn');
    const shotCountInput = document.getElementById('result-shot-count');
    
    // 1. Hantera val av antal skott (20/40/60)
    shotCountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Uppdatera utseende på knappar
            shotCountBtns.forEach(b => {
                b.classList.remove('bg-white', 'shadow', 'text-blue-800', 'font-bold');
                b.classList.add('text-gray-600', 'hover:bg-white/50');
            });
            btn.classList.add('bg-white', 'shadow', 'text-blue-800', 'font-bold');
            btn.classList.remove('text-gray-600', 'hover:bg-white/50');
            
            // Uppdatera logik
            const count = parseInt(btn.dataset.count);
            shotCountInput.value = count;
            generateSeriesInputs(count);
            calculateTotal(); 
        });
    });

    // Starta med 20 skott som standard
    generateSeriesInputs(20);
}

function generateSeriesInputs(totalShots) {
    const seriesContainer = document.getElementById('series-inputs-container');
    if (!seriesContainer) return;
    
    seriesContainer.innerHTML = '';
    const seriesCount = totalShots / 10;

    for (let i = 1; i <= seriesCount; i++) {
        const div = document.createElement('div');
        div.className = "text-center";
        div.innerHTML = `
            <span class="text-xs text-gray-500 block mb-1">Serie ${i}</span>
            <input type="number" min="0" max="109" class="series-input w-full p-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="-">
        `;
        seriesContainer.appendChild(div);
    }

    // Lägg till lyssnare för live-räkning
    const inputs = seriesContainer.querySelectorAll('.series-input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateTotal);
    });
}

export function calculateTotal() {
    const inputs = document.querySelectorAll('.series-input');
    let total = 0;
    let best = 0;
    let hasValue = false;
    let seriesScores = [];

    inputs.forEach(input => {
        const val = parseInt(input.value);
        if (!isNaN(val)) {
            total += val;
            if (val > best) best = val;
            seriesScores.push(val);
            hasValue = true;
        } else {
            seriesScores.push(0); // Spara 0 eller null för tomma
        }
    });

    const totalEl = document.getElementById('live-total-display');
    const bestEl = document.getElementById('live-best-series');
    
    if (totalEl) totalEl.textContent = hasValue ? total : '0';
    if (bestEl) bestEl.textContent = hasValue ? best : '-';
    
    return { total, best, seriesScores };
}