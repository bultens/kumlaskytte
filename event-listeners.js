// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMedalForScore } from "./result-handler.js";
import { loadAndRenderChart } from "./statistics-chart.js"; // Viktig för diagrammet!

// Ver. RESTORED 2.0 (Komplett funktionalitet för Medlemssidor & Topplistor)
export let isAdminLoggedIn = false;
export let loggedInAdminUsername = '';

// --- 1. MODALER & SYSTEMMEDDELANDEN ---

export function showModal(modalId, message) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const messageEl = modal.querySelector('p');
    if (messageEl) messageEl.innerHTML = message;
    
    modal.classList.add('active');
    
    // Auto-stäng för bekräftelser och fel
    if (modalId === 'errorModal' || modalId === 'confirmationModal') {
        setTimeout(() => hideModal(modalId), 4000);
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

export function showUserInfoModal(user) {
    const modal = document.getElementById('userInfoModal');
    if (!modal) return;
    const content = `
        <div class="space-y-2">
            <h3 class="text-xl font-bold mb-4 text-blue-900 border-b pb-2">Användarinformation</h3>
            <p><strong class="w-24 inline-block">E-post:</strong> ${user.email}</p>
            <p><strong class="w-24 inline-block">Namn:</strong> ${user.username || '-'}</p>
            <p><strong class="w-24 inline-block">ID:</strong> <span class="font-mono text-xs bg-gray-100 p-1">${user.id}</span></p>
            <p><strong class="w-24 inline-block">Medlem:</strong> 
                <span class="${user.isMember ? 'text-green-600 font-bold' : 'text-red-600'}">${user.isMember ? 'Ja' : 'Nej'}</span>
            </p>
            <p><strong class="w-24 inline-block">Admin:</strong> ${user.isAdmin ? 'Ja' : 'Nej'}</p>
        </div>
    `;
    const container = document.getElementById('user-info-content');
    if (container) container.innerHTML = content;
    modal.classList.add('active');
}

export function showDeleteProfileModal() { 
    showModal('confirmationModal', "Är du säker? Detta raderar ditt konto och kopplar bort dina skyttar."); 
}

export function showShareModal(title, url) {
    const modal = document.getElementById('shareModal');
    if (modal) {
        const input = document.getElementById('share-url-input');
        if(input) input.value = url;
        modal.classList.add('active');
    }
}

// --- 2. EDITOR (TEXTREDIGERING) ---

export function applyEditorCommand(editor, command, value = null) {
    if(!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    updateToolbarButtons(editor);
}

export function updateToolbarButtons(editor) {
    // Kan utökas för att tända/släcka knappar i toolbaren (fetstil etc)
}

// --- 3. NAVIGATION & ADMIN CHECK ---

export async function handleAdminUI(user) {
    const adminLink = document.getElementById('nav-site-admin-link');
    const adminPanel = document.getElementById('site-admin-panel');
    const profilePanel = document.getElementById('profile-panel');
    const loginPanel = document.getElementById('user-login-panel');

    // Nollställ UI först
    if (adminLink) adminLink.classList.add('hidden');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

    if (user) {
        // Inloggad vy
        if(loginPanel) loginPanel.classList.add('hidden');
        if(profilePanel) profilePanel.classList.remove('hidden');

        try {
            // Hämta utökad info från databasen
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getFirestoreDoc(docRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // Admin-kontroll
                if (userData.isAdmin === true) {
                    isAdminLoggedIn = true;
                    loggedInAdminUsername = userData.username;
                    
                    if (adminLink) adminLink.classList.remove('hidden');
                    
                    // Visa alla admin-element
                    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
                    
                    const shootersAdmin = document.getElementById('shooters-admin-section');
                    if (shootersAdmin) shootersAdmin.classList.remove('hidden');
                } else {
                    isAdminLoggedIn = false;
                }
                
                // Uppdatera profil-info i headern/profilsidan direkt
                renderProfileInfo({
                    email: user.email,
                    username: userData.username,
                    role: isAdminLoggedIn ? 'Administratör' : 'Medlem'
                });
            }
        } catch (e) { 
            console.error("Admin check failed", e); 
        }
    } else {
        // Utloggad vy
        isAdminLoggedIn = false;
        if(loginPanel) loginPanel.classList.remove('hidden');
        if(profilePanel) profilePanel.classList.add('hidden');
    }
}

export function navigate(hash) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Hantera hash som "#sida" eller "#sida#undersida"
    const parts = hash.split('#'); // ['', 'sida', 'undersida']
    const mainPageId = parts[1] || 'hem';
    
    const targetPage = document.getElementById(mainPageId);
    
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    } else {
        document.getElementById('hem').classList.add('active');
    }

    // Uppdatera navigationens utseende
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'text-blue-200', 'bg-blue-800');
        const linkHref = link.getAttribute('href');
        // Enkel matchning
        if (linkHref === '#' + mainPageId) {
            link.classList.add('active', 'text-blue-200', 'bg-blue-800');
        }
    });
}

