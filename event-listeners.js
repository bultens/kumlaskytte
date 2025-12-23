// event-listeners.js
import { 
    addOrUpdateDocument, deleteDocument, toggleLike, 
    addAdminFromUser, deleteAdmin, linkUserToShooter, toggleMemberStatus, 
    uploadDocumentFile, createClass, updateClass, saveResult, updateSiteSettings, addSponsor
} from "./data-service.js";

import { 
    showModal, showDeleteProfileModal, showShareModal, applyEditorCommand, 
    updateToolbarButtons, navigate 
} from "./ui-handler.js";

import { checkNewsForm, checkHistoryForm, checkEventForm } from "./form-validation.js";
import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, db } from "./firebase-config.js"; // Förenklad import

// Globala variabler
let currentImageTargetInput = null;
let currentImagePreviewImg = null;
let editingSponsorId = null; 
let editingImageId = null; // Flyttad hit från upload-handler

export function setupEventListeners() {
    console.log("Setting up EVENT LISTENERS (Stable Version)...");

    // --- NAVIGATION ---
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('hidden'));
        menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.classList.add('hidden')));
    }
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = link.getAttribute('href'); 
        });
    });
    window.addEventListener('hashchange', () => navigate(window.location.hash || '#hem'));

    // --- AUTENTISERING ---
    const showLogin = document.getElementById('show-login-link');
    const showRegister = document.getElementById('show-register-link');
    if (showLogin) showLogin.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-panel').classList.add('hidden'); document.getElementById('user-login-panel').classList.remove('hidden'); });
    if (showRegister) showRegister.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('user-login-panel').classList.add('hidden'); document.getElementById('register-panel').classList.remove('hidden'); });
    
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => { showModal('confirmationModal', "Utloggad."); window.location.hash = '#hem'; });
    });
    
    const delAccBtn = document.getElementById('delete-account-btn');
    if(delAccBtn) delAccBtn.addEventListener('click', showDeleteProfileModal);

    // --- MODALER ---
    document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', (e) => e.target.closest('.modal').classList.remove('active')));
    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('active'); });

    // --- TEXTREDIGERARE ---
    document.querySelectorAll('.editor-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-command');
        const val = cmd === 'createLink' ? prompt("URL:") : null;
        applyEditorCommand(btn.parentElement.nextElementSibling, cmd, val);
    }));
    document.querySelectorAll('.editor-content').forEach(ed => {
        ed.addEventListener('input', () => {
            if(ed.id === 'news-content-editor') checkNewsForm();
            if(ed.id === 'history-content-editor') checkHistoryForm();
            if(ed.id === 'event-description-editor') checkEventForm();
        });
    });

    // --- BILDVÄLJARE ---
    const imgModal = document.getElementById('imageSelectionModal');
    document.querySelectorAll('.select-image-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            currentImageTargetInput = document.getElementById(btn.getAttribute('data-target-input'));
            currentImagePreviewImg = document.getElementById(btn.getAttribute('data-target-preview'));
            if (imgModal) { imgModal.classList.add('active'); loadImagesForSelector(); }
        });
    });
    const manUrlBtn = document.getElementById('use-manual-url-btn');
    if(manUrlBtn) manUrlBtn.addEventListener('click', () => {
        const inp = document.getElementById('manual-image-url');
        if (inp?.value) { selectImage(inp.value); inp.value = ''; }
    });

    // --- FORMULÄR: SKAPA KLASS (Inställningar) ---
    const classForm = document.getElementById('create-class-form');
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('class-id').value;
            const data = {
                name: document.getElementById('class-name').value,
                minAge: parseInt(document.getElementById('class-min-age').value),
                maxAge: parseInt(document.getElementById('class-max-age').value),
                discipline: document.getElementById('class-discipline').value,
                description: document.getElementById('class-desc').value
            };
            const success = id ? await updateClass(id, data) : await createClass(data);
            if(success) { 
                e.target.reset(); 
                document.getElementById('create-class-btn').textContent="Skapa Klass"; 
                document.getElementById('cancel-class-edit-btn').classList.add('hidden'); 
                document.getElementById('class-id').value=''; 
            }
        });
    }

    // --- FORMULÄR: BASINNEHÅLL ---
    const newsForm = document.getElementById('add-news-form');
    if(newsForm) newsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('news-title').value;
        const content = document.getElementById('news-content-editor').innerHTML;
        const imageUrl = document.getElementById('news-image-url').value;
        const newsId = document.getElementById('news-id').value;
        await addOrUpdateDocument('news', newsId || null, { title, content, imageUrl, date: new Date().toISOString(), likes: newsId?undefined:0 }, "Sparat!", "Fel.");
        e.target.reset(); document.getElementById('news-content-editor').innerHTML=''; document.getElementById('news-id').value='';
        document.getElementById('add-news-btn').textContent = "Publicera Nyhet";
    });

    const eventForm = document.getElementById('add-event-form');
    if(eventForm) eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description-editor').innerHTML;
        const isRecurring = document.getElementById('is-recurring').checked;
        const data = { title, description, isRecurring };
        if(isRecurring) {
            data.weekday = document.getElementById('weekday-select').value;
            data.startTime = document.getElementById('start-time').value;
            data.endTime = document.getElementById('end-time').value;
        } else {
            data.date = document.getElementById('event-date').value;
            data.time = document.getElementById('event-time').value;
        }
        await addOrUpdateDocument('events', document.getElementById('event-id').value || null, data, "Sparat!", "Fel.");
        e.target.reset(); document.getElementById('event-description-editor').innerHTML=''; document.getElementById('event-id').value='';
    });
    
    const histForm = document.getElementById('add-history-form');
    if(histForm) histForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('history-title').value,
            content: document.getElementById('history-content-editor').innerHTML,
            year: parseInt(document.getElementById('history-year').value),
            priority: parseInt(document.getElementById('history-priority').value)
        };
        await addOrUpdateDocument('history', document.getElementById('history-id').value || null, data, "Sparat!", "Fel.");
        e.target.reset(); document.getElementById('history-content-editor').innerHTML=''; document.getElementById('history-id').value='';
    });

    // --- RESULTAT RAPPORTERING ---
    const resForm = document.getElementById('add-result-form');
    if(resForm) resForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = document.getElementById('live-total-display').textContent;
        const data = {
            shooterId: document.getElementById('result-shooter-selector').value,
            date: document.getElementById('result-date').value,
            total: parseFloat(val) || 0,
            type: document.getElementById('result-type').value,
            timestamp: new Date().toISOString()
        };
        
        // Spara serier om de finns
        const serInputs = document.querySelectorAll('.series-input');
        if(serInputs.length) {
            data.series = Array.from(serInputs).map(i => parseFloat(i.value.replace(',','.')) || 0);
        }

        await saveResult(data);
        e.target.reset(); 
        document.getElementById('live-total-display').textContent='0';
        document.getElementById('series-inputs-container').innerHTML = '';
        showModal('confirmationModal', "Resultat sparat!");
    });

    // --- UPLOAD HANDLERS (Sponsors & Images & Docs) ---
    const sponForm = document.getElementById('add-sponsor-form');
    if(sponForm) sponForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('sponsor-name').value;
        const web = document.getElementById('sponsor-website').value;
        const file = document.getElementById('sponsor-logo-file').files[0];
        if(!file && !editingSponsorId) { showModal('errorModal', "Välj en bild"); return; }
        await addSponsor(name, file, web, editingSponsorId);
        e.target.reset(); editingSponsorId = null; document.getElementById('sponsor-form-title').textContent = "Lägg till Sponsor";
    });

    const docForm = document.getElementById('upload-doc-form');
    if(docForm) docForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('doc-file').files[0];
        if(!file) return showModal('errorModal', "Välj fil");
        await uploadDocumentFile(file, document.getElementById('doc-name').value, document.getElementById('doc-category').value);
        e.target.reset();
    });

    // Inställningar
    const setForm = document.getElementById('site-settings-form');
    if(setForm) setForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateSiteSettings({
            headerColor: document.getElementById('header-color-input').value,
            showSponsors: document.getElementById('show-sponsors-checkbox').checked,
            contactEmail: document.getElementById('contact-email-input').value,
            logoUrl: document.getElementById('logo-url-input').value
        });
    });

    // --- LIVE SCORE RÄKNARE ---
    const shotSelect = document.getElementById('result-shot-count');
    const serCont = document.getElementById('series-inputs-container');
    if (shotSelect && serCont) {
        shotSelect.addEventListener('change', () => {
            const count = parseInt(shotSelect.value);
            const seriesCount = Math.ceil(count / 10);
            serCont.innerHTML = '';
            for(let i=1; i<=seriesCount; i++) {
                serCont.innerHTML += `<div class="flex flex-col"><label class="text-xs font-bold mb-1">Serie ${i}</label><input type="text" class="series-input border p-2 w-20 rounded text-center font-bold text-blue-900" placeholder="0"></div>`;
            }
        });
        
        // Event delegation för att räkna poäng
        serCont.addEventListener('input', (e) => {
            if(e.target.classList.contains('series-input')) {
                let sum = 0;
                document.querySelectorAll('.series-input').forEach(x => sum += parseFloat(x.value.replace(',','.'))||0);
                document.getElementById('live-total-display').textContent = Math.round(sum*10)/10;
            }
        });
    }

    // --- KLICK-HANTERING (ADMIN & UI) ---
    document.addEventListener('click', async (e) => {
        const t = e.target;
        
        // Delete
        if (t.closest('.delete-btn')) {
            const btn = t.closest('.delete-btn');
            if (confirm("Ta bort?")) await deleteDocument(btn.getAttribute('data-type'), btn.getAttribute('data-id'));
        }
        // Like
        if (t.closest('.like-btn')) {
            const btn = t.closest('.like-btn');
            const has = btn.getAttribute('data-liked') === 'true';
            await toggleLike(btn.getAttribute('data-id'), parseInt(btn.querySelector('.like-count').textContent)||0, has?[auth.currentUser.uid]:[]);
        }

        // Admin Actions
        if (t.classList.contains('toggle-member-btn')) await toggleMemberStatus(t.getAttribute('data-id'), t.getAttribute('data-status') === 'true');
        if (t.classList.contains('add-admin-btn') && confirm("Admin?")) await addAdminFromUser(t.getAttribute('data-id'));
        if (t.classList.contains('delete-admin-btn') && confirm("Ta bort admin?")) await deleteAdmin(t.getAttribute('data-id'));
        if (t.classList.contains('link-parent-btn')) {
            const uid = prompt("User ID (finns i användarlistan):");
            if (uid) await linkUserToShooter(uid, t.getAttribute('data-id'));
        }

        // Edit Actions
        if (t.classList.contains('edit-news-btn')) {
            const ref = doc(db, "news", t.getAttribute('data-id'));
            getDoc(ref).then(snap => {
                if(snap.exists()) {
                    const data = snap.data();
                    document.getElementById('news-id').value = snap.id;
                    document.getElementById('news-title').value = data.title;
                    document.getElementById('news-content-editor').innerHTML = data.content;
                    document.getElementById('add-news-btn').textContent = "Uppdatera";
                    document.getElementById('nav-site-admin-link').click();
                    document.getElementById('add-news-form').scrollIntoView();
                }
            });
        }
        if (t.classList.contains('edit-class-btn')) {
            const cls = JSON.parse(t.getAttribute('data-obj'));
            document.getElementById('class-id').value = cls.id;
            document.getElementById('class-name').value = cls.name;
            document.getElementById('class-min-age').value = cls.minAge;
            document.getElementById('class-max-age').value = cls.maxAge;
            document.getElementById('class-discipline').value = cls.discipline;
            document.getElementById('class-desc').value = cls.description || '';
            document.getElementById('create-class-btn').textContent = "Uppdatera";
            document.getElementById('cancel-class-edit-btn').classList.remove('hidden');
            if(!document.getElementById('installningar').classList.contains('active')) document.getElementById('nav-site-admin-link').click();
            document.getElementById('create-class-form').scrollIntoView();
        }
        if (t.classList.contains('edit-sponsor-btn')) {
            editingSponsorId = t.getAttribute('data-id');
            document.getElementById('sponsor-form-title').textContent = "Redigera Sponsor";
            document.getElementById('add-sponsor-form').scrollIntoView();
        }
    });

    document.getElementById('cancel-class-edit-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('create-class-form').reset();
        document.getElementById('class-id').value = '';
        document.getElementById('create-class-btn').textContent = "Skapa Klass";
        e.target.classList.add('hidden');
    });

    checkNewsForm(); checkHistoryForm(); checkEventForm();
}

function selectImage(url) {
    if (currentImageTargetInput) currentImageTargetInput.value = url;
    if (currentImagePreviewImg) { currentImagePreviewImg.src = url; currentImagePreviewImg.classList.remove('hidden'); }
    document.getElementById('imageSelectionModal')?.classList.remove('active');
}

import { imagesData } from "./data-service.js"; 
function loadImagesForSelector() {
    const el = document.getElementById('image-selection-grid');
    if(!el) return;
    el.innerHTML = '';
    imagesData.forEach(img => {
        const div = document.createElement('div');
        div.className = "cursor-pointer border-2 hover:border-blue-500 h-32 bg-gray-100";
        div.innerHTML = `<img src="${img.url}" class="w-full h-full object-cover">`;
        div.addEventListener('click', () => selectImage(img.url));
        el.appendChild(div);
    });
}