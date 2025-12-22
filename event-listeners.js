// event-listeners.js
import { 
    addOrUpdateDocument, deleteDocument, toggleLike, updateProfile, 
    updateProfileByAdmin, updateSiteSettings, addAdminFromUser, 
    deleteAdmin, createShooterProfile, linkUserToShooter, 
    updateShooterProfile, toggleMemberStatus, uploadDocumentFile,
    // System 1 (Vanliga klasser)
    createClass, updateClass
} from "./data-service.js";

import { 
    // System 2 (Online klasser) - ifall vi behöver dem här
    createOnlineClass, updateOnlineClass 
} from "./competition-service.js";

import { 
    showModal, hideModal, showDeleteProfileModal, 
    showShareModal, applyEditorCommand, updateToolbarButtons,
    navigate
} from "./ui-handler.js";

import { checkNewsForm, checkHistoryForm, checkEventForm } from "./form-validation.js";
import { handleImageUpload, handleSponsorUpload, setEditingImageId, setEditingSponsorId } from "./upload-handler.js";

import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentImageTargetInput = null;
let currentImagePreviewImg = null;

export function setupEventListeners() {
    console.log("Setting up ALL event listeners (Separated Systems)...");

    // --- NAVIGATION & MENU (Samma som förut) ---
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('hidden'));
        menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.classList.add('hidden')));
    }
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href'); 
            window.location.hash = href;
        });
    });
    window.addEventListener('hashchange', () => navigate(window.location.hash || '#hem'));

    // --- AUTH (Samma som förut) ---
    const showLogin = document.getElementById('show-login-link');
    const showRegister = document.getElementById('show-register-link');
    const logoutBtn = document.getElementById('logout-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    if (showLogin) showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-panel').classList.add('hidden');
        document.getElementById('user-login-panel').classList.remove('hidden');
    });
    if (showRegister) showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('user-login-panel').classList.add('hidden');
        document.getElementById('register-panel').classList.remove('hidden');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            showModal('confirmationModal', "Utloggad.");
            window.location.hash = '#hem';
        });
    });
    if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', showDeleteProfileModal);

    // --- MODALS ---
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.classList.remove('active');
    });

    // --- EDITOR ---
    document.querySelectorAll('.editor-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const command = button.getAttribute('data-command');
            if (command === 'createLink') {
                const url = prompt("Ange URL:", "https://");
                if (url) applyEditorCommand(button.parentElement.nextElementSibling, command, url);
            } else {
                applyEditorCommand(button.parentElement.nextElementSibling, command);
            }
        });
    });
    document.querySelectorAll('.editor-content').forEach(editor => {
        editor.addEventListener('keyup', () => updateToolbarButtons(editor));
        editor.addEventListener('mouseup', () => updateToolbarButtons(editor));
        editor.addEventListener('input', () => {
            if(editor.id === 'news-content-editor') checkNewsForm();
            if(editor.id === 'history-content-editor') checkHistoryForm();
            if(editor.id === 'event-description-editor') checkEventForm();
        });
    });

    // --- BILDVÄLJARE ---
    const imageSelectionModal = document.getElementById('imageSelectionModal');
    document.querySelectorAll('.select-image-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetInputId = btn.getAttribute('data-target-input');
            const targetPreviewId = btn.getAttribute('data-target-preview');
            currentImageTargetInput = document.getElementById(targetInputId);
            currentImagePreviewImg = document.getElementById(targetPreviewId);
            if (imageSelectionModal) {
                imageSelectionModal.classList.add('active');
                loadImagesForSelector(); 
            }
        });
    });
    const useManualUrlBtn = document.getElementById('use-manual-url-btn');
    if (useManualUrlBtn) {
        useManualUrlBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('manual-image-url');
            if (urlInput && urlInput.value) {
                selectImage(urlInput.value);
                urlInput.value = '';
            }
        });
    }

    // --- FORMULÄR: SKAPA/REDIGERA KLASS (SYSTEM 1 - INSTÄLLNINGAR) ---
    // Detta formulär finns i "Inställningar" och ska påverka competitionClasses
    const classForm = document.getElementById('create-class-form');
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const classId = document.getElementById('class-id').value;
            const classData = {
                name: document.getElementById('class-name').value,
                minAge: parseInt(document.getElementById('class-min-age').value),
                maxAge: parseInt(document.getElementById('class-max-age').value),
                discipline: document.getElementById('class-discipline').value,
                description: document.getElementById('class-desc').value
            };

            let success = false;
            // VIKTIGT: Vi anropar funktionerna från data-service.js (Vanliga klasser)
            if (classId) {
                success = await updateClass(classId, classData);
            } else {
                success = await createClass(classData);
            }

            if (success) {
                classForm.reset();
                document.getElementById('class-id').value = '';
                document.getElementById('create-class-btn').textContent = "Skapa Klass";
                document.getElementById('cancel-class-edit-btn').classList.add('hidden');
            }
        });
    }

    // --- ÖVRIGA FORMULÄR (Nyheter, Händelser, etc) ---
    const newsForm = document.getElementById('add-news-form');
    if (newsForm) {
        newsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('news-title').value;
            const content = document.getElementById('news-content-editor').innerHTML;
            const imageUrl = document.getElementById('news-image-url').value;
            const newsId = document.getElementById('news-id').value || null;
            if (!title || !content) { showModal('errorModal', "Titel och innehåll krävs."); return; }
            const data = { title, content, imageUrl, date: new Date().toISOString() };
            if (!newsId) { data.likes = 0; data.likedBy = []; }
            await addOrUpdateDocument('news', newsId, data, "Nyheten publicerad!", "Kunde inte spara.");
            newsForm.reset(); document.getElementById('news-content-editor').innerHTML = '';
            document.getElementById('news-id').value = '';
            document.getElementById('add-news-btn').textContent = "Publicera Nyhet";
        });
    }

    const eventForm = document.getElementById('add-event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-title').value;
            const description = document.getElementById('event-description-editor').innerHTML;
            const isRecurring = document.getElementById('is-recurring').checked;
            const eventId = document.getElementById('event-id').value || null;
            const data = { title, description, isRecurring };
            if (isRecurring) {
                data.startDate = document.getElementById('start-date').value;
                data.endDate = document.getElementById('end-date').value;
                data.weekday = document.getElementById('weekday-select').value;
                data.startTime = document.getElementById('start-time').value;
                data.endTime = document.getElementById('end-time').value;
            } else {
                data.date = document.getElementById('event-date').value;
                data.time = document.getElementById('event-time').value;
            }
            await addOrUpdateDocument('events', eventId, data, "Händelsen sparad!", "Fel vid sparning.");
            eventForm.reset(); document.getElementById('event-description-editor').innerHTML = '';
            document.getElementById('event-id').value = '';
        });
    }

    const historyForm = document.getElementById('add-history-form');
    if (historyForm) {
        historyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('history-title').value;
            const content = document.getElementById('history-content-editor').innerHTML;
            const year = parseInt(document.getElementById('history-year').value);
            const priority = parseInt(document.getElementById('history-priority').value);
            const historyId = document.getElementById('history-id').value || null;
            const data = { title, content, year, priority };
            await addOrUpdateDocument('history', historyId, data, "Historik sparad!", "Fel vid sparning.");
            historyForm.reset(); document.getElementById('history-content-editor').innerHTML = '';
            document.getElementById('history-id').value = '';
        });
    }

    // --- UPLOADS ---
    const imageUploadForm = document.getElementById('image-upload-form');
    if (imageUploadForm) imageUploadForm.addEventListener('submit', handleImageUpload);
    const sponsorUploadForm = document.getElementById('add-sponsor-form');
    if (sponsorUploadForm) sponsorUploadForm.addEventListener('submit', handleSponsorUpload);
    const uploadDocForm = document.getElementById('upload-doc-form');
    if (uploadDocForm) {
        uploadDocForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('doc-file'); 
            const file = fileInput ? fileInput.files[0] : null;
            const nameInput = document.getElementById('doc-name');
            const name = nameInput ? nameInput.value : '';
            const categoryInput = document.getElementById('doc-category');
            const category = categoryInput ? categoryInput.value : 'Övrigt';
            if (!file) { showModal('errorModal', "Välj en fil."); return; }
            try {
                const result = await uploadDocumentFile(file, name, category);
                if (result) {
                    uploadDocForm.reset();
                    const progressContainer = document.getElementById('doc-upload-progress');
                    if (progressContainer) progressContainer.classList.add('hidden');
                    showModal('confirmationModal', "Fil uppladdad!");
                }
            } catch (error) { showModal('errorModal', "Fel vid uppladdning."); }
        });
    }

    // --- BUTTON CLICKS (ADMIN) ---
    document.addEventListener('click', async (e) => {
        const target = e.target;
        
        // DELETE (Generisk)
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            const btn = target.classList.contains('delete-btn') ? target : target.closest('.delete-btn');
            const id = btn.getAttribute('data-id');
            const type = btn.getAttribute('data-type');
            if (confirm("Är du säker?")) {
                // Vi låter deleteDocument hantera logiken, men om type är 'competitionClasses' (System 1) eller 'online_competition_classes' (System 2)
                // så måste vi se till att deleteDocument (som ligger i data-service) kan hantera det.
                // deleteDocument i data-service är generisk och tar bara en collection-string, så det fungerar för båda!
                await deleteDocument(type, id, "Borttaget!", "Fel vid borttagning.");
            }
        }

        // LIKES & SHARE
        if (target.closest('.like-btn')) {
            const btn = target.closest('.like-btn');
            const id = btn.getAttribute('data-id');
            const hasLiked = btn.getAttribute('data-liked') === 'true';
            const currentLikes = parseInt(btn.querySelector('.like-count').textContent) || 0;
            const dummyLikedBy = hasLiked ? [auth.currentUser.uid] : [];
            await toggleLike(id, currentLikes, dummyLikedBy);
        }
        if (target.closest('.share-btn')) {
            const btn = target.closest('.share-btn');
            showShareModal(btn.getAttribute('data-title'), window.location.origin + window.location.pathname + '#nyheter#news-' + btn.getAttribute('data-id'));
        }

        // ADMIN - USERS & SHOOTERS
        if (target.classList.contains('toggle-member-btn')) await toggleMemberStatus(target.getAttribute('data-id'), target.getAttribute('data-status') === 'true');
        if (target.classList.contains('add-admin-btn') && confirm("Gör till admin?")) await addAdminFromUser(target.getAttribute('data-id'));
        if (target.classList.contains('delete-admin-btn') && confirm("Ta bort admin?")) await deleteAdmin(target.getAttribute('data-id'));
        if (target.classList.contains('link-parent-btn')) {
            const userId = prompt(`Ange User ID:`);
            if (userId) await linkUserToShooter(userId, target.getAttribute('data-id'));
        }

        // EDIT - CLASSES (SYSTEM 1 - I INSTÄLLNINGAR)
        if (target.classList.contains('edit-class-btn')) {
            const json = target.getAttribute('data-obj');
            if (json) {
                const cls = JSON.parse(json);
                document.getElementById('class-id').value = cls.id;
                document.getElementById('class-name').value = cls.name;
                document.getElementById('class-min-age').value = cls.minAge;
                document.getElementById('class-max-age').value = cls.maxAge;
                document.getElementById('class-discipline').value = cls.discipline;
                document.getElementById('class-desc').value = cls.description || '';
                
                document.getElementById('create-class-btn').textContent = "Uppdatera Klass";
                document.getElementById('cancel-class-edit-btn').classList.remove('hidden');
                
                // Om vi inte är på rätt flik, gå dit
                if(!document.getElementById('installningar').classList.contains('active')) {
                     document.getElementById('nav-site-admin-link').click();
                }
                document.getElementById('create-class-form').scrollIntoView({behavior: 'smooth'});
            }
        }
        
        // EDIT - NEWS & IMAGES
        if (target.classList.contains('edit-news-btn')) {
            const snap = await getDoc(doc(db, "news", target.getAttribute('data-id')));
            if(snap.exists()) {
                const data = snap.data();
                document.getElementById('news-id').value = snap.id;
                document.getElementById('news-title').value = data.title;
                document.getElementById('news-content-editor').innerHTML = data.content;
                document.getElementById('news-image-url').value = data.imageUrl || '';
                document.getElementById('add-news-btn').textContent = "Uppdatera Nyhet";
                document.getElementById('nav-site-admin-link').click();
                document.getElementById('add-news-form').scrollIntoView();
            }
        }
        if (target.classList.contains('edit-image-btn')) setEditingImageId(target.getAttribute('data-id'));
        if (target.classList.contains('edit-sponsor-btn')) setEditingSponsorId(target.getAttribute('data-id'));
    });

    // CANCEL CLASS EDIT
    const cancelClassEditBtn = document.getElementById('cancel-class-edit-btn');
    if (cancelClassEditBtn) {
        cancelClassEditBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('create-class-form').reset();
            document.getElementById('class-id').value = '';
            document.getElementById('create-class-btn').textContent = "Skapa Klass";
            cancelClassEditBtn.classList.add('hidden');
        });
    }

    // SITE SETTINGS
    const settingsForm = document.getElementById('site-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settings = {
                headerColor: document.getElementById('header-color-input').value,
                showSponsors: document.getElementById('show-sponsors-checkbox').checked,
                contactAddress: document.getElementById('contact-address-input').value,
                contactLocation: document.getElementById('contact-location-input').value,
                contactPhone: document.getElementById('contact-phone-input').value,
                contactEmail: document.getElementById('contact-email-input').value,
                logoUrl: document.getElementById('logo-url-input').value
            };
            await updateSiteSettings(settings);
        });
    }

    // LIVE SCORE (Träning)
    const liveScoreInputs = document.querySelectorAll('.series-input');
    if (liveScoreInputs.length > 0) {
        liveScoreInputs.forEach(input => {
            input.addEventListener('input', () => {
                let total = 0, best = 0;
                liveScoreInputs.forEach(i => {
                    let val = parseFloat(i.value.replace(',', '.'));
                    if (!isNaN(val)) { total += val; if (val > best) best = val; }
                });
                const totalEl = document.getElementById('live-total-display');
                if(totalEl) totalEl.textContent = Math.round(total * 10) / 10;
                const bestEl = document.getElementById('live-best-series');
                if(bestEl) bestEl.textContent = best;
            });
        });
    }
    
    checkNewsForm(); checkHistoryForm(); checkEventForm();
}

function selectImage(url) {
    if (currentImageTargetInput) currentImageTargetInput.value = url;
    if (currentImagePreviewImg) {
        currentImagePreviewImg.src = url;
        currentImagePreviewImg.classList.remove('hidden');
    }
    const modal = document.getElementById('imageSelectionModal');
    if (modal) modal.classList.remove('active');
}

import { imagesData } from "./data-service.js"; 
function loadImagesForSelector() {
    const container = document.getElementById('image-selection-grid');
    if (!container) return;
    container.innerHTML = '';
    if (imagesData.length === 0) { container.innerHTML = '<p class="text-gray-500">Inga bilder.</p>'; return; }
    imagesData.forEach(img => {
        const div = document.createElement('div');
        div.className = "cursor-pointer border-2 border-transparent hover:border-blue-500 rounded overflow-hidden h-32 bg-gray-100";
        div.innerHTML = `<img src="${img.url}" class="w-full h-full object-cover">`;
        div.addEventListener('click', () => selectImage(img.url));
        container.appendChild(div);
    });
}