// main.js
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, onSnapshot, serverTimestamp, deleteDoc, doc, query, where, getDocs, writeBatch, updateDoc, setDoc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


let isAdminLoggedIn = false;
let loggedInAdminUsername = '';
let newsData = [];
let eventsData = [];
let adminsData = [];
let historyData = [];
let imageData = []; 
let editingNewsId = null; 
let editingHistoryId = null;
let editingImageId = null;
let currentUserId = null;
let newsAddBtn, eventAddBtn, historyAddBtn, addImageBtn, historyFormTitle, newsFormTitle, imageFormTitle;

// --- MODAL FUNCTIONS ---
function showModal(modalId, message, title) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const messageEl = modal.querySelector('p');
    const titleEl = modal.querySelector('h3');
    if (messageEl) {
        messageEl.innerHTML = message;
    }
    if (titleEl) {
        titleEl.textContent = title;
    }
    
    modal.classList.add('active');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
}

// Function to extract the first line of text from HTML content
function getFirstLineText(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstChild = tempDiv.firstElementChild;
    if (firstChild && firstChild.tagName === 'P') {
        return firstChild.textContent;
    }
    return tempDiv.textContent.split('\n')[0].trim();
}

// Function to extract the first image from HTML content
function getFirstImage(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstImage = tempDiv.querySelector('img');
    return firstImage ? firstImage.outerHTML : '';
}

// En central funktion för att uppdatera alla UI-delar som beror på inloggningsstatus
function updateUI() {
    renderNews();
    renderEvents();
    renderHistory();
    renderImages();
    renderAdmins();

    // Hantera synligheten för adminindikatorn
    const adminIndicator = document.getElementById('admin-indicator');
    if (adminIndicator) {
        if (isAdminLoggedIn) {
            adminIndicator.classList.remove('hidden');
            // Visa redigeringssektionerna på de olika sidorna
            document.getElementById('news-edit-section').classList.remove('hidden');
            document.getElementById('calendar-edit-section').classList.remove('hidden');
            document.getElementById('image-edit-section').classList.remove('hidden');
            document.getElementById('history-edit-section').classList.remove('hidden');
        } else {
            adminIndicator.classList.add('hidden');
            // Dölj redigeringssektionerna
            document.getElementById('news-edit-section').classList.add('hidden');
            document.getElementById('calendar-edit-section').classList.add('hidden');
            document.getElementById('image-edit-section').classList.add('hidden');
            document.getElementById('history-edit-section').classList.add('hidden');
        }
    }
}

// --- CONTENT RENDERING ---
function renderNews() {
    const news = newsData;
    const homeNewsContainer = document.getElementById('home-news-container');
    const allNewsContainer = document.getElementById('all-news-container');

    if (!homeNewsContainer || !allNewsContainer) return;

    homeNewsContainer.innerHTML = '';
    allNewsContainer.innerHTML = '';

    // Sortera nyheterna efter det angivna datumet
    news.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
    // Render the 2 latest news items on the home page
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


        homeNewsContainer.innerHTML += `
            <div class="card flex items-start news-post home-news-post cursor-pointer" data-id="${item.id}">
                ${imageHtml}
                <div class="flex-grow">
                    <h3 class="text-2xl font-semibold mb-1">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">Publicerad: ${formattedDate}</p>
                    <div class="text-gray-700 markdown-content">${shortContent}</div>
                </div>
            </div>
        `;
    });

    // Render all news items on the news page
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

