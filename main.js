// main.js
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, onSnapshot, serverTimestamp, deleteDoc, doc, query, where, getDocs, writeBatch, updateDoc, setDoc, getDoc as getFirestoreDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { createAdminUser, signInAdmin } from "./auth.js";

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

const newsAddBtn = document.getElementById('add-news-btn');
const eventAddBtn = document.getElementById('add-event-btn');
const historyAddBtn = document.getElementById('add-history-btn');
const addImageBtn = document.getElementById('add-image-btn');
const historyFormTitle = document.getElementById('history-form-title');
const newsFormTitle = document.getElementById('news-form-title');
const imageFormTitle = document.getElementById('image-form-title');


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
    
    if (modalId === 'errorModal' || modalId === 'confirmationModal') {
        setTimeout(() => hideModal(modalId), 4000);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
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

function getFirstImage(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstImage = tempDiv.querySelector('img');
    return firstImage ? firstImage.outerHTML : '';
}

function updateUI() {
    renderNews();
    renderEvents();
    renderHistory();
    renderImages();
    renderAdmins();

    const adminIndicator = document.getElementById('admin-indicator');
    const profileNavLink = document.getElementById('profile-nav-link');
    const userNavLink = document.getElementById('user-nav-link');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginPanel = document.getElementById('admin-login-panel');
    const newsEditSection = document.getElementById('news-edit-section');
    const calendarEditSection = document.getElementById('calendar-edit-section');
    const imageEditSection = document.getElementById('image-edit-section');
    const historyEditSection = document.getElementById('history-edit-section');

    if (currentUserId) {
        if (userNavLink) userNavLink.classList.add('hidden');
        if (profileNavLink) profileNavLink.classList.remove('hidden');
    } else {
        if (userNavLink) userNavLink.classList.remove('hidden');
        if (profileNavLink) profileNavLink.classList.add('hidden');
    }

    if (isAdminLoggedIn) {
        if (adminIndicator) adminIndicator.classList.remove('hidden');
        if (newsEditSection) newsEditSection.classList.remove('hidden');
        if (calendarEditSection) calendarEditSection.classList.remove('hidden');
        if (imageEditSection) imageEditSection.classList.remove('hidden');
        if (historyEditSection) historyEditSection.classList.remove('hidden');

        if (adminPanel) adminPanel.classList.remove('hidden');
        if (adminLoginPanel) adminLoginPanel.classList.add('hidden');
    } else {
        if (adminIndicator) adminIndicator.classList.add('hidden');
        if (newsEditSection) newsEditSection.classList.add('hidden');
        if (calendarEditSection) calendarEditSection.classList.add('hidden');
        if (imageEditSection) imageEditSection.classList.add('hidden');
        if (historyEditSection) historyEditSection.classList.add('hidden');
        
        if (adminPanel) adminPanel.classList.add('hidden');
        if (adminLoginPanel) adminLoginPanel.classList.remove('hidden');
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

    news.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
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
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = events.filter(e => e.date >= today);
    
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date)); 

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
            }, 500);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else {
        document.getElementById('hem').classList.add('active');
    }
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
            if (newsAddBtn) {
                newsAddBtn.textContent = 'Lägg till';
                newsAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                newsAddBtn.classList.add('bg-gray-400');
                newsAddBtn.disabled = true;
            }
            setTimeout(() => hideModal('confirmationModal'), 2000);
        } catch (error) {
            console.error("Fel vid hantering av nyhet:", error);
            showModal('errorModal', "Ett fel uppstod.", "Fel!");
        }
    });
}

const addHistoryForm = document.getElementById('add-history-form');
if (addHistoryForm) {
    addHistoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const historyTitle = document.getElementById('history-title').value;
        const historyContent = document.getElementById('history-content-editor').innerHTML;

        const historyObject = {
            title: historyTitle,
            content: historyContent,
            createdAt: editingHistoryId ? historyData.find(h => h.id === editingHistoryId).createdAt : serverTimestamp(),
            updatedAt: editingHistoryId ? serverTimestamp() : null
        };

        try {
            if (editingHistoryId) {
                await updateDoc(doc(db, 'history', editingHistoryId), historyObject);
                showModal('confirmationModal', "Huvudsidpost har uppdaterats!", "Lyckades!");
            } else {
                await addDoc(collection(db, 'history'), historyObject);
                showModal('confirmationModal', "Huvudsidpost har lagts till!", "Lyckades!");
            }

            addHistoryForm.reset();
            document.getElementById('history-content-editor').innerHTML = '';
            editingHistoryId = null;
            document.getElementById('history-form-title').textContent = 'Lägg till Huvudsidposter';
            if (historyAddBtn) {
                historyAddBtn.textContent = 'Lägg till';
                historyAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                historyAddBtn.classList.add('bg-gray-400');
                historyAddBtn.disabled = true;
            }
            setTimeout(() => hideModal('confirmationModal'), 2000);
        } catch (error) {
            console.error("Fel vid hantering av historiepost:", error);
            showModal('errorModal', "Ett fel uppstod.", "Fel!");
        }
    });
}

