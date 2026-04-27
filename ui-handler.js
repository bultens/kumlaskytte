// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initFileManager } from "./admin-documents.js";
import { getMedalForScore } from "./result-handler.js";
import { 
    getVisitorStats, groupsData, 
    newsData, competitionsData, linksData, guidesData, sponsorsData, historyData 
} from "./data-service.js";

// Ver. 1.8
export let isAdminLoggedIn = false;
export let loggedInAdminUsername = '';
export let newsState = { currentPage: 1, year: 'all', itemsPerPage: 10 };
export let compState = { currentPage: 1, year: 'all', itemsPerPage: 10 };

let visitorChartInstance = null; // För att kunna förstöra och rita om grafen

let deviceChartInstance = null;

export function showModal(modalId, message) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const messageEl = modal.querySelector('p');
    if (messageEl) {
        messageEl.innerHTML = message;
    }
    
    modal.classList.add('active');
    
    if (modalId === 'errorModal' || modalId === 'confirmationModal') {
        setTimeout(() => hideModal(modalId), 4000);
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
}


export function showUserInfoModal(user) {
    const modal = document.getElementById('userInfoModal');
    if (!modal) return;
    
    const content = `
        <h3 class="text-xl font-bold mb-4">Användarinformation</h3>
        <p><strong>E-post:</strong> ${user.email}</p>
        <p><strong>Namn:</strong> ${user.name || 'Ej angivet'}</p>
        <p><strong>Adress:</strong> ${user.address || 'Ej angivet'}</p>
        <p><strong>Telefon:</strong> ${user.phone || 'Ej angivet'}</p>
        <p><strong>Födelseår:</strong> ${user.birthyear || 'Ej angivet'}</p>
        <p><strong>Vill ha utskick:</strong> ${user.mailingList ? 'Ja' : 'Nej'}</p>
        <p class="text-sm text-gray-500 mt-4">ID: ${user.id}</p>
    `;

    const messageEl = modal.querySelector('.modal-content p');
    if (messageEl) {
        messageEl.innerHTML = content;
    }

    modal.classList.add('active');
    
    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => hideModal('userInfoModal');
    }

    modal.onclick = (e) => {
        if (e.target === modal) hideModal('userInfoModal');
    };
}

export function showDeleteProfileModal() {
    const modal = document.getElementById('deleteProfileModal');
    if (modal) {
        // Hämta kontaktmail från sidfoten
        const emailEl = document.getElementById('contact-email');
        const email = emailEl && emailEl.textContent ? emailEl.textContent.trim() : 'styrelsen';

        const messageEl = document.getElementById('delete-profile-message');
        if (messageEl) {
            messageEl.innerHTML = `
                <span class="block mb-2 font-bold text-lg">Är du säker på att du vill ta bort ditt konto?</span>
                <span class="block mb-4 text-sm text-gray-700">
                    Denna åtgärd tar bort din inloggning och profil omedelbart. Det går inte att ångra.
                </span>
                
                <div class="text-left text-sm bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-900 mt-2">
                    <strong class="block mb-1 text-blue-800">⚠️ Viktigt om dina resultat:</strong>
                    All data under "Mina Resultat" sparas i föreningens databas för statistik och historik, även om du tar bort ditt konto.
                    <br><br>
                    Om du även vill att dina tidigare resultat ska raderas eller anonymiseras måste du kontakta administratören manuellt på:
                    <br>
                    👉 <a href="mailto:${email}" class="underline font-bold hover:text-blue-700">${email}</a>
                </div>
            `;
        }

        modal.classList.add('active');
        
        const cancelButton = document.getElementById('cancel-delete-profile-btn');
        if (cancelButton) {
            cancelButton.onclick = () => hideModal('deleteProfileModal');
        }
    }
}

export function showDeleteUserModal() {
    const modal = document.getElementById('deleteUserModal');
    if (modal) {
        modal.classList.add('active');
        const cancelButton = document.getElementById('cancel-delete-user-btn');
        if (cancelButton) {
            cancelButton.onclick = () => hideModal('deleteUserModal');
        }
    }
}

export function showEditUserModal(user) {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.name || '';
    document.getElementById('edit-user-address').value = user.address || '';
    document.getElementById('edit-user-phone').value = user.phone || '';
    document.getElementById('edit-user-birthyear').value = user.birthyear || '';
    document.getElementById('edit-user-mailing-list').checked = user.mailingList || false;

    modal.classList.add('active');
}

export function showShareModal(title, url) {
    const modal = document.getElementById('shareModal');
    if (!modal) return;

    const messageTitleEl = document.getElementById('share-message-title');
    if (messageTitleEl) {
        messageTitleEl.textContent = `Dela nyheten: "${title}"`;
    }

    const shareFacebookBtn = document.getElementById('share-facebook-btn');
    if (shareFacebookBtn) {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        shareFacebookBtn.onclick = () => {
            window.open(facebookUrl, '_blank');
            hideModal('shareModal');
        };
    }
    
    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.onclick = () => {
            navigator.clipboard.writeText(url)
                .then(() => {
                    showModal('confirmationModal', 'Länken har kopierats till urklipp!');
                    hideModal('shareModal');
                })
                .catch(err => showModal('errorModal', 'Kunde inte kopiera länken.'));
        };
    }
    
    modal.classList.add('active');
}

export function updateHeaderColor(color) {
    const header = document.getElementById('site-header');
    if (header) {
        header.classList.remove('bg-blue-800');
        header.style.backgroundColor = color;
    }
}

export function toggleSponsorsNavLink(isVisible) {
    const sponsorsLink = document.getElementById('sponsors-nav-link');
    if (sponsorsLink) {
        if (isVisible) {
            sponsorsLink.classList.remove('hidden');
        } else {
            sponsorsLink.classList.add('hidden');
        }
    }
}

