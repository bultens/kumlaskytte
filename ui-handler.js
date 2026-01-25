// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMedalForScore } from "./result-handler.js";

// Ver. 1.7 (Fixad: toggleProfileUI parametrar, renderProfileInfo ID, renderAdminsAndUsers knappar)
export var isAdminLoggedIn = false;
export let isClubMemberGlobal = false;
export let loggedInAdminUsername = '';

export const appState = {
    isAdminLoggedIn: false,
    isClubMemberGlobal: false,
    loggedInAdminUsername: ''
};

export function setClubStatus(status) {
    appState.isClubMemberGlobal = status;
}

export function setAdminStatus(isAdmin) {
    appState.isAdminLoggedIn = isAdmin;
}

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

export function renderCompetitions(data, isAdmin) {
    const container = document.getElementById('competitions-container');
    
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

                    ${isAdmin ? `
                        <div class="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
                            <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="competitions">Ta bort</button>
                            <button class="edit-comp-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    const homeContainer = document.getElementById('home-competitions-container');
    if (homeContainer) {
        homeContainer.innerHTML = '';
        data.slice(0, 2).forEach(item => {
            const date = new Date(item.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content;
            const shortContent = tempDiv.textContent.substring(0, 150) + '...';
            
            homeContainer.innerHTML += `
                <a href="#tavlingar" class="card flex flex-col items-start hover:shadow-md transition duration-300">
                    <h3 class="text-2xl font-semibold mb-1 text-blue-900">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">${date} | ${item.location}</p>
                    <div class="text-gray-700 markdown-content">${shortContent}</div>
                    <span class="text-blue-600 text-sm mt-4 font-semibold">Läs hela rapporten &rarr;</span>
                </a>
            `;
        });
    }
}

export function toggleProfileUI(isLoggedIn, isAdmin = false) {
    const showLoginLink = document.getElementById('show-login-link');
    const adminIndicator = document.getElementById('admin-indicator');
    const navAccountGroup = document.getElementById('nav-account-group');
    const navToplist = document.getElementById('nav-toplist');
    const mobileResultsLink = document.getElementById('mobile-results-nav-link');
    const mobileProfileLink = document.getElementById('mobile-profile-nav-link');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const profilePanel = document.getElementById('profile-panel');

    if (isLoggedIn) {
        if (showLoginLink) showLoginLink.classList.add('hidden');
        if (navAccountGroup) navAccountGroup.classList.remove('hidden');
        if (navToplist) navToplist.classList.remove('hidden');
        if (mobileResultsLink) mobileResultsLink.classList.remove('hidden');
        if (mobileProfileLink) mobileProfileLink.classList.remove('hidden');
        if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');
        if (profilePanel) profilePanel.classList.remove('hidden');
        
        if (adminIndicator) {
            isAdmin ? adminIndicator.classList.remove('hidden') : adminIndicator.classList.add('hidden');
        }
    } else {
        if (showLoginLink) showLoginLink.classList.remove('hidden');
        if (navAccountGroup) navAccountGroup.classList.add('hidden');
        if (navToplist) navToplist.classList.add('hidden');
        if (mobileResultsLink) mobileResultsLink.classList.add('hidden');
        if (mobileProfileLink) mobileProfileLink.classList.add('hidden');
        if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');
        if (profilePanel) profilePanel.classList.add('hidden');
        if (adminIndicator) adminIndicator.classList.add('hidden');
    }
}

export function handleAdminUI(isAdmin) {
    appState.isAdminLoggedIn = isAdmin;
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
}

export function renderNews(newsData, isAdmin, currentUserId) {
    const homeNewsContainer = document.getElementById('home-news-container');
    const allNewsContainer = document.getElementById('all-news-container');

    if (!homeNewsContainer || !allNewsContainer) return;

    window.newsRendered = false;
    homeNewsContainer.innerHTML = '';
    allNewsContainer.innerHTML = '';

    newsData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
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

    newsData.slice(0, 2).forEach(item => {
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

    newsData.forEach(item => {
        const date = new Date(item.date);
        const createdAt = item.createdAt?.toDate() || new Date();
        const updatedAt = item.updatedAt?.toDate() || createdAt;
        const formattedDate = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
        const likes = item.likes || {};
        const likeCount = Object.keys(likes).length;
        const userHasLiked = currentUserId && likes[currentUserId];
        const timeInfo = `Upplagt: ${createdAt.toLocaleDateString('sv-SE')} ${createdAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}. Senast redigerad: ${updatedAt.toLocaleDateString('sv-SE')} ${updatedAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;

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
                        Dela
                    </button>
                    ${isAdmin ? `
                        <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="news">Ta bort</button>
                        <button class="edit-news-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    window.newsRendered = true;
    scrollToNewsIfNeeded();
}

export function renderEvents(eventsData, isAdmin) {
    const calendarContainer = document.getElementById('calendar-container');
    const homeEventsContainer = document.getElementById('home-events-container');

    if (!calendarContainer || !homeEventsContainer) return;

    calendarContainer.innerHTML = '';
    homeEventsContainer.innerHTML = '';
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = eventsData.filter(e => e.date >= today);
    
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
        const timeInfo = `Upplagt: ${createdAt.toLocaleDateString('sv-SE')} ${createdAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;

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
                    ${isAdmin ? `
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

export function renderHistory(historyData, isAdmin, currentUserId) {
    const historyContainer = document.getElementById('home-history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    historyData.sort((a, b) => a.priority - b.priority);
    
    historyData.forEach(item => {
        const createdAt = item.createdAt?.toDate() || new Date();
        const updatedAt = item.updatedAt?.toDate() || createdAt;
        const timeInfo = `Upplagt: ${createdAt.toLocaleDateString('sv-SE')} ${createdAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
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
                        Dela
                    </button>
                    ${isAdmin ? `
                        <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="history">Ta bort</button>
                        <button class="edit-history-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                    ` : ''}
                </div>
            </div>
        `;
    });
}

export function scrollToNewsIfNeeded() {
    const hash = window.location.hash;
    if (!hash) return;

    const parts = hash.split('#').filter(p => p !== '');
    
    parts.forEach(part => {
        if (part.startsWith('news-') || part.startsWith('event-') || part.startsWith('comp-')) {
            setTimeout(() => {
                const targetEl = document.getElementById(part);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    targetEl.style.transition = "background-color 1s";
                    targetEl.style.backgroundColor = "#fef9c3";
                    setTimeout(() => targetEl.style.backgroundColor = "", 2000);
                }
            }, 300); 
        }
    });
}

window.addEventListener('hashchange', scrollToNewsIfNeeded);
document.addEventListener('DOMContentLoaded', scrollToNewsIfNeeded);

export function renderImages(imageData, isAdmin) {
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
                        ${isAdmin ? `
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

export function renderSponsors(sponsorsData, isAdmin) {
    const containerGuld = document.getElementById('sponsors-by-1');
    const containerSilver = document.getElementById('sponsors-by-2');
    const containerBrons = document.getElementById('sponsors-by-4');
    const sectionGuld = document.getElementById('section-guld');
    const sectionSilver = document.getElementById('section-silver');
    const sectionBrons = document.getElementById('section-brons');

    if (!containerGuld || !containerSilver || !containerBrons) return;

    containerGuld.innerHTML = '';
    containerSilver.innerHTML = '';
    containerBrons.innerHTML = '';
    sectionGuld.classList.add('hidden');
    sectionSilver.classList.add('hidden');
    sectionBrons.classList.add('hidden');

    const sortedData = [...sponsorsData].sort((a, b) => a.priority - b.priority);

    const createSponsorHtml = (sponsor, className) => {
        const sponsorLink = sponsor.url ? `<a href="${sponsor.url}" target="_blank" rel="noopener noreferrer" class="block w-full h-full flex flex-col items-center justify-center">` : '';
        const closingTag = sponsor.url ? '</a>' : '';
        
        return `
            <div class="card p-4 flex flex-col items-center justify-center text-center ${className}">
                ${sponsorLink}
                    <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="sponsor-logo object-contain mb-2">
                    <h3 class="text-xl font-semibold">${sponsor.name}</h3>
                    ${sponsor.extraText ? `<p class="text-sm text-gray-500">${sponsor.extraText}</p>` : ''}
                ${closingTag}
                ${isAdmin ? `
                    <div class="flex space-x-2 mt-2">
                        <button class="edit-sponsor-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full hover:bg-gray-600 transition duration-300" data-id="${sponsor.id}">Ändra</button>
                        <button class="delete-btn px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full hover:bg-red-600 transition duration-300" data-id="${sponsor.id}" data-type="sponsors">Ta bort</button>
                    </div>
                ` : ''}
            </div>
        `;
    };

    sortedData.forEach(sponsor => {
        if (sponsor.size === '1/1') {
            sectionGuld.classList.remove('hidden');
            containerGuld.innerHTML += createSponsorHtml(sponsor, 'sponsor-card-1-1');
        } else if (sponsor.size === '1/2') {
            sectionSilver.classList.remove('hidden');
            containerSilver.innerHTML += createSponsorHtml(sponsor, 'sponsor-card-1-2');
        } else if (sponsor.size === '1/4') {
            sectionBrons.classList.remove('hidden');
            containerBrons.innerHTML += createSponsorHtml(sponsor, 'sponsor-card-1-4');
        }
    });
}

export function renderAdminsAndUsers(usersData, isAdmin, currentUserId) {
    const adminListEl = document.getElementById('admin-list');
    const allUsersContainer = document.getElementById('all-users-container');
    
    if (!adminListEl || !allUsersContainer) {
        console.log("Kunde inte hitta admin-list eller all-users-container");
        return;
    }

    adminListEl.innerHTML = '';
    allUsersContainer.innerHTML = '';
    
    console.log("Renderar admins och användare. Antal:", usersData.length, "Är admin:", isAdmin);
    
    usersData.forEach(user => {
        const isUserAdmin = user.isAdmin || false;
        const userEl = document.createElement('div');
        userEl.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 border border-gray-200';
        
        if (isUserAdmin) {
            let buttons = `
                <button class="show-user-info-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition" data-id="${user.id}">Visa info</button>
            `;
            
            if (isAdmin) {
                buttons += `
                    <button class="edit-user-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded hover:bg-gray-600 transition ml-2" data-user-id="${user.id}">Redigera</button>
                `;
                
                const adminCount = usersData.filter(u => u.isAdmin).length;
                if (adminCount > 1 && user.id !== currentUserId) {
                    buttons += `
                        <button class="delete-admin-btn px-3 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition ml-2" data-id="${user.id}">Ta bort admin</button>
                    `;
                }
            }
            
            userEl.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-semibold">${user.name || user.email}</span>
                    <span class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">ADMIN</span>
                    ${user.isClubMember ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Medlem</span>' : ''}
                </div>
                <div class="flex items-center">${buttons}</div>
            `;
            adminListEl.appendChild(userEl);
        } else {
            let buttons = `
                <button class="show-user-info-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition" data-id="${user.id}">Visa info</button>
            `;
            
            if (isAdmin) {
                buttons += `
                    <button class="edit-user-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded hover:bg-gray-600 transition ml-2" data-user-id="${user.id}">Redigera</button>
                    
                    <button class="toggle-member-btn px-3 py-1 rounded text-xs font-bold transition ml-2 ${user.isClubMember ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}" 
                            data-id="${user.id}" 
                            data-status="${user.isClubMember || false}">
                        ${user.isClubMember ? '✓ Medlem' : 'Gör till medlem'}
                    </button>
                    
                    <button class="add-admin-btn px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded hover:bg-yellow-600 transition ml-2" data-id="${user.id}">Gör till admin</button>
                `;
            }
            
            userEl.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-semibold">${user.name || user.email}</span>
                    ${user.isClubMember ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Medlem</span>' : '<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Ej medlem</span>'}
                </div>
                <div class="flex items-center flex-wrap gap-2 justify-end">${buttons}</div>
            `;
            allUsersContainer.appendChild(userEl);
        }
    });
}

export function renderShootersAdmin(shootersData) {
    const container = document.getElementById('admin-shooters-list');
    if (!container) return;

    container.innerHTML = '';
    
    shootersData.sort((a, b) => {
        if (a.requiresAdminAction && !b.requiresAdminAction) return -1;
        if (!a.requiresAdminAction && b.requiresAdminAction) return 1;
        return a.name.localeCompare(b.name);
    });

    shootersData.forEach(shooter => {
        const parentCount = shooter.parentUserIds ? shooter.parentUserIds.length : 0;
        const isOrphan = shooter.requiresAdminAction || parentCount === 0;
        
        let statusHtml = `<p class="text-xs text-gray-500">Administreras av ${parentCount} konton</p>`;
        let bgClass = "bg-gray-50 border-gray-200";

        if (isOrphan) {
            bgClass = "bg-red-50 border-red-300";
            statusHtml = `
                <p class="text-xs text-red-600 font-bold">⚠️ SAKNAR KOPPLING</p>
                <p class="text-xs text-red-500">Profilen syns inte för någon medlem.</p>
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
                        <span>👥</span> Hantera
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
        const logoInput = document.getElementById('logo-url-input');
        const colorInput = document.getElementById('header-color-input');
        const sponsorsCheck = document.getElementById('show-sponsors-checkbox');
        const addressInput = document.getElementById('contact-address-input');
        const locationInput = document.getElementById('contact-location-input');
        const phoneInput = document.getElementById('contact-phone-input');
        const emailInput = document.getElementById('contact-email-input');

        if (logoInput) logoInput.value = data.logoUrl || '';
        if (colorInput) colorInput.value = data.headerColor || '#1e40af';
        if (sponsorsCheck) sponsorsCheck.checked = data.showSponsors || false;
        if (addressInput) addressInput.value = data.contactAddress || '';
        if (locationInput) locationInput.value = data.contactLocation || '';
        if (phoneInput) phoneInput.value = data.contactPhone || '';
        if (emailInput) emailInput.value = data.contactEmail || '';
    }
}

export async function renderProfileInfo(userData) {
    const container = document.getElementById('profile-info-container');
    
    if (!container) {
        console.error("Kunde inte hitta profile-info-container");
        return;
    }

    if (!userData) {
        container.innerHTML = '<p class="text-gray-500 italic">Kunde inte ladda profiluppgifter.</p>';
        return;
    }

    try {
        let html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">Namn</p>
                    <p class="text-lg font-semibold">${userData.name || 'Ej angivet'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">E-post</p>
                    <p class="text-lg font-semibold">${userData.email || 'Ej angivet'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">Födelseår</p>
                    <p class="text-lg font-semibold">${userData.birthyear || 'Ej angivet'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">Telefon</p>
                    <p class="text-lg font-semibold">${userData.phone || 'Ej angivet'}</p>
                </div>
                <div class="md:col-span-2">
                    <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">Adress</p>
                    <p class="text-lg font-semibold">${userData.address || 'Ej angivet'}</p>
                </div>
            </div>

            <div class="flex flex-wrap gap-3 mb-6">
                <span class="px-3 py-1 rounded-full text-xs font-bold ${userData.isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">
                    ${userData.isAdmin ? '🛡️ Admin' : '👤 Användare'}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${userData.isClubMember ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">
                    ${userData.isClubMember ? '✅ Klubbmedlem' : '⏳ Väntar på verifiering'}
                </span>
                ${userData.mailingList ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">📧 Utskick</span>' : ''}
            </div>
        `;

        container.innerHTML = html;

    } catch (err) {
        console.error("Fel vid utritning av profilinfo:", err);
        container.innerHTML = `<p class="text-red-500">Kunde inte visa profil: ${err.message}</p>`;
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
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    const parts = hash.split('#').filter(p => p !== '');
    const pageId = parts[0] || 'hem'; 
    
    const targetPage = document.getElementById(pageId);

    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
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

export function renderTopLists(results, shooters) {
    const container = document.getElementById('top-lists-container');
    if (!container) return;

    if (!appState.isClubMemberGlobal && !appState.isAdminLoggedIn) {
        container.innerHTML = `
            <div class="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div class="text-4xl mb-3">🔒</div>
                <p class="text-yellow-800 font-bold">Topplistor är endast för klubbmedlemmar.</p>
                <p class="text-sm text-yellow-700 mt-2">Ditt konto måste verifieras av en admin innan du kan se klubbens gemensamma listor.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    if (!results || results.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic text-center p-8">Inga delade resultat hittades ännu.</p>';
        return;
    }

    const categories = [
        { name: 'Sittande 20 skott', discipline: 'sitting', shots: 20 },
        { name: 'Stående 20 skott', discipline: 'standing', shots: 20 },
        { name: 'Sittande 40 skott', discipline: 'sitting', shots: 40 },
        { name: 'Stående 40 skott', discipline: 'standing', shots: 40 }
    ];

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

    categories.forEach(cat => {
        const filtered = results
            .filter(r => r.discipline === cat.discipline && r.shotCount === cat.shots && r.sharedWithClub === true)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        if (filtered.length > 0) {
            const card = document.createElement('div');
            card.className = 'card overflow-hidden border-t-4 border-blue-900 shadow-md';
            card.innerHTML = `
                <h3 class="bg-gray-100 p-3 font-bold text-center text-blue-900 uppercase text-xs tracking-wider">${cat.name}</h3>
                <div class="p-2">
                    ${filtered.map((r, i) => {
                        const shooter = shooters.find(s => s.id === r.shooterId);
                        return `
                            <div class="flex justify-between items-center p-2 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b last:border-0">
                                <span class="text-sm font-medium"><span class="text-gray-400 mr-2">${i+1}.</span> ${shooter ? shooter.name : 'Okänd'}</span>
                                <span class="font-bold text-blue-700">${r.total}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            grid.appendChild(card);
        }
    });

    if (grid.children.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic text-center p-8">Inga resultat har delats med klubben ännu.</p>';
    } else {
        container.appendChild(grid);
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