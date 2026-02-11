import { toggleLike } from "./data-service.js";

// Ver 2.11 - Mobilanpassad
export const isAdminLoggedIn = () => {
    const adminIndicator = document.getElementById('admin-indicator');
    return adminIndicator && !adminIndicator.classList.contains('hidden');
};

export function navigate(hash) {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    
    let targetId = hash.replace('#', '') || 'hem';
    let subTarget = null;

    if (targetId.includes('#')) {
        [targetId, subTarget] = targetId.split('#');
    }

    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === targetId) {
            page.classList.add('active');
        }
    });

    if (subTarget) {
        setTimeout(() => {
            const element = document.getElementById(subTarget);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export function showModal(modalId, message = "") {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (message) {
            const msgEl = modal.querySelector('p') || modal.querySelector('#error-message') || modal.querySelector('#confirmation-message');
            if (msgEl) msgEl.innerHTML = message;
        }
        modal.classList.add('active');
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

export function renderNews(data, isAdminLoggedIn, currentUserId) {
    const container = document.getElementById('all-news-container');
    const homeContainer = document.getElementById('home-news-container');
    
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (container) {
        container.innerHTML = '';
        data.forEach(item => {
            const likes = item.likes || {};
            const likeCount = Object.keys(likes).length;
            const userHasLiked = currentUserId && likes[currentUserId];

            container.innerHTML += `
                <div class="card bg-white rounded-xl shadow-md overflow-hidden mb-6" id="news-${item.id}">
                    <div class="flex flex-col md:flex-row">
                        ${item.imageUrl ? `
                            <div class="md:w-1/3 h-48 md:h-auto overflow-hidden">
                                <img src="${item.imageUrl}" class="w-full h-full object-cover" alt="${item.title}">
                            </div>
                        ` : ''}
                        <div class="p-4 md:p-6 flex-grow">
                            <h3 class="text-2xl font-bold text-blue-900 mb-2">${item.title}</h3>
                            <p class="text-xs text-gray-400 mb-4">${item.date}</p>
                            <div class="text-gray-700 leading-relaxed mb-6">${item.content}</div>
                            
                            <div class="flex items-center space-x-3 border-t pt-4">
                                <button class="like-btn flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition ${userHasLiked ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}" data-id="${item.id}" data-type="news">
                                    <span>${userHasLiked ? '👍' : '👍'}</span>
                                    <span class="font-bold">${likeCount}</span>
                                </button>
                                <button class="share-btn flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition" data-id="${item.id}" data-type="news" data-title="${item.title}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    <span class="text-sm">Dela</span>
                                </button>
                                ${isAdminLoggedIn ? `
                                    <div class="ml-auto flex space-x-1">
                                        <button class="edit-news-btn p-2 text-blue-600 hover:bg-blue-50 rounded-full" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                        <button class="delete-btn p-2 text-red-600 hover:bg-red-50 rounded-full" data-id="${item.id}" data-type="news"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    if (homeContainer) {
        homeContainer.innerHTML = '';
        data.slice(0, 4).forEach(item => {
            homeContainer.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition cursor-pointer border-t-4 border-blue-900 flex gap-4" onclick="window.location.hash='#nyheter#news-${item.id}'">
                    <div class="flex-grow">
                        <h4 class="font-bold text-blue-900 line-clamp-1">${item.title}</h4>
                        <p class="text-[10px] text-gray-400 mb-2">${item.date}</p>
                        <div class="text-sm text-gray-600 line-clamp-2">${item.content.replace(/<[^>]*>/g, '')}</div>
                    </div>
                    ${item.imageUrl ? `
                        <div class="hidden md:block w-20 h-20 flex-shrink-0">
                            <img src="${item.imageUrl}" class="w-full h-full object-cover rounded-lg shadow-inner">
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
}

export function renderEvents(data, isAdminLoggedIn) {
    const container = document.getElementById('calendar-container');
    const homeContainer = document.getElementById('home-events-container');
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = data.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));

    if (container) {
        container.innerHTML = upcomingEvents.length ? '' : '<p class="text-gray-500 italic">Inga kommande händelser.</p>';
        upcomingEvents.forEach(item => {
            container.innerHTML += `
                <div class="card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded mb-1">${item.date}</span>
                        <h3 class="text-xl font-bold text-gray-800">${item.title}</h3>
                        <div class="text-gray-600 text-sm mt-1">${item.description}</div>
                    </div>
                    ${isAdminLoggedIn ? `
                        <div class="flex space-x-2 w-full sm:w-auto">
                            <button class="edit-event-btn flex-1 sm:flex-none px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm" data-id="${item.id}">Ändra</button>
                            <button class="delete-btn flex-1 sm:flex-none px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm" data-id="${item.id}" data-type="events" data-series-id="${item.seriesId || ''}">Ta bort</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    if (homeContainer) {
        homeContainer.innerHTML = '';
        upcomingEvents.slice(0, 4).forEach(item => {
            homeContainer.innerHTML += `
                <div class="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-600 shadow-sm">
                    <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">${item.date}</span>
                    <h4 class="font-bold text-gray-800">${item.title}</h4>
                    <div class="text-xs text-gray-600 line-clamp-1 mt-1">${item.description.replace(/<[^>]*>/g, '')}</div>
                </div>
            `;
        });
    }
}

export function renderHistory(data, isAdminLoggedIn) {
    const container = document.getElementById('home-history-container');
    if (container) {
        container.innerHTML = '';
        data.sort((a, b) => (a.priority || 10) - (b.priority || 10)).forEach(item => {
            container.innerHTML += `
                <div class="card p-4 md:p-6 mb-6">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-2xl font-bold text-blue-900">${item.title}</h3>
                        ${isAdminLoggedIn ? `
                            <div class="flex space-x-2">
                                <button class="edit-history-btn p-2 text-blue-600 hover:bg-blue-50 rounded-full" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                <button class="delete-btn p-2 text-red-600 hover:bg-red-50 rounded-full" data-id="${item.id}" data-type="history"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="text-gray-700 leading-relaxed">${item.content}</div>
                </div>
            `;
        });
    }
}

export function renderImages(data, isAdminLoggedIn) {
    const container = document.getElementById('gallery-container');
    if (container) {
        container.innerHTML = '';
        const years = [...new Set(data.map(img => img.year))].sort((a, b) => b - a);
        years.forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'mb-12';
            yearSection.innerHTML = `<h2 class="text-3xl font-bold mb-6 pb-2 border-b-2 border-blue-900 text-blue-900">${year}</h2>`;
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
            
            data.filter(img => img.year === year)
                .sort((a, b) => b.month - a.month || (a.priority || 10) - (b.priority || 10))
                .forEach(img => {
                    grid.innerHTML += `
                        <div class="bg-white rounded-xl shadow-sm overflow-hidden group">
                            <div class="relative h-64 overflow-hidden">
                                <img src="${img.url}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="${img.title}" loading="lazy">
                                ${isAdminLoggedIn ? `
                                    <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button class="edit-image-btn p-2 bg-white/90 text-blue-600 rounded-full shadow-lg" data-id="${img.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                        <button class="delete-btn p-2 bg-white/90 text-red-600 rounded-full shadow-lg" data-id="${img.id}" data-type="images"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="p-3">
                                <p class="font-bold text-gray-800 text-sm line-clamp-1">${img.title}</p>
                                <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">${new Date(2000, img.month-1).toLocaleString('sv-SE', {month: 'long'})}</p>
                            </div>
                        </div>
                    `;
                });
            yearSection.appendChild(grid);
            container.appendChild(yearSection);
        });
    }
}

export function renderSponsors(data, isAdminLoggedIn) {
    const containers = {
        '1/1': document.getElementById('sponsors-by-1'),
        '1/2': document.getElementById('sponsors-by-2'),
        '1/4': document.getElementById('sponsors-by-4')
    };

    Object.values(containers).forEach(c => { if (c) { c.innerHTML = ''; c.parentElement.classList.add('hidden'); } });

    data.sort((a, b) => (a.priority || 10) - (b.priority || 10)).forEach(item => {
        const size = item.size || '1/4';
        const container = containers[size];
        if (container) {
            container.parentElement.classList.remove('hidden');
            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition group relative flex flex-col items-center text-center";
            card.innerHTML = `
                <a href="${item.url}" target="_blank" class="block w-full">
                    <div class="h-24 w-full flex items-center justify-center mb-3">
                        <img src="${item.logoUrl}" class="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition duration-500" alt="${item.name}">
                    </div>
                    <h4 class="font-bold text-gray-800 text-sm">${item.name}</h4>
                    ${item.extraText ? `<p class="text-[10px] text-gray-500 mt-1">${item.extraText}</p>` : ''}
                </a>
                ${isAdminLoggedIn ? `
                    <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="edit-sponsor-btn p-1.5 bg-gray-100 text-blue-600 rounded-full" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button class="delete-btn p-1.5 bg-gray-100 text-red-600 rounded-full" data-id="${item.id}" data-type="sponsors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                ` : ''}
            `;
            container.appendChild(card);
        }
    });
}

export function renderAdminsAndUsers(data, toggleClubMemberStatus) {
    const adminContainer = document.getElementById('admin-users-list');
    const mailingListContainer = document.getElementById('mailing-list-report');
    
    if (adminContainer) {
        adminContainer.innerHTML = '';
        const sortedData = [...data].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
        
        sortedData.forEach(user => {
            const isAdmin = user.isAdmin === true;
            const isMember = user.isClubMember === true;
            
            adminContainer.innerHTML += `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border gap-3">
                    <div class="min-w-0 flex-grow">
                        <p class="font-bold text-gray-800 truncate">${user.name || 'Inget namn'}</p>
                        <p class="text-xs text-gray-500 truncate">${user.email}</p>
                        <div class="flex gap-2 mt-1">
                            ${isAdmin ? '<span class="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Admin</span>' : ''}
                            ${isMember ? '<span class="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Medlem</span>' : ''}
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button class="edit-user-btn text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 transition flex-1 sm:flex-none" data-user-id="${user.id}">Redigera</button>
                        <button onclick="(${toggleClubMemberStatus})('${user.id}', ${isMember})" class="text-xs ${isMember ? 'bg-gray-500' : 'bg-green-600'} text-white px-3 py-1.5 rounded hover:opacity-90 transition flex-1 sm:flex-none">
                            ${isMember ? 'Ta bort Medlem' : 'Gör till Medlem'}
                        </button>
                        ${isAdmin ? 
                            `<button class="delete-admin-btn text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition flex-1 sm:flex-none" data-id="${user.id}">Ta bort Admin</button>` : 
                            `<button class="add-admin-btn text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition flex-1 sm:flex-none" data-id="${user.id}">Gör till Admin</button>`
                        }
                    </div>
                </div>
            `;
        });
    }

    if (mailingListContainer) {
        const mailingListUsers = data.filter(u => u.mailingList).sort((a, b) => (a.email).localeCompare(b.email));
        mailingListContainer.innerHTML = mailingListUsers.length ? '' : '<p class="text-gray-500 text-xs italic">Inga prenumeranter än.</p>';
        mailingListUsers.forEach(user => {
            mailingListContainer.innerHTML += `<div class="text-xs p-1 border-b border-gray-100 text-gray-600">${user.email} (${user.name || '-'})</div>`;
        });
    }
}

export function renderCompetitions(data, isAdminLoggedIn, currentUserId) {
    const container = document.getElementById('competitions-container');
    const homeContainer = document.getElementById('home-competitions-container');
    
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (container) {
        container.innerHTML = '';
        data.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('sv-SE');
            const likes = item.likes || {};
            const likeCount = Object.keys(likes).length;
            const userHasLiked = currentUserId && likes[currentUserId];

            let pdfButton = '';
            if (item.pdfUrl) {
                pdfButton = `
                    <a href="${item.pdfUrl}" target="_blank" class="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition mt-4 no-underline text-sm font-bold">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        Resultatlista (PDF)
                    </a>
                `;
            }

            container.innerHTML += `
                <div class="card bg-white p-4 md:p-6 rounded-xl shadow-md mb-6" id="comp-${item.id}">
                    <div class="mb-4">
                        <h3 class="text-2xl font-bold text-blue-900">${item.title}</h3>
                        <p class="text-sm text-gray-500">${date} | ${item.location}</p>
                    </div>
                    
                    <div class="text-gray-700 leading-relaxed mb-4 markdown-content">${item.content}</div>
                    ${pdfButton}

                    <div class="flex items-center space-x-2 mt-6 pt-4 border-t border-gray-100">
                        <button class="like-btn flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition ${userHasLiked ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}" data-id="${item.id}" data-type="competitions">
                            <span>👍</span>
                            <span class="font-bold">${likeCount}</span>
                        </button>
                        
                        <button class="share-btn flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition" data-id="${item.id}" data-type="competitions" data-title="${item.title}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            <span class="text-sm">Dela</span>
                        </button>

                        ${isAdminLoggedIn ? `
                            <div class="ml-auto flex space-x-1">
                                <button class="edit-comp-btn p-2 text-blue-600 hover:bg-blue-50 rounded-full transition" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                <button class="delete-btn p-2 text-red-600 hover:bg-red-50 rounded-full transition" data-id="${item.id}" data-type="competitions"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }

    if (homeContainer) {
        homeContainer.innerHTML = '';
        data.slice(0, 4).forEach(item => {
            const date = new Date(item.date).toLocaleDateString('sv-SE');
            homeContainer.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border-l-4 border-blue-900" onclick="window.location.hash='#tavlingar#comp-${item.id}'">
                    <h4 class="font-bold text-blue-900 line-clamp-1">${item.title}</h4>
                    <p class="text-[10px] text-gray-500 mb-2">${date} | ${item.location}</p>
                    <div class="text-sm text-gray-600 line-clamp-2">${item.content.replace(/<[^>]*>/g, '')}</div>
                </div>
            `;
        });
    }
}

export function handleAdminUI(isAdmin, isMember) { // <--- Uppdaterad signatur
    isAdminLoggedIn = isAdmin;

    // --- 1. ADMIN-LOGIK (Din gamla kod) ---
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden');
    });

    const adminNavLink = document.getElementById('admin-nav-link'); 
    const mobileAdminLink = document.getElementById('mobile-admin-nav-link'); 
    
    const adminSections = [
        'news-edit-section', 'competition-edit-section', 
        'calendar-edit-section', 'image-edit-section', 
        'history-edit-section', 'sponsors-edit-section', 'admin-panel', 'file-manager-container'
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

    } else {
        if (adminNavLink) adminNavLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');

        adminSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        
        if (adminLoginPanel) adminLoginPanel.classList.remove('hidden');
    }

    // --- 2. NYTT: MEDLEMS-LOGIK (Topplistor) ---
    const toplistItem = document.getElementById('nav-toplist-item'); // Hitta via ID
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

export function renderNews(newsData, isAdminLoggedIn, currentUserId) {
    const news = newsData;
    const homeNewsContainer = document.getElementById('home-news-container');
    const allNewsContainer = document.getElementById('all-news-container');

    if (!homeNewsContainer || !allNewsContainer) return;

    homeNewsContainer.innerHTML = '';
    allNewsContainer.innerHTML = '';

    news.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
    const getFirstLineText = (htmlContent) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const firstChild = tempDiv.firstElementChild;
        if (firstChild && firstChild.tagName === 'P') {
            return firstChild.textContent;
        }
        return tempDiv.textContent.split('\n')[0].trim();
    };

    const getFirstImage = (htmlContent) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const firstImage = tempDiv.querySelector('img');
        return firstImage ? firstImage.outerHTML : '';
    };

    news.slice(0, 2).forEach(item => {
        const date = new Date(item.date);
        const formattedDate = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
        const firstLine = getFirstLineText(item.content);
        const firstImage = getFirstImage(item.content);
        
        let imageHtml = '';
        if (firstImage) {
            const tempImgDiv = document.createElement('div');
            tempImgDiv.innerHTML = firstImage;
            const img = tempImgDiv.querySelector('img');
            img.setAttribute('style', 'width: 150px; height: auto;');
            img.classList.add('rounded-lg', 'object-cover', 'mr-4');
            imageHtml = `<div class="flex-shrink-0">${img.outerHTML}</div>`;
        }
        
        const shortContent = firstLine.length > 150 ? firstLine.substring(0, 150) + '...' : firstLine;

        const newsUrl = `#nyheter#news-${item.id}`;

        homeNewsContainer.innerHTML += `
            <a href="${newsUrl}" class="card flex items-start news-post home-news-post" data-id="${item.id}">
                ${imageHtml}
                <div class="flex-grow">
                    <h3 class="text-2xl font-semibold mb-1">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">Publicerad: ${formattedDate}</p>
                    <div class="text-gray-700 markdown-content">${shortContent}</div>
                </div>
            </a>
        `;
    });

    news.forEach(item => {
        const date = new Date(item.date);
        const createdAt = item.createdAt?.toDate() || new Date();
        const updatedAt = item.updatedAt?.toDate() || createdAt;
        const formattedDate = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
        const likes = item.likes || {};
        const likeCount = Object.keys(likes).length;
        const userHasLiked = currentUserId && likes[currentUserId];
        const timeInfo = `Upplagt: ${createdAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })} ${createdAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}. Senast redigerad: ${updatedAt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })} ${updatedAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;

        allNewsContainer.innerHTML += `
            <div class="card" id="news-${item.id}">
                <h3 class="text-2xl font-semibold mb-2">${item.title}</h3>
                <p class="text-sm text-gray-500 mb-2">${timeInfo}</p>
                <div class="text-gray-700 markdown-content">${item.content}</div>
                <div class="flex items-center space-x-2 mt-4">
                    <button class="like-btn px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300 ${userHasLiked ? 'text-blue-500' : ''}" data-id="${item.id}" data-type="news" data-liked="${userHasLiked}">
                        👍 <span class="like-count">${likeCount}</span>
                    </button>
                    <button class="share-btn px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300" data-id="${item.id}" data-title="${item.title}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.314l4.94 2.47a3 3 0 10.96.168.25.25 0 01.192.327l-.07.292-.195.071c-.563.205-.96.721-.96 1.302a.25.25 0 00.327.192l.292-.07-.07-.195c.581.042 1.139-.247 1.302-.96l.07-.292-.195-.071a3 3 0 00-.765-.365l-4.94-2.47c-1.091.523-2.265.249-3.033-.519l-1.705-1.705c-.768-.768-1.042-1.942-.519-3.033l1.378-1.378z"/>
                        </svg>
                        <span class="ml-1 hidden sm:inline">Dela</span>
                    </button>
                    ${isAdminLoggedIn ? `
                        <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="news">Ta bort</button>
                        <button class="edit-news-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                    ` : ''}
                </div>
            </div>
        `;
    });
}

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
                    ${isAdminLoggedIn ? `
                        <div class="flex space-x-2 mt-4">
                            <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="events" data-series-id="${item.seriesId || ''}">Ta bort</button>
                            <button class="edit-event-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                        </div>
                    ` : ''}
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
                    <button class="share-btn px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300" data-id="${item.id}" data-title="${item.title}">
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

export function renderImages(imageData, isAdminLoggedIn) {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = '';
    
    imageData.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1);
        const dateB = new Date(b.year, b.month - 1);
        const priorityA = a.priority || 10;
        const priorityB = b.priority || 10;
        if (dateB - dateA !== 0) {
            return dateB - dateA;
        }
        return priorityA - priorityB;
    });
    
    const groupedImages = imageData.reduce((acc, curr) => {
        const key = `${curr.year}-${curr.month}`;
        if (!acc[key]) {
            acc[key] = [];
        }
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
                    <div class="relative group">
                        <img src="${item.url}" alt="${item.title}" class="gallery-image shadow-md group-hover:opacity-75 transition-opacity duration-300">
                        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/50 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg">
                            <h3 class="text-lg font-bold">${item.title}</h3>
                        </div>
                        ${isAdminLoggedIn ? `
                            <div class="absolute top-2 right-2 flex space-x-2">
                                <button class="edit-image-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                                <button class="delete-btn px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="images">Ta bort</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        galleryContainer.innerHTML += galleryGroupHtml;
    }
}

export function renderSponsors(sponsorsData, isAdminLoggedIn) {
    const sponsorsContainer = document.getElementById('sponsors-container');
    if (!sponsorsContainer) return;
    sponsorsContainer.innerHTML = '';
    
    const sizeOrder = {'1/1': 1, '1/2': 2, '1/4': 3};
    sponsorsData.sort((a, b) => {
        const sizeDiff = sizeOrder[a.size] - sizeOrder[b.size];
        if (sizeDiff !== 0) {
            return sizeDiff;
        }
        return a.priority - b.priority;
    });

    const sponsorsByFull = sponsorsData.filter(s => s.size === '1/1');
    const sponsorsByHalf = sponsorsData.filter(s => s.size === '1/2');
    const sponsorsByQuarter = sponsorsData.filter(s => s.size === '1/4');

    const renderSponsorGroup = (group, className) => {
        return group.map(sponsor => {
            const sponsorLink = sponsor.url ? `<a href="${sponsor.url}" target="_blank" rel="noopener noreferrer" class="block w-full h-full flex flex-col items-center justify-center">` : '';
            const closingTag = sponsor.url ? '</a>' : '';
            
            const sponsorHtml = `
                <div class="card p-4 flex flex-col items-center justify-center text-center ${className}">
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

    sponsorsContainer.innerHTML += `<div class="sponsors-grid-container">${renderSponsorGroup(sponsorsByFull, 'sponsor-card-1-1')}</div>`;
    sponsorsContainer.innerHTML += `<div class="sponsors-grid-container">${renderSponsorGroup(sponsorsByHalf, 'sponsor-card-1-2')}</div>`;
    sponsorsContainer.innerHTML += `<div class="sponsors-grid-container">${renderSponsorGroup(sponsorsByQuarter, 'sponsor-card-1-4')}</div>`;
}

export function renderAdminsAndUsers(users, toggleStatusCallback) {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga användare hittades.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = "min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden";
    
    table.innerHTML = `
        <thead class="bg-gray-100">
            <tr>
                <th class="py-2 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase">E-post / Namn</th>
                <th class="py-2 px-4 border-b text-center text-xs font-semibold text-gray-600 uppercase">Admin</th>
                <th class="py-2 px-4 border-b text-center text-xs font-semibold text-gray-600 uppercase">Medlem</th>
                <th class="py-2 px-4 border-b text-center text-xs font-semibold text-gray-600 uppercase">Åtgärd</th>
            </tr>
        </thead>
        <tbody id="user-table-body"></tbody>
    `;

    const tbody = table.querySelector('#user-table-body');
    const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50";
        
        // Medlemsstatus
        const memberColor = user.isClubMember ? 'text-green-600 bg-green-100' : 'text-gray-400 bg-gray-100';
        const memberText = user.isClubMember ? 'Ja' : 'Nej';

        // Admin-kontroller
        let adminControls = '';
        if (user.isAdmin) {
            adminControls = `
                <div class="flex flex-col items-center gap-1">
                    <span class="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Admin</span>
                    ${user.id !== currentUserId ? 
                        `<button class="delete-admin-btn text-xs text-red-600 hover:underline" data-id="${user.id}">Ta bort behörighet</button>` 
                        : '<span class="text-[10px] text-gray-400">(Du)</span>'}
                </div>`;
        } else {
            adminControls = `
                <button class="add-admin-btn text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition" data-id="${user.id}">
                    Gör till admin
                </button>`;
        }

        tr.innerHTML = `
            <td class="py-3 px-4 border-b">
                <div class="flex flex-col">
                    <span class="font-medium text-gray-800">${user.email}</span>
                    <span class="text-xs text-gray-500">${user.name || 'Inget namn'}</span>
                </div>
            </td>
            <td class="py-3 px-4 border-b text-center">
                ${adminControls}
            </td>
            <td class="py-3 px-4 border-b text-center">
                 <button class="member-toggle-btn px-2 py-1 rounded-full text-xs font-bold ${memberColor} hover:opacity-80 transition" 
                    data-id="${user.id}" data-status="${user.isClubMember}">
                    ${memberText}
                </button>
            </td>
            <td class="py-3 px-4 border-b text-center">
                ${!user.isAdmin ? `
                    <button class="delete-user-btn text-red-600 hover:text-red-800 text-sm font-medium" data-id="${user.id}">
                        Ta bort
                    </button>
                ` : '<span class="text-gray-400 text-xs">-</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    container.appendChild(table);

    // Koppla event listeners för Medlems-knappen (Admin och Delete hanteras globalt i event-listeners.js)
    tbody.querySelectorAll('.member-toggle-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const currentStatus = btn.dataset.status === 'true';
            if (typeof toggleStatusCallback === 'function') {
                await toggleStatusCallback(uid, currentStatus);
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

    // 2. Dela upp hashen för att hantera djuplänkar (t.ex. #nyheter#news-123)
    // split('#') på "#nyheter#news-123" ger arrayen: ["", "nyheter", "news-123"]
    const parts = hash.split('#');
    
    // Del 1 (index 1) är sidans ID (t.ex. "nyheter")
    const pageId = parts[1] || 'hem'; 
    
    // Del 2 (index 2) är det specifika inläggets ID (t.ex. "news-123"), kan vara undefined
    const subId = parts[2];           

    // 3. Dölj alla sidor
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // 4. Hitta och visa rätt huvudsida
    const targetPage = document.getElementById(pageId);
    
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Scrolla alltid till toppen först
        window.scrollTo(0, 0);

        // 5. Om vi har en djuplänk (subId), försök scrolla till den
        if (subId) {
            // Vi väntar lite så att Firebase hinner ladda innehållet (nyheter/kalender)
            setTimeout(() => {
                const targetElement = document.getElementById(subId);
                if (targetElement) {
                    // Scrolla dit mjukt
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Valfritt: Highlighta elementet temporärt så man ser vad som menas
                    targetElement.style.transition = "background-color 0.5s";
                    const originalBg = targetElement.style.backgroundColor;
                    targetElement.style.backgroundColor = "#fffbeb"; // Ljusgul highlight
                    
                    // Om det är en kalenderpost, expandera den
                    if (targetElement.classList.contains('calendar-post')) {
                        const shortText = targetElement.querySelector('.calendar-post-short');
                        const expandedText = targetElement.querySelector('.calendar-post-expanded');
                        if (shortText && expandedText) {
                            targetElement.setAttribute('data-expanded', 'true');
                            shortText.classList.add('hidden');
                            expandedText.classList.remove('hidden');
                        }
                    }

                    setTimeout(() => {
                        targetElement.style.backgroundColor = originalBg;
                    }, 2000);
                }
            }, 600); // 600ms fördröjning för att säkerställa att listan laddats
        }
    } else {
        // Om ID:t är ogiltigt, skicka till startsidan
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
    const container = document.getElementById('public-results-list');
    const statsContainer = document.getElementById('public-shooter-stats');
    if (!container || !statsContainer) return;

    if (!shooterId) {
        statsContainer.classList.add('hidden');
        return;
    }

    const shooter = allShooters.find(s => s.id === shooterId);
    if (!shooter) return;

    document.getElementById('public-shooter-name').textContent = shooter.name;
    statsContainer.classList.remove('hidden');

    const myResults = allResults.filter(r => r.shooterId === shooterId && r.sharedWithClub === true);
    myResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    let maxTotal = 0;
    let maxYear = 0;
    const currentYear = new Date().getFullYear();

    myResults.forEach(r => {
        if (r.total > maxTotal) maxTotal = r.total;
        if (new Date(r.date).getFullYear() === currentYear) {
            if (r.total > maxYear) maxYear = r.total;
        }
    });

    document.getElementById('public-pb').textContent = maxTotal > 0 ? maxTotal : '-';
    document.getElementById('public-sb').textContent = maxYear > 0 ? maxYear : '-';

    container.innerHTML = '';
    if (myResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga delade resultat än.</p>';
        return;
    }

    myResults.slice(0, 10).forEach(res => {
        container.innerHTML += `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div>
                    <span class="font-bold text-gray-800">${res.total}p</span>
                    <span class="text-xs text-gray-500 ml-2">${res.date} (${res.discipline})</span>
                </div>
                ${res.isPB ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">PB</span>' : ''}
            </div>
        `;
    });
}