export function renderCompetitions(competitionsData, isAdminLoggedIn) {
    const container = document.getElementById('competitions-container');
    const homeCompContainer = document.getElementById('home-competitions-container');
    const yearSelect = document.getElementById('comp-year-filter');
    const paginationContainer = document.getElementById('comp-pagination');

    if (!container) return;

    // 1. Sortera all data efter datum (senaste först)
    const sortedAll = [...competitionsData].sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Uppdatera startsidan (de 2 senaste tävlingarna)
    if (homeCompContainer) {
        homeCompContainer.innerHTML = '';
        sortedAll.slice(0, 2).forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString('sv-SE', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            homeCompContainer.innerHTML += `
                <a href="#tavlingar#comp-${item.id}" class="card block hover:shadow-lg transition border-l-4 border-blue-600 p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-lg text-gray-900">${item.title}</h3>
                            <p class="text-xs text-gray-500 mt-1">📅 ${dateStr} • 📍 ${item.location}</p>
                        </div>
                        <span class="text-blue-600 text-sm font-bold">Läs rapport →</span>
                    </div>
                </a>`;
        });
    }

    // 3. Uppdatera års-dropdownen dynamiskt
    if (yearSelect && yearSelect.options.length <= 1) {
        const years = [...new Set(sortedAll.map(c => new Date(c.date).getFullYear()))].sort((a, b) => b - a);
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });
    }

    // 4. Filtrera baserat på valt år för arkivet
    const filtered = sortedAll.filter(item => {
        return compState.year === 'all' || new Date(item.date).getFullYear().toString() === compState.year;
    });

    // 5. Beräkna sidor och plocka ut rätt inlägg
    const start = (compState.currentPage - 1) * compState.itemsPerPage;
    const paginatedItems = filtered.slice(start, start + compState.itemsPerPage);

    // 6. Rendera inläggen i arkivet
    container.innerHTML = '';
    
    if (paginatedItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p class="text-gray-500">Inga tävlingsrapporter hittades för valt år.</p>
            </div>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    paginatedItems.forEach(item => {
        const div = document.createElement('div');
        div.id = `comp-${item.id}`;
        div.className = "card bg-white p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-blue-600 relative group mb-6";
        
        const formattedDate = new Date(item.date).toLocaleDateString('sv-SE', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${item.title}</h3>
                    <div class="flex items-center text-xs text-gray-500 mt-1 gap-3">
                        <span class="flex items-center gap-1">📅 ${formattedDate}</span>
                        <span class="flex items-center gap-1">📍 ${item.location}</span>
                    </div>
                </div>
                
                ${item.pdfUrl ? `
                    <a href="${item.pdfUrl}" target="_blank" class="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition shadow-sm border border-red-100" title="Öppna resultatlista">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </a>
                ` : ''}
            </div>

            <div class="markdown-content text-gray-700 text-sm sm:text-base leading-relaxed mb-4">
                ${item.content}
            </div>

            <div class="flex items-center space-x-2 pt-4 border-t border-gray-100 mt-4">
                <button class="share-btn text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition font-bold" data-id="${item.id}" data-type="competitions" data-title="${item.title}">
                    🔗 Dela
                </button>
                ${isAdminLoggedIn ? `
                    <button class="edit-comp-btn text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-200 transition font-bold" data-id="${item.id}">
                        Redigera
                    </button>
                    <button class="delete-btn text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition font-bold" data-id="${item.id}" data-type="competitions">
                        Ta bort
                    </button>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });

    // 7. Rita ut pagineringsknapparna för tävlingar
    renderPaginationUI('comp-pagination', filtered.length, compState.itemsPerPage, compState.currentPage, (newPage) => {
        compState.currentPage = newPage;
        renderCompetitions(competitionsData, isAdminLoggedIn);
        // Scrolla mjukt upp till toppen av sektionen
        const section = document.getElementById('tavlingar');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
}

export function handleAdminUI(isAdmin, isMember) { 
    isAdminLoggedIn = isAdmin;

    // --- 1. ADMIN-LOGIK  ---
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden');
    });

    const adminNavLink = document.getElementById('admin-nav-link'); 
    const mobileAdminLink = document.getElementById('mobile-admin-nav-link'); 
    
    const adminSections = [
        'news-edit-section', 'competition-edit-section', 
        'calendar-edit-section', 'image-edit-section', 
        'history-edit-section', 'sponsors-edit-section', 'admin-panel', 'file-manager-container',
        'admin-add-guide-section'
    ];
    
    const adminLoginPanel = document.getElementById('admin-login-panel');
    const adminUserInfo = document.getElementById('admin-user-info');
    
    if (isAdmin) {
        // Initiera filhanteraren bara om man är admin
        import('./admin-documents.js').then(module => module.initFileManager());
        
        if (adminNavLink) adminNavLink.classList.remove('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.remove('hidden');
        
        adminSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });

        if (adminLoginPanel) adminLoginPanel.classList.add('hidden');
        
        if (adminUserInfo && auth.currentUser) {
            loggedInAdminUsername = auth.currentUser.email || 'Admin';
            adminUserInfo.textContent = `Inloggad som administratör: ${loggedInAdminUsername}`;
        }

        // Hämta och visa besöksstatistik
        getVisitorStats().then(stats => {
            const todayEl = document.getElementById('visitor-count-today');
            const totalEl = document.getElementById('visitor-count-total');
            if (todayEl) todayEl.textContent = stats.todayVisits.toLocaleString('sv-SE');
            if (totalEl) totalEl.textContent = stats.totalVisits.toLocaleString('sv-SE');
            // Rendera de nya graferna
            if (typeof renderVisitorChart === 'function') renderVisitorChart(stats.dailyStats, stats.todayVisits);
            if (typeof renderHourlyChart === 'function') renderHourlyChart(stats.allDocs);
            if (typeof renderDeviceChart === 'function') renderDeviceChart(stats.allDocs);
        }).catch(err => {
            console.error('Kunde inte hämta besöksstatistik:', err);
        });

        // --- MASTER-REFRESH: RITA OM INNEHÅLL MED ADMIN-VERKTYG ---
        const uid = auth.currentUser ? auth.currentUser.uid : null;
        
        // Vi kollar ifall listorna finns hämtade från databasen innan vi ritar om dem
        if (typeof newsData !== 'undefined' && newsData.length > 0) renderNews(newsData, true, uid);
        if (typeof competitionsData !== 'undefined' && competitionsData.length > 0) renderCompetitions(competitionsData, true, uid);
        if (typeof linksData !== 'undefined' && linksData.length > 0) renderLinks(linksData, true);
        if (typeof guidesData !== 'undefined' && (guidesData.length > 0 || document.getElementById('guider'))) renderGuides(guidesData, true);
        if (typeof sponsorsData !== 'undefined' && sponsorsData.length > 0) renderSponsors(sponsorsData, true);
        if (typeof historyData !== 'undefined' && historyData.length > 0) renderHistory(historyData, true, uid);

    } else {
        if (adminNavLink) adminNavLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');

        adminSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        
        if (adminLoginPanel) adminLoginPanel.classList.remove('hidden');
    }

    // --- 2. MEDLEMS-LOGIK (Topplistor) ---
    const toplistItem = document.getElementById('nav-toplist-item'); 
    
    if (isMember || isAdmin) { 
        if (toplistItem) toplistItem.classList.remove('hidden');
    } else {
        if (toplistItem) toplistItem.classList.add('hidden');
        
        // Om användaren redan står på sidan #topplistor, skicka hem dem
        if (window.location.hash === '#topplistor') {
            window.location.hash = '#hem';
        }
    }
}

/**
 * NY FUNKTION: Rendera graf över besökare
 */
export function renderVisitorChart(dailyStats, todayVisits) {
    const canvas = document.getElementById('visitorChart');
    const groupingSelect = document.getElementById('visitor-chart-grouping');
    if (!canvas || !groupingSelect) return;

    const grouping = groupingSelect.value; // 'day', 'week', 'month' eller 'year'
    const ctx = canvas.getContext('2d');
    
    // 1. Förbered datan
    const todayStr = new Date().toISOString().split('T')[0];
    const allData = { ...dailyStats };
    if (todayVisits > 0) allData[todayStr] = todayVisits;

    // 2. Gruppera datan baserat på val
    const groupedData = {};
    
    Object.keys(allData).forEach(dateStr => {
        let key = dateStr; // Standard: dag (YYYY-MM-DD)
        const date = new Date(dateStr);

        if (grouping === 'week') {
            // Hitta veckonummer (enkel version)
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
            const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            key = `${date.getFullYear()}-V${weekNum}`;
        } else if (grouping === 'month') {
            key = dateStr.substring(0, 7); // Blir YYYY-MM
        } else if (grouping === 'year') {
            key = dateStr.substring(0, 4); // Blir YYYY
        }

        groupedData[key] = (groupedData[key] || 0) + allData[dateStr];
    });

    // 3. Sortera och förbered för Chart.js
    const sortedKeys = Object.keys(groupedData).sort();
    const displayKeys = sortedKeys.slice(-15); // Visa de senaste 15 punkterna
    const displayValues = displayKeys.map(key => groupedData[key]);

    // 4. Rita om grafen
    if (visitorChartInstance) {
        visitorChartInstance.destroy();
    }

    visitorChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayKeys,
            datasets: [{
                label: 'Besökare',
                data: displayValues,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { ticks: { font: { size: 10 } } }
            }
        }
    });
}
//renderDeviceChart(stats.allDocs)

export function toggleProfileUI(user, isAdmin) {
    const showLoginLink = document.getElementById('show-login-link');
    const adminIndicator = document.getElementById('admin-indicator');
    
    // Nya referenser för desktop-menyn
    const navAccountGroup = document.getElementById('nav-account-group'); // Hela "Mitt Konto" dropdownen
    const navToplist = document.getElementById('nav-toplist'); // Länken inuti "Aktuellt"
    
    // Mobil-länkar (Oförändrade)
    const mobileResultsLink = document.getElementById('mobile-results-nav-link');
    const mobileProfileLink = document.getElementById('mobile-profile-nav-link');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    if (user) {
        // --- INLOGGAD ---
        if (showLoginLink) showLoginLink.classList.add('hidden'); // Dölj "Logga in"-knappen
        
        // Visa menyer för inloggad
        if (navAccountGroup) navAccountGroup.classList.remove('hidden');
        if (navToplist) navToplist.classList.remove('hidden'); // Visa "Topplistor" under Aktuellt

        // Mobil
        if (mobileResultsLink) mobileResultsLink.classList.remove('hidden');
        if (mobileProfileLink) mobileProfileLink.classList.remove('hidden');
        if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');
        
        // Admin-badge
        if (adminIndicator) {
            isAdmin ? adminIndicator.classList.remove('hidden') : adminIndicator.classList.add('hidden');
        }
    } else {
        // --- UTLOGGAD ---
        if (showLoginLink) showLoginLink.classList.remove('hidden');
        
        // Dölj menyer
        if (navAccountGroup) navAccountGroup.classList.add('hidden');
        if (navToplist) navToplist.classList.add('hidden'); // Dölj "Topplistor"

        // Mobil
        if (mobileResultsLink) mobileResultsLink.classList.add('hidden');
        if (mobileProfileLink) mobileProfileLink.classList.add('hidden');
        if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');
        
        if (adminIndicator) adminIndicator.classList.add('hidden');
    }
}

// Hjälpfunktion för att rita ut snygg paginering
function renderPaginationUI(containerId, totalItems, itemsPerPage, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    container.innerHTML = '';
    
    if (totalPages <= 1) return;

    // Föregående
    const prevBtn = document.createElement('button');
    prevBtn.className = `px-3 py-2 rounded-lg border ${currentPage === 1 ? 'text-gray-300 border-gray-100' : 'text-blue-600 border-blue-100 hover:bg-blue-50'} transition font-bold`;
    prevBtn.innerHTML = '←';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => onPageChange(currentPage - 1);
    container.appendChild(prevBtn);

    // Sidnummer
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        const isActive = i === currentPage;
        pageBtn.className = `w-10 h-10 rounded-lg border font-bold transition ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => onPageChange(i);
        container.appendChild(pageBtn);
    }

    // Nästa
    const nextBtn = document.createElement('button');
    nextBtn.className = `px-3 py-2 rounded-lg border ${currentPage === totalPages ? 'text-gray-300 border-gray-100' : 'text-blue-600 border-blue-100 hover:bg-blue-50'} transition font-bold`;
    nextBtn.innerHTML = '→';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => onPageChange(currentPage + 1);
    container.appendChild(nextBtn);
}

export function renderNews(newsData, isAdminLoggedIn, currentUserId) {
    const homeNewsContainer = document.getElementById('home-news-container');
    const allNewsContainer = document.getElementById('all-news-container');
    const yearSelect = document.getElementById('news-year-filter');

    const sortedAll = (newsData && Array.isArray(newsData)) ? 
        [...newsData].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

    if (yearSelect && yearSelect.options.length <= 1 && sortedAll.length > 0) {
        const years = [...new Set(sortedAll.map(n => {
            const d = new Date(n.date);
            return isNaN(d) ? null : d.getFullYear();
        }))].filter(y => y !== null).sort((a,b) => b-a);
        
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.toString();
            opt.textContent = y.toString();
            yearSelect.appendChild(opt);
        });
    }

    // STARTSIDAN - Skicka med "true" som sista argument för att indikera att det är startsidan
    if (homeNewsContainer) {
        homeNewsContainer.innerHTML = sortedAll.length === 0 ? 
            '<p class="text-gray-500 italic">Inga nyheter tillgängliga.</p>' : '';
        sortedAll.slice(0, 2).forEach(item => {
            homeNewsContainer.innerHTML += createNewsCard(item, isAdminLoggedIn, currentUserId, true);
        });

        // MOBILFIX: Sätt lyssnaren direkt på korten efter att de skapats
        const newsCards = homeNewsContainer.querySelectorAll('.home-news-post');
        newsCards.forEach(card => {
            card.addEventListener('click', () => {
                const targetHash = card.getAttribute('data-href');
                if (targetHash) window.location.hash = targetHash;
            });
        });
    }

    // NYHETSSIDAN - Skicka med "false" som sista argument
    if (allNewsContainer) {
        const filtered = sortedAll.filter(item => {
            if (!newsState.year || newsState.year === 'all') return true;
            return new Date(item.date).getFullYear().toString() === newsState.year;
        });

        const start = (newsState.currentPage - 1) * newsState.itemsPerPage;
        const paginatedItems = filtered.slice(start, start + newsState.itemsPerPage);

        allNewsContainer.innerHTML = paginatedItems.length === 0 ? 
            '<p class="text-gray-500 italic p-8 text-center">Inga nyheter hittades för valt år.</p>' : '';
        
        paginatedItems.forEach(item => {
            allNewsContainer.innerHTML += createNewsCard(item, isAdminLoggedIn, currentUserId, false);
        });

        renderPaginationUI('news-pagination', filtered.length, newsState.itemsPerPage, newsState.currentPage, (newPage) => {
            newsState.currentPage = newPage;
            renderNews(newsData, isAdminLoggedIn, currentUserId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// NY VERSION AV createNewsCard
const createNewsCard = (item, isAdminLoggedIn, currentUserId, isStartPage = false) => {
    const likes = item.likes || {};
    const likeCount = Object.keys(likes).length;
    const userHasLiked = currentUserId && likes[currentUserId];

    // Om det är på startsidan: Klickbart kort, förkortad text
    if (isStartPage) {
        return `
            <div data-href="#nyheter#news-${item.id}" role="button" tabindex="0" class="card block hover:shadow-lg transition border-l-4 border-blue-600 p-4 home-news-post cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500" id="home-news-${item.id}">
                <h3 class="text-xl font-bold mb-1 text-gray-900">${item.title}</h3>
                <p class="text-xs text-gray-500 mb-3">📅 ${item.date}</p>
                <div class="markdown-content text-gray-700 text-sm line-clamp-3 mb-2 pointer-events-none">${item.content}</div>
                <span class="text-blue-600 text-sm font-bold mt-2 inline-block pointer-events-none">Läs hela nyheten →</span>
            </div>`;
    }

    // Om det är på nyhetssidan: Full text (ingen line-clamp), gilla/dela-knappar
    return `
        <div class="card h-full flex flex-col sm:flex-row gap-4" id="news-${item.id}">
            <div class="flex-grow">
                <h3 class="text-xl font-bold mb-1">${item.title}</h3>
                <p class="text-xs text-gray-500 mb-3">📅 ${item.date}</p>
                <div class="markdown-content text-gray-700 text-sm">${item.content}</div>
                <div class="flex items-center space-x-2 mt-4">
                    <button class="like-btn text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition ${userHasLiked ? 'text-blue-600 font-bold' : ''}" data-id="${item.id}" data-type="news">
                        👍 <span>${likeCount}</span>
                    </button>
                    <button class="share-btn text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition" data-id="${item.id}" data-type="news" data-title="${item.title}">
                        🔗 Dela
                    </button>
                    ${isAdminLoggedIn ? `
                        <button class="edit-news-btn text-xs bg-gray-500 text-white px-2 py-1 rounded" data-id="${item.id}">Ändra</button>
                        <button class="delete-btn text-xs bg-red-500 text-white px-2 py-1 rounded" data-id="${item.id}" data-type="news">Ta bort</button>
                    ` : ''}
                </div>
            </div>
        </div>`;
};

export function renderEvents(eventsData, isAdminLoggedIn) {
    const events = eventsData;
    const calendarContainer = document.getElementById('calendar-container');
    const homeEventsContainer = document.getElementById('home-events-container');

    if (!calendarContainer || !homeEventsContainer) return;

    calendarContainer.innerHTML = '';
    homeEventsContainer.innerHTML = '';
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = events.filter(e => e.date >= today);
    
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date)); 

    upcomingEvents.slice(0, 2).forEach(item => {
        const eventDate = new Date(item.date);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleString('sv-SE', { month: 'short' });

        const eventUrl = `#kalender#event-${item.id}`;
        
        homeEventsContainer.innerHTML += `
            <a href="${eventUrl}" class="card flex items-start calendar-post home-calendar-post" data-id="${item.id}">
                <div class="flex-shrink-0 bg-blue-500 text-white font-bold p-4 rounded-lg text-center mr-4">
                    <p class="text-xl leading-none">${day}</p>
                    <p class="text-xs uppercase">${month}</p>
                </div>
                <div class="flex-grow">
                    <h3 class="text-2xl font-semibold mb-1">${item.title}</h3>
                </div>
            </a>
        `;
    });

    upcomingEvents.forEach(item => {
        const eventDate = new Date(item.date);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleString('sv-SE', { month: 'short' });
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = item.description;
        const shortText = tempDiv.firstElementChild && tempDiv.firstElementChild.tagName === 'P' ? tempDiv.firstElementChild.innerHTML : tempDiv.innerHTML;
        const createdAt = item.createdAt?.toDate() || new Date();
        const updatedAt = item.updatedAt?.toDate() || createdAt;
        const timeInfo = `Upplagt: ${createdAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })} ${createdAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}. Senast redigerad: ${updatedAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })} ${updatedAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;

        calendarContainer.innerHTML += `
            <div class="card flex items-start calendar-post" data-expanded="false" data-id="${item.id}" id="event-${item.id}">
                <div class="flex-shrink-0 bg-blue-500 text-white font-bold p-4 rounded-lg text-center mr-4">
                    <p class="text-xl leading-none">${day}</p>
                    <p class="text-xs uppercase">${month}</p>
                </div>
                <div class="flex-grow">
                    <h3 class="text-2xl font-semibold mb-1">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">${timeInfo}</p>
                    <div class="text-gray-700 markdown-content calendar-post-short">${shortText}</div>
                    <div class="text-gray-700 markdown-content hidden calendar-post-expanded mt-2">${item.description}</div>
                    <div class="flex items-center space-x-2 mt-4">
                        <button class="share-btn px-3 py-1 bg-gray-100 text-gray-700 font-bold rounded hover:bg-gray-200 transition text-sm" data-id="${item.id}" data-type="events" data-title="${item.title}">🔗 Dela</button>
                        ${isAdminLoggedIn ? `
                            <button class="delete-btn px-3 py-1 bg-red-500 text-white font-bold rounded hover:bg-red-600 transition text-sm" data-id="${item.id}" data-type="events" data-series-id="${item.seriesId || ''}">Ta bort</button>
                            <button class="edit-event-btn px-3 py-1 bg-gray-500 text-white font-bold rounded hover:bg-gray-600 transition text-sm" data-id="${item.id}">Ändra</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.calendar-post').forEach(post => {
        post.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.edit-event-btn')) {
                return;
            }
            const isExpanded = post.getAttribute('data-expanded') === 'true';
            post.setAttribute('data-expanded', !isExpanded);
            const shortText = post.querySelector('.calendar-post-short');
            const expandedText = post.querySelector('.calendar-post-expanded');
            if (isExpanded) {
                shortText.classList.remove('hidden');
                expandedText.classList.add('hidden');
            } else {
                shortText.classList.add('hidden');
                expandedText.classList.remove('hidden');
            }
        });
    });
}

export function renderHistory(historyData, isAdminLoggedIn, currentUserId) {
    const historyContainer = document.getElementById('home-history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    historyData.sort((a, b) => {
        return a.priority - b.priority;
    });
    
    historyData.forEach(item => {
        const createdAt = item.createdAt?.toDate() || new Date();
        const updatedAt = item.updatedAt?.toDate() || createdAt;
        const timeInfo = `Upplagt: ${createdAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })} ${createdAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}. Senast redigerad: ${updatedAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })} ${updatedAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
        const likes = item.likes || {};
        const likeCount = Object.keys(likes).length;
        const userHasLiked = currentUserId && likes[currentUserId];

        historyContainer.innerHTML += `
            <div class="card" id="history-${item.id}">
                <h3 class="text-2xl font-semibold mb-2">${item.title}</h3>
                <p class="text-sm text-gray-500 mb-2">${timeInfo}</p>
                <div class="text-gray-700 markdown-content">${item.content}</div>
                <div class="flex items-center space-x-2 mt-4">
                    <button class="like-btn px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300 ${userHasLiked ? 'text-blue-500' : ''}" data-id="${item.id}" data-type="history" data-liked="${userHasLiked}">
                        👍 <span class="like-count">${likeCount}</span>
                    </button>
                    <button class="share-btn px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300" data-id="${item.id}" data-type="history" data-title="${item.title}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.314l4.94 2.47a3 3 0 10.96.168.25.25 0 01.192.327l-.07.292-.195.071c-.563.205-.96.721-.96 1.302a.25.25 0 00.327.192l.292-.07-.07-.195c.581.042 1.139-.247 1.302-.96l.07-.292-.195-.071a3 3 0 00-.765-.365l-4.94-2.47c-1.091.523-2.265.249-3.033-.519l-1.705-1.705c-.768-.768-1.042-1.942-.519-3.033l1.378-1.378z"/>
                        </svg>
                        <span class="ml-1 hidden sm:inline">Dela</span>
                    </button>
                    ${isAdminLoggedIn ? `
                        <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="history">Ta bort</button>
                        <button class="edit-history-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                    ` : ''}
                </div>
            </div>
        `;
    });
}


export function renderGroupsAdmin(groups) {
    const container = document.getElementById('admin-groups-list');
    if (!container) return;

    container.innerHTML = '';
    
    if (groups.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic text-sm">Inga grupper skapade än.</p>';
        return;
    }

    groups.forEach(group => {
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded-full shadow-inner border border-black/10" style="background-color: ${group.color}"></div>
                    <span class="font-bold text-gray-800">${group.name}</span>
                </div>
                <button class="delete-btn text-red-600 hover:text-red-800 font-bold text-sm transition" 
                    data-id="${group.id}" data-type="groups">Ta bort</button>
            </div>
        `;
    });
}

export function renderImages(imageData, isAdminLoggedIn) {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = '';
    
    imageData.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1);
        const dateB = new Date(b.year, b.month - 1);
        const priorityA = a.priority || 10;
        const priorityB = b.priority || 10;
        if (dateB - dateA !== 0) return dateB - dateA;
        return priorityA - priorityB;
    });
    
    const groupedImages = imageData.reduce((acc, curr) => {
        const key = `${curr.year}-${curr.month}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
    }, {});

    for (const key in groupedImages) {
        const imagesInGroup = groupedImages[key];
        const itemDate = new Date(imagesInGroup[0].year, imagesInGroup[0].month - 1);
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.toLocaleString('sv-SE', { month: 'long' });

        const galleryGroupHtml = `
            <h2 class="text-2xl font-bold mt-8 mb-4">${itemMonth} ${itemYear}</h2>
            <hr class="border-gray-300 mb-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                ${imagesInGroup.map(item => `
                    <div class="relative group cursor-pointer gallery-item" 
                         id="image-${item.id}"
                         data-url="${item.url}" 
                         data-title="${item.title}" 
                         data-description="${item.description || ''}">
                        <img src="${item.url}" alt="${item.title}" class="gallery-image shadow-md group-hover:opacity-75 transition-opacity duration-300 w-full h-64 object-cover rounded-lg">
                        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg flex flex-col items-start">
                            <h3 class="text-lg font-bold">${item.title}</h3>
                            ${item.description ? `<p class="text-xs text-gray-200 line-clamp-1 mt-0.5">${item.description}</p>` : ''}
                            <button class="share-btn mt-2 px-3 py-1 bg-white/20 text-white text-xs font-bold rounded hover:bg-white/40 transition duration-300" data-id="${item.id}" data-type="images" data-title="${item.title}">🔗 Dela bild</button>
                        </div>
                        ${isAdminLoggedIn ? `
                            <div class="absolute top-2 right-2 flex space-x-2 z-10">
                                <button class="edit-image-btn px-3 py-1 bg-gray-500/80 text-white text-xs font-bold rounded-full hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                                <button class="delete-btn px-3 py-1 bg-red-500/80 text-white text-xs font-bold rounded-full hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="images">Ta bort</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        galleryContainer.innerHTML += galleryGroupHtml;
    }
}

export function showLightbox(url, title, description = "") {
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    const descEl = document.getElementById('lightbox-description'); // NY
    
    if (modal && img && caption) {
        img.src = url;
        caption.textContent = title;
        if (descEl) descEl.textContent = description; // VISAR HELA TEXTEN
        modal.classList.add('active');
    }
}


export function renderSponsors(sponsorsData, isAdminLoggedIn) {
    const sponsorsContainer = document.getElementById('sponsors-container');
    if (!sponsorsContainer) return;
    sponsorsContainer.innerHTML = '';
    
    // Sorteringslogik
    const sizeOrder = {'1/1': 1, '1/2': 2, '1/4': 3};
    sponsorsData.sort((a, b) => {
        const sizeDiff = sizeOrder[a.size] - sizeOrder[b.size];
        if (sizeDiff !== 0) {
            return sizeDiff;
        }
        return a.priority - b.priority;
    });

    // Gruppering baserat på storlek
    const sponsorsByFull = sponsorsData.filter(s => s.size === '1/1');
    const sponsorsByHalf = sponsorsData.filter(s => s.size === '1/2');
    const sponsorsByQuarter = sponsorsData.filter(s => s.size === '1/4');

    const renderSponsorGroup = (group, className) => {
        return group.map(sponsor => {
            // 1. Hämta bakgrundstyp från databasen, default till vit om det saknas
            const bgClass = sponsor.bgType || 'bg-white';
            
            const sponsorLink = sponsor.url ? `<a href="${sponsor.url}" target="_blank" rel="noopener noreferrer" class="block w-full h-full flex flex-col items-center justify-center">` : '';
            const closingTag = sponsor.url ? '</a>' : '';
            
            // 2. Applicera bgClass i class-listan för div-elementet
            const sponsorHtml = `
                <div class="card p-4 flex flex-col items-center justify-center text-center ${className} ${bgClass}">
                    ${sponsorLink}
                        <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="sponsor-logo object-contain mb-2">
                        <h3 class="text-xl font-semibold">${sponsor.name}</h3>
                        ${sponsor.extraText ? `<p class="text-sm text-gray-500">${sponsor.extraText}</p>` : ''}
                    ${closingTag}
                    ${isAdminLoggedIn ? `
                        <div class="flex space-x-2 mt-2">
                            <button class="edit-sponsor-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full hover:bg-gray-600 transition duration-300" data-id="${sponsor.id}">Ändra</button>
                            <button class="delete-btn px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full hover:bg-red-600 transition duration-300" data-id="${sponsor.id}" data-type="sponsors">Ta bort</button>
                        </div>
                    ` : ''}
                </div>
            `;
            return sponsorHtml;
        }).join('');
    };

    // Rendera grupperna
    if (sponsorsByFull.length > 0) {
        sponsorsContainer.innerHTML += `<div class="sponsors-grid-container">${renderSponsorGroup(sponsorsByFull, 'sponsor-card-1-1')}</div>`;
    }
    if (sponsorsByHalf.length > 0) {
        sponsorsContainer.innerHTML += `<div class="sponsors-grid-container">${renderSponsorGroup(sponsorsByHalf, 'sponsor-card-1-2')}</div>`;
    }
    if (sponsorsByQuarter.length > 0) {
        sponsorsContainer.innerHTML += `<div class="sponsors-grid-container">${renderSponsorGroup(sponsorsByQuarter, 'sponsor-card-1-4')}</div>`;
    }
}

export function renderAdminsAndUsers(users, toggleStatusCallback, toggleGroupCallback) {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga användare hittades.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = "min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden";
    
    // 1. LÄGG TILL GRUPP-KOLUMNEN I HEADERN HÄR
    table.innerHTML = `
        <thead class="bg-gray-100">
            <tr>
                <th class="py-2 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase">E-post / Namn</th>
                <th class="py-2 px-4 border-b text-center text-xs font-semibold text-gray-600 uppercase w-20 sm:w-32">Admin</th>
                <th class="py-2 px-4 border-b text-center text-xs font-semibold text-gray-600 uppercase w-16 sm:w-24">Medlem</th>
                <th class="py-2 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase">Grupper</th>
                <th class="py-2 px-4 border-b text-center text-xs font-semibold text-gray-600 uppercase w-24 sm:w-32">Åtgärd</th>
            </tr>
        </thead>
        <tbody id="user-table-body"></tbody>
    `;

    const tbody = table.querySelector('#user-table-body');
    const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 border-b last:border-0";
        
        const memberColor = user.isClubMember ? 'text-green-600 bg-green-100' : 'text-gray-400 bg-gray-100';
        const memberText = user.isClubMember ? 'Ja' : 'Nej';

        let adminControls = '';
        if (user.isAdmin) {
            adminControls = `
                <div class="flex flex-col items-center gap-1">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">Admin</span>
                    ${user.id !== currentUserId ? 
                        `<button class="delete-admin-btn text-[9px] text-red-600 hover:underline leading-tight" data-id="${user.id}">Ta bort</button>` 
                        : '<span class="text-[9px] text-gray-400">(Du)</span>'}
                </div>`;
        } else {
            adminControls = `
                <button class="add-admin-btn text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition whitespace-nowrap" data-id="${user.id}">
                    Gör admin
                </button>`;
        }

        // 2. BYGG UPP GRUPPERNA (Detta saknades i min kod du fick)
        const userGroups = user.groups || [];
        const groupsHtml = groupsData && groupsData.length > 0 ? groupsData.map(group => `
            <label class="inline-flex items-center mr-2 mb-1 cursor-pointer group" title="${group.name}">
                <input type="checkbox" 
                    class="user-group-checkbox w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    data-user-id="${user.id}" 
                    data-group-id="${group.id}" 
                    ${userGroups.includes(group.id) ? 'checked' : ''}>
                <span class="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style="background-color: ${group.color}22; color: ${group.color}">
                    ${group.name}
                </span>
            </label>
        `).join('') : '<span class="text-[10px] text-gray-400 italic">Inga grupper skapade</span>';

        tr.innerHTML = `
            <td class="py-2 px-3 sm:px-4">
                <div class="flex flex-col min-w-0">
                    <span class="font-medium text-gray-800 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none" title="${user.email}">
                        ${user.email}
                    </span>
                    <span class="text-[10px] text-gray-500 truncate max-w-[100px] sm:max-w-none">
                        ${user.name || 'Inget namn'}
                    </span>
                </div>
            </td>
            <td class="py-2 px-2 text-center">
                ${adminControls}
            </td>
            <td class="py-2 px-2 text-center">
                 <button class="member-toggle-btn px-2 py-1 rounded-full text-[10px] font-bold ${memberColor} hover:opacity-80 transition" 
                    data-id="${user.id}" data-status="${user.isClubMember}">
                    ${memberText}
                </button>
            </td>
            <td class="py-2 px-2">
                <div class="flex flex-wrap max-w-[200px]">
                    ${groupsHtml}
                </div>
            </td>
            <td class="py-2 px-2">
                <div class="flex items-center justify-center gap-1 sm:gap-2">
                    <button class="show-user-info-btn p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition" 
                            data-id="${user.id}" title="Visa information">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>

                    <button class="edit-user-btn p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition" 
                            data-user-id="${user.id}" title="Redigera användare">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>

                    ${!user.isAdmin ? `
                        <button class="delete-user-btn p-1.5 text-red-600 hover:bg-red-50 rounded-full transition" 
                                data-id="${user.id}" title="Ta bort användare">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    container.appendChild(table);

    // Event listeners för medlemstoggle
    tbody.querySelectorAll('.member-toggle-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const currentStatus = btn.dataset.status === 'true';
            if (typeof toggleStatusCallback === 'function') {
                await toggleStatusCallback(uid, currentStatus);
            }
        });
    });

    // NYTT: Event listeners för grupp-checkboxar
    tbody.querySelectorAll('.user-group-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const userId = cb.dataset.userId;
            const groupId = cb.dataset.groupId;
            const isChecked = cb.checked;
            if (typeof toggleGroupCallback === 'function') {
                toggleGroupCallback(userId, groupId, isChecked);
            }
        });
    });
}

export function renderShootersAdmin(shootersData) {
    const container = document.getElementById('admin-shooters-list');
    if (!container) return;

    container.innerHTML = '';
    
    // Sortera: De som kräver åtgärd först, sen alfabetiskt
    shootersData.sort((a, b) => {
        if (a.requiresAdminAction && !b.requiresAdminAction) return -1;
        if (!a.requiresAdminAction && b.requiresAdminAction) return 1;
        return a.name.localeCompare(b.name);
    });

    shootersData.forEach(shooter => {
        const parentCount = shooter.parentUserIds ? shooter.parentUserIds.length : 0;
        
        // Kolla om den är "föräldralös"
        const isOrphan = shooter.requiresAdminAction || parentCount === 0;
        
        let statusHtml = `<p class="text-xs text-gray-500">Administreras av ${parentCount} konton</p>`;
        let bgClass = "bg-gray-100 border-gray-200";

        if (isOrphan) {
            bgClass = "bg-red-50 border-red-300"; // Röd bakgrund för att varna admin
            statusHtml = `
                <p class="text-xs text-red-600 font-bold">⚠️ SAKNAR KOPPLING (Föräldralös)</p>
                <p class="text-xs text-red-500">Denna profil syns inte för någon medlem just nu.</p>
            `;
        }
        
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 rounded-lg border ${bgClass}">
                <div>
                    <span class="font-bold text-gray-800">${shooter.name}</span>
                    <span class="text-sm text-gray-500"> (Född: ${shooter.birthyear})</span>
                    ${statusHtml}
                </div>
                <div class="flex space-x-2">
                    <button class="link-parent-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition flex items-center gap-1" 
                            data-id="${shooter.id}" data-name="${shooter.name}">
                        <span>👥</span> Hantera föräldrar
                    </button>
                    <button class="delete-btn px-3 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition" 
                            data-id="${shooter.id}" 
                            data-type="shooters">
                        Ta bort
                    </button>
                </div>
            </div>
        `;
    });
}

export function renderUserReport(usersData) {
    const userListContainer = document.getElementById('user-report-list');
    const mailingListContainer = document.getElementById('mailing-list-report');
    if (!userListContainer || !mailingListContainer) return;
    
    userListContainer.innerHTML = '';
    mailingListContainer.innerHTML = '';

    const sortedUsers = usersData.sort((a, b) => a.email.localeCompare(b.email));

    sortedUsers.forEach(user => {
        const userHtml = `
            <div class="p-2 border-b border-gray-200 last:border-0">
                <p><strong>E-post:</strong> ${user.email}</p>
                <p><strong>Namn:</strong> ${user.name || 'Ej angivet'}</p>
                <p><strong>Adress:</strong> ${user.address || 'Ej angivet'}</p>
                <p><strong>Telefon:</strong> ${user.phone || 'Ej angivet'}</p>
                <p><strong>Födelseår:</strong> ${user.birthyear || 'Ej angivet'}</p>
                <p><strong>Admin:</strong> ${user.isAdmin ? 'Ja' : 'Nej'}</p>
                <p><strong>Vill ha utskick:</strong> ${user.mailingList ? 'Ja' : 'Nej'}</p>
            </div>
        `;
        userListContainer.innerHTML += userHtml;
    });

    const mailingListUsers = sortedUsers.filter(user => user.mailingList);
    mailingListUsers.forEach(user => {
        mailingListContainer.innerHTML += `
            <div class="p-2 border-b border-gray-200 last:border-0">
                <p><strong>E-post:</strong> ${user.email}</p>
            </div>
        `;
    });
}


export function renderContactInfo() {
    const contactAddressEls = document.querySelectorAll('#contact-address');
    const contactLocationEls = document.querySelectorAll('#contact-location'); 
    const contactPhoneEls = document.querySelectorAll('#contact-phone');
    const contactEmailEls = document.querySelectorAll('#contact-email');

    getFirestoreDoc(doc(db, 'settings', 'siteSettings')).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            contactAddressEls.forEach(el => el.textContent = data.contactAddress || 'Ej angivet');
            contactLocationEls.forEach(el => el.textContent = data.contactLocation || 'Ej angivet');
            contactPhoneEls.forEach(el => el.textContent = data.contactPhone || 'Ej angivet');
            contactEmailEls.forEach(el => el.textContent = data.contactEmail || 'Ej angivet');
        }
    });
}