const addImageForm = document.getElementById('add-image-form');
if (addImageForm) {
    addImageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageTitle = document.getElementById('image-title').value;
        const imageUrl = document.getElementById('image-url').value;
        const imageYear = parseInt(document.getElementById('image-year').value);
        const imageMonth = parseInt(document.getElementById('image-month').value);
        
        const imageObject = {
            title: imageTitle,
            url: imageUrl,
            year: imageYear,
            month: imageMonth,
            createdAt: editingImageId ? imageData.find(i => i.id === editingImageId).createdAt : serverTimestamp(),
            updatedAt: editingImageId ? serverTimestamp() : null
        };

        try {
            if (editingImageId) {
                await updateDoc(doc(db, 'images', editingImageId), imageObject);
                showModal('confirmationModal', "Bilden har uppdaterats!", "Lyckades!");
            } else {
                await addDoc(collection(db, 'images'), imageObject);
                showModal('confirmationModal', "Bilden har lagts till!", "Lyckades!");
            }

            addImageForm.reset();
            editingImageId = null;
            document.getElementById('image-form-title').textContent = 'Lägg till Bild';
            if (addImageBtn) {
                addImageBtn.textContent = 'Lägg till Bild';
                addImageBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                addImageBtn.classList.add('bg-gray-400');
                addImageBtn.disabled = true;
            }
            setTimeout(() => hideModal('confirmationModal'), 2000);
        } catch (error) {
            console.error("Fel vid hantering av bild:", error);
            showModal('errorModal', "Ett fel uppstod när bilden skulle hanteras. Kontrollera dina Firebase Security Rules.", "Fel!");
        }
    });
}

const addAdminForm = document.getElementById('add-admin-form');
if (addAdminForm) {
    addAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-admin-username').value;
        const password = document.getElementById('new-admin-password').value;

        if (!username || !password) {
            showModal('errorModal', "Fyll i både användarnamn och lösenord.", "Fel!");
            return;
        }

        const result = await createAdminUser(username, password);
        if (result.success) {
            showModal('confirmationModal', result.message, "Lyckades!");
            addAdminForm.reset();
        } else {
            showModal('errorModal', result.message, "Fel!");
        }
    });
}

