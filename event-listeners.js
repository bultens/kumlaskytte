// event-listeners.js - Ver. 1.14 (Master Unified Version)
import { auth, db } from "./firebase-config.js";
import { 
    addOrUpdateDocument, deleteDocument, toggleLike, 
    setCurrentUserId 
} from "./data-service.js";
import { setupResultFormListeners } from "./result-handler.js";
import { 
    navigate, showModal, hideModal, showShareModal, 
    isAdminLoggedIn, showDeleteUserModal 
} from "./ui-handler.js";
import { 
    checkNewsForm, checkHistoryForm, checkImageForm, 
    checkSponsorForm, checkEventForm, checkCompetitionForm 
} from './form-validation.js';
import { handleImageUpload, handleSponsorUpload } from "./upload-handler.js";
import { loadAndRenderChart } from "./statistics-chart.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function setupEventListeners() {
    
    // --- 1. NAVIGATION & MENY ---
    window.addEventListener('hashchange', () => {
        navigate(window.location.hash);
        if (window.location.hash === '#statistik') {
            const selector = document.getElementById('shooter-selector');
            if (selector && selector.value) loadAndRenderChart(selector.value);
        }
    });

    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.onclick = () => mobileMenu.classList.toggle('hidden');
    }

    // --- 2. MODAL-STÄNGNING ---
    const closeMapping = {
        'close-news-modal': 'news-edit-section',
        'close-competition-modal': 'competition-edit-section',
        'close-calendar-modal': 'calendar-edit-section',
        'close-image-modal': 'image-edit-section',
        'close-history-modal': 'history-edit-section',
        'close-sponsors-modal': 'sponsors-edit-section',
        'close-share-modal': 'shareModal',
        'close-image-selection-modal': 'imageSelectionModal',
        'close-delete-user-modal': 'deleteUserModal'
    };

    Object.entries(closeMapping).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.onclick = () => hideModal(modalId);
    });

    // --- 3. GENERISKA LYSSNARE (Event Delegation) ---
    // Denna del ersätter hundratals rader av specifik kod för varje knapp
    document.addEventListener('click', async (e) => {
        // GILLA (Hjärtat)
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            if (!auth.currentUser) return showModal('errorModal', "Logga in för att gilla.");
            await toggleLike(likeBtn.dataset.id, likeBtn.dataset.type, auth.currentUser.uid);
            return;
        }

        // DELA (Länk-ikonen)
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            showShareModal(shareBtn.dataset.title, shareBtn.dataset.url);
            return;
        }

        // RADERA (Papperskorgen)
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const type = deleteBtn.dataset.type;
            if (confirm(`Är du säker på att du vill ta bort denna post från ${type}?`)) {
                await deleteDocument(deleteBtn.dataset.id, type, deleteBtn.dataset.seriesId);
            }
            return;
        }

        // TA BORT ANVÄNDARE (Medlemslistan)
        const deleteUserBtn = e.target.closest('.delete-user-btn');
        if (deleteUserBtn) {
            const userId = deleteUserBtn.dataset.id;
            const confirmBtn = document.getElementById('confirm-delete-user-btn');
            if (confirmBtn) confirmBtn.dataset.targetId = userId; 
            showDeleteUserModal(); 
            return;
        }
    });

    // --- 4. BILDVALS-LOGIK (MODALEN FÖR GALLERIET) ---
    const selectNewsImg = document.getElementById('select-image-btn');
    const selectCompImg = document.getElementById('comp-select-image-btn');
    let imageTarget = 'news';

    if (selectNewsImg) selectNewsImg.onclick = () => { imageTarget = 'news'; showModal('imageSelectionModal', ''); };
    if (selectCompImg) selectCompImg.onclick = () => { imageTarget = 'competitions'; showModal('imageSelectionModal', ''); };

    // Hantera klick på en bild i väljaren
    document.addEventListener('click', (e) => {
        const img = e.target.closest('.selectable-image');
        if (img) {
            const url = img.dataset.url;
            const prefix = imageTarget === 'news' ? 'news' : 'comp';
            const preview = document.getElementById(`${prefix}-image-preview`);
            const input = document.getElementById(`${prefix}-image-url`);
            
            if (preview) { preview.src = url; preview.classList.remove('hidden'); }
            if (input) { 
                input.value = url; 
                if (imageTarget === 'news') checkNewsForm(); 
                else checkCompetitionForm(); 
            }
            hideModal('imageSelectionModal');
        }
    });

    // --- 5. FORMULÄR: SPARA NYHET & TÄVLING ---
    const addNewsBtn = document.getElementById('add-news-btn');
    if (addNewsBtn) {
        addNewsBtn.onclick = async () => {
            const data = {
                title: document.getElementById('news-title').value,
                content: document.getElementById('news-content-editor').innerHTML,
                imageUrl: document.getElementById('news-image-url').value,
                date: document.getElementById('news-date').value,
                likes: {}, createdAt: serverTimestamp()
            };
            await addOrUpdateDocument('news', null, data, "Nyheten har publicerats!", "Kunde inte spara.");
            // Återställ formulär
            document.getElementById('news-title').value = '';
            document.getElementById('news-content-editor').innerHTML = '';
            document.getElementById('news-image-url').value = '';
            document.getElementById('news-image-preview').classList.add('hidden');
            checkNewsForm();
        };
    }

    const addCompBtn = document.getElementById('add-competition-btn');
    if (addCompBtn) {
        addCompBtn.onclick = async () => {
            const data = {
                title: document.getElementById('comp-title').value,
                content: document.getElementById('comp-content-editor').innerHTML,
                location: document.getElementById('comp-location').value,
                date: document.getElementById('comp-date').value,
                imageUrl: document.getElementById('comp-image-url').value,
                pdfUrl: document.getElementById('comp-pdf-url').value,
                likes: {}, createdAt: serverTimestamp()
            };
            await addOrUpdateDocument('competitions', null, data, "Rapporten har sparats!", "Kunde inte spara.");
            // Återställ
            ['comp-title', 'comp-location', 'comp-image-url', 'comp-pdf-url'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('comp-content-editor').innerHTML = '';
            document.getElementById('comp-image-preview').classList.add('hidden');
            checkCompetitionForm();
        };
    }

    // --- 6. UPLOAD HANDLERS (BILDER & SPONSORER) ---
    const addImageBtn = document.getElementById('add-image-btn');
    if (addImageBtn) addImageBtn.onclick = handleImageUpload;

    const addSponsorBtn = document.getElementById('add-sponsor-btn');
    if (addSponsorBtn) addSponsorBtn.onclick = handleSponsorUpload;

    // --- 7. VALIDERINGAR ---
    ['news-title', 'news-content-editor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = checkNewsForm;
    });

    ['comp-title', 'comp-content-editor', 'comp-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = checkCompetitionForm;
    });

    // --- 8. INITIALISERING ---
    setupResultFormListeners();
}