export function renderSiteSettings(data) {
    if (!data) return;

    // Hjälpfunktion för att sätta värde säkert
    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value || '';
        } else {
            // Bra för felsökning, kan tas bort senare
            // console.warn(`Varning: Hittade inte input-fältet med id: ${id}`);
        }
    };

    // 1. Logo och Färg
    setVal('logo-url-input', data.logoUrl);
    setVal('header-color-input', data.headerColor);

    // 2. Kontaktuppgifter (HÄR VAR FELET)
    // Vi ändrar från data.address -> data.contactAddress osv.
    setVal('contact-address-input', data.contactAddress);
    setVal('contact-location-input', data.contactLocation);
    setVal('contact-phone-input', data.contactPhone);
    setVal('contact-email-input', data.contactEmail);
}

export async function renderProfileInfo(user) {
    if (!user) return;

    try {
        // Hämta färsk data från Firestore för den inloggade användaren
        const userDoc = await getFirestoreDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();

            // 1. Rendera den statiska sammanfattningen (kräver id="profile-info-container" i index.html)
            const container = document.getElementById('profile-info-container');
            if (container) {
                container.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-100">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700">Namn</label>
                                <p class="p-2 bg-gray-50 border rounded text-gray-900">${data.name || 'Ej angivet'}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700">E-post</label>
                                <p class="p-2 bg-gray-50 border rounded text-gray-900">${data.email || user.email}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700">Födelseår</label>
                                <p class="p-2 bg-gray-50 border rounded text-gray-900">${data.birthyear || 'Ej angivet'}</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700">Adress</label>
                                <p class="p-2 bg-gray-50 border rounded text-gray-900">${data.address || 'Ej angivet'}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700">Telefon</label>
                                <p class="p-2 bg-gray-50 border rounded text-gray-900">${data.phone || 'Ej angivet'}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 2. Fyll i formulärets input-fält så användaren slipper skriva allt på nytt vid ändring
            const nameInput = document.getElementById('profile-name-input');
            const addressInput = document.getElementById('profile-address-input');
            const phoneInput = document.getElementById('profile-phone-input');
            const birthyearInput = document.getElementById('profile-birthyear-input');
            const mailingListCheckbox = document.getElementById('profile-mailing-list-checkbox');

            if (nameInput) nameInput.value = data.name || '';
            if (addressInput) addressInput.value = data.address || '';
            if (phoneInput) phoneInput.value = data.phone || '';
            if (birthyearInput) birthyearInput.value = data.birthyear || '';
            if (mailingListCheckbox) mailingListCheckbox.checked = data.mailingList || false;
        }
    } catch (error) {
        console.error("Fel vid hämtning av profilinfo:", error);
    }
}