function renderEvents() {
    const events = eventsData;
    const calendarContainer = document.getElementById('calendar-container');
    const homeEventsContainer = document.getElementById('home-events-container');

    if (!calendarContainer || !homeEventsContainer) return;

    calendarContainer.innerHTML = '';
    homeEventsContainer.innerHTML = '';
    
    // Sortera händelser efter datum och filtrera bort gamla händelser
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = events.filter(e => e.date >= today);
    
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date)); 

    // Rendera de 2 närmaste kommande händelserna på startsidan
    upcomingEvents.slice(0, 2).forEach(item => {
        const eventDate = new Date(item.date);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleString('sv-SE', { month: 'short' });
        
        homeEventsContainer.innerHTML += `
            <div class="card flex items-start calendar-post home-calendar-post" data-id="${item.id}">
                <div class="flex-shrink-0 bg-blue-500 text-white font-bold p-4 rounded-lg text-center mr-4">
                    <p class="text-xl leading-none">${day}</p>
                    <p class="text-xs uppercase">${month}</p>
                </div>
                <div class="flex-grow">
                    <h3 class="text-2xl font-semibold mb-1">${item.title}</h3>
                </div>
            </div>
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

    // Attach event listeners for calendar posts
    document.querySelectorAll('.calendar-post').forEach(post => {
        post.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
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

function renderHistory() {
    const historyContainer = document.getElementById('home-history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    historyData.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(a.date);
        const dateB = b.createdAt?.toDate() || new Date(b.date);
        return dateB - dateA;
    });
    
    historyData.forEach(item => {
        const date = item.createdAt?.toDate() || new Date(item.date);
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
                    ${isAdminLoggedIn ? `
                        <button class="delete-btn px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-300" data-id="${item.id}" data-type="history">Ta bort</button>
                        <button class="edit-history-btn px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition duration-300" data-id="${item.id}">Ändra</button>
                    ` : ''}
                </div>
            </div>
        `;
    });
}

function renderImages() {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = '';
    
    imageData.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1);
        const dateB = new Date(b.year, b.month - 1);
        return dateB - dateA;
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

function renderAdmins() {
    const admins = adminsData;
    const adminListEl = document.getElementById('admin-list');
    if (!adminListEl) return;
    
    adminListEl.innerHTML = '';
    admins.forEach(admin => {
        const adminEl = document.createElement('div');
        adminEl.className = 'flex items-center justify-between p-2 bg-gray-100 rounded-lg';
        adminEl.innerHTML = `
            <span class="font-semibold">${admin.username}</span>
            ${isAdminLoggedIn && admins.length > 1 && admin.username !== loggedInAdminUsername ? `<button class="delete-admin-btn text-red-500 hover:text-red-700 transition duration-300 text-sm" data-id="${admin.id}">Ta bort</button>` : ''}
        `;
        adminListEl.appendChild(adminEl);
    });
}

function applyEditorCommand(editor, command, value = null) {
    editor.focus();
    document.execCommand(command, false, value);
}