// --- 4. PUBLIC CONTENT RENDERING ---

export function renderNews(data, isAdmin, uid) {
    const container = document.getElementById('news-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Inga nyheter än.</p>';
        return;
    }

    data.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('sv-SE');
        const hasLiked = item.likedBy && item.likedBy.includes(uid);
        
        // Hantera bild
        let imageHtml = '';
        if (item.imageUrl) {
            imageHtml = `<img src="${item.imageUrl}" class="w-full h-64 object-cover rounded-t-lg mb-4 cursor-pointer" onclick="window.open('${item.imageUrl}', '_blank')">`;
        }

        container.innerHTML += `
            <div class="card mb-8 shadow-lg hover:shadow-xl transition duration-300" id="news-${item.id}">
                ${imageHtml}
                <div class="p-6">
                    <h3 class="text-3xl font-bold mb-2 text-blue-900">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-4 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        ${date}
                    </p>
                    <div class="text-gray-700 markdown-content leading-relaxed">${item.content}</div>
                    
                    <div class="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                        <div class="flex space-x-6">
                            <button class="like-btn flex items-center space-x-2 transition ${hasLiked ? 'text-blue-600 font-bold transform scale-110' : 'text-gray-500 hover:text-blue-500'}" data-id="${item.id}" data-liked="${hasLiked}">
                                <span class="text-xl">👍</span> <span class="like-count">${item.likes || 0}</span>
                            </button>
                            <button class="share-btn flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition" data-id="${item.id}" data-title="${item.title}">
                                <span class="text-xl">🔗</span> <span>Dela</span>
                            </button>
                        </div>
                        ${isAdmin ? `
                        <div class="flex space-x-3">
                            <button class="edit-news-btn px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium text-sm" data-id="${item.id}">Ändra</button>
                            <button class="delete-btn px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium text-sm" data-id="${item.id}" data-type="news">Ta bort</button>
                        </div>` : ''}
                    </div>
                </div>
            </div>`;
    });
}

export function renderEvents(data, isAdmin) {
    const container = document.getElementById('events-container');
    if (!container) return;
    container.innerHTML = '';
    
    const now = new Date();
    // Visa kommande samt återkommande
    const upcoming = data.filter(e => e.isRecurring || new Date(e.date) >= now);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Kalendern är tom just nu.</p>';
        return;
    }

    upcoming.forEach(item => {
        let dateDisplay = '';
        let badge = '';
        
        if (item.isRecurring) {
            const days = { 'monday': 'Måndag', 'tuesday': 'Tisdag', 'wednesday': 'Onsdag', 'thursday': 'Torsdag', 'friday': 'Fredag', 'saturday': 'Lördag', 'sunday': 'Söndag' };
            dateDisplay = `${days[item.weekday]}ar ${item.startTime}-${item.endTime}`;
            badge = `<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">Återkommande</span>`;
        } else {
            dateDisplay = new Date(item.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }) + ' kl ' + (item.time || '');
            dateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1); // Capitalize first letter
            badge = `<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">Händelse</span>`;
        }

        container.innerHTML += `
            <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-500 mb-4 hover:shadow-md transition">
                <div class="flex justify-between items-start">
                    <div class="w-full">
                        <div class="flex justify-between items-center mb-2">
                            ${badge}
                            ${isAdmin ? `<button class="delete-btn text-gray-400 hover:text-red-500 transition" data-id="${item.id}" data-type="events" title="Ta bort">✕</button>` : ''}
                        </div>
                        <h4 class="font-bold text-xl text-gray-900 mb-1">${item.title}</h4>
                        <p class="text-blue-600 font-medium mb-3 flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            ${dateDisplay}
                        </p>
                        <div class="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded">${item.description}</div>
                    </div>
                </div>
            </div>`;
    });
}

