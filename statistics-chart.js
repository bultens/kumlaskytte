// statistics-chart.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let resultsChart = null;

// Lyssnare för dropdowns (Tog bort chart-type)
document.addEventListener('DOMContentLoaded', () => {
    ['chart-data-source', 'chart-grouping', 'chart-shot-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const shooterId = document.getElementById('shooter-selector')?.value;
                if(shooterId) loadAndRenderChart(shooterId);
            });
        }
    });
});

// Variabel för att spara hämtad data så vi slipper hämta om när man bara byter filter
let currentShooterData = [];

export async function loadAndRenderChart(shooterId) {
    if (!shooterId) return;

    const ctx = document.getElementById('resultsChart');
    if (!ctx) return; 

    try {
        // Hämta data sorterat på datum (äldst först)
        const q = query(collection(db, 'results'), where('shooterId', '==', shooterId), orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        currentShooterData = [];
        querySnapshot.forEach((doc) => {
            // Vi behöver hantera datumobjekt/timestamps korrekt
            const data = doc.data();
            currentShooterData.push({
                ...data,
                // Skapa en sorteringsbar timestamp om den saknas
                sortTime: new Date(data.date).getTime() + (data.createdAt ? data.createdAt.toMillis() : 0)
            });
        });

        // Sortera en extra gång för säkerhets skull (createdAt skiljer omgångar samma dag)
        currentShooterData.sort((a, b) => a.sortTime - b.sortTime);

        if (currentShooterData.length === 0) {
            if (resultsChart) resultsChart.destroy();
            return;
        }

        renderChart(currentShooterData);
    } catch (error) {
        console.error("Fel vid hämtning av statistik:", error);
    }
}

function renderChart(data) {
    const ctx = document.getElementById('resultsChart');
    const dataSource = document.getElementById('chart-data-source').value;
    const grouping = document.getElementById('chart-grouping').value;
    const shotCountFilter = document.getElementById('chart-shot-count').value;

    // 1. FILTRERA DATA (Antal skott)
    let filteredData = data;
    if (shotCountFilter !== 'all') {
        const targetCount = parseInt(shotCountFilter);
        filteredData = data.filter(item => item.shotCount === targetCount);
    }

    if (filteredData.length === 0) {
        if (resultsChart) resultsChart.destroy();
        return;
    }

    // 2. BEARBETNING (Gruppering & Matematik)
    const processed = processData(filteredData, dataSource, grouping);

    if (resultsChart) {
        resultsChart.destroy();
    }

    // Konfiguration för Linjediagram
    const config = {
        type: 'line',
        data: {
            labels: processed.labels,
            datasets: [{
                label: getLabelText(dataSource),
                data: processed.values,
                borderColor: 'rgb(37, 99, 235)', // Tailwind Blue-600
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: 'rgb(37, 99, 235)',
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.3, // Mjuk kurva
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            scales: {
                y: { 
                    beginAtZero: false, 
                    title: { display: true, text: 'Poäng' },
                    grid: { color: '#f3f4f6' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += Math.round(context.parsed.y * 10) / 10;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };

    resultsChart = new Chart(ctx, config);
}

function processData(rawData, source, grouping) {
    const labels = [];
    const values = [];

    // Helper för att hämta värdet baserat på datakälla
    const getValue = (item) => {
        if (source === 'total') return parseFloat(item.total);
        if (source === 'average_series') return item.total / (item.series ? item.series.length : 1);
        if (source === 'best_series') return parseFloat(item.bestSeries) || 0;
        return 0;
    };

    if (grouping === 'none') {
        // --- VARJE TILLFÄLLE (Ingen gruppering) ---
        // Visa varje punkt i kronologisk ordning
        rawData.forEach(item => {
            const typeLabel = item.type === 'competition' ? ' (Tävling)' : '';
            labels.push(`${item.date}${typeLabel}`);
            values.push(getValue(item));
        });

    } else if (grouping === 'day') {
        // --- PER DAG (Visa BÄSTA resultatet för dagen) ---
        const groups = {};
        
        rawData.forEach(item => {
            const key = item.date; // YYYY-MM-DD
            if (!groups[key]) groups[key] = [];
            groups[key].push(getValue(item));
        });

        // Sortera datum
        const sortedKeys = Object.keys(groups).sort();
        
        sortedKeys.forEach(date => {
            const dayValues = groups[date];
            // Hitta MAX-värdet för dagen
            const bestValue = Math.max(...dayValues);
            labels.push(date);
            values.push(bestValue);
        });

    } else if (grouping === 'month') {
        // --- PER MÅNAD (Visa SNITTET för månaden) ---
        const groups = {};

        rawData.forEach(item => {
            const key = item.date.substring(0, 7); // YYYY-MM
            if (!groups[key]) groups[key] = [];
            groups[key].push(getValue(item));
        });

        const sortedKeys = Object.keys(groups).sort();

        sortedKeys.forEach(month => {
            const monthValues = groups[month];
            // Beräkna MEDELVÄRDE
            const sum = monthValues.reduce((a, b) => a + b, 0);
            const avg = sum / monthValues.length;
            labels.push(month);
            values.push(avg);
        });
    }

    // Om vi visar "Varje tillfälle" och har väldigt många punkter, visa bara de 50 senaste för läsbarhet
    if (grouping === 'none' && labels.length > 50) {
        return {
            labels: labels.slice(labels.length - 50),
            values: values.slice(values.length - 50)
        };
    }

    return { labels, values };
}

function getLabelText(source) {
    if (source === 'total') return 'Totalpoäng';
    if (source === 'average_series') return 'Snitt per serie';
    if (source === 'best_series') return 'Bästa serie';
    return 'Värde';
}