const loginBtn = document.getElementById('login-btn');
const adminUsernameInput = document.getElementById('admin-username');
const adminPasswordInput = document.getElementById('admin-password');
const logoutBtn = document.getElementById('logout-btn');

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const username = adminUsernameInput.value.trim();
        const password = adminPasswordInput.value.trim();

        if (!username || !password) {
            showModal('errorModal', "Fyll i både användarnamn och lösenord.", "Fel!");
            return;
        }

        const result = await signInAdmin(username, password);
        if (result.success) {
            showModal('confirmationModal', "Admin-inloggning lyckades!", "Välkommen!");
            navigate('#admin');
        } else {
            showModal('errorModal', "Fel användarnamn eller lösenord.", "Inloggning misslyckades");
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        isAdminLoggedIn = false;
        loggedInAdminUsername = '';
        navigate('#hem');
        updateUI();
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    onAuthStateChanged(auth, async (user) => {
        currentUserId = user ? user.uid : null;
        isAdminLoggedIn = false;
        loggedInAdminUsername = '';
        
        const profileNavLink = document.getElementById('profile-nav-link');
        const userNavLink = document.getElementById('user-nav-link');
        const adminIndicator = document.getElementById('admin-indicator');
        const profilePanel = document.getElementById('profile-panel');
        const userLoginPanel = document.getElementById('user-login-panel');
        const registerPanel = document.getElementById('register-panel');
        
        if (user) {
            if (profileNavLink) profileNavLink.classList.remove('hidden');
            if (userNavLink) userNavLink.classList.add('hidden');
            if (profilePanel) profilePanel.classList.remove('hidden');
            if (userLoginPanel) userLoginPanel.classList.add('hidden');
            if (registerPanel) registerPanel.classList.add('hidden');
            
            const adminsRef = collection(db, 'admins');
            const q = query(adminsRef, where('username', '==', user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                isAdminLoggedIn = true;
                loggedInAdminUsername = user.email;
                if (adminIndicator) adminIndicator.classList.remove('hidden');
            } else {
                if (adminIndicator) adminIndicator.classList.add('hidden');
            }
        } else {
            if (profileNavLink) profileNavLink.classList.add('hidden');
            if (userNavLink) userNavLink.classList.remove('hidden');
            if (profilePanel) profilePanel.classList.add('hidden');
            if (userLoginPanel) userLoginPanel.classList.remove('hidden');
            if (registerPanel) registerPanel.classList.add('hidden');
            if (adminIndicator) adminIndicator.classList.add('hidden');
        }
        updateUI();
    });

    onSnapshot(collection(db, 'news'), (snapshot) => { newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateUI(); });
    onSnapshot(collection(db, 'events'), (snapshot) => { eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateUI(); });
    onSnapshot(collection(db, 'admins'), (snapshot) => { adminsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateUI(); });
    onSnapshot(collection(db, 'history'), (snapshot) => { historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateUI(); });
    onSnapshot(collection(db, 'images'), (snapshot) => { imageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateUI(); });
    onSnapshot(doc(db, 'settings', 'siteSettings'), (docSnap) => {
        const siteTitleElement = document.getElementById('site-title-display');
        const pageTitleElement = document.getElementById('page-title');
        const faviconLink = document.getElementById('favicon-link');
        const siteLogoElement = document.getElementById('site-logo');
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (siteTitleElement) siteTitleElement.textContent = data.siteName || "Klubbens Webbplats";
            if (pageTitleElement) pageTitleElement.textContent = data.siteName || "Klubbens Webbplats";
            if (siteLogoElement) siteLogoElement.src = data.logoUrl || "logo.png";
            if (faviconLink) faviconLink.href = data.logoUrl || "logo.png";
        }
    });

    const closeErrorModal = document.getElementById('close-error-modal');
    if (closeErrorModal) closeErrorModal.addEventListener('click', () => hideModal('errorModal'));
    
    const errorModal = document.getElementById('errorModal');
    if (errorModal) errorModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideModal('errorModal'); });
    
    const confirmationModal = document.getElementById('confirmationModal');
    if (confirmationModal) confirmationModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideModal('confirmationModal'); });
    
    handleDeeplink();
    window.addEventListener('hashchange', handleDeeplink);

    document.addEventListener('click', (e) => {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const docId = likeBtn.getAttribute('data-id');
            const docType = likeBtn.getAttribute('data-type');
            handleLike(docId, docType);
        }

        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            const newsId = shareBtn.getAttribute('data-id');
            const newsTitle = newsData.find(n => n.id === newsId)?.title || 'Nyhet';
            const pageUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${pageUrl}#nyheter#news-${newsId}`;

            const shareModal = document.getElementById('shareModal');
            const shareMessageTitle = document.getElementById('share-message-title');
            const shareFacebookBtn = document.getElementById('share-facebook-btn');
            const copyLinkBtn = document.getElementById('copy-link-btn');
            const closeShareModalBtn = document.getElementById('close-share-modal');
            
            if (shareModal && shareMessageTitle && shareFacebookBtn && copyLinkBtn) {
                shareMessageTitle.textContent = newsTitle;
                shareFacebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                copyLinkBtn.onclick = () => {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        showModal('confirmationModal', "Länken har kopierats till urklipp!", "Lyckades!");
                        hideModal('shareModal');
                    }).catch(err => {
                        showModal('errorModal', "Kunde inte kopiera länken.", "Fel!");
                    });
                };
                if (closeShareModalBtn) {
                    closeShareModalBtn.addEventListener('click', () => hideModal('shareModal'));
                }
                shareModal.addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) hideModal('shareModal');
                });
                showModal('shareModal', '', 'Dela nyhet');
            }
        }
        
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const docId = deleteBtn.getAttribute('data-id');
            const docType = deleteBtn.getAttribute('data-type');
            deleteDocument(docId, docType);
        }

        const deleteAdminBtn = e.target.closest('.delete-admin-btn');
        if (deleteAdminBtn) {
            const adminId = deleteAdminBtn.getAttribute('data-id');
            deleteAdmin(adminId);
        }

        const editNewsBtn = e.target.closest('.edit-news-btn');
        if (editNewsBtn) {
            const newsId = editNewsBtn.getAttribute('data-id');
            const newsItem = newsData.find(n => n.id === newsId);
            if (newsItem) {
                editingNewsId = newsId;
                document.getElementById('news-title').value = newsItem.title;
                document.getElementById('news-content-editor').innerHTML = newsItem.content;
                document.getElementById('news-date').value = newsItem.date;
                newsFormTitle.textContent = 'Ändra Nyhet';
                newsAddBtn.textContent = 'Spara ändring';
                newsAddBtn.disabled = false;
                newsAddBtn.classList.remove('bg-gray-400');
                newsAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                navigate('#nyheter');
                setTimeout(() => {
                    document.getElementById('news-edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }

        const editHistoryBtn = e.target.closest('.edit-history-btn');
        if (editHistoryBtn) {
            const historyId = editHistoryBtn.getAttribute('data-id');
            const historyItem = historyData.find(h => h.id === historyId);
            if (historyItem) {
                editingHistoryId = historyId;
                document.getElementById('history-title').value = historyItem.title;
                document.getElementById('history-content-editor').innerHTML = historyItem.content;
                historyFormTitle.textContent = 'Ändra Huvudsidpost';
                historyAddBtn.textContent = 'Spara ändring';
                historyAddBtn.disabled = false;
                historyAddBtn.classList.remove('bg-gray-400');
                historyAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                navigate('#hem');
                setTimeout(() => {
                    document.getElementById('history-edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
        
        const editImageBtn = e.target.closest('.edit-image-btn');
        if (editImageBtn) {
            const imageId = editImageBtn.getAttribute('data-id');
            const imageItem = imageData.find(i => i.id === imageId);
            if (imageItem) {
                editingImageId = imageId;
                document.getElementById('image-title').value = imageItem.title;
                document.getElementById('image-url').value = imageItem.url;
                document.getElementById('image-year').value = imageItem.year;
                document.getElementById('image-month').value = imageItem.month;
                imageFormTitle.textContent = 'Ändra Bild';
                addImageBtn.textContent = 'Spara ändring';
                addImageBtn.disabled = false;
                addImageBtn.classList.remove('bg-gray-400');
                addImageBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                navigate('#bilder');
                setTimeout(() => {
                    document.getElementById('image-edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
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

    navigate(window.location.hash || '#hem');

    // Handle form input changes for enabling/disabling submit buttons
    const newsTitleInput = document.getElementById('news-title');
    const newsContentEditor = document.getElementById('news-content-editor');
    const historyTitleInput = document.getElementById('history-title');
    const historyContentEditor = document.getElementById('history-content-editor');
    const imageTitleInput = document.getElementById('image-title');
    const imageUrlInput = document.getElementById('image-url');
    const imageYearInput = document.getElementById('image-year');
    const imageMonthInput = document.getElementById('image-month');

    function checkNewsForm() {
        if (newsTitleInput.value && newsContentEditor.innerHTML.trim()) {
            newsAddBtn.disabled = false;
            newsAddBtn.classList.remove('bg-gray-400');
            newsAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
            newsAddBtn.disabled = true;
            newsAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            newsAddBtn.classList.add('bg-gray-400');
        }
    }
    
    function checkHistoryForm() {
        if (historyTitleInput.value && historyContentEditor.innerHTML.trim()) {
            historyAddBtn.disabled = false;
            historyAddBtn.classList.remove('bg-gray-400');
            historyAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
            historyAddBtn.disabled = true;
            historyAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            historyAddBtn.classList.add('bg-gray-400');
        }
    }

    function checkImageForm() {
        if (imageTitleInput.value && imageUrlInput.value && imageYearInput.value && imageMonthInput.value) {
            addImageBtn.disabled = false;
            addImageBtn.classList.remove('bg-gray-400');
            addImageBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
            addImageBtn.disabled = true;
            addImageBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            addImageBtn.classList.add('bg-gray-400');
        }
    }

    if (newsTitleInput) newsTitleInput.addEventListener('input', checkNewsForm);
    if (newsContentEditor) newsContentEditor.addEventListener('input', checkNewsForm);
    if (historyTitleInput) historyTitleInput.addEventListener('input', checkHistoryForm);
    if (historyContentEditor) historyContentEditor.addEventListener('input', checkHistoryForm);
    if (imageTitleInput) imageTitleInput.addEventListener('input', checkImageForm);
    if (imageUrlInput) imageUrlInput.addEventListener('input', checkImageForm);
    if (imageYearInput) imageYearInput.addEventListener('input', checkImageForm);
    if (imageMonthInput) imageMonthInput.addEventListener('input', checkImageForm);
});