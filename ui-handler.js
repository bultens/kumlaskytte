// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ver. 2.2 (Fixad handleAdminUI med mobilmeny och global status)
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
        <p><strong>Namn:</strong> ${user.name || '-'}</p>
        <p><strong>Adress:</strong> ${user.address || '-'}</p>
        <p><strong>Telefon:</strong> ${user.phone || '-'}</p>
        <p><strong>Födelseår:</strong> ${user.birthyear || '-'}</p>
        <p><strong>Utskick:</strong> ${user.mailingList ? 'Ja' : 'Nej'}</p>
        <p><strong>Admin:</strong> ${user.isAdmin ? 'Ja' : 'Nej'}</p>
        <div class="mt-6 flex space-x-2">
            ${!user.isAdmin ? `<button class="add-admin-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" data-id="${user.id}">Gör till Admin</button>` : `<button class="delete-admin-btn bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" data-id="${user.id}">Ta bort Admin</button>`}
            <button class="edit-user-btn bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600" data-user-id="${user.id}">Ändra uppgifter</button>
            <button id="close-user-info-modal" class="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 ml-auto">Stäng</button>
        </div>
    `;
    
    const modalBody = modal.querySelector('.modal-body') || modal.querySelector('div');
    if (modalBody) modalBody.innerHTML = content;
    
    // Återanslut stäng-knapp eftersom vi skrev över HTML
    setTimeout(() => {
        const closeBtn = document.getElementById('close-user-info-modal');
        if(closeBtn) closeBtn.onclick = () => hideModal('userInfoModal');
    }, 0);

    modal.classList.add('active');
}

export function showEditUserModal(user) {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-email').value = user.email; // Readonly
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
    
    const text = `Kolla in "${title}" på Kumla Skytteförening!`;
    const shareLinksDiv = document.getElementById('share-links');
    
    shareLinksDiv.innerHTML = `
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="block bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700 mb-2">Facebook</a>
        <a href="mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}" class="block bg-gray-600 text-white text-center py-2 rounded hover:bg-gray-700 mb-2">E-post</a>
        <button id="copy-link-btn" class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Kopiera länk</button>
    `;
    
    modal.classList.add('active');
    
    setTimeout(() => {
        document.getElementById('copy-link-btn').onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                showModal('confirmationModal', "Länk kopierad!");
                hideModal('shareModal');
            });
        };
    }, 0);
}

export function showDeleteProfileModal() {
    const modal = document.getElementById('deleteProfileModal');
    if (modal) {
        modal.classList.add('active');
        
        // Setup cancel button specifically for this modal
        const cancelBtn = document.getElementById('cancel-delete-profile-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => hideModal('deleteProfileModal');
        }
    }
}

export function applyEditorCommand(editorElement, command, value = null) {
    editorElement.focus();
    document.execCommand(command, false, value);
    editorElement.focus();
}

export function navigate(hash) {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link'); // Uppdatera även mobillänkar
    
    pages.forEach(page => page.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active')); // Tailwind active style usually applied via class, logic kept
    
    const targetId = hash.replace('#', '');
    const targetPage = document.getElementById(targetId);
    
    if (targetPage) {
        targetPage.classList.add('active');
        // Scroll to top
        window.scrollTo(0, 0);
    } else {
        // Default to hem if hash not found
        const hemPage = document.getElementById('hem');
        if(hemPage) hemPage.classList.add('active');
    }
}

// DENNA FUNKTION ÄR UPPDATERAD
export function handleAdminUI(isAdmin) {
    // VIKTIGT: Uppdatera global variabel så att "redigera"-pennor syns i listorna
    isAdminLoggedIn = isAdmin;

    const adminNavLink = document.getElementById('admin-nav-link');
    const mobileAdminNavLink = document.getElementById('mobile-admin-nav-link'); // Mobil
    const adminIndicator = document.getElementById('admin-indicator');
    
    // Lista på alla sektioner som ska visas för admin
    const sections = [
        'news-edit-section', 'competition-edit-section', 'calendar-edit-section',
        'image-edit-section', 'history-edit-section', 'sponsors-edit-section',
        'admin-panel'
    ];
    
    const adminLoginPanel = document.getElementById('admin-login-panel');
    const adminUserInfo = document.getElementById('admin-user-info');
    
    if (isAdmin) {
        // VISA
        if (adminNavLink) adminNavLink.classList.remove('hidden');
        if (mobileAdminNavLink) mobileAdminNavLink.classList.remove('hidden'); // Visa i mobil
        if (adminIndicator) adminIndicator.classList.remove('hidden');
        
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
        
        if (adminLoginPanel) adminLoginPanel.classList.add('hidden');
        
        if (adminUserInfo && auth.currentUser) {
            loggedInAdminUsername = auth.currentUser.email || 'Admin';
            adminUserInfo.textContent = `Inloggad som administratör: ${loggedInAdminUsername}`;
        }
    } else {
        // GÖM
        if (adminNavLink) adminNavLink.classList.add('hidden');
        if (mobileAdminNavLink) mobileAdminNavLink.classList.add('hidden'); // Göm i mobil
        if (adminIndicator) adminIndicator.classList.add('hidden');

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        if (adminLoginPanel) adminLoginPanel.classList.remove('hidden');
    }
}

export function renderNews(newsData, isAdmin, currentUserId) {
    const container = document.getElementById('news-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const sortedNews = [...newsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedNews.forEach(item => {
        const likesCount = item.likes ? Object.keys(item.likes).length : 0;
        const userLiked = currentUserId && item.likes && item.likes[currentUserId];
        const likeBtnClass = userLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500';
        
        // Om användaren är admin (isAdminLoggedIn är satt i handleAdminUI), visa redigera-knapp
        const adminControls = isAdmin ? `
            <button class="edit-news-btn text-blue-600 hover:text-blue-800 text-sm font-semibold mr-2" data-id="${item.id}">Ändra</button>
            <button class="delete-btn text-red-600 hover:text-red-800 text-sm font-semibold" data-id="${item.id}" data-type="news">Ta bort</button>
        ` : '';

        const div = document.createElement('div');
        div.className = 'card bg-white p-6 rounded-lg shadow-md mb-6';
        div.id = `news-${item.id}`;
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm text-gray-500 font-medium">${item.date}</span>
                <div>${adminControls}</div>
            </div>
            <h3 class="text-2xl font-bold text-gray-800 mb-3">${item.title}</h3>
            <div class="text-gray-700 leading-relaxed mb-4 editor-content">${item.content}</div>
            <div class="flex items-center space-x-4 border-t pt-3 mt-4">
                <button class="like-btn flex items-center space-x-1 ${likeBtnClass} transition" data-id="${item.id}" data-type="news">
                    <span class="text-xl">♥</span>
                    <span class="text-sm font-semibold">${likesCount}</span>
                </button>
                <button class="share-btn flex items-center space-x-1 text-gray-400 hover:text-blue-600 transition" data-id="${item.id}" data-title="${item.title}">
                    <span class="text-xl">🔗</span>
                    <span class="text-sm font-semibold">Dela</span>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

export function renderEvents(eventsData, isAdmin) {
    const container = document.getElementById('events-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Filtrera bort gamla events (äldre än igår)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const upcomingEvents = eventsData.filter(e => new Date(e.date) >= yesterday);
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (upcomingEvents.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Inga kommande händelser inlagda.</p>';
        return;
    }

    upcomingEvents.forEach(item => {
        const adminControls = isAdmin ? `
            <div class="mt-2 pt-2 border-t border-gray-100 flex justify-end space-x-2">
                <button class="edit-event-btn text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200" data-id="${item.id}">Ändra</button>
                <button class="delete-btn text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200" data-id="${item.id}" data-type="events" ${item.seriesId ? `data-series-id="${item.seriesId}"` : ''}>Ta bort</button>
            </div>
        ` : '';

        const dateObj = new Date(item.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('sv-SE', { month: 'short' }).toUpperCase();
        
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-600 flex justify-between items-start';
        div.innerHTML = `
            <div class="flex items-start">
                <div class="flex flex-col items-center justify-center bg-blue-50 px-3 py-2 rounded mr-4 min-w-[60px]">
                    <span class="text-xl font-bold text-blue-800 leading-none">${day}</span>
                    <span class="text-xs font-bold text-blue-600">${month}</span>
                </div>
                <div>
                    <h4 class="font-bold text-lg text-gray-800">${item.title}</h4>
                    <div class="text-gray-600 text-sm mt-1 editor-content">${item.description}</div>
                </div>
            </div>
            ${adminControls}
        `;
        container.appendChild(div);
    });
}

export function renderCompetitions(competitionsData, isAdmin) {
    const container = document.getElementById('competitions-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const sortedComps = [...competitionsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedComps.forEach(comp => {
        const adminControls = isAdmin ? `
            <div class="absolute top-2 right-2 flex space-x-1">
                <button class="edit-comp-btn bg-white p-1 rounded-full shadow hover:text-blue-600 text-gray-400" data-id="${comp.id}">✏️</button>
                <button class="delete-btn bg-white p-1 rounded-full shadow hover:text-red-600 text-gray-400" data-id="${comp.id}" data-type="competitions">🗑️</button>
            </div>
        ` : '';

        const pdfLink = comp.pdfUrl ? `
            <a href="${comp.pdfUrl}" target="_blank" class="inline-flex items-center mt-3 text-red-600 hover:text-red-800 font-bold">
                <span class="mr-1">📄</span> Läs inbjudan/resultat (PDF)
            </a>
        ` : '';

        const div = document.createElement('div');
        div.className = 'card relative bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-100';
        div.innerHTML = `
            ${adminControls}
            <div class="text-sm text-blue-600 font-bold mb-1">${comp.date} | ${comp.location}</div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">${comp.title}</h3>
            <div class="text-gray-600 editor-content">${comp.content}</div>
            ${pdfLink}
        `;
        container.appendChild(div);
    });
}

export function renderHistory(historyData, isAdmin) {
    const container = document.getElementById('history-container');
    if (!container) return;
    container.innerHTML = '';
    
    const sortedHistory = [...historyData].sort((a, b) => a.priority - b.priority);
    
    sortedHistory.forEach(item => {
        const adminControls = isAdmin ? `
            <div class="mb-2">
                <button class="edit-history-btn text-blue-600 hover:text-blue-800 text-xs mr-2" data-id="${item.id}">Ändra</button>
                <button class="delete-btn text-red-600 hover:text-red-800 text-xs" data-id="${item.id}" data-type="history">Ta bort</button>
            </div>
        ` : '';

        const div = document.createElement('div');
        div.className = 'mb-8';
        div.innerHTML = `
            ${adminControls}
            <h3 class="text-2xl font-bold text-blue-900 mb-3">${item.title}</h3>
            <div class="text-gray-700 leading-relaxed editor-content">${item.content}</div>
        `;
        container.appendChild(div);
    });
}

export function renderImages(imageData, isAdmin) {
    const container = document.getElementById('image-gallery');
    if (!container) return;
    container.innerHTML = '';
    
    // Sortera: År (fallande), sedan Månad (fallande), sedan Prioritet (lägst först)
    const sortedImages = [...imageData].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        return (a.priority || 10) - (b.priority || 10);
    });
    
    sortedImages.forEach(img => {
        const adminControls = isAdmin ? `
            <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="edit-image-btn bg-white text-gray-800 p-1 rounded-full shadow hover:bg-blue-50" data-id="${img.id}">✏️</button>
                <button class="delete-btn bg-white text-red-600 p-1 rounded-full shadow hover:bg-red-50" data-id="${img.id}" data-type="images">🗑️</button>
            </div>
        ` : '';

        const div = document.createElement('div');
        div.className = 'group relative break-inside-avoid mb-4';
        div.innerHTML = `
            <img src="${img.url}" alt="${img.title}" class="w-full rounded-lg shadow-md hover:shadow-xl transition duration-300">
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-white font-bold">${img.title}</p>
                <p class="text-gray-200 text-xs">${img.year}-${img.month}</p>
            </div>
            ${adminControls}
        `;
        container.appendChild(div);
    });
}

export function renderSponsors(sponsorsData, isAdmin) {
    const container = document.getElementById('sponsors-container');
    const footerContainer = document.getElementById('footer-sponsors-container');
    
    if (container) container.innerHTML = '';
    if (footerContainer) footerContainer.innerHTML = '';
    
    const sortedSponsors = [...sponsorsData].sort((a, b) => (a.priority || 10) - (b.priority || 10));
    
    sortedSponsors.forEach(sponsor => {
        // Huvudsidan
        if (container) {
            const sizeClass = sponsor.size === '1/1' ? 'w-full md:w-full' : 
                              sponsor.size === '1/2' ? 'w-full md:w-1/2' : 'w-1/2 md:w-1/4';
            
            const adminControls = isAdmin ? `
                <div class="absolute top-2 right-2">
                    <button class="edit-sponsor-btn text-gray-400 hover:text-blue-600 mr-1" data-id="${sponsor.id}">✎</button>
                    <button class="delete-btn text-gray-400 hover:text-red-600" data-id="${sponsor.id}" data-type="sponsors">🗑</button>
                </div>
            ` : '';

            const div = document.createElement('div');
            div.className = `${sizeClass} p-4 flex flex-col items-center relative group`;
            div.innerHTML = `
                <a href="${sponsor.url}" target="_blank" class="block w-full h-full flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
                    <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="max-h-24 max-w-full object-contain mb-3">
                    <h4 class="font-bold text-gray-800">${sponsor.name}</h4>
                    ${sponsor.extraText ? `<p class="text-xs text-gray-500 text-center mt-1">${sponsor.extraText}</p>` : ''}
                </a>
                ${adminControls}
            `;
            container.appendChild(div);
        }

        // Footer (bara loggor, små)
        if (footerContainer) {
            const a = document.createElement('a');
            a.href = sponsor.url;
            a.target = "_blank";
            a.className = "opacity-70 hover:opacity-100 transition";
            a.innerHTML = `<img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="h-8 w-auto grayscale hover:grayscale-0 transition">`;
            footerContainer.appendChild(a);
        }
    });
}

export function renderAdminsAndUsers(usersData, isAdmin, currentUserId) {
    const adminList = document.getElementById('admin-list');
    if (!adminList || !isAdmin) return; 

    adminList.innerHTML = '';
    
    // Admins
    const admins = usersData.filter(u => u.isAdmin);
    let adminHtml = '<div class="mb-6"><h3 class="font-bold text-lg mb-2">Administratörer</h3><ul class="space-y-2">';
    admins.forEach(u => {
        adminHtml += `<li class="flex justify-between items-center bg-gray-50 p-2 rounded">
            <span>${u.email} ${u.name ? `(${u.name})` : ''}</span>
            ${u.id !== currentUserId ? `<button class="show-user-info-btn text-blue-600 hover:text-blue-800 text-sm" data-id="${u.id}">Hantera</button>` : '<span class="text-xs text-gray-500">(Du)</span>'}
        </li>`;
    });
    adminHtml += '</ul></div>';
    
    // Users
    const users = usersData.filter(u => !u.isAdmin);
    let userHtml = '<div><h3 class="font-bold text-lg mb-2">Övriga Användare</h3><ul class="space-y-2 max-h-60 overflow-y-auto">';
    users.forEach(u => {
        userHtml += `<li class="flex justify-between items-center bg-white border p-2 rounded hover:bg-gray-50 transition cursor-pointer show-user-info-btn" data-id="${u.id}">
            <span>${u.email} ${u.name ? `(${u.name})` : ''}</span>
            <span class="text-gray-400">ℹ️</span>
        </li>`;
    });
    userHtml += '</ul></div>';

    adminList.innerHTML = adminHtml + userHtml;
}

export function renderShootersAdmin(shootersData) {
    const list = document.getElementById('admin-shooters-list');
    if (!list) return;
    list.innerHTML = '';
    
    shootersData.forEach(shooter => {
        const warning = shooter.requiresAdminAction ? '<span class="text-red-500 font-bold ml-2">⚠️ Föräldralös!</span>' : '';
        const parents = shooter.parentUserIds ? shooter.parentUserIds.length : 0;
        
        list.innerHTML += `
            <div class="flex justify-between items-center p-2 border-b bg-white ${shooter.requiresAdminAction ? 'bg-red-50' : ''}">
                <div>
                    <strong>${shooter.name}</strong> (${shooter.birthyear})
                    <div class="text-xs text-gray-500">Kopplade föräldrar: ${parents} ${warning}</div>
                </div>
                <div class="flex space-x-2">
                    <button class="link-parent-btn bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200" data-id="${shooter.id}">Koppla</button>
                    <button class="delete-btn bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200" data-id="${shooter.id}" data-type="shooters">Radera</button>
                </div>
            </div>
        `;
    });
}

export function renderUserReport(usersData) {
    const container = document.getElementById('admin-user-report');
    if (!container) return;

    const totalUsers = usersData.length;
    const mailingListCount = usersData.filter(u => u.mailingList).length;
    
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-4 text-center">
            <div class="bg-blue-50 p-3 rounded">
                <span class="block text-2xl font-bold text-blue-800">${totalUsers}</span>
                <span class="text-xs text-blue-600">Registrerade konton</span>
            </div>
            <div class="bg-green-50 p-3 rounded">
                <span class="block text-2xl font-bold text-green-800">${mailingListCount}</span>
                <span class="text-xs text-green-600">Prenumererar på utskick</span>
            </div>
        </div>
    `;
}