export function applyEditorCommand(editor, command, value = null) {
    editor.focus();
    document.execCommand(command, false, value);
}

export function updateToolbarButtons(editor) {
    const toolbar = editor.previousElementSibling;
    if (!toolbar) return;
    const boldButton = toolbar.querySelector('[data-command="bold"]');
    const italicButton = toolbar.querySelector('[data-command="italic"]');
    
    if (document.queryCommandState('bold')) {
        boldButton.classList.add('active');
    } else {
        boldButton.classList.remove('active');
    }
    
    if (document.queryCommandState('italic')) {
        italicButton.classList.add('active');
    } else {
        italicButton.classList.remove('active');
    }
}

export function navigate(hash) {
    // 1. Hantera om hash är tom (gå till hem)
    if (!hash) hash = '#hem';

    // 2. Dela upp hashen för att hantera djuplänkar (t.ex. #lankar#link-123)
    // parts[1] blir sidans ID ("lankar"), parts[2] blir elementets ID ("link-123")
    const parts = hash.split('#');
    const pageId = parts[1] || 'hem'; 
    const subId = parts[2];           

    // 3. Dölj alla sidor
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // 4. Hitta och visa rätt huvudsida (t.ex. sektionen med id="lankar")
    const targetPage = document.getElementById(pageId);
    
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Scrolla alltid till toppen först
        window.scrollTo(0, 0);

        // 5. Om vi har en djuplänk (subId), t.ex. från en delad länk eller bild
        if (subId) {
            // Vi väntar lite (600ms) så att Firebase hinner rendera listan
            setTimeout(() => {
                const targetElement = document.getElementById(subId);
                if (targetElement) {
                    // Scrolla till elementet mjukt och centrera det i vyn
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Highlight-effekt: Gör bakgrunden temporärt gul så man hittar rätt
                    const originalBg = targetElement.style.backgroundColor;
                    targetElement.style.transition = "background-color 0.5s";
                    targetElement.style.backgroundColor = "#fffbeb"; // Ljusgul highlight
                    
                    // Om det är en kalenderpost, se till att den expanderas
                    if (targetElement.classList.contains('calendar-post')) {
                        const shortText = targetElement.querySelector('.calendar-post-short');
                        const expandedText = targetElement.querySelector('.calendar-post-expanded');
                        if (shortText && expandedText) {
                            targetElement.setAttribute('data-expanded', 'true');
                            shortText.classList.add('hidden');
                            expandedText.classList.remove('hidden');
                        }
                    }

                    // Återställ färgen efter 2 sekunder
                    setTimeout(() => {
                        targetElement.style.backgroundColor = originalBg;
                    }, 2000);
                }
            }, 600); 
        }
    } else {
        // Om ID:t inte finns (felskrivet i URL), skicka användaren till hem
        const hemPage = document.getElementById('hem');
        if (hemPage) hemPage.classList.add('active');
    }
}