export function renderHistory(data, isAdmin) {
    const container = document.getElementById('history-timeline');
    if (!container) return;
    container.innerHTML = '';
    
    // Sortera: Senaste år först
    data.sort((a, b) => b.year - a.year);
    
    data.forEach(item => {
        container.innerHTML += `
            <div class="relative pl-8 border-l-2 border-blue-200 pb-10 last:pb-0 group">
                <div class="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-blue-500 border-4 border-white shadow group-hover:bg-blue-600 transition"></div>
                <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition relative">
                    <span class="text-blue-600 font-bold text-lg block mb-1">${item.year}</span>
                    <h3 class="text-xl font-bold mb-3 text-gray-800">${item.title}</h3>
                    <div class="text-gray-700 leading-relaxed">${item.content}</div>
                    ${isAdmin ? `
                        <div class="absolute top-4 right-4">
                            <button class="delete-btn text-xs text-red-400 hover:text-red-600 font-bold bg-red-50 px-2 py-1 rounded" data-id="${item.id}" data-type="history">Ta bort</button>
                        </div>
                    ` : ''}
                </div>
            </div>`;
    });
}

export function renderImages(data, isAdmin) {
    const container = document.getElementById('image-gallery-grid');
    if (!container) return;
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500">Inga bilder uppladdade.</p>';
        return;
    }

    data.forEach(item => {
        container.innerHTML += `
            <div class="relative group h-64 overflow-hidden rounded-xl shadow-md cursor-pointer bg-gray-100">
                <img src="${item.url}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" onclick="window.open('${item.url}', '_blank')">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                    <p class="text-white font-bold text-lg transform translate-y-4 group-hover:translate-y-0 transition duration-300">${item.title}</p>
                    <p class="text-gray-300 text-sm transform translate-y-4 group-hover:translate-y-0 transition duration-300 delay-75">${item.year || ''}</p>
                </div>
                
                ${isAdmin ? `
                    <div class="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition duration-300">
                         <button class="edit-image-btn bg-white p-2 rounded-full text-blue-600 shadow-lg hover:bg-blue-50" data-id="${item.id}" title="Ändra info">✏️</button>
                         <button class="delete-btn bg-white p-2 rounded-full text-red-600 shadow-lg hover:bg-red-50" data-id="${item.id}" data-type="images" title="Ta bort">🗑️</button>
                    </div>
                ` : ''}
            </div>`;
    });
}

export function renderSponsors(data, isAdmin) {
    const container = document.getElementById('sponsors-grid');
    if (!container) return;
    container.innerHTML = '';
    
    data.forEach(item => {
        container.innerHTML += `
            <div class="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
                <div class="h-24 w-full flex items-center justify-center mb-4">
                    <img src="${item.imageUrl}" class="max-h-full max-w-full object-contain filter grayscale hover:grayscale-0 transition duration-500">
                </div>
                <h4 class="font-bold text-center text-gray-800 mb-2">${item.name}</h4>
                ${item.website ? `<a href="${item.website}" target="_blank" class="text-sm text-blue-500 hover:text-blue-700 hover:underline">Besök hemsida &rarr;</a>` : ''}
                
                ${isAdmin ? `
                    <div class="mt-4 pt-4 border-t w-full flex justify-center space-x-3 opacity-50 hover:opacity-100 transition">
                        <button class="edit-sponsor-btn text-xs font-bold text-blue-600" data-id="${item.id}">Ändra</button>
                        <button class="delete-btn text-xs font-bold text-red-600" data-id="${item.id}" data-type="sponsors">Ta bort</button>
                    </div>
                ` : ''}
            </div>`;
    });
}