export function renderContactInfo() {
    const contactInfoDiv = document.getElementById('contact-info');
    if (!contactInfoDiv) return; // Finns i footer i index.html, men bra check
    
    // I en riktig app skulle detta läsas från 'settings', men här hårdkodar vi element-referenserna för redigering
    // Eftersom settings laddas i data-service och renderar *inputs*, här renderar vi *view*.
    // OBS: För att detta ska bli dynamiskt "på riktigt" måste settingsData skickas hit.
    // I initializeDataListeners anropas denna *efter* settings hämtats, men vi har inte sparat dem globalt i UI än.
    // Låt oss anta att vi läser från DOM om det behövs, eller så sköter onSnapshot i data-service uppdateringen av DOM direkt.
    // Förenkling: data-service.js uppdaterar direkt elementen i footern (id="footer-address" etc). 
}

// Dessa funktioner anropas från data-service med data från DB
export function updateHeaderColor(color) {
    if (color) {
        document.getElementById('site-header').style.backgroundColor = color;
        // Uppdatera även mobilmenyns border
        const mobileMenu = document.getElementById('mobile-menu');
        if(mobileMenu) mobileMenu.style.borderColor = color;
    }
}

export function toggleSponsorsNavLink(show) {
    const link = document.querySelector('a[href="#sponsorer"]');
    if (link) {
        if (show) link.parentElement.classList.remove('hidden');
        else link.parentElement.classList.add('hidden');
    }
}

