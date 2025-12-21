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

    // --- LOGGA UT ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.hash = '#hem';
                showModal('confirmationModal', "Du har loggats ut.");
            } catch (error) {
                console.error("Fel vid utloggning:", error);
            }
        });
    }

 // --- DOKUMENTUPPLADDNING ---
    const uploadDocForm = document.getElementById('upload-doc-form');
    if (uploadDocForm) {
        uploadDocForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // ÄNDRAT HÄR: Matchar nu id="doc-file" i index.html
            const fileInput = document.getElementById('doc-file'); 
            const file = fileInput ? fileInput.files[0] : null;

            // ÄNDRAT HÄR: Matchar nu id="doc-name" i index.html
            const nameInput = document.getElementById('doc-name');
            const name = nameInput ? nameInput.value : '';

            // ÄNDRAT HÄR: Matchar nu id="doc-category" i index.html (det är en input med datalist, inte en select)
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
                    // Dölj progressbaren igen efter lyckad uppladdning
                    const progressContainer = document.getElementById('doc-upload-progress');
                    if (progressContainer) progressContainer.classList.add('hidden');
                    
                    showModal('confirmationModal', "Filen har laddats upp!");
                }
            } catch (error) {
                console.error(error); // Logga felet så du ser det i konsolen
                showModal('errorModal', "Kunde inte ladda upp filen: " + error.message);
            }
        });
    }

    // --- SKAPA / UPPDATERA NYHET ---
    const addNewsForm = document.getElementById('add-news-form');
    if (addNewsForm) {
        // Kör validering när man skriver (så knappen tänds för nya nyheter)
        document.getElementById('news-title').addEventListener('input', checkNewsForm);
        document.getElementById('news-content-editor').addEventListener('input', checkNewsForm);

        addNewsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentDiv = document.getElementById('news-content-editor');
            const hiddenInput = document.getElementById('news-content-hidden');
            const editId = document.getElementById('news-edit-id').value || null; 
            
            hiddenInput.value = contentDiv.innerHTML;

            const newsData = {
                title: document.getElementById('news-title').value,
                date: document.getElementById('news-date').value,
                content: hiddenInput.value,
            };
            
            if (!editId) {
                newsData.likes = {};
                newsData.createdAt = new Date(); 
            } else {
                 newsData.updatedAt = new Date();
            }

            let msg = editId ? "Nyheten har uppdaterats!" : "Nyheten har publicerats!";
            await addOrUpdateDocument('news', editId, newsData, msg, "Kunde inte spara nyheten.");
            
            // Återställ formuläret och knappen
            addNewsForm.reset();
            contentDiv.innerHTML = '';
            document.getElementById('news-edit-id').value = ''; 
            document.getElementById('news-form-title').textContent = "Lägg till Nyhet";
            
            const btn = document.getElementById('add-news-btn');
            if(btn) {
                btn.textContent = "Lägg till";
                btn.disabled = true;
                btn.classList.add('bg-gray-400');
                btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            }
        });
    }