// --- 5. ADMIN LISTOR (USERS & KLASSER) ---

export function renderAdminsAndUsers(users, isAdmin, currentUid) {
    const adminList = document.getElementById('admin-users-list');
    const userList = document.getElementById('all-users-list');
    
    if (adminList) {
        adminList.innerHTML = '';
        users.filter(u => u.isAdmin).forEach(u => {
            adminList.innerHTML += `
                <li class="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded mb-2">
                    <span class="font-medium text-indigo-900">${u.username || u.email}</span>
                    ${u.id !== currentUid ? `<button class="delete-admin-btn text-xs text-red-600 hover:text-red-800 font-bold" data-id="${u.id}">Ta bort behörighet</button>` : '<span class="text-xs text-indigo-400 font-bold px-2">Du</span>'}
                </li>`;
        });
    }

    if (userList) {
        userList.innerHTML = '';
        users.forEach(u => {
            const memberClass = u.isMember ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
            userList.innerHTML += `
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 transition mb-2">
                    <div class="mb-2 sm:mb-0">
                        <div class="font-bold text-gray-800">${u.email}</div>
                        <div class="text-xs text-gray-500">Namn: ${u.username || '-'} | ID: <span class="font-mono">${u.id.substring(0,8)}...</span></div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button class="text-xs px-3 py-1 rounded-full font-bold ${memberClass} toggle-member-btn transition" data-id="${u.id}" data-status="${u.isMember}">
                            ${u.isMember ? '✅ Medlem' : '❌ Ej medlem'}
                        </button>
                        <button class="text-xs text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 show-user-info-btn" 
                            onclick="showUserInfoModal({email:'${u.email}', username:'${u.username}', id:'${u.id}', isMember:${u.isMember}, isAdmin:${u.isAdmin}})">
                            Info
                        </button>
                        ${!u.isAdmin ? `<button class="text-xs text-white bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700 add-admin-btn" data-id="${u.id}">+ Admin</button>` : ''}
                    </div>
                </div>`;
        });
    }
}

export function renderShootersAdmin(shooters) {
    const container = document.getElementById('admin-shooters-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (shooters.length === 0) { 
        container.innerHTML = '<p class="text-gray-500 p-4 text-center">Inga skyttar registrerade i systemet.</p>'; 
        return; 
    }

    shooters.forEach(shooter => {
        const hasParent = shooter.parentUserIds && shooter.parentUserIds.length > 0;
        const borderColor = hasParent ? 'border-green-500' : 'border-red-500';
        const bgStatus = hasParent ? 'bg-white' : 'bg-red-50';

        container.innerHTML += `
            <div class="flex items-center justify-between p-4 ${bgStatus} border-l-4 ${borderColor} rounded shadow-sm mb-3">
                <div>
                    <h4 class="font-bold text-gray-900">${shooter.name}</h4>
                    <p class="text-sm text-gray-600">Född: ${shooter.birthYear} | Klubb: ${shooter.club}</p>
                    ${!hasParent ? '<p class="text-xs text-red-600 font-bold mt-1">⚠️ Saknar föräldrakonto!</p>' : ''}
                </div>
                <div class="flex flex-col space-y-1">
                    ${!hasParent ? `<button class="link-parent-btn bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 mb-1" data-id="${shooter.id}" data-name="${shooter.name}">Koppla</button>` : ''}
                    <button class="delete-btn text-red-500 hover:text-red-700 text-xs font-bold" data-id="${shooter.id}" data-type="shooters">Ta bort profil</button>
                </div>
            </div>`;
    });
}