export function renderSiteSettings() {
    // Fyller i formulären i Admin -> Inställningar. 
    // Data hämtas i data-service och denna funktion kallas. 
    // Men vänta, data-service har datan i 'docSnap'. 
    // Vi måste skicka med datan hit.
    // Ändring i data-service behövs för att skicka data.
    // MEN: För att slippa ändra data-service igen, gör vi såhär:
    // data-service fyller i inputs DIREKT. Denna funktion kan vara tom eller göra UI-uppfräschning.
    
    // Faktum är: data-service.js gör redan jobbet i sin onSnapshot:
    /*
        document.getElementById('logo-url-input').value = data.logoUrl || '';
        document.getElementById('header-color-input').value = data.headerColor || '#1e40af';
        // ... osv
    */
    // Så denna funktion behövs knappt, men vi behåller den för struktur.
}

export function renderProfileInfo(userDoc, myShooters) {
    if (!userDoc.exists()) return;
    const data = userDoc.data();
    
    // Fyll i formuläret
    const inputs = {
        'profile-name-input': data.name,
        'profile-address-input': data.address,
        'profile-phone-input': data.phone,
        'profile-birthyear-input': data.birthyear
    };
    
    for (const [id, val] of Object.entries(inputs)) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }
    
    const check = document.getElementById('profile-mailing-list-checkbox');
    if (check) check.checked = data.mailingList || false;
    
    // Settings
    if (data.settings) {
        const trackEl = document.getElementById('track-medals-toggle');
        const shareEl = document.getElementById('profile-default-share');
        if (trackEl) trackEl.checked = data.settings.trackMedals !== false;
        if (shareEl) shareEl.checked = data.settings.defaultShareResults || false;
    }

    // Välkomsttext
    const welcome = document.getElementById('profile-welcome-message');
    if (welcome) welcome.textContent = `Välkommen, ${data.name || data.email}`;
}