export function renderHomeAchievements(allResults, allShooters) {
    const container = document.getElementById('achievements-list');
    const section = document.getElementById('achievements-section');
    
    if (!container || !section) return;

    if (!auth.currentUser) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    const chronologicalResults = [...allResults].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const records = {
        totalPB: new Set(), totalSB: new Set(),
        seriesPB: new Set(), seriesSB: new Set(),
        s20PB: new Set(), s20SB: new Set(),
        s40PB: new Set(), s40SB: new Set(),
        s60PB: new Set(), s60SB: new Set()
    };
    
    const trackers = {
        pb: {},
        sb: {}
    };

    chronologicalResults.forEach(res => {
        const key = `${res.shooterId}_${res.discipline}`;
        const year = new Date(res.date).getFullYear();
        const yearKey = `${key}_${year}`;
        
        const total = parseFloat(res.total);
        const bestSeries = parseFloat(res.bestSeries);
        const shotCount = parseInt(res.shotCount);

        if (!trackers.pb[key]) trackers.pb[key] = { maxTotal: 0, maxSeries: 0, max20: 0, max40: 0, max60: 0 };
        if (!trackers.sb[yearKey]) trackers.sb[yearKey] = { maxTotal: 0, maxSeries: 0, max20: 0, max40: 0, max60: 0 };

        const pb = trackers.pb[key];
        const sb = trackers.sb[yearKey];

        const totalKey = `${key}_${shotCount}`; 
        const totalYearKey = `${yearKey}_${shotCount}`;
        
        if (!trackers.pb[totalKey]) trackers.pb[totalKey] = 0;
        if (!trackers.sb[totalYearKey]) trackers.sb[totalYearKey] = 0;

        if (total > trackers.pb[totalKey]) {
            trackers.pb[totalKey] = total;
            records.totalPB.add(res.id);
        }
        if (total > trackers.sb[totalYearKey]) {
            trackers.sb[totalYearKey] = total;
            records.totalSB.add(res.id);
        }

        if (bestSeries > pb.maxSeries) {
            pb.maxSeries = bestSeries;
            records.seriesPB.add(res.id);
        }
        if (bestSeries > sb.maxSeries) {
            sb.maxSeries = bestSeries;
            records.seriesSB.add(res.id);
        }
        
        if (shotCount === 20) {
            if (total > pb.max20) { pb.max20 = total; records.s20PB.add(res.id); }
            if (total > sb.max20) { sb.max20 = total; records.s20SB.add(res.id); }
        } else if (shotCount === 40) {
            if (total > pb.max40) { pb.max40 = total; records.s40PB.add(res.id); }
            if (total > sb.max40) { sb.max40 = total; records.s40SB.add(res.id); }
        } else if (shotCount === 60) {
            if (total > pb.max60) { pb.max60 = total; records.s60PB.add(res.id); }
            if (total > sb.max60) { sb.max60 = total; records.s60SB.add(res.id); }
        }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const relevantResults = allResults.filter(res => {
        const resDate = new Date(res.date);
        const isRecent = resDate >= thirtyDaysAgo;
        const isShared = res.sharedWithClub === true;
        const hasEarnedBadge = res.earnedBadges && res.earnedBadges.length > 0;
        
        const isAnyRecord = 
            records.totalPB.has(res.id) || records.totalSB.has(res.id) ||
            records.seriesPB.has(res.id) || records.seriesSB.has(res.id) ||
            records.s20PB.has(res.id) || records.s20SB.has(res.id) ||
            records.s40PB.has(res.id) || records.s40SB.has(res.id) ||
            records.s60PB.has(res.id) || records.s60SB.has(res.id);

        return isRecent && isShared && (hasEarnedBadge || isAnyRecord);
    });

    relevantResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = '';
    
    if (relevantResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full text-center">Inga nya rekord eller märken de senaste 30 dagarna. Kämpa på! 🎯</p>';
        return;
    }

    relevantResults.slice(0, 9).forEach(res => {
        const shooter = allShooters.find(s => s.id === res.shooterId);
        const shooterName = shooter ? shooter.name : "Okänd skytt";
        const dateStr = new Date(res.date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });

        const getLabel = (isPB, isSB) => {
            if (isPB) return `<span class="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-200 uppercase ml-2">PB 🚀</span>`;
            if (isSB) return `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase ml-2">ÅB 📅</span>`;
            return '';
        };

        const totalLabel = getLabel(records.totalPB.has(res.id), records.totalSB.has(res.id));
        
        let seriesRow = '';
        if (records.seriesPB.has(res.id) || records.seriesSB.has(res.id)) {
            const label = getLabel(records.seriesPB.has(res.id), records.seriesSB.has(res.id));
            seriesRow = `<div class="flex justify-between items-center text-sm text-gray-600 mt-1">
                            <span>Bästa serie: <b>${res.bestSeries}</b></span>
                            ${label}
                         </div>`;
        }

        let countRow = '';
        const shotCount = parseInt(res.shotCount);
        let hasCountRecord = false;
        let countLabel = '';

        if (shotCount === 20) {
            hasCountRecord = records.s20PB.has(res.id) || records.s20SB.has(res.id);
            countLabel = getLabel(records.s20PB.has(res.id), records.s20SB.has(res.id));
        } else if (shotCount === 40) {
            hasCountRecord = records.s40PB.has(res.id) || records.s40SB.has(res.id);
            countLabel = getLabel(records.s40PB.has(res.id), records.s40SB.has(res.id));
        } else if (shotCount === 60) {
            hasCountRecord = records.s60PB.has(res.id) || records.s60SB.has(res.id);
            countLabel = getLabel(records.s60PB.has(res.id), records.s60SB.has(res.id));
        }

        if (hasCountRecord) {
            countRow = `<div class="flex justify-between items-center text-sm text-gray-600 mt-1">
                            <span>${shotCount} skott: <b>${res.total}</b></span>
                            ${countLabel}
                        </div>`;
        }

        let badgeHtml = '';
        if (res.earnedBadges && res.earnedBadges.length > 0) {
            res.earnedBadges.forEach(badge => {
                let color = 'text-yellow-800 bg-yellow-50 border-yellow-200';
                let icon = '🏆';
                if(badge.includes('Silver')) { color = 'text-slate-700 bg-slate-50 border-slate-200'; icon = '🥈'; }
                if(badge.includes('Brons')) { color = 'text-orange-800 bg-orange-50 border-orange-200'; icon = '🥉'; }
                
                badgeHtml += `<div class="${color} flex items-center justify-center font-bold text-xs border px-2 py-1 rounded-md mt-1 w-full">
                    <span class="mr-1">${icon}</span> ${badge}-märke!
                </div>`;
            });
        }

        let bgClass = "bg-white border-gray-100";
        if (records.totalPB.has(res.id)) bgClass = "bg-green-50 border-green-200";
        else if (records.totalSB.has(res.id)) bgClass = "bg-blue-50 border-blue-200";
        else if (res.earnedBadges && res.earnedBadges.length > 0) bgClass = "bg-yellow-50 border-yellow-200";

        container.innerHTML += `
            <div class="flex flex-col p-4 rounded-xl border ${bgClass} shadow-sm hover:shadow-md transition-shadow relative">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-gray-800 truncate text-lg">${shooterName}</span>
                    <span class="text-xs text-gray-400 whitespace-nowrap">${dateStr}</span>
                </div>
                
                <div class="flex items-center justify-between mb-2 pb-2 border-b border-black/5">
                    <div class="flex flex-col">
                        <span class="font-bold text-blue-900 text-2xl leading-none">${res.total}p</span>
                        <span class="text-[10px] text-gray-500 uppercase tracking-wide mt-1">${res.discipline} (${res.shotCount} skott)</span>
                    </div>
                     <div>${totalLabel}</div>
                </div>

                <div class="flex flex-col gap-0 mb-2">
                    ${seriesRow}
                    ${countRow}
                </div>

                <div class="flex flex-col gap-1 mt-auto">
                    ${badgeHtml}
                </div>
            </div>
        `;
    });
}

// --- NYA FUNKTIONERNA ---

export function renderClassesAdmin(classes) {
    const container = document.getElementById('admin-classes-list');
    if (!container) return;

    container.innerHTML = '';
    
    classes.forEach(cls => {
        let discLabel = cls.discipline === 'sitting' ? 'Sittande' : 'Stående';
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
                <div>
                    <h4 class="font-bold text-blue-900">${cls.name}</h4>
                    <p class="text-sm text-gray-600">${cls.description || ''} (${cls.minAge}-${cls.maxAge} år, ${discLabel})</p>
                </div>
                <div>
                    <button class="edit-class-btn text-blue-600 font-bold mr-2 text-sm" 
                        data-obj='${JSON.stringify(cls)}'>Ändra</button>
                    <button class="delete-btn text-red-600 font-bold text-sm" 
                        data-id="${cls.id}" data-type="competitionClasses">Ta bort</button>
                </div>
            </div>
        `;
    });
}

export function renderTopLists(classes, allResults, allShooters) {
    const container = document.getElementById('top-lists-container');
    const searchSection = document.getElementById('public-shooter-search-section'); // Om du har gett sök-diven ett ID, annars ignorera denna rad
    
    if (!container) return;
    
    // SÄKERHETSKOLL I UI:
    if (!auth.currentUser) {
        container.innerHTML = `
            <div class="col-span-full text-center p-8 bg-blue-50 rounded-xl border border-blue-100">
                <h3 class="text-2xl font-bold text-blue-900 mb-2">Endast för medlemmar</h3>
                <p class="text-gray-600 mb-4">Du måste vara inloggad för att se topplistor och statistik.</p>
                <button onclick="document.getElementById('user-nav-link').click(); window.location.hash='#profil';" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                    Gå till inloggning
                </button>
            </div>
        `;
        // Dölj sök-rutan om den finns
        const searchCard = document.querySelector('#topplistor .card');
        if(searchCard) searchCard.classList.add('hidden');
        return;
    }
    
    // Visa sök-rutan igen om man är inloggad
    const searchCard = document.querySelector('#topplistor .card');
    if(searchCard) searchCard.classList.remove('hidden');

    if (classes.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Inga klasser konfigurerade än.</p>';
        return;
    }

    container.innerHTML = '';

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const recentResults = allResults.filter(res => {
        const d = new Date(res.date);
        return d >= oneWeekAgo && res.sharedWithClub === true;
    });

    const currentYear = new Date().getFullYear();

    classes.forEach(cls => {
        const classResults = recentResults.filter(res => {
            if (res.discipline !== cls.discipline) return false;

            const shooter = allShooters.find(s => s.id === res.shooterId);
            if (!shooter || !shooter.birthyear) return false;

            const age = currentYear - shooter.birthyear;
            return age >= cls.minAge && age <= cls.maxAge;
        });

        if (classResults.length === 0) return;

        classResults.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

        const top5 = classResults.slice(0, 5);

        let rowsHtml = '';
        top5.forEach((res, index) => {
            const shooter = allShooters.find(s => s.id === res.shooterId);
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}.`));
            
            rowsHtml += `
                <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div class="flex items-center">
                        <span class="w-6 font-bold text-gray-500">${medal}</span>
                        <span class="font-semibold text-gray-800 truncate max-w-[120px]">${shooter.name}</span>
                    </div>
                    <span class="font-bold text-blue-900">${res.total}</span>
                </div>
            `;
        });

        container.innerHTML += `
            <div class="bg-white rounded-xl shadow p-4 border-t-4 border-blue-600">
                <div class="flex justify-between items-baseline mb-3">
                    <h3 class="text-xl font-bold text-gray-800">${cls.name}</h3>
                    <span class="text-xs text-gray-500 uppercase">${cls.discipline === 'sitting' ? 'Sittande' : 'Stående'}</span>
                </div>
                <div class="flex flex-col">
                    ${rowsHtml}
                </div>
            </div>
        `;
    });
    
    if (container.innerHTML === '') {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Inga resultat registrerade den senaste veckan.</p>';
    }
}