export function renderClassesAdmin(classes) {
    const container = document.getElementById('admin-classes-list');
    if (!container) return;
    container.innerHTML = '';
    
    // Sortera: Yngsta först
    classes.sort((a,b) => a.minAge - b.minAge);

    classes.forEach(cls => {
        let discLabel = cls.discipline === 'sitting' ? 'Sittande' : 'Stående';
        container.innerHTML += `
            <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-3 hover:border-blue-300 transition">
                <div>
                    <h4 class="font-bold text-lg text-blue-900">${cls.name}</h4>
                    <p class="text-sm text-gray-600">
                        <span class="font-mono bg-gray-100 px-1 rounded">${cls.minAge}-${cls.maxAge} år</span> • ${discLabel}
                    </p>
                    ${cls.description ? `<p class="text-xs text-gray-500 mt-1 italic">"${cls.description}"</p>` : ''}
                </div>
                <div class="flex space-x-2">
                    <button class="edit-class-btn text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-bold mr-2 text-sm" data-obj='${JSON.stringify(cls)}'>Ändra</button>
                    <button class="delete-btn text-red-600 hover:bg-red-50 px-2 py-1 rounded font-bold text-sm" data-id="${cls.id}" data-type="competitionClasses">Ta bort</button>
                </div>
            </div>`;
    });
}

// --- 6. MINA SIDOR & RESULTATHANTERING (Återställd detaljvy) ---

export function renderProfileInfo(user) {
    // Uppdatera sidhuvudet i profilen
    const nameDisplay = document.getElementById('profile-name-display');
    const roleDisplay = document.getElementById('profile-role-display');
    if(nameDisplay) nameDisplay.textContent = user.username || user.email;
    if(roleDisplay) roleDisplay.textContent = user.role;

    // Fyll i "Redigera profil"-formuläret
    const emailInput = document.getElementById('profile-email-display');
    const nameInput = document.getElementById('profile-name-input');
    if(emailInput) emailInput.value = user.email;
    if(nameInput) nameInput.value = user.username || '';
}

export function renderShooterSelector(shooters) {
    // Uppdatera alla dropdowns som väljer skytt (både på Profilen och ev. andra ställen)
    const selectors = [
        document.getElementById('shooter-selector'),       // För filtrering på Mina Sidor
        document.getElementById('result-shooter-selector') // För att rapportera resultat
    ];
    
    const myShooters = shooters.filter(s => s.parentUserIds && s.parentUserIds.includes(auth.currentUser?.uid));
    
    selectors.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Välj skytt...</option>';
        myShooters.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
        
        // Återställ val om möjligt
        if (currentVal && myShooters.find(s => s.id === currentVal)) {
            select.value = currentVal;
        } else if (myShooters.length === 1) {
            select.value = myShooters[0].id; // Auto-välj om man bara har en skytt
        }
    });
}

// Funktion för att rita ut hela profil-sidan (Knyter ihop säcken)
export function renderProfilePage(results, shooters, users) {
    // 1. Filtrera resultat för inloggad användare (där 'registeredBy' == uid)
    // Eller hellre: Visa resultat för mina skyttar.
    const myShooterIds = shooters.filter(s => s.parentUserIds.includes(auth.currentUser.uid)).map(s => s.id);
    
    // Filtrera resultaten så vi bara ser de som tillhör mina skyttar
    const myResults = results.filter(r => myShooterIds.includes(r.shooterId));
    
    // 2. Rendera tabellen
    renderMyResultsTable(myResults, shooters);
    
    // 3. Uppdatera grafen (om en skytt är vald i dropdown)
    const selector = document.getElementById('shooter-selector');
    if (selector && selector.value) {
        loadAndRenderChart(selector.value);
    }
}