// --- SKAPA / UPPDATERA KALENDERHÄNDELSE ---
    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        // Logik för att visa/dölja återkommande fält
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
            const editId = document.getElementById('event-edit-id').value || null;

            hiddenInput.value = contentDiv.innerHTML;

            const isRecurring = document.getElementById('is-recurring').checked;
            const title = document.getElementById('event-title').value;
            const description = hiddenInput.value;

            // Om vi redigerar en specifik händelse, behandlar vi den som en "single event" update
            if (editId) {
                const eventData = {
                    title: title,
                    date: document.getElementById('event-date').value,
                    description: description
                };
                await addOrUpdateDocument('events', editId, eventData, "Händelsen uppdaterad!", "Kunde inte uppdatera.");
                
                // Återställning
                addEventForm.reset();
                contentDiv.innerHTML = '';
                document.getElementById('event-edit-id').value = '';
                document.getElementById('add-event-btn').textContent = "Lägg till i Kalender";
                return;
            }

            // --- SKAPA NYTT (Samma logik som förut) ---
            if (isRecurring) {
                const startDate = new Date(document.getElementById('start-date').value);
                const endDate = new Date(document.getElementById('end-date').value);
                const weekday = parseInt(document.getElementById('weekday-select').value);
                const seriesId = Date.now().toString(); 

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

// --- SKAPA / UPPDATERA HISTORIK ---
    const addHistoryForm = document.getElementById('add-history-form');
    if (addHistoryForm) {
        addHistoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentDiv = document.getElementById('history-content-editor');
            const hiddenInput = document.getElementById('history-content-hidden');
            const editId = document.getElementById('history-edit-id').value || null;
            
            hiddenInput.value = contentDiv.innerHTML;

            const historyData = {
                title: document.getElementById('history-title').value,
                priority: parseInt(document.getElementById('history-priority').value),
                content: hiddenInput.value
            };
            
            if (!editId) historyData.likes = {};

            const msg = editId ? "Historik uppdaterad!" : "Historik tillagd!";
            await addOrUpdateDocument('history', editId, historyData, msg, "Kunde inte spara.");
            
            addHistoryForm.reset();
            contentDiv.innerHTML = '';
            document.getElementById('history-edit-id').value = '';
            document.getElementById('add-history-btn').textContent = "Lägg till";
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

// --- SKAPA / UPPDATERA BILD ---
    const addImageForm = document.getElementById('add-image-form');
    if (addImageForm) {
        addImageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('image-url').value;
            const editId = document.getElementById('image-edit-id').value || null;
            
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
                storagePath: document.getElementById('image-url').dataset.storagePath || null 
            };

            const msg = editId ? "Bilden uppdaterad!" : "Bild tillagd!";
            await addOrUpdateDocument('images', editId, imageData, msg, "Kunde inte spara bild.");
            
            addImageForm.reset();
            document.getElementById('file-name-display').textContent = "Ingen fil vald";
            document.getElementById('image-edit-id').value = '';
            document.getElementById('add-image-btn').textContent = "Lägg till Bild";
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

    // --- SKAPA SKJUTKLASS ---
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
            const totalScore = parseFloat(document.getElementById('live-total-display').textContent) || 0;
            const bestSeries = parseFloat(document.getElementById('live-best-series').textContent) || 0;
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
                earnedBadges: earnedBadges, 
                seriesMedals: seriesMedals 
            };

            await saveResult(resultData);
            
            const currentDate = document.getElementById('result-date').value;
            const currentShooter = document.getElementById('shooter-selector').value;
            resultForm.reset();
            document.getElementById('result-date').value = currentDate;
            document.getElementById('shooter-selector').value = currentShooter;
            document.getElementById('live-total-display').textContent = '0';
            document.getElementById('live-best-series').textContent = '-';
            
            loadAndRenderChart(currentShooter);
        });
    }

    // --- MODALER (SKYTTAR & ANVÄNDARE) ---
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
            const shooterId = document.getElementById('shooter-selector').value;
            if(shooterId) loadAndRenderChart(shooterId);
        });
    }

    // --- GLOBAL CLICK LISTENER ---
    document.addEventListener('click', async (e) => {
        
        // ADMIN: REDIGERA NYHET (Fix för att fylla formuläret och tända knappen)
        if (e.target.classList.contains('edit-news-btn')) {
            const id = e.target.dataset.id;
            const { newsData } = await import("./data-service.js");
            const item = newsData.find(n => n.id === id);
            
            if (item) {
                document.getElementById('news-title').value = item.title;
                document.getElementById('news-date').value = item.date;
                document.getElementById('news-content-editor').innerHTML = item.content;
                document.getElementById('news-edit-id').value = item.id;
                
                // Scrolla upp
                const form = document.getElementById('add-news-form');
                form.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('news-form-title').textContent = `Redigera: ${item.title}`;
                
                // Tänd knappen manuellt och byt text
                const btn = document.getElementById('add-news-btn');
                if(btn) {
                    btn.disabled = false;
                    btn.classList.remove('bg-gray-400');
                    btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    btn.textContent = "Spara ändringar";
                }
                
                // Trigga validering för säkerhets skull
                checkNewsForm();
            }
        }
        // ADMIN: REDIGERA KALENDER
        if (e.target.classList.contains('edit-event-btn')) {
            const id = e.target.dataset.id;
            const { eventsData } = await import("./data-service.js");
            const item = eventsData.find(e => e.id === id);
            
            if (item) {
                document.getElementById('event-title').value = item.title;
                document.getElementById('event-date').value = item.date;
                document.getElementById('event-description-editor').innerHTML = item.description;
                document.getElementById('event-edit-id').value = item.id;
                
                // Se till att vi visar "Enskild händelse"-läget
                document.getElementById('is-recurring').checked = false;
                document.getElementById('single-event-fields').classList.remove('hidden');
                document.getElementById('recurring-event-fields').classList.add('hidden');
                
                document.getElementById('add-event-form').scrollIntoView({ behavior: 'smooth' });
                document.getElementById('add-event-btn').textContent = "Spara ändringar";
            }
        }

        // ADMIN: REDIGERA HISTORIK
        if (e.target.classList.contains('edit-history-btn')) {
            const id = e.target.dataset.id;
            const { historyData } = await import("./data-service.js");
            const item = historyData.find(h => h.id === id);
            
            if (item) {
                document.getElementById('history-title').value = item.title;
                document.getElementById('history-priority').value = item.priority;
                document.getElementById('history-content-editor').innerHTML = item.content;
                document.getElementById('history-edit-id').value = item.id;
                
                document.getElementById('add-history-form').scrollIntoView({ behavior: 'smooth' });
                document.getElementById('add-history-btn').textContent = "Spara ändringar";
            }
        }

        // ADMIN: REDIGERA BILD
        if (e.target.classList.contains('edit-image-btn')) {
            const id = e.target.dataset.id;
            const { imageData } = await import("./data-service.js");
            const item = imageData.find(img => img.id === id);
            
            if (item) {
                document.getElementById('image-title').value = item.title;
                document.getElementById('image-year').value = item.year;
                document.getElementById('image-month').value = item.month;
                document.getElementById('image-priority').value = item.priority;
                document.getElementById('image-url').value = item.url;
                document.getElementById('image-edit-id').value = item.id;
                
                // Visa förhandsgranskning om möjligt (valfritt)
                document.getElementById('file-name-display').textContent = "Befintlig bild vald";

                document.getElementById('add-image-form').scrollIntoView({ behavior: 'smooth' });
                document.getElementById('add-image-btn').textContent = "Spara ändringar";
            }
        }

        // TA BORT-KNAPPAR
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            const type = e.target.getAttribute('data-type');
            
            if (id && type) {
                if (type === 'events') {
                    const seriesId = e.target.getAttribute('data-series-id');
                    if (seriesId) {
                        const modal = document.getElementById('deleteEventModal');
                        document.getElementById('delete-event-message').textContent = "Detta är en del av en återkommande serie.";
                        modal.classList.add('active');
                        
                        const delSingle = document.getElementById('delete-single-event-btn');
                        const delSeries = document.getElementById('delete-series-event-btn');
                        const cancel = document.getElementById('cancel-event-delete-btn');
                        
                        const newDelSingle = delSingle.cloneNode(true);
                        const newDelSeries = delSeries.cloneNode(true);
                        const newCancel = cancel.cloneNode(true);
                        
                        delSingle.parentNode.replaceChild(newDelSingle, delSingle);
                        delSeries.parentNode.replaceChild(newDelSeries, delSeries);
                        cancel.parentNode.replaceChild(newCancel, cancel);

                        newDelSingle.addEventListener('click', async () => {
                            hideModal('deleteEventModal');
                            if(confirm("Radera denna enskilda händelse?")) await deleteDocument(id, 'events');
                        });
                        newDelSeries.addEventListener('click', async () => {
                            hideModal('deleteEventModal');
                            if(confirm("Radera HELA serien av händelser?")) await deleteDocument(null, 'events', seriesId);
                        });
                        newCancel.addEventListener('click', () => hideModal('deleteEventModal'));

                    } else {
                        if (confirm("Är du säker på att du vill ta bort denna händelse?")) await deleteDocument(id, 'events');
                    }
                } else {
                    if (confirm("Är du säker på att du vill ta bort detta?")) await deleteDocument(id, type);
                }
            }
        }

        // LIKE & SHARE
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
        
        if (e.target.closest('.share-btn')) {
            const btn = e.target.closest('.share-btn');
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            
            // Fixad länkstruktur: sidan.se/#nyheter#news-ID
            let page = 'nyheter'; 
            // Om man är på startsidan (#hem) och klickar dela på en nyhet, vill vi att länken ska gå till #nyheter
            // Vi kollar vilken sektion knappen ligger i för att avgöra sida om det behövs, men för nyheter är det alltid #nyheter
            if(btn.closest('.calendar-post')) page = 'kalender';
            
            // Bygg URL: origin + pathname + #sida + #id
            const url = `${window.location.origin}${window.location.pathname}#${page}#${page === 'nyheter' ? 'news' : 'event'}-${id}`;
            showShareModal(title, url);
        }

        // EDITOR
        if (e.target.closest('.editor-toolbar button')) {
            e.preventDefault(); 
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
            } else if (['insertGold', 'insertSilver', 'insertBronze'].includes(command)) {
                const emoji = btn.textContent;
                editor.focus();
                document.execCommand('insertText', false, emoji);
            } else {
                applyEditorCommand(editor, command);
            }
            updateToolbarButtons(editor);
        }

        // ADMIN-KNAPPAR
        if (e.target.classList.contains('add-admin-btn')) {
            if (confirm("Ge admin-rättigheter?")) await addAdminFromUser(e.target.getAttribute('data-id'));
        }
        if (e.target.classList.contains('delete-admin-btn')) {
            if (confirm("Ta bort admin-rättigheter?")) await deleteAdmin(e.target.getAttribute('data-id'));
        }
        if (e.target.classList.contains('toggle-member-btn')) {
            await toggleMemberStatus(e.target.dataset.id, e.target.dataset.status === "true");
        }
        if (e.target.classList.contains('edit-user-btn')) {
            const { usersData } = await import("./data-service.js");
            const user = usersData.find(u => u.id === e.target.getAttribute('data-user-id'));
            if(user) showEditUserModal(user);
        }
        if (e.target.classList.contains('show-user-info-btn')) {
             const { usersData } = await import("./data-service.js");
             const user = usersData.find(u => u.id === e.target.getAttribute('data-id'));
             if(user) showUserInfoModal(user);
        }
        
        // ADMIN: REDIGERA KLASS
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
        
        // ADMIN: REDIGERA TÄVLINGSRAPPORT
        if (e.target.classList.contains('edit-comp-btn')) {
            const compId = e.target.dataset.id;
            const { competitionsData } = await import("./data-service.js");
            const comp = competitionsData.find(c => c.id === compId);
            if (comp && confirm("Redigera rapport? Den gamla tas bort när du sparar den nya.")) {
                await deleteDocument(compId, 'competitions');
                document.getElementById('comp-title').value = comp.title;
                document.getElementById('comp-date').value = comp.date;
                document.getElementById('comp-location').value = comp.location;
                document.getElementById('comp-content-editor').innerHTML = comp.content;
                document.getElementById('comp-pdf-url').value = comp.pdfUrl || '';
                document.getElementById('add-competition-form').scrollIntoView();
            }
        }

        // ÖVRIGA MODAL- OCH UI-HANDLINGAR
        if (e.target.id === 'open-add-shooter-modal-btn') document.getElementById('addShooterModal').classList.add('active');
        
        if (e.target.id === 'edit-shooter-btn') {
             const shooterId = document.getElementById('shooter-selector').value;
             if (!shooterId) { showModal('errorModal', "Ingen skytt vald."); return; }
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
        
        if (e.target.classList.contains('modal-close-btn')) {
            e.target.closest('.modal').classList.remove('active');
        }
        
        if (e.target.classList.contains('link-parent-btn')) {
            document.getElementById('link-shooter-id').value = e.target.dataset.id;
            const select = document.getElementById('link-parent-select');
            select.innerHTML = '<option>Laddar...</option>';
            document.getElementById('linkParentModal').classList.add('active');
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

    // --- ÖVRIGA LISTENER (SHOT COUNT, EDITOR ETC) ---
    const shooterSelector = document.getElementById('shooter-selector');
    if (shooterSelector) {
        shooterSelector.addEventListener('change', (e) => loadAndRenderChart(e.target.value));
    }

    const publicShooterSelector = document.getElementById('public-shooter-selector');
    if (publicShooterSelector) {
        publicShooterSelector.addEventListener('change', async (e) => {
            const { renderPublicShooterStats } = await import("./ui-handler.js");
            const { latestResultsCache, allShootersData } = await import("./data-service.js");
            renderPublicShooterStats(e.target.value, latestResultsCache, allShootersData);
        });
    }
    
    const copyMailBtn = document.getElementById('copy-mailing-list-btn');
    if (copyMailBtn) {
        copyMailBtn.addEventListener('click', () => {
             const text = document.getElementById('mailing-list-report').innerText.replace(/E-post: /g, '').replace(/\n\n/g, '; '); 
             navigator.clipboard.writeText(text).then(() => showModal('confirmationModal', "E-postadresser kopierade!"));
        });
    }

    document.querySelectorAll('.shot-count-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.shot-count-btn').forEach(b => {
                b.classList.remove('bg-white', 'shadow', 'text-blue-800', 'font-bold');
                b.classList.add('text-gray-600', 'hover:bg-white/50');
            });
            e.target.classList.add('bg-white', 'shadow', 'text-blue-800', 'font-bold');
            e.target.classList.remove('text-gray-600', 'hover:bg-white/50');
            
            const count = parseInt(e.target.getAttribute('data-count'));
            document.getElementById('result-shot-count').value = count;
            const container = document.getElementById('series-inputs-container');
            container.innerHTML = '';
            for (let i = 1; i <= count / 10; i++) {
                container.innerHTML += `
                    <div class="text-center">
                        <span class="text-xs text-gray-500 block mb-1">Serie ${i}</span>
                        <input type="text" inputmode="decimal" class="series-input w-full p-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="-">
                    </div>`;
            }
            setupLiveScoreCalculation();
        });
    });

    setupLiveScoreCalculation();

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
                let val = parseFloat(i.value.replace(',', '.'));
                if (!isNaN(val)) {
                    total += val;
                    if (val > best) best = val;
                }
            });
            document.getElementById('live-total-display').textContent = Math.round(total * 10) / 10;
            document.getElementById('live-best-series').textContent = best > 0 ? best : '-';
        });
    });
}