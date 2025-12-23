// result-handler.js

// Medaljgränser (Standardgevär/Gevär)
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

// Hjälpfunktion för att räkna ihop serier från inputs
export function calculateTotalScore(containerSelector) {
    const inputs = document.querySelectorAll(`${containerSelector} input`);
    let total = 0;
    let bestSeries = 0;
    
    inputs.forEach(input => {
        // Ersätt komma med punkt och parsa
        let val = parseFloat(input.value.replace(',', '.'));
        if (!isNaN(val)) {
            total += val;
            if (val > bestSeries) bestSeries = val;
        }
    });

    // Avrunda till 1 decimal för att slippa 100.0000001
    total = Math.round(total * 10) / 10;
    
    return { total, bestSeries };
}