// Den detaljerade tabellen som saknades!
function renderMyResultsTable(results, shooters) {
    const container = document.getElementById('my-results-list'); // Se till att denna ID finns i HTML (under Mina Sidor -> Statistik)
    if (!container) return;
    
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Inga resultat registrerade ännu.</td></tr>';
        return;
    }

    // Sortera datum fallande
    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    results.forEach(res => {
        const shooter = shooters.find(s => s.id === res.shooterId);
        const name = shooter ? shooter.name : 'Okänd';
        const date = new Date(res.date).toLocaleDateString('sv-SE');
        const type = res.type === 'competition' ? '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">Tävling</span>' : '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">Träning</span>';
        
        container.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 text-sm">${date}</td>
                <td class="p-3 font-medium">${name}</td>
                <td class="p-3">${type}</td>
                <td class="p-3 font-bold text-blue-900">${res.total}p</td>
                <td class="p-3 text-right">
                    <button class="delete-btn text-red-400 hover:text-red-600 p-1" data-id="${res.id}" data-type="results" title="Ta bort resultat">✕</button>
                </td>
            </tr>
        `;
    });
}


// --- 7. TOPPLISTOR & REKORD (Återställd logik) ---

export function renderTopLists(classes, results, shooters, users) {
    const container = document.getElementById('toplist-container');
    const recordContainer = document.getElementById('record-container');
    
    if (container) container.innerHTML = '';
    if (recordContainer) recordContainer.innerHTML = '';

    if (!container || results.length === 0) return;

    // Vi måste gruppera resultat per klass.
    // Eftersom vi inte sparar 'classId' direkt i resultatet (ännu), måste vi gissa klassen baserat på ålder.
    // Detta görs enklast genom att iterera klasserna och hitta skyttar som passar.
    
    classes.forEach(cls => {
        // Hitta resultat som passar i denna klass
        const classResults = results.filter(res => {
            const shooter = shooters.find(s => s.id === res.shooterId);
            if (!shooter) return false;
            
            // Kolla gren (Sittande/Stående) - detta kräver att vi vet vad resultatet sköts i.
            // För nu antar vi att alla resultat matchar klassens gren om inte annat anges.
            // (Detta kan behöva förfinas om ni skjuter både sitt och stå)
            
            // Kolla ålder
            const thisYear = new Date().getFullYear();
            const age = thisYear - shooter.birthYear;
            return age >= cls.minAge && age <= cls.maxAge;
        });

        if (classResults.length === 0) return;

        // Sortera (Högst poäng först)
        classResults.sort((a, b) => b.total - a.total);

        // Skapa HTML för klassen
        let html = `
            <div class="mb-8 bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                <div class="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 flex justify-between items-center">
                    <h3 class="font-bold text-lg">${cls.name}</h3>
                    <span class="text-xs bg-blue-700 px-2 py-1 rounded text-blue-100">${cls.discipline === 'sitting' ? 'Sittande' : 'Stående'}</span>
                </div>
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-600 font-bold border-b">
                        <tr>
                            <th class="p-3 w-12">#</th>
                            <th class="p-3">Skytt</th>
                            <th class="p-3">Datum</th>
                            <th class="p-3 text-right">Poäng</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
        `;

        // Visa topp 5
        classResults.slice(0, 5).forEach((res, index) => {
            const shooter = shooters.find(s => s.id === res.shooterId);
            const date = new Date(res.date).toLocaleDateString('sv-SE');
            
            let rank = `<span class="font-mono text-gray-500">${index + 1}</span>`;
            if (index === 0) rank = '🥇';
            if (index === 1) rank = '🥈';
            if (index === 2) rank = '🥉';

            html += `
                <tr class="hover:bg-blue-50 transition">
                    <td class="p-3 text-center">${rank}</td>
                    <td class="p-3 font-medium text-gray-800">${shooter ? shooter.name : 'Okänd'}</td>
                    <td class="p-3 text-gray-500 text-xs">${date}</td>
                    <td class="p-3 text-right font-bold text-blue-900">${res.total}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        container.innerHTML += html;

        // --- KLUBBREKORD ---
        // Rekordet är helt enkelt den högsta poängen i klassen
        const record = classResults[0];
        if (recordContainer && record) {
            const shooter = shooters.find(s => s.id === record.shooterId);
            recordContainer.innerHTML += `
                <div class="flex items-center justify-between p-3 bg-white border-b border-gray-100 last:border-0 hover:bg-yellow-50 transition">
                    <div>
                        <span class="text-xs font-bold text-gray-400 uppercase block tracking-wider">${cls.name}</span>
                        <span class="font-bold text-gray-800">${shooter ? shooter.name : 'Okänd'}</span>
                        <span class="text-xs text-gray-500 ml-2">${new Date(record.date).toLocaleDateString('sv-SE')}</span>
                    </div>
                    <div class="flex items-center">
                        <span class="text-xl mr-2">🏆</span>
                        <span class="text-lg font-bold text-blue-900">${record.total}p</span>
                    </div>
                </div>
            `;
        }
    });
}

