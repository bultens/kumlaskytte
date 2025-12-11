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
    
    if (!shotCountBtns.length) return;

    shotCountBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            document.querySelectorAll('.shot-count-btn').forEach(b => {
                b.classList.remove('bg-white', 'shadow', 'text-blue-800', 'font-bold');
                b.classList.add('text-gray-600', 'hover:bg-white/50');
            });
            newBtn.classList.add('bg-white', 'shadow', 'text-blue-800', 'font-bold');
            newBtn.classList.remove('text-gray-600', 'hover:bg-white/50');
            
            const count = parseInt(newBtn.dataset.count);
            if (shotCountInput) shotCountInput.value = count;
            
            generateSeriesInputs(count);
            calculateTotal(); 
        });
    });

    const container = document.getElementById('series-inputs-container');
    if (container && container.innerHTML.trim() === '') {
        generateSeriesInputs(20);
    }
}

function generateSeriesInputs(totalShots) {
    const seriesContainer = document.getElementById('series-inputs-container');
    if (!seriesContainer) return;
    
    seriesContainer.innerHTML = '';
    const seriesCount = totalShots / 10;

    for (let i = 1; i <= seriesCount; i++) {
        const div = document.createElement('div');
        div.className = "text-center";
        
        // ÄNDRING: Använder type="text" och inputmode="decimal" för att tillåta både komma och punkt
        div.innerHTML = `
            <span class="text-xs text-gray-500 block mb-1">Serie ${i}</span>
            <input type="text" inputmode="decimal" class="series-input w-full p-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="-">
        `;
        seriesContainer.appendChild(div);
    }

    const inputs = seriesContainer.querySelectorAll('.series-input');
    inputs.forEach(input => {
        // Validera att man bara skriver siffror, punkt eller komma
        input.addEventListener('input', (e) => {
            // Byt ut komma mot punkt live för beräkningens skull, eller hantera det i calculateTotal
            // Här låter vi användaren skriva vad de vill, men calculateTotal städar upp det.
            calculateTotal();
        });
    });
}

export function calculateTotal() {
    const inputs = document.querySelectorAll('.series-input');
    let total = 0;
    let best = 0;
    let hasValue = false;
    let seriesScores = [];

    inputs.forEach(input => {
        let rawValue = input.value;
        
        // Byt ut komma mot punkt för att JS ska kunna räkna
        rawValue = rawValue.replace(',', '.');
        
        // Ta bort allt som inte är siffror eller punkt (säkerhetsåtgärd eftersom vi bytte till text-input)
        // Detta tillåter dock användaren att skriva "10.5"
        
        let val = parseFloat(rawValue);

        if (!isNaN(val)) {
            total += val;
            if (val > best) best = val;
            seriesScores.push(val);
            hasValue = true;
        } else {
            seriesScores.push(0); 
        }
    });

    // Avrunda till 1 decimal för att undvika flyttalsfel (t.ex. 10.1 + 20.2 = 30.2999999)
    total = Math.round(total * 10) / 10;
    
    const totalEl = document.getElementById('live-total-display');
    const bestEl = document.getElementById('live-best-series');
    
    if (totalEl) totalEl.textContent = hasValue ? total : '0';
    if (bestEl) bestEl.textContent = hasValue ? best : '-';
    
    return { total, best, seriesScores };
}