// NY: Renderar topplistor på startsidan/topplistor-sidan
export function renderTopLists(classes, allResults, shooters) {
    const container = document.getElementById('toplists-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Gruppera resultat per klass
    // En skytt tillhör en klass baserat på ålder.
    // Vi måste räkna ut varje skytts bästa resultat för året.
    
    const currentYear = new Date().getFullYear();
    const shooterBest = {}; // { shooterId: { total: 0, shooterObj: ... } }

    // 1. Hitta bästa resultatet för varje skytt detta år
    allResults.forEach(r => {
        const rYear = new Date(r.date).getFullYear();
        if (rYear === currentYear && r.sharedWithClub) {
            if (!shooterBest[r.shooterId] || r.total > shooterBest[r.shooterId].total) {
                shooterBest[r.shooterId] = {
                    total: r.total,
                    shooterId: r.shooterId
                };
            }
        }
    });

    // 2. Koppla skytt till klass och skapa listor
    const classResults = {}; // { 'L 11': [ {name, total} ] }

    // Initiera klasser
    classes.forEach(c => classResults[c.name] = []);
    classResults['Övriga'] = [];

    // Placera in skyttar i klasser
    Object.values(shooterBest).forEach(best => {
        const shooter = shooters.find(s => s.id === best.shooterId);
        if (shooter) {
            // Räkna ut ålder
            const age = currentYear - shooter.birthyear;
            let assignedClass = 'Övriga';
            
            // Hitta rätt klass (antar att classes är sorterad)
            for (const c of classes) {
                if (age >= c.minAge && age <= c.maxAge) {
                    assignedClass = c.name;
                    break;
                }
            }
            
            if (!classResults[assignedClass]) classResults[assignedClass] = [];
            classResults[assignedClass].push({
                name: shooter.name,
                total: best.total,
                age: age
            });
        }
    });

    // 3. Rendera HTML
    for (const [className, list] of Object.entries(classResults)) {
        if (list.length > 0) {
            // Sortera fallande poäng
            list.sort((a, b) => b.total - a.total);
            
            let listHtml = `
                <div class="bg-white rounded-lg shadow p-4 mb-4 break-inside-avoid">
                    <h3 class="font-bold text-lg text-blue-900 border-b pb-2 mb-2">${className}</h3>
                    <ul class="space-y-2">
            `;
            
            list.forEach((item, index) => {
                let icon = '';
                if (index === 0) icon = '🥇';
                else if (index === 1) icon = '🥈';
                else if (index === 2) icon = '🥉';
                else icon = `<span class="text-gray-400 font-mono w-5 inline-block text-center">${index + 1}.</span>`;
                
                listHtml += `
                    <li class="flex justify-between items-center text-sm">
                        <div><span class="mr-2">${icon}</span> ${item.name}</div>
                        <div class="font-bold text-gray-700">${item.total}p</div>
                    </li>
                `;
            });
            
            listHtml += `</ul></div>`;
            container.innerHTML += listHtml;
        }
    }
    
    if (container.innerHTML === '') {
        container.innerHTML = '<p class="text-gray-500 italic text-center">Inga resultat registrerade för detta år än.</p>';
    }
}

export function renderClassesAdmin(classes) {
    const list = document.getElementById('admin-classes-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    classes.forEach(c => {
        const json = JSON.stringify(c);
        list.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded mb-2 border">
                <div>
                    <span class="font-bold">${c.name}</span> 
                    <span class="text-xs text-gray-500 ml-2">(${c.minAge}-${c.maxAge} år)</span>
                    <p class="text-xs text-gray-400">${c.discipline || ''}</p>
                </div>
                <div>
                    <button class="edit-class-btn text-blue-600 hover:text-blue-800 text-sm mr-2" data-obj='${json}'>Ändra</button>
                    <button class="delete-btn text-red-600 hover:text-red-800 text-sm" data-id="${c.id}" data-type="competitionClasses">Ta bort</button>
                </div>
            </div>
        `;
    });
}

// Denna används på den publika "topplistor"-sidan när man väljer en specifik skytt
export function renderPublicShooterStats(shooterId, allResults, allShooters) {
    const container = document.getElementById('public-shooter-stats-container');
    const statsContainer = document.getElementById('public-stats-display');
    const shooterNameEl = document.getElementById('public-shooter-name');
    
    if (!container || !shooterId) {
        if (statsContainer) statsContainer.classList.add('hidden');
        return;
    }

    const shooter = allShooters.find(s => s.id === shooterId);
    if (!shooter) return;

    shooterNameEl.textContent = shooter.name;
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
                    <span class="font-bold text-gray-800">${res.total} p</span>
                    <span class="text-xs text-gray-500 ml-2">${res.date}</span>
                </div>
                <div class="text-xs text-gray-400">${res.discipline}</div>
            </div>
        `;
    });
}