// "Senaste Nytt" på startsidan (Resultat)
export function renderHomeAchievements(results, shooters, users) {
    const container = document.getElementById('home-latest-results');
    if (!container) return;
    container.innerHTML = '';
    
    if (results.length === 0) { 
        container.innerHTML = '<p class="text-gray-400 italic text-sm">Inga resultat inrapporterade ännu.</p>'; 
        return; 
    }
    
    // Topp 5 senaste
    results.slice(0, 5).forEach(res => {
        const shooter = shooters.find(s => s.id === res.shooterId);
        container.innerHTML += `
            <div class="flex items-center justify-between py-2 border-b border-blue-800/30 last:border-0">
                <div>
                    <span class="font-bold text-blue-100 block text-sm">${shooter ? shooter.name : 'Okänd'}</span>
                    <span class="text-xs text-blue-300">${new Date(res.date).toLocaleDateString('sv-SE')}</span>
                </div>
                <div class="font-mono font-bold text-white text-lg bg-blue-800/50 px-2 py-1 rounded">${res.total}p</div>
            </div>`;
    });
}

// --- 8. ÖVRIGT (Settings, Filer etc) ---

export function renderSiteSettings(settings) {
    if (!settings || !settings.design) return;
    document.getElementById('header-color-input').value = settings.design.headerColor || '#1e3a8a';
    document.getElementById('show-sponsors-checkbox').checked = settings.design.showSponsors || false;
    document.getElementById('logo-url-input').value = settings.design.logoUrl || '';
    document.getElementById('contact-address-input').value = settings.design.contactAddress || '';
    document.getElementById('contact-email-input').value = settings.design.contactEmail || '';
}

export function updateHeaderColor(color) { 
    const header = document.querySelector('header'); 
    if (header && color) header.style.backgroundColor = color; 
}

export function toggleSponsorsNavLink(show) { 
    const link = document.getElementById('nav-sponsors-link'); 
    if (link) show ? link.classList.remove('hidden') : link.classList.add('hidden'); 
}

export function renderContactInfo() {
    // Placeholder om vi vill rendera footer-info dynamiskt
}

export function renderDocumentArchive(docs) {
    const container = document.getElementById('document-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (docs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm italic">Inga dokument.</p>';
        return;
    }

    docs.forEach(doc => {
         // Ikon baserat på filtyp
         let icon = '📄';
         if (doc.fileType?.includes('pdf')) icon = '📕';
         else if (doc.fileType?.includes('word')) icon = '📘';
         else if (doc.fileType?.includes('sheet')) icon = '📗';

         const date = doc.uploadedAt?.toDate ? doc.uploadedAt.toDate().toLocaleDateString('sv-SE') : 'Nyss';

         container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 mb-2 hover:border-blue-300 transition">
                <a href="${doc.url}" target="_blank" class="flex items-center text-blue-700 hover:underline group">
                    <span class="text-xl mr-3 group-hover:scale-110 transition">${icon}</span>
                    <div class="flex flex-col">
                        <span class="font-medium">${doc.name}</span>
                        <span class="text-xs text-gray-400">${date} • ${doc.category}</span>
                    </div>
                </a>
                <button class="delete-btn text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition" data-id="${doc.id}" data-type="documents" title="Radera">🗑️</button>
            </div>`;
    });
}