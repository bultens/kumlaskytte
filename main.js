// main.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { getUserRole } from "./data-service.js";
import { 
    showPage, 
    showModal, 
    renderNews, 
    renderEvents, 
    renderHistory, 
    renderSponsors, 
    renderGallery, 
    renderProfileData,
    renderShootersAdminList // <--- TILLAGD: Importerad från ui-handler.js
} from "./ui-handler.js";
import { initEventListeners } from "./event-listeners.js";
import { initFileManager } from "./admin-documents.js";

// Globalt tillstånd för inloggning
window.isAdminLoggedIn = false;

/**
 * Huvudfunktion för att visa en sida och ladda dess data
 */
export async function handleNavigation(pageId) {
    showPage(pageId); // Visar rätt sektion i HTML

    // Ladda specifik data beroende på vilken sida som visas
    if (pageId === 'home') {
        renderNews();
        renderSponsors();
    } else if (pageId === 'admin') {
        // Om användaren inte är admin (kontrolleras i ui-handler), 
        // kommer dessa funktioner att avbrytas säkert
        renderNews();
        renderEvents();
        renderHistory();
        renderSponsors();
        renderGallery();
        renderShootersAdminList(); // <--- TILLAGD: Laddar listan över skyttar
        initFileManager();
    } else if (pageId === 'events') {
        renderEvents();
    } else if (pageId === 'history') {
        renderHistory();
    } else if (pageId === 'gallery') {
        renderGallery();
    } else if (pageId === 'profile') {
        renderProfileData();
    }
}

/**
 * Initiera applikationen vid start
 */
function init() {
    // 1. Lyssna på Auth-ändringar
    onAuthStateChanged(auth, async (user) => {
        const adminIndicator = document.getElementById('admin-indicator');
        const adminLink = document.getElementById('nav-admin');
        const loginBtn = document.getElementById('nav-login');
        const profileBtn = document.getElementById('nav-profile');

        if (user) {
            // Hämta roll från Firestore
            const userRole = await getUserRole(user.uid);
            const isAdmin = userRole === 'admin';
            window.isAdminLoggedIn = isAdmin;

            if (isAdmin) {
                if (adminIndicator) adminIndicator.classList.remove('hidden');
                if (adminLink) adminLink.classList.remove('hidden');
            }

            if (loginBtn) loginBtn.classList.add('hidden');
            if (profileBtn) profileBtn.classList.remove('hidden');
            
            // Om vi råkar stå på admin-sidan vid inloggning, ladda listan direkt
            const activePage = document.querySelector('.page.active');
            if (activePage && activePage.id === 'admin' && isAdmin) {
                renderShootersAdminList();
            }
        } else {
            // Återställ UI vid utloggning
            window.isAdminLoggedIn = false;
            if (adminIndicator) adminIndicator.classList.add('hidden');
            if (adminLink) adminLink.classList.add('hidden');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (profileBtn) profileBtn.classList.add('hidden');
            
            // Skicka användaren till startsidan om de loggar ut från en skyddad sida
            const activePage = document.querySelector('.page.active');
            if (activePage && (activePage.id === 'admin' || activePage.id === 'profile')) {
                handleNavigation('home');
            }
        }
    });

    // 2. Initiera klick-lyssnare för navigering och formulär
    initEventListeners();

    // 3. Visa startsidan som standard
    handleNavigation('home');
}

// Starta appen
init();