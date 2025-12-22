// event-listeners.js
import { 
    addOrUpdateDocument, deleteDocument, toggleLike, updateProfile, 
    updateProfileByAdmin, updateSiteSettings, addAdminFromUser, 
    deleteAdmin, createShooterProfile, linkUserToShooter, 
    updateShooterProfile, toggleMemberStatus, uploadDocumentFile
} from "./data-service.js";

import { 
    showModal, hideModal, showDeleteProfileModal, 
    showShareModal, applyEditorCommand, updateToolbarButtons,
    navigate
} from "./ui-handler.js";

import { checkNewsForm, checkHistoryForm, checkEventForm } from "./form-validation.js";
import { handleImageUpload, handleSponsorUpload, setEditingImageId, setEditingSponsorId, editingImageId, editingSponsorId } from "./upload-handler.js";

import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Globala variabler för bildväljaren
let currentImageTargetInput = null;
let currentImagePreviewImg = null;

export function setupEventListeners() {
    console.log("Setting up ALL event listeners (Complete version)...");

    // --- MOBIL MENY ---
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.add('hidden');
            });
        });
    }

    // --- NAVIGATION ---
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href'); 
            window.location.hash = href;
        });
    });

    window.addEventListener('hashchange', () => {
        navigate(window.location.hash || '#hem');
    });

    // --- AUTENTISERING ---
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
            showModal('confirmationModal', "Du har loggats ut.");
            window.location.hash = '#hem';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    });

    if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', showDeleteProfileModal);

    // --- MODAL CLOSERS (X-knappar) ---
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    // Stäng modal om man klickar utanför
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // --- TEXTREDIGERARE (TOOLBARS) ---
    document.querySelectorAll('.editor-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const command = button.getAttribute('data-command');
            
            if (command === 'createLink') {
                const url = prompt("Ange länkens URL:", "https://");
                if (url) applyEditorCommand(button.parentElement.nextElementSibling, command, url);
            } else {
                applyEditorCommand(button.parentElement.nextElementSibling, command);
            }
        });
    });

    document.querySelectorAll('.editor-content').forEach(editor => {
        editor.addEventListener('keyup', () => updateToolbarButtons(editor));
        editor.addEventListener('mouseup', () => updateToolbarButtons(editor));
        // Koppla till validering
        editor.addEventListener('input', () => {
            if(editor.id === 'news-content-editor') checkNewsForm();
            if(editor.id === 'history-content-editor') checkHistoryForm();
            if(editor.id === 'event-description-editor') checkEventForm();
        });
    });

    // --- BILDVÄLJARE (IMAGE SELECTOR) ---
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

    // --- FORMULÄR: NYHETER (SAKNADES I FÖRRA) ---
    const newsForm = document.getElementById('add-news-form');
    if (newsForm) {
        newsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('news-title').value;
            const content = document.getElementById('news-content-editor').innerHTML;
            const imageUrl = document.getElementById('news-image-url').value;
            const newsId = document.getElementById('news-id').value || null; // För redigering
            
            if (!title || !content) {
                showModal('errorModal', "Titel och innehåll krävs.");
                return;
            }

            const data = { title, content, imageUrl, date: new Date().toISOString() };
            // Om ny, sätt likes till 0
            if (!newsId) { data.likes = 0; data.likedBy = []; }

            await addOrUpdateDocument('news', newsId, data, "Nyheten publicerad!", "Kunde inte spara nyheten.");
            
            newsForm.reset();
            document.getElementById('news-content-editor').innerHTML = '';
            document.getElementById('news-id').value = '';
            document.getElementById('add-news-btn').textContent = "Publicera Nyhet";
            document.getElementById('news-preview-image').classList.add('hidden');
        });
    }

    // --- FORMULÄR: HÄNDELSER/KALENDER (SAKNADES I FÖRRA) ---
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

            await addOrUpdateDocument('events', eventId, data, "Händelsen sparad!", "Kunde inte spara händelsen.");
            
            eventForm.reset();
            document.getElementById('event-description-editor').innerHTML = '';
            document.getElementById('event-id').value = '';
            document.getElementById('add-event-btn').textContent = "Lägg till Händelse";
        });
    }

    // --- FORMULÄR: HISTORIA (SAKNADES I FÖRRA) ---
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
            
            await addOrUpdateDocument('history', historyId, data, "Historik sparad!", "Kunde inte spara historik.");
            
            historyForm.reset();
            document.getElementById('history-content-editor').innerHTML = '';
            document.getElementById('history-id').value = '';
        });
    }

    // --- FORMULÄR: BILDUPPLADDNING & SPONSORER ---
    const imageUploadForm = document.getElementById('image-upload-form');
    if (imageUploadForm) imageUploadForm.addEventListener('submit', handleImageUpload);

    const sponsorUploadForm = document.getElementById('add-sponsor-form');
    if (sponsorUploadForm) sponsorUploadForm.addEventListener('submit', handleSponsorUpload);


    // --- ADMIN KNAPPAR (Event Delegation) ---
    document.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Ta bort dokument/objekt
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            const btn = target.classList.contains('delete-btn') ? target : target.closest('.delete-btn');
            const id = btn.getAttribute('data-id');
            const type = btn.getAttribute('data-type');
            if (confirm("Är du säker på att du vill ta bort detta?")) {
                await deleteDocument(type, id, "Borttaget!", "Kunde inte ta bort.");
            }
        }

        // Gilla-knapp
        if (target.closest('.like-btn')) {
            const btn = target.closest('.like-btn');
            const id = btn.getAttribute('data-id');
            const hasLiked = btn.getAttribute('data-liked') === 'true';
            const likesText = btn.querySelector('.like-count').textContent;
            const currentLikes = parseInt(likesText) || 0;
            const dummyLikedBy = hasLiked ? [auth.currentUser.uid] : [];
            await toggleLike(id, currentLikes, dummyLikedBy);
        }

        // Dela-knapp
        if (target.closest('.share-btn')) {
            const btn = target.closest('.share-btn');
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            const url = window.location.origin + window.location.pathname + '#nyheter#news-' + id;
            showShareModal(title, url);
        }

        // --- ADMIN: ANVÄNDARE ---
        if (target.classList.contains('toggle-member-btn')) {
            const id = target.getAttribute('data-id');
            const status = target.getAttribute('data-status') === 'true';
            await toggleMemberStatus(id, status);
        }
        if (target.classList.contains('add-admin-btn')) {
            const id = target.getAttribute('data-id');
            if(confirm("Vill du göra denna användare till Admin?")) await addAdminFromUser(id);
        }
        if (target.classList.contains('delete-admin-btn')) {
            const id = target.getAttribute('data-id');
            if(confirm("Ta bort admin-rättigheter?")) await deleteAdmin(id);
        }

        // --- ADMIN: SKYTTAR ---
        if (target.classList.contains('link-parent-btn')) {
            const shooterId = target.getAttribute('data-id');
            const name = target.getAttribute('data-name');
            const userId = prompt(`Ange User ID för föräldern som ska kopplas till ${name}:`);
            if (userId) await linkUserToShooter(userId, shooterId);
        }

        // --- ADMIN: KLASSER (Redigera) ---
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
                
                if(!document.getElementById('installningar').classList.contains('active')) {
                     document.getElementById('nav-site-admin-link').click();
                }
                document.getElementById('create-class-form').scrollIntoView({behavior: 'smooth'});
            }
        }

        // --- ADMIN: REDIGERA NYHETER (Lagt till stöd för detta) ---
        if (target.classList.contains('edit-news-btn')) {
            const id = target.getAttribute('data-id');
            // Hämta data
            const docRef = doc(db, "news", id);
            const snap = await getDoc(docRef);
            if(snap.exists()) {
                const data = snap.data();
                document.getElementById('news-id').value = id;
                document.getElementById('news-title').value = data.title;
                document.getElementById('news-content-editor').innerHTML = data.content;
                document.getElementById('news-image-url').value = data.imageUrl || '';
                
                if(data.imageUrl) {
                    const img = document.getElementById('news-preview-image');
                    img.src = data.imageUrl;
                    img.classList.remove('hidden');
                }

                document.getElementById('add-news-btn').textContent = "Uppdatera Nyhet";
                document.getElementById('nav-site-admin-link').click();
                document.getElementById('add-news-form').scrollIntoView();
            }
        }
        
        // --- ADMIN: REDIGERA BILDER/SPONSORER (Via Upload Handler) ---
        if (target.classList.contains('edit-image-btn')) {
             // Detta hanteras av ui-handler men vi sätter ID här för upload-handler
             const id = target.getAttribute('data-id');
             setEditingImageId(id);
             // UI bör fyllas i av ui-handler, men vi förbereder upload-handler
        }
        if (target.classList.contains('edit-sponsor-btn')) {
             const id = target.getAttribute('data-id');
             setEditingSponsorId(id);
        }
    });

    // --- AVBRYT KLASS-REDIGERING ---
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

    // --- SPARA INSTÄLLNINGAR ---
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

    // --- DOKUMENTUPPLADDNING ---
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

            if (!file) {
                showModal('errorModal', "Du måste välja en fil.");
                return;
            }

            try {
                const result = await uploadDocumentFile(file, name, category);
                if (result) {
                    uploadDocForm.reset();
                    const progressContainer = document.getElementById('doc-upload-progress');
                    if (progressContainer) progressContainer.classList.add('hidden');
                    showModal('confirmationModal', "Filen har laddats upp!");
                }
            } catch (error) {
                console.error(error);
                showModal('errorModal', "Kunde inte ladda upp filen: " + error.message);
            }
        });
    }
    
    // --- LIVE SCORE (TRÄNING) ---
    const liveScoreInputs = document.querySelectorAll('.series-input');
    if (liveScoreInputs.length > 0) {
        liveScoreInputs.forEach(input => {
            input.addEventListener('input', () => {
                let total = 0;
                let best = 0;
                liveScoreInputs.forEach(i => {
                    let val = parseFloat(i.value.replace(',', '.'));
                    if (!isNaN(val)) {
                        total += val;
                        if (val > best) best = val;
                    }
                });
                const totalEl = document.getElementById('live-total-display');
                if(totalEl) totalEl.textContent = Math.round(total * 10) / 10;
                const bestEl = document.getElementById('live-best-series');
                if(bestEl) bestEl.textContent = best;
            });
        });
    }
    
    // Initial check för validering
    checkNewsForm();
    checkHistoryForm();
    checkEventForm();
}

// Hjälpfunktion för att välja bild
function selectImage(url) {
    if (currentImageTargetInput) {
        currentImageTargetInput.value = url;
    }
    if (currentImagePreviewImg) {
        currentImagePreviewImg.src = url;
        currentImagePreviewImg.classList.remove('hidden');
    }
    const modal = document.getElementById('imageSelectionModal');
    if (modal) modal.classList.remove('active');
}

// Hjälpfunktion för att ladda bilder till väljaren
import { imagesData } from "./data-service.js"; 
function loadImagesForSelector() {
    const container = document.getElementById('image-selection-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (imagesData.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500">Inga bilder uppladdade än.</p>';
        return;
    }

    imagesData.forEach(img => {
        const div = document.createElement('div');
        div.className = "cursor-pointer border-2 border-transparent hover:border-blue-500 rounded overflow-hidden relative h-32 bg-gray-100";
        div.innerHTML = `<img src="${img.url}" class="w-full h-full object-cover">`;
        div.addEventListener('click', () => selectImage(img.url));
        container.appendChild(div);
    });
}