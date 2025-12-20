// event-listeners.js
import { 
    addOrUpdateDocument, deleteDocument, toggleLike, updateProfile, 
    updateProfileByAdmin, updateSiteSettings, addAdminFromUser, 
    deleteAdmin, saveResult, createShooterProfile, linkUserToShooter, 
    updateShooterProfile, updateUserResult, toggleMemberStatus 
} from "./data-service.js";

import { 
    showModal, hideModal, showDeleteProfileModal, showDeleteUserModal, 
    showEditUserModal, showShareModal, applyEditorCommand, updateToolbarButtons,
    showUserInfoModal, navigate
} from "./ui-handler.js";

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
        // Stäng menyn när man klickar på en länk
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.add('hidden');
            });
        });
    }

    // --- LOGGA UT ---
    const logoutBtn = document.getElementById('logout-btn'); // Om denna finns i menyn
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.hash = '#hem'; // Skicka till hem vid utloggning
                showModal('confirmationModal', "Du har loggats ut.");
            } catch (error) {
                console.error("Fel vid utloggning:", error);
            }
        });
    }

    // --- SKAPA NYHET ---
    const addNewsForm = document.getElementById('add-news-form');
    if (addNewsForm) {
        addNewsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentDiv = document.getElementById('news-content-editor');
            const hiddenInput = document.getElementById('news-content-hidden');
            hiddenInput.value = contentDiv.innerHTML;

            const newsData = {
                title: document.getElementById('news-title').value,
                date: document.getElementById('news-date').value,
                content: hiddenInput.value,
                likes: {}
            };
            await addOrUpdateDocument('news', null, newsData, "Nyheten har publicerats!", "Kunde inte publicera nyheten.");
            addNewsForm.reset();
            contentDiv.innerHTML = '';
        });
    }

    // --- SKAPA KALENDERHÄNDELSE ---
    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        // Visa/dölj fält för återkommande händelser
        const isRecurringCheckbox = document.getElementById('is-recurring');
        const singleEventFields = document.getElementById('single-event-fields');
        const recurringEventFields = document.getElementById('recurring-event-fields');

        if (isRecurringCheckbox && singleEventFields && recurringEventFields) {
            isRecurringCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    singleEventFields.classList.add('hidden');
                    recurringEventFields.classList.remove('hidden');
                    document.getElementById('event-date').removeAttribute('required');
                    document.getElementById('start-date').setAttribute('required', 'true');
                    document.getElementById('end-date').setAttribute('required', 'true');
                } else {
                    singleEventFields.classList.remove('hidden');
                    recurringEventFields.classList.add('hidden');
                    document.getElementById('event-date').setAttribute('required', 'true');
                    document.getElementById('start-date').removeAttribute('required');
                    document.getElementById('end-date').removeAttribute('required');
                }
            });
        }

        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentDiv = document.getElementById('event-description-editor');
            const hiddenInput = document.getElementById('event-description-hidden');
            hiddenInput.value = contentDiv.innerHTML;

            const isRecurring = document.getElementById('is-recurring').checked;
            const title = document.getElementById('event-title').value;
            const description = hiddenInput.value;

            if (isRecurring) {
                // Hantera återkommande händelser
                const startDate = new Date(document.getElementById('start-date').value);
                const endDate = new Date(document.getElementById('end-date').value);
                const weekday = parseInt(document.getElementById('weekday-select').value);
                const seriesId = Date.now().toString(); // Unikt ID för serien

                let currentDate = new Date(startDate);
                let eventsCreated = 0;

                while (currentDate <= endDate) {
                    if (currentDate.getDay() === weekday) {
                        const eventData = {
                            title: title,
                            date: currentDate.toISOString().split('T')[0],
                            description: description,
                            seriesId: seriesId
                        };
                        // Vi kör dessa parallellt men väntar inte på varje för UI-flyt, 
                        // men i en riktig app borde man kanske använda batch.
                        addOrUpdateDocument('events', null, eventData, "Serie skapad", "Fel vid skapande");
                        eventsCreated++;
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                if (eventsCreated > 0) {
                     showModal('confirmationModal', `${eventsCreated} händelser har skapats i serien!`);
                     addEventForm.reset();
                     contentDiv.innerHTML = '';
                } else {
                     showModal('errorModal', "Inga datum matchade vald veckodag i intervallet.");
                }

            } else {
                // Enskild händelse
                const eventData = {
                    title: title,
                    date: document.getElementById('event-date').value,
                    description: description
                };
                await addOrUpdateDocument('events', null, eventData, "Händelsen har lagts till!", "Kunde inte lägga till händelsen.");
                addEventForm.reset();
                contentDiv.innerHTML = '';
            }
        });
    }

    // --- SKAPA HISTORIK ---
    const addHistoryForm = document.getElementById('add-history-form');
    if (addHistoryForm) {
        addHistoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentDiv = document.getElementById('history-content-editor');
            const hiddenInput = document.getElementById('history-content-hidden');
            hiddenInput.value = contentDiv.innerHTML;

            const historyData = {
                title: document.getElementById('history-title').value,
                priority: parseInt(document.getElementById('history-priority').value),
                content: hiddenInput.value,
                likes: {}
            };
            await addOrUpdateDocument('history', null, historyData, "Historikpost tillagd!", "Kunde inte lägga till historik.");
            addHistoryForm.reset();
            contentDiv.innerHTML = '';
        });
    }

    // --- SKAPA TÄVLINGSRAPPORT (CMS) ---
    const addCompForm = document.getElementById('add-competition-form');
    if (addCompForm) {
        addCompForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentDiv = document.getElementById('comp-content-editor');
            
            const compData = {
                title: document.getElementById('comp-title').value,
                date: document.getElementById('comp-date').value,
                location: document.getElementById('comp-location').value,
                content: contentDiv.innerHTML,
                pdfUrl: document.getElementById('comp-pdf-url').value || null,
                storagePath: document.getElementById('comp-storage-path').value || null
            };
            
            await addOrUpdateDocument('competitions', null, compData, "Tävlingsrapport publicerad!", "Kunde inte publicera rapport.");
            
            addCompForm.reset();
            contentDiv.innerHTML = '';
            document.getElementById('comp-pdf-name').textContent = '';
            document.getElementById('comp-upload-progress-container').classList.add('hidden');
        });
    }

    // --- SKAPA BILD ---
    const addImageForm = document.getElementById('add-image-form');
    if (addImageForm) {
        addImageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Kolla om vi har en uppladdad bild-URL eller en manuell länk
            // I upload-handler.js sätter vi dataset.uploadedUrl på formen eller liknande, 
            // men här verkar vi behöva hantera logiken.
            // Förenkling: Vi kollar om det finns en URL i "image-url"-fältet. 
            // Om upload-handler har kört, borde den ha fyllt i det fältet eller så litar vi på upload-handlerns state.
            
            // OBS: I din upload-handler fylls oftast ett input-fält eller så returneras URLen.
            // Låt oss anta att upload-handler sätter värdet i 'image-url' inputen om man klistrar in,
            // men för file-upload hanteras det oftast via en hidden input eller direkt.
            
            // Kontrollera om en uppladdning gjorts via upload-handler logic (som vi inte ser här i detalj men antar sätter hidden field eller liknande).
            // Vi använder input-fältet 'image-url' som "master" för URLen här.
            const url = document.getElementById('image-url').value;
            
            if (!url) {
                showModal('errorModal', "Du måste välja en bild eller ange en URL.");
                return;
            }

            const imageData = {
                title: document.getElementById('image-title').value,
                year: parseInt(document.getElementById('image-year').value),
                month: parseInt(document.getElementById('image-month').value),
                priority: parseInt(document.getElementById('image-priority').value),
                url: url,
                // Om det var en filuppladdning kanske vi har en storagePath sparad i ett hidden field?
                // För enkelhetens skull här, om det inte finns hidden field, blir det null.
                storagePath: document.getElementById('image-url').dataset.storagePath || null 
            };

            await addOrUpdateDocument('images', null, imageData, "Bild tillagd i galleriet!", "Kunde inte lägga till bild.");
            addImageForm.reset();
            document.getElementById('file-name-display').textContent = "Ingen fil vald";
            document.getElementById('clear-image-upload').classList.add('hidden');
            document.getElementById('upload-progress-container').classList.add('hidden');
        });
    }

    // --- SKAPA SPONSOR ---
    const addSponsorForm = document.getElementById('add-sponsor-form');
    if (addSponsorForm) {
        addSponsorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const logoUrl = document.getElementById('sponsor-logo-url').value;
             if (!logoUrl) {
                showModal('errorModal', "Du måste ladda upp eller ange URL till logotyp.");
                return;
            }

            const sponsorData = {
                name: document.getElementById('sponsor-name').value,
                extraText: document.getElementById('sponsor-extra-text').value,
                url: document.getElementById('sponsor-url').value,
                priority: parseInt(document.getElementById('sponsor-priority').value),
                size: document.getElementById('sponsor-size').value,
                logoUrl: logoUrl,
                storagePath: document.getElementById('sponsor-logo-url').dataset.storagePath || null
            };

            await addOrUpdateDocument('sponsors', null, sponsorData, "Sponsor tillagd!", "Kunde inte lägga till sponsor.");
            addSponsorForm.reset();
            document.getElementById('sponsor-logo-name-display').textContent = "Ingen fil vald";
            document.getElementById('clear-sponsor-logo-upload').classList.add('hidden');
            document.getElementById('sponsor-upload-progress-container').classList.add('hidden');
        });
    }

    // --- SKAPA SKJUTKLASS (ADMIN - STATISTIK) ---
    // Detta är koden du efterfrågade för att få formuläret att fungera
    const addClassForm = document.getElementById('add-class-form');
    if (addClassForm) {
        addClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('class-name').value;
            const discipline = document.getElementById('class-discipline').value;
            const minAge = parseInt(document.getElementById('class-min-age').value);
            const maxAge = parseInt(document.getElementById('class-max-age').value);
            const desc = document.getElementById('class-desc').value;

            const classData = {
                name: name,
                discipline: discipline,
                minAge: isNaN(minAge) ? 0 : minAge,
                maxAge: isNaN(maxAge) ? 99 : maxAge,
                description: desc
            };

            // 'competitionClasses' är namnet på samlingen i Firebase
            await addOrUpdateDocument('competitionClasses', null, classData, "Ny klass tillagd!", "Kunde inte lägga till klass.");
            
            addClassForm.reset();
        });
    }


    // --- INSTÄLLNINGAR (ADMIN) ---
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                logoUrl: document.getElementById('logo-url-input').value,
                headerColor: document.getElementById('header-color-input').value,
                showSponsors: document.getElementById('show-sponsors-checkbox').checked,
                contactAddress: document.getElementById('contact-address-input').value,
                contactLocation: document.getElementById('contact-location-input').value,
                contactPhone: document.getElementById('contact-phone-input').value,
                contactEmail: document.getElementById('contact-email-input').value
            };
            await updateSiteSettings(data);
        });
    }

    // --- MIN PROFIL ---
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (user) {
                const data = {
                    name: document.getElementById('profile-name-input').value,
                    address: document.getElementById('profile-address-input').value,
                    phone: document.getElementById('profile-phone-input').value,
                    birthyear: document.getElementById('profile-birthyear-input').value,
                    mailingList: document.getElementById('profile-mailing-list-checkbox').checked
                };
                await updateProfile(user.uid, data);
            }
        });
    }

    // --- RAPPORTERA RESULTAT ---
    const resultForm = document.getElementById('add-result-form');
    if (resultForm) {
        resultForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const shooterId = document.getElementById('shooter-selector').value;
            if (!shooterId) {
                showModal('errorModal', "Du måste välja en skytt.");
                return;
            }

            const seriesInputs = document.querySelectorAll('.series-input');
            const series = Array.from(seriesInputs).map(input => parseFloat(input.value) || 0);
            
            // Hämta total och bestSeries från det som räknats ut live
            const totalScore = parseFloat(document.getElementById('live-total-display').textContent) || 0;
            const bestSeries = parseFloat(document.getElementById('live-best-series').textContent) || 0;

            // Hämta badges som räknats ut av result-handler (sparas temporärt på formuläret eller via global state)
            // För enkelhetens skull, låt oss anta att vi räknar ut dem igen i backend eller att de sparas med resultatet.
            // I din result-handler.js verkar logiken för märken köras live. 
            // Vi hämtar "tjing"-statusen från UI om möjligt, eller låter data-service räkna.
            // Här: Vi litar på att data-service.js eller result-handler.js hanterar logiken.
            // Men för att spara märken måste vi veta vilka det blev.
            // Lösning: Vi hämtar de badges som visas i UI just nu (om vi har implementerat visning vid inmatning).
            // Annars skickar vi bara datan och låter en Cloud Function eller klienten vid visning räkna ut det.
            // I ditt fall verkar `result-handler.js` ha `checkBadges`-funktionen.
            
            // Vi hämtar den array av märken som eventuellt sparats på formuläret av result-handler
            const earnedBadges = resultForm.dataset.earnedBadges ? JSON.parse(resultForm.dataset.earnedBadges) : [];
            const seriesMedals = resultForm.dataset.seriesMedals ? JSON.parse(resultForm.dataset.seriesMedals) : [];

            const resultData = {
                shooterId: shooterId,
                registeredBy: auth.currentUser.uid,
                date: document.getElementById('result-date').value,
                type: document.getElementById('result-type').value,
                discipline: document.getElementById('result-discipline').value,
                shotCount: parseInt(document.getElementById('result-shot-count').value),
                series: series,
                total: totalScore,
                bestSeries: bestSeries,
                sharedWithClub: document.getElementById('result-share-checkbox').checked,
                earnedBadges: earnedBadges, // Array med namn på märken (t.ex. "Guld", "Silver")
                seriesMedals: seriesMedals // Array med märken per serie (för statistik)
            };

            await saveResult(resultData);
            
            // Nollställ formuläret men behåll datum och skytt för smidighet
            const currentDate = document.getElementById('result-date').value;
            const currentShooter = document.getElementById('shooter-selector').value;
            resultForm.reset();
            document.getElementById('result-date').value = currentDate;
            document.getElementById('shooter-selector').value = currentShooter;
            document.getElementById('live-total-display').textContent = '0';
            document.getElementById('live-best-series').textContent = '-';
            
            // Uppdatera grafen
            loadAndRenderChart(currentShooter);
        });
    }

    // --- LÄGG TILL SKYTT (ADD SHOOTER MODAL) ---
    const addShooterForm = document.getElementById('add-shooter-form');
    if (addShooterForm) {
        addShooterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('new-shooter-name').value;
            const birthyear = document.getElementById('new-shooter-birthyear').value;
            
            await createShooterProfile(auth.currentUser.uid, name, birthyear);
            hideModal('addShooterModal');
            addShooterForm.reset();
        });
    }

    // --- KOPPLA SKYTT TILL ANVÄNDARE (ADMIN) ---
    const confirmLinkBtn = document.getElementById('confirm-link-parent-btn');
    if (confirmLinkBtn) {
        confirmLinkBtn.addEventListener('click', async () => {
            const shooterId = document.getElementById('link-shooter-id').value;
            const userId = document.getElementById('link-parent-select').value;
            
            if (shooterId && userId) {
                await linkUserToShooter(shooterId, userId);
                hideModal('linkParentModal');
            }
        });
    }

    // --- INSTÄLLNINGAR FÖR SKYTT (EDIT SHOOTER MODAL) ---
    const editShooterForm = document.getElementById('edit-shooter-form');
    if (editShooterForm) {
        editShooterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-shooter-id').value;
            const data = {
                name: document.getElementById('edit-shooter-name').value,
                birthyear: parseInt(document.getElementById('edit-shooter-birthyear').value),
                settings: {
                    trackMedals: document.getElementById('edit-shooter-gamification').checked,
                    defaultShareResults: document.getElementById('edit-shooter-share').checked
                }
            };
            await updateShooterProfile(id, data);
            hideModal('editShooterModal');
        });
    }

    // --- REDIGERA ANVÄNDARE (ADMIN MODAL) ---
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uid = document.getElementById('edit-user-id').value;
            const data = {
                name: document.getElementById('edit-user-name').value,
                address: document.getElementById('edit-user-address').value,
                phone: document.getElementById('edit-user-phone').value,
                birthyear: document.getElementById('edit-user-birthyear').value,
                mailingList: document.getElementById('edit-user-mailing-list').checked
            };
            await updateProfileByAdmin(uid, data);
            hideModal('editUserModal');
        });
    }

    // --- REDIGERA RESULTAT (USER MODAL) ---
    const editResultForm = document.getElementById('edit-result-form');
    if (editResultForm) {
        editResultForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultId = document.getElementById('edit-result-id').value;
            const data = {
                date: document.getElementById('edit-result-date').value,
                type: document.getElementById('edit-result-type').value,
                discipline: document.getElementById('edit-result-discipline').value,
                sharedWithClub: document.getElementById('edit-result-share').checked
            };
            await updateUserResult(resultId, data);
            hideModal('editResultModal');
            // Uppdatera listan/grafen
            const shooterId = document.getElementById('shooter-selector').value;
            if(shooterId) loadAndRenderChart(shooterId);
        });
    }

    // --- GLOBAL DELETE / ACTION LISTENER (Dynamiska element) ---
    document.addEventListener('click', async (e) => {
        
        // Ta bort-knappar (Generell funktion)
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            const type = e.target.getAttribute('data-type');
            
            if (id && type) {
                // Särskild hantering för events (serier)
                if (type === 'events') {
                    const seriesId = e.target.getAttribute('data-series-id');
                    if (seriesId) {
                        // Visa modal för serie-borttagning
                        const modal = document.getElementById('deleteEventModal');
                        document.getElementById('delete-event-message').textContent = "Detta är en del av en återkommande serie.";
                        modal.classList.add('active');
                        
                        // Koppla knapparna i modalen
                        const delSingle = document.getElementById('delete-single-event-btn');
                        const delSeries = document.getElementById('delete-series-event-btn');
                        const cancel = document.getElementById('cancel-event-delete-btn');
                        
                        // Kloning för att ta bort gamla listeners
                        const newDelSingle = delSingle.cloneNode(true);
                        const newDelSeries = delSeries.cloneNode(true);
                        const newCancel = cancel.cloneNode(true);
                        
                        delSingle.parentNode.replaceChild(newDelSingle, delSingle);
                        delSeries.parentNode.replaceChild(newDelSeries, delSeries);
                        cancel.parentNode.replaceChild(newCancel, cancel);

                        newDelSingle.addEventListener('click', async () => {
                            hideModal('deleteEventModal');
                            if(confirm("Radera denna enskilda händelse?")) {
                                await deleteDocument(id, 'events');
                            }
                        });
                        
                        newDelSeries.addEventListener('click', async () => {
                            hideModal('deleteEventModal');
                            if(confirm("Radera HELA serien av händelser?")) {
                                await deleteDocument(null, 'events', seriesId);
                            }
                        });

                        newCancel.addEventListener('click', () => hideModal('deleteEventModal'));

                    } else {
                        if (confirm("Är du säker på att du vill ta bort denna händelse?")) {
                            await deleteDocument(id, 'events');
                        }
                    }
                } else {
                    // Standard borttagning
                    if (confirm("Är du säker på att du vill ta bort detta?")) {
                        await deleteDocument(id, type);
                    }
                }
            }
        }

        // Like-knapp
        if (e.target.closest('.like-btn')) {
            const btn = e.target.closest('.like-btn');
            const id = btn.getAttribute('data-id');
            const type = btn.getAttribute('data-type');
            const user = auth.currentUser;
            if (user && id && type) {
                await toggleLike(id, type, user.uid);
            } else if (!user) {
                showModal('errorModal', "Du måste vara inloggad för att gilla.");
            }
        }
        
        // Dela-knapp
        if (e.target.closest('.share-btn')) {
            const btn = e.target.closest('.share-btn');
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            
            // Skapa en länk till specifikt inlägg (använder hash-navigering)
            // T.ex. https://sidan.se/#nyheter#news-123
            const url = `${window.location.origin}${window.location.pathname}#${window.location.hash.split('#')[1] || 'nyheter'}#news-${id}`;
            showShareModal(title, url);
        }

        // --- EDITOR KNAPPAR ---
        if (e.target.closest('.editor-toolbar button')) {
            e.preventDefault(); // Förhindra formulär-submit
            const btn = e.target.closest('button');
            const command = btn.getAttribute('data-command');
            const toolbar = btn.parentElement;
            const editorId = toolbar.getAttribute('data-editor-target');
            const editor = document.getElementById(editorId);

            if (command === 'createLink') {
                const url = prompt("Ange länkens URL:", "https://");
                if (url) applyEditorCommand(editor, command, url);
            } else if (command === 'insertImage') {
                const url = prompt("Ange bildens URL:", "https://");
                if (url) applyEditorCommand(editor, command, url);
            } else if (command === 'insertGold' || command === 'insertSilver' || command === 'insertBronze') {
                // Special för tävlingsrapport - infoga medalj-emoji
                const emoji = btn.textContent;
                editor.focus();
                document.execCommand('insertText', false, emoji);
            } else {
                applyEditorCommand(editor, command);
            }
            updateToolbarButtons(editor);
        }

        // Admin: Lägg till administratör
        if (e.target.classList.contains('add-admin-btn')) {
            const userId = e.target.getAttribute('data-id');
            if (confirm("Är du säker på att du vill ge denna användare administratörsrättigheter?")) {
                await addAdminFromUser(userId);
            }
        }

        // Admin: Ta bort administratör
        if (e.target.classList.contains('delete-admin-btn')) {
            const userId = e.target.getAttribute('data-id');
            if (confirm("Är du säker på att du vill ta bort admin-rättigheterna för denna användare?")) {
                await deleteAdmin(userId);
            }
        }
        
        // Admin: Hantera medlemskap (Toggle)
        if (e.target.classList.contains('toggle-member-btn')) {
            const userId = e.target.dataset.id;
            const currentStatus = e.target.dataset.status === "true"; // Konvertera sträng till boolean
            await toggleMemberStatus(userId, currentStatus);
        }

        // Admin: Visa redigera användare modal
        if (e.target.classList.contains('edit-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            // Hämta användardata från UI (lite fult, men sparar en db-läsning) 
            // Bättre vore att hämta från usersData arrayen i data-service om den exporterades.
            // Vi gör en sökning i DOM eller hämtar via ID om vi har tillgång. 
            // Enklast här: Vi har ingen global users-lista tillgänglig direkt i event-listener utan import.
            // Lösning: Vi letar upp knappen och dess förälder för att hitta data? Nej.
            // Vi importerar usersData från data-service.js? Nej, det är en live-array.
            // Vi skickar med datan på knappen? Ja, det vore bäst i render-funktionen.
            // FALLBACK: Vi gör inget här för jag kan inte garantera datan. 
            // FIX: I ui-handler.js renderAdminsAndUsers måste vi lägga till logik för att öppna modalen.
            // Det verkar redan finnas showEditUserModal i ui-handler.
            // Vi behöver hämta användaren. 
            // Vi importerar usersData från data-service.js (det är en export)
            const { usersData } = await import("./data-service.js");
            const user = usersData.find(u => u.id === userId);
            if(user) showEditUserModal(user);
        }
        
        // Visa användarinfo modal
        if (e.target.classList.contains('show-user-info-btn')) {
             const userId = e.target.getAttribute('data-id');
             const { usersData } = await import("./data-service.js");
             const user = usersData.find(u => u.id === userId);
             if(user) showUserInfoModal(user);
        }
        
        // Admin: Redigera tävling (Ladda in i formuläret)
        if (e.target.classList.contains('edit-comp-btn')) {
            const compId = e.target.dataset.id;
            const { competitionsData } = await import("./data-service.js");
            const comp = competitionsData.find(c => c.id === compId);
            if (comp) {
                if(confirm("Vill du redigera denna rapport? (Formuläret fylls i och den gamla tas bort vid sparning om du inte ändrar logiken, men här gör vi det enkelt: Ta bort gammal manuellt eller skapa update-funktion. \n\nI denna version: Vi tar bort den gamla och du får spara en ny.)")) {
                    await deleteDocument(compId, 'competitions');
                    document.getElementById('comp-title').value = comp.title;
                    document.getElementById('comp-date').value = comp.date;
                    document.getElementById('comp-location').value = comp.location;
                    document.getElementById('comp-content-editor').innerHTML = comp.content;
                    document.getElementById('comp-pdf-url').value = comp.pdfUrl || '';
                    document.getElementById('add-competition-form').scrollIntoView();
                }
            }
        }
        
        // Admin: Redigera skjutklass (Den nya koden du ville ha)
        if (e.target.classList.contains('edit-class-btn')) {
            const cls = JSON.parse(e.target.dataset.obj);
            if(confirm(`Vill du redigera klassen "${cls.name}"?\n\nDetta tar bort den nuvarande och fyller i formuläret så du kan spara den på nytt.`)) {
                await deleteDocument(cls.id, 'competitionClasses');
                
                document.getElementById('class-name').value = cls.name;
                document.getElementById('class-discipline').value = cls.discipline;
                document.getElementById('class-min-age').value = cls.minAge;
                document.getElementById('class-max-age').value = cls.maxAge;
                document.getElementById('class-desc').value = cls.description || '';
                
                document.getElementById('add-class-form').scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Öppna modaler
        if (e.target.id === 'open-add-shooter-modal-btn') {
            document.getElementById('addShooterModal').classList.add('active');
        }
        if (e.target.id === 'edit-shooter-btn') {
             const shooterId = document.getElementById('shooter-selector').value;
             if (!shooterId) {
                 showModal('errorModal', "Ingen skytt vald.");
                 return;
             }
             // Hämta data
             const { allShootersData } = await import("./data-service.js");
             const shooter = allShootersData.find(s => s.id === shooterId);
             
             document.getElementById('edit-shooter-id').value = shooter.id;
             document.getElementById('edit-shooter-name').value = shooter.name;
             document.getElementById('edit-shooter-birthyear').value = shooter.birthyear;
             
             if (shooter.settings) {
                 document.getElementById('edit-shooter-gamification').checked = shooter.settings.trackMedals || false;
                 document.getElementById('edit-shooter-share').checked = shooter.settings.defaultShareResults || false;
             }
             
             document.getElementById('editShooterModal').classList.add('active');
        }
        
        // Stänga modaler (generic)
        if (e.target.classList.contains('modal-close-btn')) {
            const modal = e.target.closest('.modal');
            modal.classList.remove('active');
        }
    });

    // --- ÖVRIGA UI-EVENTS ---
    
    // Hantera val av skytt (uppdatera graf)
    const shooterSelector = document.getElementById('shooter-selector');
    if (shooterSelector) {
        shooterSelector.addEventListener('change', (e) => {
            const shooterId = e.target.value;
            loadAndRenderChart(shooterId);
        });
    }

    // Hantera val av publik skytt (topplistor)
    const publicShooterSelector = document.getElementById('public-shooter-selector');
    if (publicShooterSelector) {
        publicShooterSelector.addEventListener('change', async (e) => {
            const shooterId = e.target.value;
            // Vi behöver importera hjälpfunktioner för detta
            const { renderPublicShooterStats } = await import("./ui-handler.js");
            const { latestResultsCache, allShootersData } = await import("./data-service.js");
            renderPublicShooterStats(shooterId, latestResultsCache, allShootersData);
        });
    }
    
    // Kopiera maillista
    const copyMailBtn = document.getElementById('copy-mailing-list-btn');
    if (copyMailBtn) {
        copyMailBtn.addEventListener('click', () => {
             const listDiv = document.getElementById('mailing-list-report');
             // Extrahera alla e-postadresser
             const text = listDiv.innerText.replace(/E-post: /g, '').replace(/\n\n/g, '; '); 
             // Enkel regex-städning om det behövs, men innerText brukar funka ok här
             
             navigator.clipboard.writeText(text).then(() => {
                 showModal('confirmationModal', "E-postadresser kopierade till urklipp!");
             });
        });
    }

    // Admin: Koppla förälder till skytt
    // Vi använder en dynamisk listener i renderShootersAdmin, men här hanterar vi öppnandet av modalen
    // via global click listener eller via specifika knappar om de ritas om.
    // Eftersom shooters-listan ritas om dynamiskt, hanterar vi klicket i global listenern?
    // Nej, låt oss lägga till det i global listener för enkelhetens skull.
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('link-parent-btn')) {
            const shooterId = e.target.dataset.id;
            const shooterName = e.target.dataset.name;
            
            document.getElementById('link-shooter-id').value = shooterId;
            const select = document.getElementById('link-parent-select');
            select.innerHTML = '<option>Laddar...</option>';
            document.getElementById('linkParentModal').classList.add('active');
            
            // Fyll selecten
            const { usersData } = await import("./data-service.js");
            select.innerHTML = '';
            usersData.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.email} (${u.name || 'Inget namn'})`;
                select.appendChild(opt);
            });
        }
    });

    // Hantera "Shot count" knappar i resultatformuläret
    document.querySelectorAll('.shot-count-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Återställ alla knappar
            document.querySelectorAll('.shot-count-btn').forEach(b => {
                b.classList.remove('bg-white', 'shadow', 'text-blue-800', 'font-bold');
                b.classList.add('text-gray-600', 'hover:bg-white/50');
            });
            
            // Markera vald
            e.target.classList.add('bg-white', 'shadow', 'text-blue-800', 'font-bold');
            e.target.classList.remove('text-gray-600', 'hover:bg-white/50');
            
            const count = parseInt(e.target.getAttribute('data-count'));
            document.getElementById('result-shot-count').value = count;
            
            // Uppdatera antal inmatningsrutor
            const container = document.getElementById('series-inputs-container');
            container.innerHTML = '';
            const seriesCount = count / 10;
            
            for (let i = 1; i <= seriesCount; i++) {
                const div = document.createElement('div');
                div.className = "text-center";
                div.innerHTML = `
                    <span class="text-xs text-gray-500 block mb-1">Serie ${i}</span>
                    <input type="text" inputmode="decimal" class="series-input w-full p-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="-">
                `;
                container.appendChild(div);
            }
            
            // Lägg på lyssnare för live-räkning
            setupLiveScoreCalculation();
        });
    });

    // Initiera live-räkning för default (20 skott)
    setupLiveScoreCalculation();

    // Hantera editor-uppdateringar
    document.querySelectorAll('.editor-content').forEach(editor => {
        editor.addEventListener('keyup', () => updateToolbarButtons(editor));
        editor.addEventListener('mouseup', () => updateToolbarButtons(editor));
    });
}

function setupLiveScoreCalculation() {
    const inputs = document.querySelectorAll('.series-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            let total = 0;
            let best = 0;
            inputs.forEach(i => {
                // Ersätt komma med punkt för decimaltal
                let valStr = i.value.replace(',', '.');
                let val = parseFloat(valStr);
                if (!isNaN(val)) {
                    total += val;
                    if (val > best) best = val;
                }
            });
            
            // Avrunda totalen till 1 decimal för att undvika flyttalsfel
            total = Math.round(total * 10) / 10;
            
            document.getElementById('live-total-display').textContent = total;
            document.getElementById('live-best-series').textContent = best > 0 ? best : '-';
        });
    });
}