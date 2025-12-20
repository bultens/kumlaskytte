// statistics-chart.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let resultsChart = null;

// Lyssnare för dropdowns (Nu inkluderas även chart-shot-count)
document.addEventListener('DOMContentLoaded', () => {
    ['chart-data-source', 'chart-grouping', 'chart-type', 'chart-shot-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const shooterId = document.getElementById('shooter-selector')?.value;
                // Om vi redan har data i minnet (i en riktig app) kunde vi rita om direkt,
                // men här anropar vi loadAndRender för enkelhetens skull (eller en render-funktion om vi sparat datan).
                // Eftersom vi inte sparar datan globalt i denna fil, hämtar vi den igen eller (bättre) vi sparar den.
                
                // För att göra det snabbt: Vi anropar loadAndRenderChart igen. 
                // Firestore cachen gör att det går fort ändå.
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
        const q = query(collection(db, 'results'), where('shooterId', '==', shooterId), orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        currentShooterData = [];
        querySnapshot.forEach((doc) => {
            currentShooterData.push(doc.data());
        });

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
    const chartType = document.getElementById('chart-type').value;
    const shotCountFilter = document.getElementById('chart-shot-count').value; // Hämta filter

    // 1. FILTRERA DATA
    let filteredData = data;
    if (shotCountFilter !== 'all') {
        const targetCount = parseInt(shotCountFilter);
        // Filtrera så vi bara behåller resultat med rätt antal skott
        filteredData = data.filter(item => item.shotCount === targetCount);
    }

    // Om filtret gjorde att det blev tomt
    if (filteredData.length === 0) {
        if (resultsChart) resultsChart.destroy();
        return;
    }

    // 2. BEARBETNING
    const processed = processData(filteredData, dataSource, grouping);

    if (resultsChart) {
        resultsChart.destroy();
    }

    const config = {
        type: chartType === 'boxplot' && grouping !== 'none' ? 'boxplot' : 'line',
        data: {
            labels: processed.labels,
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Poäng' } }
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

    if (chartType === 'boxplot' && grouping !== 'none') {
        config.data.datasets.push({
            label: 'Spridning',
            data: processed.values,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            outlierColor: '#999999',
            padding: 10,
            itemRadius: 2
        });
        config.data.datasets.push({
            label: 'Snitt',
            type: 'line',
            data: processed.averages,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            tension: 0.3,
            fill: false
        });
    } else {
        config.data.datasets.push({
            label: getLabelText(dataSource),
            data: processed.averages,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.3,
            fill: true
        });
        
        if (grouping !== 'none') {
            config.data.datasets.push({
                label: 'Max',
                data: processed.maxes,
                borderColor: 'rgba(54, 162, 235, 0.4)',
                borderDash: [5, 5],
                fill: false,
                tension: 0.3,
                pointRadius: 0
            });
            config.data.datasets.push({
                label: 'Min',
                data: processed.mins,
                borderColor: 'rgba(255, 99, 132, 0.4)',
                borderDash: [5, 5],
                fill: false,
                tension: 0.3,
                pointRadius: 0
            });
        }
    }

    resultsChart = new Chart(ctx, config);
}

function processData(rawData, source, grouping) {
    const groups = {};
    
    rawData.forEach(item => {
        let key = item.date;
        if (grouping === 'month') key = item.date.substring(0, 7); 
        if (grouping === 'none') key = `${item.date} (${item.type === 'competition' ? 'Tävling' : 'Träning'})`;

        if (!groups[key]) groups[key] = [];

        let val = 0;
        if (source === 'total') val = item.total;
        if (source === 'average_series') val = item.total / (item.series ? item.series.length : 1);
        if (source === 'best_series') val = item.bestSeries || 0;

        groups[key].push(val);
    });

    const labels = Object.keys(groups).sort();
    let displayLabels = labels;
    if (grouping === 'none' && labels.length > 30) displayLabels = labels.slice(labels.length - 30);

    const averages = [], mins = [], maxes = [], values = [];

    displayLabels.forEach(key => {
        const vals = groups[key];
        const sum = vals.reduce((a, b) => a + b, 0);
        averages.push(sum / vals.length);
        mins.push(Math.min(...vals));
        maxes.push(Math.max(...vals));
        values.push(vals);
    });

    return { labels: displayLabels, averages, mins, maxes, values };
}

function getLabelText(source) {
    if (source === 'total') return 'Totalpoäng';
    if (source === 'average_series') return 'Snitt per serie';
    if (source === 'best_series') return 'Bästa serie';
    return 'Värde';
}