export function renderHomeAchievements(allResults, shooters) {
    const list = document.getElementById('recent-achievements-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Hitta de 5 senaste "prestationerna" (PB, ÅB, Märken)
    // Eftersom vi inte sparar prestationer som egna event, får vi leta i resultaten.
    // Vi filtrerar ut resultat som är "delade" och har isPB/isSB eller badges.
    
    const achievements = allResults.filter(r => r.sharedWithClub && (r.isPB || r.isSB || (r.earnedBadges && r.earnedBadges.length > 0)));
    
    // Sortera datum fallande
    achievements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    achievements.slice(0, 5).forEach(r => {
        const shooter = shooters.find(s => s.id === r.shooterId);
        if (!shooter) return;
        
        let text = '';
        let icon = '';
        
        if (r.isPB) { text = `nytt <strong>Personbästa</strong> (${r.total}p)`; icon = '🚀'; }
        else if (r.isSB) { text = `nytt <strong>Årsbästa</strong> (${r.total}p)`; icon = '📅'; }
        else if (r.earnedBadges && r.earnedBadges.length > 0) {
            text = `tog märket <strong>${r.earnedBadges[0]}</strong>`; icon = '🏆';
        }
        
        list.innerHTML += `
            <li class="flex items-start space-x-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                <span class="text-xl">${icon}</span>
                <div>
                    <span class="font-bold text-gray-800">${shooter.name}</span>
                    <span class="text-gray-600">sköt ${text}</span>
                    <div class="text-xs text-gray-400 mt-0.5">${r.date}</div>
                </div>
            </li>
        `;
    });
    
    if (list.innerHTML === '') {
        list.innerHTML = '<li class="text-gray-500 italic text-xs">Inga prestationer registrerade än.</li>';
    }
}