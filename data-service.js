// event-listeners.js
import { 
    addOrUpdateDocument, deleteDocument, toggleLike, updateProfile, 
    updateProfileByAdmin, updateSiteSettings, addAdminFromUser, 
    deleteAdmin, saveResult, createShooterProfile, linkUserToShooter, 
    updateShooterProfile, updateUserResult, toggleMemberStatus , uploadDocumentFile
} from "./data-service.js";

import { 
    showModal, hideModal, showDeleteProfileModal, showDeleteUserModal, 
    showEditUserModal, showShareModal, applyEditorCommand, updateToolbarButtons,
    showUserInfoModal, navigate
} from "./ui-handler.js";

import { checkNewsForm } from "./form-validation.js";

import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { loadAndRenderChart } from "./statistics-chart.js";

export function setupEventListeners() {
    
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
    const deleteUserBtn = document.getElementById('delete-user-btn');

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
    
    // --- ADMINHANTERING (KNAPPAR) ---
    // Vi använder "event delegation" på hela dokumentet för dynamiskt skapade knappar
    document.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Ta bort (Generisk)
        if (target.classList.contains('delete-btn')) {
            const id = target.getAttribute('data-id');
            const type = target.getAttribute('data-type');
            if (confirm("Är du säker på att du vill ta bort detta?")) {
                await deleteDocument(type, id, "Borttaget!", "Kunde inte ta bort.");
            }
        }

        // Gilla
        if (target.closest('.like-btn')) {
            const btn = target.closest('.like-btn');
            const id = btn.getAttribute('data-id');
            const type = btn.getAttribute('data-type'); 
            const likesText = btn.querySelector('.like-count').textContent;
            const currentLikes = parseInt(likesText) || 0;
            // OBS: Vi behöver hämta 'likedBy' från datan egentligen. 
            // För enkelhetens skull skickar vi null här och låter data-service lösa toggling via backend-logik om möjligt,
            // eller så måste vi skicka med listan. I min data-service-lösning hanterar jag det via arrayUnion/Remove.
            // Men vi vet inte om användaren redan gillat BARA genom knappen.
            // UI-handlern sätter data-liked="true/false".
            const hasLiked = btn.getAttribute('data-liked') === 'true';
            
            // Vi fuskar lite och skickar en array med uid om vi gillat, annars tom/null, 
            // så toggleLike fattar om den ska lägga till eller ta bort.
            const dummyLikedBy = hasLiked ? [auth.currentUser.uid] : []; 
            
            await toggleLike(id, currentLikes, dummyLikedBy);
        }

        // Dela
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
        if (target.classList.contains('edit-user-btn')) {
            // Hämta user-objektet från data-service via ID hade varit snyggast, 
            // men vi kan fuska och hämta från DOM eller global lista
            // För nu: Vi implementerar edit user modal-öppning i ui-handler och anropar den här
            // Detta kräver att vi har tillgång till usersData. Vi gör en enkel lösning:
            // Vi skickar bara ID till en funktion som letar upp datan.
            // (Detta implementerades inte fullt ut i ui-handler tidigare, men vi lägger stubben)
            console.log("Edit user clicked", target.getAttribute('data-user-id'));
            // TODO: Implementera full editering om det behövs
        }
        
        // --- ADMIN: SKYTTAR ---
        if (target.classList.contains('link-parent-btn')) {
            const shooterId = target.getAttribute('data-id');
            const name = target.getAttribute('data-name');
            const email = prompt(`Ange E-POST för föräldern som ska kopplas till ${name}:`);
            if (email) {
                // Vi måste hitta userId baserat på email. Det går inte direkt i klienten utan att söka i alla users.
                // Vi gör en sökning i usersData (som måste importeras eller nås).
                // Enklast: Säg till admin att ange ID istället, eller bygg en dropdown.
                // För nu: Vi ber om ID för att det är säkrast med nuvarande kod.
                const userId = prompt("Ange användarens ID (finns i användarlistan under Info):");
                if (userId) await linkUserToShooter(userId, shooterId);
            }
        }

        // --- ADMIN: KLASSER (FIXAD EDITERING) ---
        if (target.classList.contains('edit-class-btn')) {
            const json = target.getAttribute('data-obj');
            if (json) {
                const cls = JSON.parse(json);
                // Fyll i formuläret
                document.getElementById('class-id').value = cls.id;
                document.getElementById('class-name').value = cls.name;
                document.getElementById('class-min-age').value = cls.minAge;
                document.getElementById('class-max-age').value = cls.maxAge;
                document.getElementById('class-discipline').value = cls.discipline;
                document.getElementById('class-desc').value = cls.description || '';
                
                // Byt text på knappen
                document.getElementById('create-class-btn').textContent = "Uppdatera Klass";
                document.getElementById('cancel-class-edit-btn').classList.remove('hidden');
                
                // Scrolla till formuläret
                document.getElementById('create-class-form').scrollIntoView({behavior: 'smooth'});
            }
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

    // --- SPARA INSTÄLLNINGAR (FIXAD) ---
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

    // --- DOKUMENTUPPLADDNING (Samma fix som tidigare) ---
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

    // --- PROFIL ---
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('profile-email-display').value; // Readonly, men behövs
            const name = document.getElementById('profile-name-input').value;
            const address = document.getElementById('profile-address-input').value;
            const phone = document.getElementById('profile-phone-input').value;
            const birthyear = document.getElementById('profile-birthyear-input').value;
            const mailingList = document.getElementById('profile-mailing-list-checkbox').checked;

            await updateProfileByAdmin(auth.currentUser.uid, { // Vi använder Admin-funktionen för den är mer generisk
                name, address, phone, birthyear: parseInt(birthyear), mailingList
            });
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

    // Text editor listeners
    document.querySelectorAll('.editor-content').forEach(editor => {
        editor.addEventListener('keyup', () => updateToolbarButtons(editor));
        editor.addEventListener('mouseup', () => updateToolbarButtons(editor));
    });
}