export function renderPublicShooterStats(shooterId, allResults, allShooters) {
    const resultsContainer = document.getElementById('public-results-list');
    const statsContainer = document.getElementById('public-shooter-stats');
    const disciplineStatsContainer = document.getElementById('discipline-stats-container');
    
    if (!resultsContainer || !statsContainer || !disciplineStatsContainer) return;
    if (!shooterId) { statsContainer.classList.add('hidden'); return; }

    const shooter = allShooters.find(s => s.id === shooterId);
    if (!shooter) return;

    document.getElementById('public-shooter-name').textContent = shooter.name;
    statsContainer.classList.remove('hidden');
    disciplineStatsContainer.innerHTML = ''; 

    const myResults = allResults.filter(r => r.shooterId === shooterId && r.sharedWithClub === true);
    myResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    const currentYear = new Date().getFullYear();
    const disciplines = [
        { id: 'sitting', name: 'Sittande', icon: '🪑', color: 'blue' },
        { id: 'standing', name: 'Stående', icon: '🧍', color: 'indigo' }
    ];

    disciplines.forEach(disc => {
        const discResults = myResults.filter(r => r.discipline === disc.id);
        if (discResults.length === 0) return; 

        const stats = {
            pb: { series: { val: 0, date: '' }, s20: { val: 0, date: '' }, s40: { val: 0, date: '' }, s60: { val: 0, date: '' }, s100: { val: 0, date: '' } },
            sb: { series: { val: 0, date: '' }, s20: { val: 0, date: '' }, s40: { val: 0, date: '' }, s60: { val: 0, date: '' }, s100: { val: 0, date: '' } }
        };

        discResults.forEach(r => {
            const isCurrentYear = new Date(r.date).getFullYear() === currentYear;
            const total = parseFloat(r.total) || 0;
            const bestSeries = parseFloat(r.bestSeries) || 0;
            const count = parseInt(r.shotCount);
            const resDate = r.date;

            if (bestSeries > stats.pb.series.val) stats.pb.series = { val: bestSeries, date: resDate };
            if (isCurrentYear && bestSeries > stats.sb.series.val) stats.sb.series = { val: bestSeries, date: resDate };

            const key = `s${count}`;
            if (stats.pb[key] !== undefined) {
                if (total > stats.pb[key].val) stats.pb[key] = { val: total, date: resDate };
                if (isCurrentYear && total > stats.sb[key].val) stats.sb[key] = { val: total, date: resDate };
            }
        });

        const renderRows = (data) => {
            const labels = { series: 'Bästa serie', s20: '20 skott', s40: '40 skott', s60: '60 skott', s100: '100 skott' };
            return Object.entries(labels).map(([key, label]) => {
                const item = data[key];
                if (item.val === 0) return '';
                // UPPDATERAD: Datumet är nu mörkare grått (text-gray-400) för bättre synlighet
                return `
                    <div class="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0 text-sm">
                        <span class="text-gray-500">
                            ${label} <span class="text-[10px] text-gray-400 ml-1">(${item.date})</span>
                        </span>
                        <span class="font-bold text-gray-800">${item.val}p</span>
                    </div>`;
            }).join('');
        };

        disciplineStatsContainer.innerHTML += `
            <div class="discipline-section mb-6">
                <div class="flex items-center gap-2 mb-3">
                    <span class="bg-${disc.color}-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                        ${disc.icon} ${disc.name}
                    </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                        <p class="text-[10px] font-bold text-green-600 uppercase mb-2">🚀 Personbästa</p>
                        ${renderRows(stats.pb)}
                    </div>
                    <div class="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <p class="text-[10px] font-bold text-blue-600 uppercase mb-2">📅 Årsbästa ${currentYear}</p>
                        ${renderRows(stats.sb)}
                    </div>
                </div>
            </div>`;
    });

    resultsContainer.innerHTML = myResults.length === 0 ? '<p class="text-gray-500 italic">Inga delade resultat än.</p>' : '';
    myResults.slice(0, 10).forEach(res => {
        resultsContainer.innerHTML += `
            <div class="flex justify-between items-center p-3 bg-white rounded border border-gray-100 shadow-sm mb-2">
                <div>
                    <span class="font-bold text-gray-800">${res.total}p</span>
                    <span class="text-xs text-gray-500 ml-2">${res.date}</span>
                    <div class="text-[10px] text-gray-400 uppercase font-medium">
                        ${res.discipline === 'sitting' ? 'Sittande' : 'Stående'} • ${res.shotCount} skott
                    </div>
                </div>
                ${res.isPB ? '<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">PB</span>' : ''}
            </div>`;
    });
}

