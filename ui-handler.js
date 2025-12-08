// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ver. 1.32 (Helt fristående för att undvika krasch)
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
    const container = document.getElementById('competitions-container');
    if (!container) return;

    container.innerHTML = '';
    
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

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
    
    if (isAdmin) {
        isAdminLoggedIn = true;
        if (adminIndicator) adminIndicator.classList.remove('hidden');
        if (newsEditSection) newsEditSection.classList.remove('hidden');
        if (competitionEditSection) competitionEditSection.classList.remove('hidden');
        if (calendarEditSection) calendarEditSection.classList.remove('hidden');
        if (imageEditSection) imageEditSection.classList.remove('hidden');
        if (historyEditSection) historyEditSection.classList.remove('hidden');
        if (sponsorsEditSection) sponsorsEditSection.classList.remove('hidden');
        if (adminPanel) adminPanel.classList.remove('hidden');
        if (adminLoginPanel) adminLoginPanel.classList.add('hidden');
        
        // Hämta användare direkt från auth istället för usersData för att undvika loop
        if (adminUserInfo && auth.currentUser) {
            loggedInAdminUsername = auth.currentUser.email || 'Admin';
            adminUserInfo.textContent = `Välkommen, ${loggedInAdminUsername}`;
        }
    } else {
        isAdminLoggedIn = false;
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

        const baseUrl = window.location.href.split('?')[0];
        const newsUrl = `${baseUrl}?#nyheter#news-${item.id}`;

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

        const baseUrl = window.location.href.split('?')[0];
        const eventUrl = `${baseUrl}?#kalender#event-${item.id}`;
        
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
    
    // Sort by size first, then by priority
    const sizeOrder = {'1/1': 1, '1/2': 2, '1/4': 3};
    sponsorsData.sort((a, b) => {
        const sizeDiff = sizeOrder[a.size] - sizeOrder[b.size];
        if (sizeDiff !== 0) {
            return sizeDiff;
        }
        return a.priority - b.priority;
    });

    // Group sponsors by size
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
        const userEl = document.createElement('div');
        userEl.className = 'flex items-center justify-between p-2 bg-gray-100 rounded-lg';
        
        if (isUserAdmin) {
            userEl.innerHTML = `
                <span class="font-semibold">${user.email} (Admin)</span>
                <div class="flex space-x-2">
                    <button class="show-user-info-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition duration-300" data-id="${user.id}">Visa info</button>
                    ${isAdminLoggedIn ? `<button class="edit-user-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full hover:bg-gray-600 transition duration-300" data-user-id="${user.id}">Redigera</button>` : ''}
                    ${isAdminLoggedIn && usersData.filter(u => u.isAdmin).length > 1 && user.id !== auth.currentUser.uid ? `<button class="delete-admin-btn text-red-500 hover:text-red-700 transition duration-300 text-sm" data-id="${user.id}">Ta bort</button>` : ''}
                </div>
            `;
            adminListEl.appendChild(userEl);
        } else {
            userEl.innerHTML = `
                <span class="font-semibold">${user.email}</span>
                <div class="flex space-x-2">
                    <button class="show-user-info-btn px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition duration-300" data-id="${user.id}">Visa info</button>
                    ${isAdminLoggedIn ? `<button class="edit-user-btn px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full hover:bg-gray-600 transition duration-300" data-user-id="${user.id}">Redigera</button>` : ''}
                    ${isAdminLoggedIn ? `<button class="add-admin-btn px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full hover:bg-green-600 transition duration-300" data-id="${user.id}">Lägg till som Admin</button>` : ''}
                </div>
            `;
            allUsersContainer.appendChild(userEl);
        }
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
    // Använd querySelectorAll för att hitta ALLA element, eftersom ID:t nu finns på flera ställen (Footer + Om oss)
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

export function renderProfileInfo(userDoc) {
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
    const targetElementId = hashParts[2];
    
    if (!targetPageId || targetPageId === 'hem') {
        targetPageId = 'hem';
        document.getElementById(targetPageId).classList.add('active');
    } else {
        const targetPage = document.querySelector(`#${targetPageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            // Fallback to home if the page ID is not found
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