function updateToolbarButtons(editor) {
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

async function handleLike(docId, collectionName) {
    if (!currentUserId) {
        showModal('errorModal', "Du måste vara inloggad för att gilla poster.", "Fel!");
        return;
    }
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getFirestoreDoc(docRef);
    if (!docSnap.exists()) {
        console.error("Dokumentet finns inte:", docId);
        return;
    }
    const data = docSnap.data();
    const likes = data.likes || {};

    if (likes[currentUserId]) {
        delete likes[currentUserId];
    } else {
        likes[currentUserId] = true;
    }

    try {
        await updateDoc(docRef, { likes: likes });
    } catch (error) {
        console.error("Fel vid uppdatering av likes:", error);
        showModal('errorModal', "Ett fel uppstod när like-funktionen skulle uppdateras.", "Fel!");
    }
}

async function deleteDocument(docId, collectionName) {
    if (!db || !isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.", "Fel!");
        return;
    }
    const docRef = doc(db, collectionName, docId);
    try {
        await deleteDoc(docRef);
        showModal('confirmationModal', `Posten har tagits bort från ${collectionName}.`, "Lyckades!");
        setTimeout(() => hideModal('confirmationModal'), 2000);
        updateUI();
    } catch (error) {
        console.error("Fel vid borttagning av post:", error);
        showModal('errorModal', "Ett fel uppstod när posten skulle tas bort. Kontrollera dina Firebase Security Rules.", "Fel!");
    }
}

async function deleteAdmin(adminId) {
    if (!db || !isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.", "Fel!");
        return;
    }
    if (adminsData.length <= 1) {
        showModal('errorModal', "Kan inte ta bort den sista administratören.", "Fel!");
        return;
    }
    const adminToDelete = adminsData.find(a => a.id === adminId);
    if (adminToDelete.username === loggedInAdminUsername) {
        showModal('errorModal', "Du kan inte ta bort dig själv.", "Fel!");
        return;
    }
    const adminRef = doc(db, 'admins', adminId);
    try {
        await deleteDoc(adminRef);
        showModal('confirmationModal', "Admin har tagits bort.", "Lyckades!");
        setTimeout(() => hideModal('confirmationModal'), 2000);
        updateUI();
    } catch (error) {
        console.error("Fel vid borttagning av admin:", error);
        showModal('errorModal', "Ett fel uppstod när admin skulle tas bort.", "Fel!");
    }
}

function navigate(hash) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const hashParts = hash.split('#');
    const targetPageId = hashParts[1];
    const targetElementId = hashParts[2];
    
    const targetPage = document.querySelector(`#${targetPageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
        if (targetElementId) {
            setTimeout(() => {
                const targetElement = document.getElementById(targetElementId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else {
        document.getElementById('hem').classList.add('active');
    }
}

function getFirstImage(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstImage = tempDiv.querySelector('img');
    return firstImage ? firstImage.outerHTML : '';
}

function getFirstLineText(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstChild = tempDiv.firstElementChild;
    if (firstChild && firstChild.tagName === 'P') {
        return firstChild.textContent;
    }
    return tempDiv.textContent.split('\n')[0].trim();
}

function handleDeeplink() {
    const hash = window.location.hash;
    if (hash && hash.includes('#news-')) {
        const parts = hash.split('#');
        const targetPageId = parts[1];
        const targetElementId = parts[2];

        if (targetPageId && targetElementId) {
            navigate(`#${targetPageId}`);
            setTimeout(() => {
                const targetElement = document.getElementById(targetElementId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    onAuthStateChanged(auth, async (user) => {
        currentUserId = user ? user.uid : null;
        isAdminLoggedIn = false;
        loggedInAdminUsername = '';
        const profileNavLink = document.getElementById('profile-nav-link');

        if (user) {
            profileNavLink.classList.remove('hidden');
            const adminsRef = collection(db, 'admins');
            const q = query(adminsRef, where('username', '==', user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                isAdminLoggedIn = true;
                loggedInAdminUsername = user.email;
            }
        } else {
            profileNavLink.classList.add('hidden');
        }
        updateUI();
    });

    // --- Data fetching ---
    const newsRef = collection(db, `news`);
    onSnapshot(newsRef, (snapshot) => {
        newsData = [];
        snapshot.forEach(doc => {
            newsData.push({ id: doc.id, ...doc.data() });
        });
        updateUI();
    });

    const eventsRef = collection(db, `events`);
    onSnapshot(eventsRef, (snapshot) => {
        eventsData = [];
        snapshot.forEach(doc => {
            eventsData.push({ id: doc.id, ...doc.data() });
        });
        updateUI();
    });

    const adminsRef = collection(db, `admins`);
    onSnapshot(adminsRef, (snapshot) => {
        adminsData = [];
        snapshot.forEach(doc => {
            adminsData.push({ id: doc.id, ...doc.data() });
        });
        updateUI();
    });

    const historyRef = collection(db, `history`);
    onSnapshot(historyRef, (snapshot) => {
        historyData = [];
        snapshot.forEach(doc => {
            historyData.push({ id: doc.id, ...doc.data() });
        });
        updateUI();
    });

    const imageRef = collection(db, `images`);
    onSnapshot(imageRef, (snapshot) => {
        imageData = [];
        snapshot.forEach(doc => {
            imageData.push({ id: doc.id, ...doc.data() });
        });
        updateUI();
    });

    const settingsCollection = 'settings';
    const siteSettingsRef = doc(db, settingsCollection, 'siteSettings');
    onSnapshot(siteSettingsRef, (docSnap) => {
        const siteTitleElement = document.getElementById('site-title-display');
        const pageTitleElement = document.getElementById('page-title');
        const faviconLink = document.getElementById('favicon-link');
        const siteLogoElement = document.getElementById('site-logo');
        const logoUrlInput = document.getElementById('logo-url-input');
        const siteNameInput = document.getElementById('site-name-input');
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (siteTitleElement) siteTitleElement.textContent = data.siteName || "Klubbens Webbplats";
            if (pageTitleElement) pageTitleElement.textContent = data.siteName || "Klubbens Webbplats";
            if (siteLogoElement) siteLogoElement.src = data.logoUrl || "logo.png";
            if (faviconLink) faviconLink.href = data.logoUrl || "logo.png";
            if (logoUrlInput) logoUrlInput.value = data.logoUrl || '';
            if (siteNameInput) siteNameInput.value = data.siteName || '';
        }
    });

    updateUI();

    // --- Event Listeners ---
    document.addEventListener('click', (e) => {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const docId = likeBtn.getAttribute('data-id');
            const docType = likeBtn.getAttribute('data-type');
            handleLike(docId, docType);
        }
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const docId = deleteBtn.getAttribute('data-id');
            const docType = deleteBtn.getAttribute('data-type');
            deleteDocument(docId, docType);
        }
        const editNewsBtn = e.target.closest('.edit-news-btn');
        if (editNewsBtn) {
            const docId = editNewsBtn.getAttribute('data-id');
            const newsItem = newsData.find(item => item.id === docId);
            if (newsItem) {
                document.getElementById('news-form-title').textContent = 'Ändra Nyhet';
                document.getElementById('news-title').value = newsItem.title;
                document.getElementById('news-content-editor').innerHTML = newsItem.content;
                document.getElementById('news-date').value = newsItem.date;
                editingNewsId = docId;
                document.getElementById('add-news-btn').textContent = 'Spara ändringar';
                navigate('#nyheter');
                document.getElementById('news-edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = e.target.getAttribute('href');
            history.pushState(null, '', hash);
            navigate(hash);
        });
    });

    window.addEventListener('popstate', () => {
        navigate(window.location.hash || '#hem');
    });

    handleDeeplink();

    // --- Forms ---
    const addNewsForm = document.getElementById('add-news-form');
    if (addNewsForm) {
        addNewsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newsTitle = document.getElementById('news-title').value;
            const newsContent = document.getElementById('news-content-editor').innerHTML;
            const newsDate = document.getElementById('news-date').value;
            
            const newsObject = {
                title: newsTitle,
                content: newsContent,
                date: newsDate,
                createdAt: editingNewsId ? newsData.find(n => n.id === editingNewsId).createdAt : serverTimestamp(),
                updatedAt: editingNewsId ? serverTimestamp() : null
            };

            try {
                if (editingNewsId) {
                    await updateDoc(doc(db, 'news', editingNewsId), newsObject);
                    showModal('confirmationModal', "Nyhet har uppdaterats!", "Lyckades!");
                } else {
                    await addDoc(collection(db, `news`), newsObject);
                    showModal('confirmationModal', "Nyhet har lagts till!", "Lyckades!");
                }
                
                addNewsForm.reset();
                document.getElementById('news-content-editor').innerHTML = '';
                document.getElementById('news-date').value = new Date().toISOString().split('T')[0];
                editingNewsId = null;
                document.getElementById('news-form-title').textContent = 'Lägg till Nyhet';
                document.getElementById('add-news-btn').textContent = 'Lägg till';
                setTimeout(() => hideModal('confirmationModal'), 2000);
            } catch (error) {
                console.error("Fel vid hantering av nyhet:", error);
                showModal('errorModal', "Ett fel uppstod.", "Fel!");
            }
        });
    }
});