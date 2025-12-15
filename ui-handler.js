// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMedalForScore } from "./result-handler.js";

// Ver. 1.5 (Fixed Syntax)
export let isAdminLoggedIn = false;
export let loggedInAdminUsername = '';

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

export function renderCompetitions(data, isAdminLoggedIn) {
    // 1. Hantera huvudlistan (sidan Tävlingar)
    const container = document.getElementById('competitions-container');
    
    // Sortera: Nyast datum först
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (container) {
        container.innerHTML = '';
        data.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
            
            let pdfButton = '';
            if (item.pdfUrl) {
                pdfButton = `
                    <a href="${item.pdfUrl}" target="_blank" class="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition mt-4">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        Resultatlista (PDF)
                    </a>
                `;
            }

            container.innerHTML += `
                <div class="card">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-2xl font-bold mb-1">${item.title}</h3>
                            <p class="text-sm text-gray-500 mb-2">Datum: ${date} | Ort: ${item.location}</p>
                        </div>
                    </div>
                    
                    <div class="text-gray-700 markdown-content mt-2">${item.content}</div>
                    ${pdfButton}

                    ${isAdminLoggedIn ? `
                        <div class="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
                            <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="competitions">Ta bort</button>
                            <button class="edit-comp-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    // 2. Hantera startsidan (Senaste tävlingarna)
    const homeContainer = document.getElementById('home-competitions-container');
    if (homeContainer) {
        homeContainer.innerHTML = '';

        const getFirstLineText = (htmlContent) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const firstChild = tempDiv.firstElementChild;
            if (firstChild && firstChild.tagName === 'P') {
                return firstChild.textContent;
            }
            return tempDiv.textContent.split('\n')[0].trim();
        };

        // Ta de 2 senaste
        data.slice(0, 2).forEach(item => {
            const date = new Date(item.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
            const rawText = getFirstLineText(item.content);
            const shortContent = rawText.length > 150 ? rawText.substring(0, 150) + '...' : rawText;
            const compUrl = '#tavlingar';

            homeContainer.innerHTML += `
                <a href="${compUrl}" class="card flex flex-col items-start hover:shadow-md transition duration-300">
                    <h3 class="text-2xl font-semibold mb-1 text-blue-900">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">${date} | ${item.location}</p>
                    <div class="text-gray-700 markdown-content">${shortContent}</div>
                    <span class="text-blue-600 text-sm mt-4 font-semibold">Läs hela rapporten &rarr;</span>
                </a>
            `;
        });
    }
}

export function handleAdminUI(isAdmin) {
    const adminIndicator = document.getElementById('admin-indicator');
    const newsEditSection = document.getElementById('news-edit-section');
    const competitionEditSection = document.getElementById('competition-edit-section');
    const calendarEditSection = document.getElementById('calendar-edit-section');
    const imageEditSection = document.getElementById('image-edit-section');
    const historyEditSection = document.getElementById('history-edit-section');
    const sponsorsEditSection = document.getElementById('sponsors-edit-section');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginPanel = document.getElementById('admin-login-panel');
    const adminUserInfo = document.getElementById('admin-user-info');
    
    // NYTT: Hämta admin-länken i menyn
    const adminNavLink = document.getElementById('admin-nav-link');
    
    if (isAdmin) {
        isAdminLoggedIn = true;
        // Visa admin-länken i menyn
        if (adminNavLink) adminNavLink.classList.remove('hidden');

        if (adminIndicator) adminIndicator.classList.remove('hidden');
        if (newsEditSection) newsEditSection.classList.remove('hidden');
        if (competitionEditSection) competitionEditSection.classList.remove('hidden');
        if (calendarEditSection) calendarEditSection.classList.remove('hidden');
        if (imageEditSection) imageEditSection.classList.remove('hidden');
        if (historyEditSection) historyEditSection.classList.remove('hidden');
        if (sponsorsEditSection) sponsorsEditSection.classList.remove('hidden');
        if (adminPanel) adminPanel.classList.remove('hidden');
        if (adminLoginPanel) adminLoginPanel.classList.add('hidden');
        
        if (adminUserInfo && auth.currentUser) {
            loggedInAdminUsername = auth.currentUser.email || 'Admin';
            adminUserInfo.textContent = `Välkommen, ${loggedInAdminUsername}`;
        }
    } else {
        isAdminLoggedIn = false;
        // Göm admin-länken i menyn
        if (adminNavLink) adminNavLink.classList.add('hidden');

        if (adminIndicator) adminIndicator.classList.add('hidden');
        if (newsEditSection) newsEditSection.classList.add('hidden');
        if (competitionEditSection) competitionEditSection.classList.add('hidden');
        if (calendarEditSection) calendarEditSection.classList.add('hidden');
        if (imageEditSection) imageEditSection.classList.add('hidden');
        if (historyEditSection) historyEditSection.classList.add('hidden');
        if (sponsorsEditSection) sponsorsEditSection.classList.add('hidden');
        if (adminPanel) adminPanel.classList.add('hidden');
        if (adminLoginPanel) adminLoginPanel.classList.remove('hidden');
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

export function renderAdminsAndUsers(usersData, isAdminLoggedIn, currentUserId) {
    const adminListEl = document.getElementById('admin-list');
    const allUsersContainer = document.getElementById('all-users-container');
    if (!adminListEl || !allUsersContainer) return;

    adminListEl.innerHTML = '';
    allUsersContainer.innerHTML = '';
    
    usersData.forEach(user => {
        const isUserAdmin = user.isAdmin || false;
        const isMember = user.isMember || false;
        
        // UI för medlemsstatus
        const memberBtnText = isMember ? "Medlem (Neka)" : "Ej Medlem (Godkänn)";
        const memberBtnClass = isMember 
            ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" 
            : "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200";
        const statusIcon = isMember ? "✅ Medlem" : "⏳ Väntar";

        const userEl = document.createElement('div');
        userEl.className = 'flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2';
        
        let actionButtons = `
            <div class="flex flex-wrap gap-2 mt-2 sm:mt-0">
                <button class="show-user-info-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition" data-id="${user.id}">Info</button>
                ${isAdminLoggedIn ? `<button class="edit-user-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded hover:bg-gray-600 transition" data-user-id="${user.id}">Redigera</button>` : ''}
                
                ${isAdminLoggedIn ? `<button class="toggle-member-btn px-3 py-1 border text-xs font-bold rounded transition ${memberBtnClass}" data-id="${user.id}" data-status="${isMember}">${memberBtnText}</button>` : ''}
                
                ${!isUserAdmin && isAdminLoggedIn ? `<button class="add-admin-btn px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded hover:bg-black transition" data-id="${user.id}">Gör till Admin</button>` : ''}
            </div>
        `;

        if (isUserAdmin) {
            actionButtons = `
                <div class="flex gap-2">
                    <button class="show-user-info-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded" data-id="${user.id}">Info</button>
                    ${isAdminLoggedIn && usersData.filter(u => u.isAdmin).length > 1 && user.id !== auth.currentUser.uid ? `<button class="delete-admin-btn text-red-500 text-xs font-bold" data-id="${user.id}">Ta bort Admin</button>` : ''}
                </div>
            `;
        }

        userEl.innerHTML = `
            <div class="mb-1 sm:mb-0">
                <span class="font-bold block text-gray-800">${user.email}</span>
                <span class="text-xs text-gray-500">${user.name || 'Inget namn'} | ${isUserAdmin ? 'Administratör' : statusIcon}</span>
            </div>
            ${actionButtons}
        `;

        if (isUserAdmin) {
            adminListEl.appendChild(userEl);
        } else {
            allUsersContainer.appendChild(userEl);
        }
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
                    <button class="link-parent-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition" 
                            data-id="${shooter.id}" data-name="${shooter.name}">
                        Koppla
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

export async function renderSiteSettings() {
    const siteSettingsDoc = await getFirestoreDoc(doc(db, 'settings', 'siteSettings'));
    if (siteSettingsDoc.exists()) {
        const data = siteSettingsDoc.data();
        document.getElementById('logo-url-input').value = data.logoUrl || '';
        document.getElementById('header-color-input').value = data.headerColor || '#1e40af';
        document.getElementById('show-sponsors-checkbox').checked = data.showSponsors || false;
        document.getElementById('contact-address-input').value = data.contactAddress || '';
        document.getElementById('contact-location-input').value = data.contactLocation || '';
        document.getElementById('contact-phone-input').value = data.contactPhone || '';
        document.getElementById('contact-email-input').value = data.contactEmail || '';
    }
}

export function renderProfileInfo(userDoc, myShooters = []) {
    if (!userDoc || !userDoc.exists()) {
        const profileNameInput = document.getElementById('profile-name-input');
        const profileAddressInput = document.getElementById('profile-address-input');
        const profilePhoneInput = document.getElementById('profile-phone-input');
        const profileBirthyearInput = document.getElementById('profile-birthyear-input');
        const profileMailingListCheckbox = document.getElementById('profile-mailing-list-checkbox');

        profileNameInput.value = '';
        profileAddressInput.value = '';
        profilePhoneInput.value = '';
        profileBirthyearInput.value = '';
        profileMailingListCheckbox.checked = false;
        return;
    }
    const data = userDoc.data();
    const profileNameInput = document.getElementById('profile-name-input');
    const profileAddressInput = document.getElementById('profile-address-input');
    const profilePhoneInput = document.getElementById('profile-phone-input');
    const profileBirthyearInput = document.getElementById('profile-birthyear-input');
    const profileMailingListCheckbox = document.getElementById('profile-mailing-list-checkbox');

    profileNameInput.value = data.name || '';
    profileAddressInput.value = data.address || '';
    profilePhoneInput.value = data.phone || '';
    profileBirthyearInput.value = data.birthyear || '';
    profileMailingListCheckbox.checked = data.mailingList || false;

    const profileForm = document.getElementById('profile-form');
    const oldList = document.getElementById('profile-linked-shooters');
    if (oldList) oldList.remove();

    if (myShooters && myShooters.length > 0) {
        const listHtml = document.createElement('div');
        listHtml.id = 'profile-linked-shooters';
        listHtml.className = "mt-6 p-4 bg-blue-50 rounded border border-blue-100";
        
        let html = '<h3 class="font-bold text-blue-900 mb-2">Kopplade Skyttprofiler</h3><ul class="list-disc pl-5 text-sm text-blue-800">';
        myShooters.forEach(s => {
            html += `<li>${s.name} (Född ${s.birthyear})</li>`;
        });
        html += '</ul>';
        listHtml.innerHTML = html;
        
        const saveBtn = document.getElementById('save-profile-btn');
        profileForm.insertBefore(listHtml, saveBtn);
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
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const hashParts = hash.split('#');
    let targetPageId = hashParts[1];
    
    if (targetPageId) {
        targetPageId = targetPageId.split('?')[0];
    }

    const targetElementId = hashParts[2];
    
    if (!targetPageId || targetPageId === 'hem') {
        targetPageId = 'hem';
        const homePage = document.getElementById(targetPageId);
        if (homePage) homePage.classList.add('active');
    } else {
        try {
            const targetPage = document.querySelector(`#${targetPageId}`);
            if (targetPage) {
                targetPage.classList.add('active');
            } else {
                targetPageId = 'hem';
                document.getElementById('hem').classList.add('active');
            }
        } catch (e) {
            console.warn("Kunde inte navigera till:", targetPageId);
            targetPageId = 'hem';
            document.getElementById('hem').classList.add('active');
        }
    }

    const correspondingNavLink = document.querySelector(`a[href="#${targetPageId}"]`);
    if (correspondingNavLink) {
        correspondingNavLink.classList.add('active');
    }

    if (targetElementId) {
        setTimeout(() => {
            const targetElement = document.getElementById(targetElementId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 500);
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export function renderHomeAchievements(allResults, allShooters, usersData = []) {
    const container = document.getElementById('achievements-list');
    const section = document.getElementById('achievements-section');
    
    if (!container || !section) return;

    const currentUser = auth.currentUser;
    const myProfile = currentUser ? usersData.find(u => u.id === currentUser.uid) : null;
    const isMember = myProfile ? myProfile.isMember === true : false;
    const isAdmin = myProfile ? myProfile.isAdmin === true : false;

    // Visa inte rutan om man inte är godkänd medlem
    if (!currentUser || (!isMember && !isAdmin)) {
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

export function renderTopLists(classes, allResults, allShooters, usersData = []) {
    const container = document.getElementById('top-lists-container');
    const searchCard = document.querySelector('#topplistor .card');
    
    if (!container) return;
    
    // Säkerhetskoll: Är användaren inloggad OCH medlem?
    const currentUser = auth.currentUser;
    const myProfile = currentUser ? usersData.find(u => u.id === currentUser.uid) : null;
    const isMember = myProfile ? myProfile.isMember === true : false;
    const isAdmin = myProfile ? myProfile.isAdmin === true : false;

    // Om man inte är inloggad alls
    if (!currentUser) {
        container.innerHTML = `
            <div class="col-span-full text-center p-8 bg-blue-50 rounded-xl border border-blue-100">
                <h3 class="text-2xl font-bold text-blue-900 mb-2">Endast för medlemmar</h3>
                <p class="text-gray-600 mb-4">Du måste vara inloggad för att se topplistor och statistik.</p>
                <button onclick="document.getElementById('user-nav-link').click(); window.location.hash='#profil';" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                    Gå till inloggning
                </button>
            </div>
        `;
        if(searchCard) searchCard.classList.add('hidden');
        return;
    }

    // Om man är inloggad men INTE medlem (och inte admin)
    if (!isMember && !isAdmin) {
        container.innerHTML = `
            <div class="col-span-full text-center p-8 bg-yellow-50 rounded-xl border border-yellow-200">
                <h3 class="text-2xl font-bold text-yellow-800 mb-2">Medlemskap krävs</h3>
                <p class="text-gray-700 mb-4">
                    Ditt konto väntar på godkännande av en administratör.
                    <br>Du kan registrera dina egna resultat, men topplistor och andras resultat är dolda tills du är verifierad.
                </p>
                <p class="text-sm text-gray-500">Kontakta styrelsen om du väntat länge.</p>
            </div>
        `;
        if(searchCard) searchCard.classList.add('hidden');
        return;
    }
    
    // Om godkänd: Visa sök-rutan och kör logiken
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