export function setupVisitorChartControls() {
    const mainSelect = document.getElementById('visitor-chart-grouping');
    const hourlyPeriod = document.getElementById('hourly-filter-period');
    const hourlyWeekday = document.getElementById('hourly-filter-weekday');

    const refreshCharts = async () => {
        const stats = await getVisitorStats();
        renderVisitorChart(stats.dailyStats, stats.todayVisits);
        renderHourlyChart(stats.allDocs);
        renderDeviceChart(stats.allDocs);
    };

    if (mainSelect) mainSelect.addEventListener('change', refreshCharts);
    if (hourlyPeriod) hourlyPeriod.addEventListener('change', refreshCharts);
    if (hourlyWeekday) hourlyWeekday.addEventListener('change', refreshCharts);
}

let hourlyChartInstance = null;

/**
 * Renderar klockslagsgrafen med stöd för period- och veckodagsfiltrering.
 * @param {Array} dailyLogDocs - Lista med dokument-snapshots från dailyLog-samlingen.
 */
export function renderHourlyChart(dailyLogDocs) {
    const canvas = document.getElementById('hourlyChart');
    if (!canvas) return;

    // Hämta valda filtervärden från dropdown-menyerna
    const periodFilter = document.getElementById('hourly-filter-period')?.value || "1";
    const weekdayFilter = document.getElementById('hourly-filter-weekday')?.value || "all";

    const ctx = canvas.getContext('2d');
    const hourlyTotals = Array(24).fill(0);
    const labels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);

    // Datumlogik för filtrering
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Beräkna gränsdatum baserat på vald period
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - parseInt(periodFilter));
    cutoffDate.setHours(0, 0, 0, 0);

    // Variabel för att räkna antal dagar som matchar filtret (om man vill räkna snitt senare)
    let matchingDaysCount = 0;

    dailyLogDocs.forEach(docSnap => {
        const data = docSnap.data();
        const docDate = new Date(data.date);
        docDate.setHours(0, 0, 0, 0);

        // --- FILTRERING ---
        
        // 1. Kontrollera tidsperiod
        if (periodFilter === "1") {
            // "Idag" - kräv exakt matchning på dagens datumsträng
            if (data.date !== todayStr) return;
        } else {
            // Övriga perioder - kontrollera att datumet är inom intervallet
            if (docDate < cutoffDate) return;
        }

        // 2. Kontrollera veckodag
        if (weekdayFilter !== "all") {
            // getDay() returnerar 0 för söndag, 1 för måndag osv.
            if (docDate.getDay().toString() !== weekdayFilter) return;
        }

        matchingDaysCount++;

        // --- DATAAGGREGERING ---

        // Hantera modern Map-struktur: hourlyDistribution: { "13": 5 }
        if (data.hourlyDistribution) {
            Object.keys(data.hourlyDistribution).forEach(hour => {
                const hourIndex = parseInt(hour);
                if (hourIndex >= 0 && hourIndex < 24) {
                    hourlyTotals[hourIndex] += data.hourlyDistribution[hour];
                }
            });
        }

        // Fallback för gammal platt struktur: "hourlyDistribution.13": 2
        Object.keys(data).forEach(key => {
            if (key.startsWith('hourlyDistribution.')) {
                const hour = parseInt(key.split('.')[1]);
                if (!isNaN(hour) && hour >= 0 && hour < 24) {
                    hourlyTotals[hour] += data[key];
                }
            }
        });
    });

    // Rita om grafen
    if (hourlyChartInstance) {
        hourlyChartInstance.destroy();
    }

    // Skapa grafen med inställningar som matchar din övriga design
    hourlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Besökare',
                data: hourlyTotals,
                backgroundColor: 'rgba(59, 130, 246, 0.6)', // Kumla-blå med transparens
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.raw} besök kl ${context.label}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: '#94a3b8',
                        font: { size: 10 }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { 
                        color: '#94a3b8',
                        font: { size: 10 },
                        // Visa bara varannan timme på x-axeln för bättre läsbarhet på mobil
                        callback: function(val, index) {
                            return index % 2 === 0 ? this.getLabelForValue(val) : '';
                        }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

export function renderLinks(data, isAdmin) {
    const container = document.getElementById('links-container');
    const categoryList = document.getElementById('category-list');
    const groupSelect = document.getElementById('link-target-group');
    if (!container) return;

    container.innerHTML = '';
    
    // --- 1. FILTRERA BORT DET SOM INTE SKA SYNAS ---
    const filteredData = data.filter(link => {
        // Admin ser alltid alla länkar
        if (isAdmin) return true;
        
        // Om länken är publik (eller saknar målgrupp), visa den för alla
        if (!link.targetGroup || link.targetGroup === 'all') return true;
        
        // Om vi når hit krävs det att man är inloggad. Är man inte det? Göm länken!
        if (!auth.currentUser) return false;

        // Framtida tillägg: Här kan vi lägga till if(användarensGrupp !== link.targetGroup) return false;
        // Just nu får alla inloggade se grupp-länkarna.
        return true; 
    });

    // 2. Gruppera BARA den filtrerade datan per kategori
    const grouped = filteredData.reduce((acc, link) => {
        if (!acc[link.category]) acc[link.category] = [];
        acc[link.category].push(link);
        return acc;
    }, {});

    // 3. Sortera kategorinamn alfanumeriskt
    const sortedCategories = Object.keys(grouped).sort();

    // Uppdatera datalist för admin-formuläret (så admin kan se alla tidigare kategorier)
    if (categoryList) {
        // Vi hämtar unika kategorier från ALL data för admin, oavsett filtrering
        const allUniqueCategories = [...new Set(data.map(l => l.category))].sort();
        categoryList.innerHTML = allUniqueCategories.map(cat => `<option value="${cat}">`).join('');
    }

    // 4. Rendera varje kategori
    sortedCategories.forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.className = 'link-category-block';
        
        let linksHtml = grouped[category].map(link => `
            <div class="group bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition relative mb-3">
                <div class="flex justify-between items-start">
                    <div>
                        <a href="${link.url}" target="_blank" class="text-lg font-bold text-blue-700 hover:underline flex items-center">
                            ${link.title} 
                            <span class="ml-2 text-xs font-normal text-gray-400">↗</span>
                        </a>
                        ${link.description ? `<p class="text-gray-600 text-sm mt-1">${link.description}</p>` : ''}
                        ${link.targetGroup && link.targetGroup !== 'all' ? `<span class="inline-block mt-2 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Endast ${link.targetGroup}</span>` : ''}
                    </div>
                    ${isAdmin ? `
                        <div class="flex space-x-1">
                            <button class="edit-link-btn p-1.5 text-gray-400 hover:text-blue-600 transition" data-id="${link.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button class="delete-btn p-1.5 text-gray-400 hover:text-red-600 transition" data-id="${link.id}" data-type="links">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        categorySection.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-100 flex items-center">
                <span class="bg-blue-900 w-2 h-6 mr-3 rounded-full"></span>
                ${category}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${linksHtml}
            </div>
        `;
        container.appendChild(categorySection);
    });

    // Visa/Dölj admin-sektion
    const adminSection = document.getElementById('admin-add-link-section');
    if (adminSection) {
        isAdmin ? adminSection.classList.remove('hidden') : adminSection.classList.add('hidden');
    }

    // Fyll i grupper i dropdown om de finns
    if (groupSelect && groupsData) {
        const currentVal = groupSelect.value;
        groupSelect.innerHTML = '<option value="all">Alla (Publik)</option>' + 
            groupsData.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
        groupSelect.value = currentVal;
    }
}


// --- SKYTTEPORTALEN (GUIDER) ---

export function renderGuides(data, isAdmin) {
    // 1. DÖRRVAKTEN FÖRST! Visa/göm formuläret direkt, oavsett om datan är tom eller ej.
    const adminSection = document.getElementById('admin-add-guide-section');
    if (adminSection) {
        if (isAdmin) {
            adminSection.classList.remove('hidden');
        } else {
            adminSection.classList.add('hidden');
        }
    }

    const menuContainer = document.getElementById('guide-menu-container');
    const contentContainer = document.getElementById('guide-content-container');
    const categoryList = document.getElementById('guide-category-list');
    const groupSelect = document.getElementById('guide-target-group');
    
    if (!menuContainer || !contentContainer) return;

    // 2. SKOTTSÄKER DATA: Säkerställ att vi alltid har en array, även om databasen är tom
    const safeData = Array.isArray(data) ? data : [];

    // 3. Filtrera data
    const filteredData = safeData.filter(guide => {
        if (isAdmin) return true;
        if (!guide.targetGroup || guide.targetGroup === 'all') return true;
        if (!auth.currentUser) return false;
        return true; 
    });

    // 4. Gruppera per kategori
    const grouped = filteredData.reduce((acc, guide) => {
        if (!acc[guide.category]) acc[guide.category] = [];
        acc[guide.category].push(guide);
        return acc;
    }, {});

    const sortedCategories = Object.keys(grouped).sort();

    // Uppdatera admin-datalist
    if (categoryList) {
        const allCats = [...new Set(safeData.map(g => g.category))].sort();
        categoryList.innerHTML = allCats.map(cat => `<option value="${cat}">`).join('');
    }

    // 5. RITA UT (Med fallback om det är tomt!)
    if (sortedCategories.length === 0) {
        menuContainer.innerHTML = `<p class="text-sm text-gray-500 italic p-2 border-l-2 border-blue-200">Inga guider ännu.</p>`;
        contentContainer.innerHTML = `<p class="text-gray-500 bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">Skytteportalen är under uppbyggnad. Här kommer vi samla guider och instruktioner.</p>`;
    } else {
        menuContainer.innerHTML = sortedCategories.map(cat => `
            <button onclick="document.getElementById('cat-${cat.replace(/\s+/g, '-')}').scrollIntoView({behavior:'smooth'})" 
                    class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition mb-1">
                ${cat}
            </button>
        `).join('');

        contentContainer.innerHTML = sortedCategories.map(cat => `
            <div id="cat-${cat.replace(/\s+/g, '-')}" class="space-y-6 pt-4">
                <h3 class="text-2xl font-bold text-gray-800 border-b-2 border-blue-100 pb-2">${cat}</h3>
                <div class="grid grid-cols-1 gap-6">
                    ${grouped[cat].map(guide => `
                        <article id="guide-${guide.id}" class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm relative group">
                            <div class="flex justify-between items-start mb-4">
                                <h4 class="text-xl font-bold text-blue-900">${guide.title}</h4>
                                ${isAdmin ? `
                                    <div class="flex space-x-2">
                                        <button class="edit-guide-btn p-1 text-gray-400 hover:text-blue-600" data-id="${guide.id}">✎</button>
                                        <button class="delete-btn p-1 text-gray-400 hover:text-red-600" data-id="${guide.id}" data-type="guides">🗑</button>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="markdown-content text-gray-700 leading-relaxed">
                                ${guide.content}
                            </div>
                            ${guide.targetGroup && guide.targetGroup !== 'all' ? `<span class="mt-4 inline-block text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">${guide.targetGroup}</span>` : ''}
                        </article>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Fyll i dynamiska grupper i dropdownen
    if (groupSelect && typeof groupsData !== 'undefined') {
        const currentVal = groupSelect.value;
        groupSelect.innerHTML = '<option value="all">Alla (Publik)</option>' + 
            groupsData.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
        groupSelect.value = currentVal;
    }
}

// --- DYNAMISKT HERO-KORT ---

export function renderHero(user, userData) {
    const container = document.getElementById('hero-container');
    if (!container) return;

    // 1. Oinloggad
    if (!user) {
        container.innerHTML = `
            <div class="card bg-blue-900 text-white p-8 relative overflow-hidden">
                <div class="relative z-10">
                    <h2 class="text-2xl sm:text-3xl font-bold">Nyfiken på skytte?</h2>
                    <p class="mt-2 text-blue-100 max-w-xl">Vi välkomnar alla åldrar! Kom ner på en prova-på-kväll i hallen. Vi har all utrustning du behöver för att komma igång.</p>
                    <a href="#guider" class="inline-block mt-6 bg-white text-blue-900 px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition shadow-lg">Läs nybörjarguiden</a>
                </div>
                <div class="absolute right-[-20px] bottom-[-20px] text-white/10 text-9xl font-black select-none italic">KUMLA</div>
            </div>`;
        return;
    }

    // 2. Registrerad men ej klubbmedlem
    if (userData && !userData.isClubMember) {
        container.innerHTML = `
            <div class="card bg-gradient-to-r from-orange-500 to-red-600 text-white p-8">
                <h2 class="text-2xl font-bold">Välkommen till föreningen!</h2>
                <p class="mt-2 opacity-90">Härligt att du har skapat ett konto. Prata med en ledare på plats i hallen så registrerar vi ditt medlemskap och ger dig full tillgång.</p>
                <a href="#guider" class="inline-block mt-6 bg-black/20 border border-white/30 text-white px-8 py-3 rounded-full font-bold hover:bg-black/30 transition">Hur blir jag medlem?</a>
            </div>`;
        return;
    }

    // 3. Tävlingsskytt (Kolla gruppen TävlingsSkyttar)
    const isCompShooter = userData && userData.groups && userData.groups.includes('TävlingsSkyttar');

    if (isCompShooter) {
        container.innerHTML = `
            <div class="card bg-white border-2 border-blue-900 p-8">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <span class="bg-blue-900 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Aktiv Tävlande</span>
                        <h2 class="text-2xl font-bold mt-2 text-gray-900">Dags för nästa tävling?</h2>
                        <p class="text-gray-600 mt-1">Glöm inte att kolla samåkningen inför helgens starter.</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <a href="#tavlingar" class="inline-block bg-blue-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-800 transition">Tävlingsrapporter</a>
                        <a href="#kalender" class="inline-block bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition">Kalender</a>
                    </div>
                </div>
            </div>`;
    } else {
        // 4. Vanlig medlem
        container.innerHTML = `
            <div class="card bg-green-800 text-white p-8">
                <h2 class="text-2xl font-bold">Redo att börja tävla?</h2>
                <p class="mt-2 text-green-100">Som medlem har du möjlighet att börja tävla för klubben. Vi har en komplett guide som hjälper dig igång.</p>
                <a href="#guider" class="inline-block mt-6 bg-white text-green-800 px-8 py-3 rounded-full font-bold hover:bg-green-50 transition">Visa tävlingsguiden</a>
            </div>`;
    }
}

export function renderDeviceChart(dailyLogDocs) {
    const canvas = document.getElementById('deviceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const deviceTotals = { 'Mobil': 0, 'Surfplatta': 0, 'Desktop': 0 };

    // Samma filtrering som i renderHourlyChart (använd gärna samma filter-id)
    const periodFilter = document.getElementById('hourly-filter-period')?.value || "7";
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - parseInt(periodFilter));

    dailyLogDocs.forEach(docSnap => {
        const data = docSnap.data();
        const docDate = new Date(data.date);
        
        // Filtrera på tid
        if (parseInt(periodFilter) !== 1 && docDate < cutoffDate) return;
        if (parseInt(periodFilter) === 1 && data.date !== now.toISOString().split('T')[0]) return;

        if (data.deviceDistribution) {
            Object.keys(data.deviceDistribution).forEach(device => {
                if (deviceTotals[device] !== undefined) {
                    deviceTotals[device] += data.deviceDistribution[device];
                }
            });
        }
    });

    if (deviceChartInstance) deviceChartInstance.destroy();

    deviceChartInstance = new Chart(ctx, {
        type: 'doughnut', // 'pie' fungerar också, men doughnut ser modernare ut
        data: {
            labels: Object.keys(deviceTotals),
            datasets: [{
                data: Object.values(deviceTotals),
                backgroundColor: [
                    '#3b82f6', // Blå (Mobil)
                    '#8b5cf6', // Lila (Surfplatta)
                    '#10b981'  // Grön (Desktop)
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                }
            },
            cutout: '60%' // Gör det till en ring
        }
    });
}