// event-listeners.js
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { addOrUpdateDocument, deleteDocument, updateProfile, updateSiteSettings, addAdminFromUser, deleteAdmin, updateProfileByAdmin, newsData, eventsData, historyData, imageData, usersData, sponsorsData, competitionsData, toggleLike, createShooterProfile, getMyShooters, saveResult, getShooterResults, updateUserResult } from "./data-service.js";
import { setupResultFormListeners, calculateTotal, getMedalForScore } from "./result-handler.js";
import { navigate, showModal, hideModal, showUserInfoModal, showEditUserModal, applyEditorCommand, isAdminLoggedIn, showShareModal } from "./ui-handler.js";
import { handleImageUpload, handleSponsorUpload, setEditingImageId } from "./upload-handler.js";
import { checkNewsForm, checkHistoryForm, checkImageForm, checkSponsorForm, checkEventForm } from './form-validation.js';

// Ver. 1.28 (Rensade importer)
let editingNewsId = null;
let editingHistoryId = null;
let editingImageId = null;
let editingEventId = null;
let editingSponsorId = null;
let editingCompId = null;

export function setupEventListeners() {
    const newsAddBtn = document.getElementById('add-news-btn');
    const eventAddBtn = document.getElementById('add-event-btn');
    const historyAddBtn = document.getElementById('add-history-btn');
    const addImageBtn = document.getElementById('add-image-btn');
    const addSponsorBtn = document.getElementById('add-sponsor-btn');
    const deleteConfirmationModal = document.getElementById('deleteConfirmationModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteEventModal = document.getElementById('deleteEventModal');
    const deleteSingleEventBtn = document.getElementById('delete-single-event-btn');
    const deleteSeriesEventBtn = document.getElementById('delete-series-event-btn');
    const cancelEventDeleteBtn = document.getElementById('cancel-event-delete-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileForm = document.getElementById('profile-form');
    const settingsForm = document.getElementById('settings-form');
    const addNewsForm = document.getElementById('add-news-form');
    const addHistoryForm = document.getElementById('add-history-form');
    const addImageForm = document.getElementById('add-image-form');
    const addSponsorForm = document.getElementById('add-sponsor-form');
    const addEventForm = document.getElementById('add-event-form');
    const newsTitleInput = document.getElementById('news-title');
    const newsContentEditor = document.getElementById('news-content-editor');
    const historyTitleInput = document.getElementById('history-title');
    const historyContentEditor = document.getElementById('history-content-editor');
    const historyPriorityInput = document.getElementById('history-priority');
    const imageTitleInput = document.getElementById('image-title');
    const imageUrlInput = document.getElementById('image-url');
    const imageYearInput = document.getElementById('image-year');
    const imageMonthInput = document.getElementById('image-month');
    const imagePriorityInput = document.getElementById('image-priority');
    const sponsorNameInput = document.getElementById('sponsor-name');
    const sponsorExtraText = document.getElementById('sponsor-extra-text');
    const sponsorUrlInput = document.getElementById('sponsor-url');
    const sponsorLogoUrlInput = document.getElementById('sponsor-logo-url');
    const sponsorLogoUpload = document.getElementById('sponsor-logo-upload');
    const sponsorPriorityInput = document.getElementById('sponsor-priority');
    const sponsorSizeInput = document.getElementById('sponsor-size');
    const eventTitleInput = document.getElementById('event-title');
    const eventDescriptionEditor = document.getElementById('event-description-editor');
    const eventDateInput = document.getElementById('event-date');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const weekdaySelect = document.getElementById('weekday-select');
    const imageUploadInput = document.getElementById('image-upload');
    const fileNameDisplay = document.getElementById('file-name-display');
    const sponsorFileNameDisplay = document.getElementById('sponsor-logo-name-display');
    const clearImageUpload = document.getElementById('clear-image-upload');
    const clearSponsorLogoUpload = document.getElementById('clear-sponsor-logo-upload');
    const isRecurringCheckbox = document.getElementById('is-recurring');
    const singleEventFields = document.getElementById('single-event-fields');
    const recurringEventFields = document.getElementById('recurring-event-fields');
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('edit-user-form');
    const headerColorInput = document.getElementById('header-color-input');
    const showSponsorsCheckbox = document.getElementById('show-sponsors-checkbox');
    const copyMailingListBtn = document.getElementById('copy-mailing-list-btn');
    const addCompForm = document.getElementById('add-competition-form');
    const compTitleInput = document.getElementById('comp-title');
    const compContentEditor = document.getElementById('comp-content-editor');
    const compPdfUpload = document.getElementById('comp-pdf-upload');
    const compAddBtn = document.getElementById('add-comp-btn');
    const openAddShooterBtn = document.getElementById('open-add-shooter-modal-btn');
    const addShooterModal = document.getElementById('addShooterModal');
    const closeShooterModalBtn = document.getElementById('close-add-shooter-modal');
    const addShooterForm = document.getElementById('add-shooter-form');
    const resultsContainer = document.getElementById('results-history-container');
    const editResultModal = document.getElementById('editResultModal');
    const closeEditResultBtn = document.getElementById('close-edit-result-modal');
    const editResultForm = document.getElementById('edit-result-form');

if (openAddShooterBtn) {
        openAddShooterBtn.addEventListener('click', () => {
            if (addShooterModal) addShooterModal.classList.add('active');
        });
    }
    if (closeShooterModalBtn) {
        closeShooterModalBtn.addEventListener('click', () => {
            if (addShooterModal) addShooterModal.classList.remove('active');
        });
    }
    if (addShooterForm) {
        addShooterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('new-shooter-name').value;
            const year = document.getElementById('new-shooter-birthyear').value;
            
            if (auth.currentUser) {
                await createShooterProfile(auth.currentUser.uid, name, year);
                addShooterModal.classList.remove('active');
                addShooterForm.reset();
                loadShootersIntoDropdown(); // Uppdatera listan direkt
            }
        });
    }

    // 2. Ladda skyttar till dropdown när man går till fliken (eller loggar in)
    async function loadShootersIntoDropdown() {
        const select = document.getElementById('shooter-selector');
        if (!select || !auth.currentUser) return;

        const shooters = await getMyShooters(auth.currentUser.uid);
        select.innerHTML = '';
        
        if (shooters.length === 0) {
            select.innerHTML = '<option value="">Inga profiler hittades - Skapa en ny!</option>';
        } else {
            shooters.forEach(shooter => {
                const option = document.createElement('option');
                option.value = shooter.id;
                option.text = shooter.name;
                // Spara inställningar i dataset för att använda senare
                option.dataset.settings = JSON.stringify(shooter.settings || {});
                select.appendChild(option);
            });
            // Trigga en 'change' så att vi kan ladda inställningar för den förvalda skytten
            select.dispatchEvent(new Event('change'));
        }
    }

    // Körs när man loggat in (via main/auth listener) eller manuellt:
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#resultat') {
            loadShootersIntoDropdown();
	    setupResultFormListeners();
        }
    });
    
    // Hantera val av skytt (uppdatera "Dela"-rutan baserat på profil)
    const shooterSelect = document.getElementById('shooter-selector');
    if (shooterSelect) {
        shooterSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.settings) {
                const settings = JSON.parse(selectedOption.dataset.settings);
                const shareCheckbox = document.getElementById('result-share-checkbox');
                if (shareCheckbox) {
                    shareCheckbox.checked = settings.defaultShareResults || false;
                }
                // Här kan vi också ladda historik för vald skytt!
                loadResultsHistory(e.target.value);
            }
        });
    }
if (resultsContainer) {
        resultsContainer.addEventListener('click', (e) => {
            // 1. Hantera TA BORT
            const deleteBtn = e.target.closest('.delete-result-btn');
            if (deleteBtn) {
                const docId = deleteBtn.dataset.id;
                showModal('deleteConfirmationModal', "Är du säker på att du vill radera resultatet?");
                
                // Koppla bekräfta-knappen till just detta ID
                const confirmBtn = document.getElementById('confirm-delete-btn');
                // Vi klonar knappen för att rensa gamla lyssnare (samma trick som för 20/40-knapparna)
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                
                newConfirmBtn.addEventListener('click', async () => {
                    // Använd din befintliga deleteDocument men skicka 'results' som collection
                    await deleteDocument(docId, 'results');
                    hideModal('deleteConfirmationModal');
                    // Ladda om listan
                    const shooterId = document.getElementById('shooter-selector').value;
                    if (shooterId) loadResultsHistory(shooterId);
                });
            }

            // 2. Hantera ÄNDRA
            const editBtn = e.target.closest('.edit-result-btn');
            if (editBtn) {
                const data = JSON.parse(decodeURIComponent(editBtn.dataset.obj));
                
                // Fyll i formuläret
                document.getElementById('edit-result-id').value = data.id;
                document.getElementById('edit-result-date').value = data.date;
                document.getElementById('edit-result-type').value = data.type;
                document.getElementById('edit-result-discipline').value = data.discipline;
                document.getElementById('edit-result-share').checked = data.shared;
                
                // Visa modalen
                editResultModal.classList.add('active');
            }
        });
    }

    // Stäng edit-modal
    if (closeEditResultBtn) {
        closeEditResultBtn.addEventListener('click', () => editResultModal.classList.remove('active'));
    }

    // Spara ändringar
    if (editResultForm) {
        editResultForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const resultId = document.getElementById('edit-result-id').value;
            const updatedData = {
                date: document.getElementById('edit-result-date').value,
                type: document.getElementById('edit-result-type').value,
                discipline: document.getElementById('edit-result-discipline').value,
                sharedWithClub: document.getElementById('edit-result-share').checked
            };

            await updateUserResult(resultId, updatedData);
            editResultModal.classList.remove('active');
            
            // Uppdatera listan
            const shooterId = document.getElementById('shooter-selector').value;
            if (shooterId) loadResultsHistory(shooterId);
        });
    }

    // 3. Spara Resultat
    const addResultForm = document.getElementById('add-result-form');
    if (addResultForm) {
        addResultForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const shooterId = document.getElementById('shooter-selector').value;
            if (!shooterId) {
                showModal('errorModal', "Du måste välja eller skapa en skytt först!");
                return;
            }

            const { total, best, seriesScores } = calculateTotal();
            
            // Hämta inställningar för att veta om vi ska spara medaljer
            const selectedShooterOption = document.getElementById('shooter-selector').selectedOptions[0];
            const settings = selectedShooterOption ? JSON.parse(selectedShooterOption.dataset.settings) : {};
            const trackMedals = settings.trackMedals !== false; // Default true

            // Beräkna medaljer för serierna
            const seriesMedals = seriesScores.map(score => {
                if (trackMedals) {
                    const m = getMedalForScore(score);
                    return m ? m.name : null;
                }
                return null;
            });

            const resultData = {
                shooterId: shooterId,
                registeredBy: auth.currentUser.uid,
                date: document.getElementById('result-date').value,
                type: document.getElementById('result-type').value,
                discipline: document.getElementById('result-discipline').value,
                shotCount: parseInt(document.getElementById('result-shot-count').value),
                series: seriesScores,
                seriesMedals: seriesMedals,
                total: total,
                bestSeries: best,
                sharedWithClub: document.getElementById('result-share-checkbox').checked
            };

            await saveResult(resultData);
            addResultForm.reset();
            setupResultFormListeners(); // Återställ rutorna (default 20 skott)
            loadResultsHistory(shooterId); // Uppdatera listan
        });
    }

async function loadResultsHistory(shooterId) {
        const container = document.getElementById('results-history-container');
        if (!container) return;
        
        container.innerHTML = '<p class="text-gray-500">Laddar...</p>';
        
        // Hämta resultat (din nya säkra sökning)
        const results = await getShooterResults(shooterId);
        
        container.innerHTML = '';
        if (results.length === 0) {
            container.innerHTML = '<p class="text-gray-500 italic">Inga resultat registrerade än.</p>';
            return;
        }

        results.slice(0, 10).forEach(res => { 
            const date = new Date(res.date).toLocaleDateString();
            const shareIcon = res.sharedWithClub ? '🌐' : '🔒';
            const shareTitle = res.sharedWithClub ? 'Delad med klubben' : 'Privat';

            // Vi sparar datan i data-attribut för att enkelt kunna ladda edit-fönstret
            const dataString = encodeURIComponent(JSON.stringify({
                id: res.id,
                date: res.date,
                type: res.type,
                discipline: res.discipline,
                shared: res.sharedWithClub
            }));

            container.innerHTML += `
                <div class="card p-3 flex justify-between items-center bg-white border-l-4 ${res.sharedWithClub ? 'border-blue-500' : 'border-gray-300'}">
                    <div class="flex-grow">
                        <div class="flex items-center space-x-2">
                            <p class="font-bold text-gray-800 text-lg">${res.total} p</p>
                            <span class="text-xs" title="${shareTitle}">${shareIcon}</span>
                        </div>
                        <p class="text-xs text-gray-500">${date} | ${res.discipline} | ${res.type}</p>
                        <p class="text-xs text-gray-400">Serier: ${res.series.join(', ')}</p>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold bg-gray-100 px-2 py-1 rounded mr-2 hidden sm:inline">Bästa: ${res.bestSeries}</span>
                        
                        <button class="edit-result-btn p-2 text-gray-500 hover:text-blue-600 transition" 
                                data-obj="${dataString}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>

                        <button class="delete-result-btn p-2 text-gray-500 hover:text-red-600 transition" 
                                data-id="${res.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    if (isRecurringCheckbox) {
        isRecurringCheckbox.addEventListener('change', () => {
            if (isRecurringCheckbox.checked) {
                singleEventFields.classList.add('hidden');
                recurringEventFields.classList.remove('hidden');
            } else {
                singleEventFields.classList.remove('hidden');
                recurringEventFields.classList.add('hidden');
            }
            checkEventForm();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth);
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const profileNameInput = document.getElementById('profile-name-input');
            const profileAddressInput = document.getElementById('profile-address-input');
            const profilePhoneInput = document.getElementById('profile-phone-input');
            const profileBirthyearInput = document.getElementById('profile-birthyear-input');
            const profileMailingListCheckbox = document.getElementById('profile-mailing-list-checkbox');

            const profileData = {
                name: profileNameInput.value,
                address: profileAddressInput.value,
                phone: profilePhoneInput.value,
                birthyear: profileBirthyearInput.value,
                mailingList: profileMailingListCheckbox.checked
            };
            await updateProfile(auth.currentUser.uid, profileData);
        });
    }

    if (settingsForm) {
        const settingsInputs = settingsForm.querySelectorAll('input, select');
        settingsInputs.forEach(input => {
            input.addEventListener('input', () => {
                const settingsData = {
                    logoUrl: document.getElementById('logo-url-input').value,
                    headerColor: headerColorInput.value,
                    showSponsors: showSponsorsCheckbox.checked,
                    contactAddress: document.getElementById('contact-address-input').value,
                    contactLocation: document.getElementById('contact-location-input').value, 
                    contactPhone: document.getElementById('contact-phone-input').value,
                    contactEmail: document.getElementById('contact-email-input').value
                };
                updateSiteSettings(settingsData);
            });
        });
        
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settingsData = {
                logoUrl: document.getElementById('logo-url-input').value,
                headerColor: headerColorInput.value,
                showSponsors: showSponsorsCheckbox.checked,
                contactAddress: document.getElementById('contact-address-input').value,
                contactLocation: document.getElementById('contact-location-input').value, 
                contactPhone: document.getElementById('contact-phone-input').value,
                contactEmail: document.getElementById('contact-email-input').value
            };
            await updateSiteSettings(settingsData);
        });
    }

    if (addNewsForm) {
        addNewsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newsObject = {
                title: newsTitleInput.value,
                content: newsContentEditor.innerHTML,
                date: document.getElementById('news-date').value,
                createdAt: editingNewsId ? newsData.find(n => n.id === editingNewsId).createdAt : serverTimestamp(),
                updatedAt: editingNewsId ? serverTimestamp() : null
            };
            await addOrUpdateDocument('news', editingNewsId, newsObject, "Nyhet har lagts till!", "Ett fel uppstod.");
            addNewsForm.reset();
            newsContentEditor.innerHTML = '';
            editingNewsId = null;
            document.getElementById('news-form-title').textContent = 'Lägg till Nyhet';
            newsAddBtn.textContent = 'Lägg till';
            newsAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            newsAddBtn.classList.add('bg-gray-400');
            newsAddBtn.disabled = true;
        });
    }

    if (addHistoryForm) {
        addHistoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const historyObject = {
                title: historyTitleInput.value,
                content: historyContentEditor.innerHTML,
                priority: parseInt(historyPriorityInput.value),
                createdAt: editingHistoryId ? historyData.find(h => h.id === editingHistoryId).createdAt : serverTimestamp(),
                updatedAt: editingHistoryId ? serverTimestamp() : null
            };
            await addOrUpdateDocument('history', editingHistoryId, historyObject, "Historikpost har lagts till!", "Ett fel uppstod.");
            addHistoryForm.reset();
            historyContentEditor.innerHTML = '';
            editingHistoryId = null;
            document.getElementById('history-form-title').textContent = 'Lägg till Historikpost';
            historyAddBtn.textContent = 'Lägg till';
            historyAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            historyAddBtn.classList.add('bg-gray-400');
            historyAddBtn.disabled = true;
        });
    }

    if (addImageForm) {
        addImageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleImageUpload(e);
        });
    }

    if (addSponsorForm) {
        addSponsorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSponsorUpload(e);
        });
    }

    // Tävlingslogik
    function checkCompForm() {
        if (compTitleInput.value && document.getElementById('comp-date').value) {
             compAddBtn.disabled = false;
             compAddBtn.classList.remove('bg-gray-400');
             compAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
             compAddBtn.disabled = true;
             compAddBtn.classList.add('bg-gray-400');
             compAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        }
    }

    if (addCompForm) {
        addCompForm.addEventListener('input', checkCompForm);

        compPdfUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            document.getElementById('comp-upload-progress-container').classList.remove('hidden');
            compAddBtn.disabled = true;

            const storage = getStorage();
            const storagePath = `results/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    document.getElementById('comp-upload-progress').value = progress;
                }, 
                (error) => {
                    console.error(error);
                    showModal('errorModal', "Uppladdning av PDF misslyckades.");
                    compAddBtn.disabled = false;
                }, 
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        document.getElementById('comp-pdf-url').value = downloadURL;
                        document.getElementById('comp-storage-path').value = storagePath;
                        document.getElementById('comp-pdf-name').textContent = `Fil uppladdad: ${file.name}`;
                        document.getElementById('comp-upload-progress-container').classList.add('hidden');
                        checkCompForm();
                    });
                }
            );
        });

        addCompForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const compObject = {
                title: compTitleInput.value,
                date: document.getElementById('comp-date').value,
                location: document.getElementById('comp-location').value,
                content: compContentEditor.innerHTML,
                pdfUrl: document.getElementById('comp-pdf-url').value || null,
                storagePath: document.getElementById('comp-storage-path').value || null,
                createdAt: editingCompId ? competitionsData.find(c => c.id === editingCompId).createdAt : serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addOrUpdateDocument('competitions', editingCompId, compObject, "Tävlingsrapport sparad!", "Fel vid sparande.");
            
            addCompForm.reset();
            compContentEditor.innerHTML = '';
            document.getElementById('comp-pdf-name').textContent = '';
            document.getElementById('comp-pdf-url').value = '';
            editingCompId = null;
            document.getElementById('competition-form-title').textContent = 'Lägg till Tävlingsrapport';
            compAddBtn.textContent = 'Publicera rapport';
        });
    }

    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const isRecurring = isRecurringCheckbox.checked;
            const eventTitle = eventTitleInput.value;
            const eventDescription = eventDescriptionEditor.innerHTML;

            const baseEventObject = {
                title: eventTitle,
                description: eventDescription,
                createdAt: editingEventId ? eventsData.find(evt => evt.id === editingEventId).createdAt : serverTimestamp(),
                updatedAt: editingEventId ? serverTimestamp() : null
            };

            if (isRecurring) {
                const startDate = startDateInput.value;
                const endDate = endDateInput.value;
                const weekday = weekdaySelect.value;
                if (!startDate || !endDate || !weekday) {
                    showModal('errorModal', "Fyll i alla fält för återkommande evenemang.");
                    return;
                }
                const eventsToAdd = [];
                let currentDate = new Date(startDate);
                const end = new Date(endDate);
                while (currentDate <= end) {
                    if (currentDate.getDay() === parseInt(weekday)) {
                        eventsToAdd.push({
                            ...baseEventObject,
                            date: currentDate.toISOString().split('T')[0]
                        });
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                const batch = writeBatch(db);
                const seriesId = `series-${Date.now()}`;
                eventsToAdd.forEach(evt => {
                    const newDocRef = doc(collection(db, 'events'));
                    batch.set(newDocRef, { ...evt, seriesId: seriesId });
                });
                await batch.commit();
                showModal('confirmationModal', "Återkommande evenemang har lagts till!");

            } else {
                const eventDate = eventDateInput.value;
                if (!eventDate) {
                    showModal('errorModal', "Fyll i datum för enskild händelse.");
                    return;
                }
                const eventObject = { ...baseEventObject, date: eventDate };
                await addOrUpdateDocument('events', editingEventId, eventObject, "Evenemanget har uppdaterats!", "Ett fel uppstod när evenemanget skulle hanteras.");
            }
            
            addEventForm.reset();
            eventDescriptionEditor.innerHTML = '';
            editingEventId = null;
            document.getElementById('is-recurring').checked = false;
            singleEventFields.classList.remove('hidden');
            recurringEventFields.classList.add('hidden');
            eventAddBtn.textContent = 'Lägg till';
            eventAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            eventAddBtn.classList.add('bg-gray-400');
            eventAddBtn.disabled = true;
        });
    }

    if (copyMailingListBtn) {
        copyMailingListBtn.addEventListener('click', () => {
            const mailingListUsers = usersData.filter(user => user.mailingList).sort((a, b) => a.email.localeCompare(b.email));
            const emails = mailingListUsers.map(user => user.email);
            const emailString = emails.join(';');
            navigator.clipboard.writeText(emailString)
                .then(() => {
                    showModal('confirmationModal', 'E-postadresser har kopierats till urklipp!');
                })
                .catch(err => {
                    console.error('Kunde inte kopiera text:', err);
                    showModal('errorModal', 'Kunde inte kopiera e-postadresser.');
                });
        });
    }

    // Shared Click Handlers
    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const docId = deleteBtn.getAttribute('data-id');
            const docType = deleteBtn.getAttribute('data-type');
            const seriesId = deleteBtn.getAttribute('data-series-id');

            if (!isAdminLoggedIn) {
                showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
                return;
            }

            if (docType === 'events' && seriesId) {
                showModal('deleteEventModal', `Är du säker på att du vill ta bort detta evenemang? Välj om du vill ta bort enskild händelse eller hela serien.`);

                deleteSingleEventBtn.onclick = async () => {
                    await deleteDocument(docId, docType);
                    hideModal('deleteEventModal');
                };

                deleteSeriesEventBtn.onclick = async () => {
                    await deleteDocument(docId, docType, seriesId);
                    hideModal('deleteEventModal');
                };
                cancelEventDeleteBtn.onclick = () => {
                    hideModal('deleteEventModal');
                };
            } else {
                showModal('deleteConfirmationModal', `Är du säker på att du vill ta bort denna post?`);

                confirmDeleteBtn.onclick = async () => {
                    await deleteDocument(docId, docType);
                    hideModal('deleteConfirmationModal');
                };
                cancelDeleteBtn.onclick = () => {
                    hideModal('deleteConfirmationModal');
                };
            }
        }
        const addAdminFromUserBtn = e.target.closest('.add-admin-btn');
        if (addAdminFromUserBtn) {
            const userId = addAdminFromUserBtn.getAttribute('data-id');
            addAdminFromUser(userId);
        }

        const showUserInfoBtn = e.target.closest('.show-user-info-btn');
        if (showUserInfoBtn) {
            const userId = showUserInfoBtn.getAttribute('data-id');
            const user = usersData.find(u => u.id === userId);
            if (user) {
                showUserInfoModal(user);
            }
        }

        const editUserBtn = e.target.closest('.edit-user-btn');
        if (editUserBtn) {
            const userId = editUserBtn.getAttribute('data-user-id');
            const user = usersData.find(u => u.id === userId);
            if (user) {
                showEditUserModal(user);
            }
        }

        const deleteAdminBtn = e.target.closest('.delete-admin-btn');
        if (deleteAdminBtn) {
            const adminId = deleteAdminBtn.getAttribute('data-id');
            deleteAdmin(adminId);
        }

        // Redigeringsknappar
        const editNewsBtn = e.target.closest('.edit-news-btn');
        if (editNewsBtn) {
            const newsId = editNewsBtn.getAttribute('data-id');
            const newsItem = newsData.find(n => n.id === newsId);
            if (newsItem) {
                editingNewsId = newsId;
                document.getElementById('news-title').value = newsItem.title;
                document.getElementById('news-content-editor').innerHTML = newsItem.content;
                document.getElementById('news-date').value = newsItem.date;
                document.getElementById('news-form-title').textContent = 'Ändra Nyhet';
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
                document.getElementById('history-priority').value = historyItem.priority;
                document.getElementById('history-form-title').textContent = 'Ändra Historikpost';
                historyAddBtn.textContent = 'Spara ändring';
                historyAddBtn.disabled = false;
                historyAddBtn.classList.remove('bg-gray-400');
                historyAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                navigate('#omoss');
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
                setEditingImageId(imageId);
                document.getElementById('image-title').value = imageItem.title;
                document.getElementById('image-url').value = imageItem.url;
                document.getElementById('image-year').value = imageItem.year;
                document.getElementById('image-month').value = imageItem.month;
                document.getElementById('image-priority').value = imageItem.priority || 10;
                document.getElementById('image-form-title').textContent = 'Ändra Bild';
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
        const editSponsorBtn = e.target.closest('.edit-sponsor-btn');
        if (editSponsorBtn) {
            const sponsorId = editSponsorBtn.getAttribute('data-id');
            const sponsorItem = sponsorsData.find(s => s.id === sponsorId);
            if (sponsorItem) {
                editingSponsorId = sponsorId;
                document.getElementById('sponsor-name').value = sponsorItem.name;
                document.getElementById('sponsor-extra-text').value = sponsorItem.extraText || '';
                document.getElementById('sponsor-url').value = sponsorItem.url;
                document.getElementById('sponsor-logo-url').value = sponsorItem.logoUrl;
                document.getElementById('sponsor-priority').value = sponsorItem.priority;
                document.getElementById('sponsor-size').value = sponsorItem.size || '1/4';
                document.getElementById('sponsor-form-title').textContent = 'Ändra Sponsor';
                addSponsorBtn.textContent = 'Spara ändring';
                addSponsorBtn.disabled = false;
                addSponsorBtn.classList.remove('bg-gray-400');
                addSponsorBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                navigate('#sponsorer');
                setTimeout(() => {
                    document.getElementById('sponsors-edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
        const editEventBtn = e.target.closest('.edit-event-btn');
        if (editEventBtn) {
            const eventId = editEventBtn.getAttribute('data-id');
            const eventItem = eventsData.find(e => e.id === eventId);
            if (eventItem) {
                editingEventId = eventId;
                document.getElementById('event-title').value = eventItem.title;
                document.getElementById('event-description-editor').innerHTML = eventItem.description;
                document.getElementById('event-date').value = eventItem.date;
                document.getElementById('is-recurring').checked = false;
                document.getElementById('single-event-fields').classList.remove('hidden');
                document.getElementById('recurring-event-fields').classList.add('hidden');
                document.getElementById('add-event-btn').textContent = 'Spara ändring';
                document.getElementById('add-event-btn').disabled = false;
                document.getElementById('add-event-btn').classList.remove('bg-gray-400');
                document.getElementById('add-event-btn').classList.add('bg-blue-600', 'hover:bg-blue-700');
                navigate('#kalender');
                setTimeout(() => {
                    document.getElementById('calendar-edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
        
        // Editera tävling
        const editCompBtn = e.target.closest('.edit-comp-btn');
        if (editCompBtn) {
            const id = editCompBtn.getAttribute('data-id');
            const item = competitionsData.find(c => c.id === id);
            if (item) {
                editingCompId = id;
                document.getElementById('comp-title').value = item.title;
                document.getElementById('comp-date').value = item.date;
                document.getElementById('comp-location').value = item.location;
                document.getElementById('comp-content-editor').innerHTML = item.content;
                if (item.pdfUrl) {
                    document.getElementById('comp-pdf-url').value = item.pdfUrl;
                    document.getElementById('comp-pdf-name').textContent = "Befintlig PDF sparad (ladda upp ny för att byta)";
                }
                
                document.getElementById('competition-form-title').textContent = 'Ändra Tävlingsrapport';
                compAddBtn.textContent = 'Spara ändring';
                checkCompForm();
                
                navigate('#tavlingar');
                setTimeout(() => {
                     document.getElementById('competition-edit-section').scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    });

    // Input listeners
    const inputElements = [
        newsTitleInput, newsContentEditor,
        historyTitleInput, historyContentEditor, historyPriorityInput,
        imageTitleInput, imageYearInput, imageMonthInput, imageUploadInput, imageUrlInput,
        sponsorNameInput, sponsorExtraText, sponsorPriorityInput, sponsorLogoUpload, sponsorLogoUrlInput, sponsorSizeInput,
        eventTitleInput, eventDescriptionEditor, eventDateInput, isRecurringCheckbox, startDateInput, endDateInput, weekdaySelect,
        headerColorInput, showSponsorsCheckbox, document.getElementById('logo-url-input'), document.getElementById('contact-address-input'),
        document.getElementById('contact-location-input'),
        document.getElementById('contact-phone-input'), document.getElementById('contact-email-input')
    ];

    inputElements.forEach(element => {
        if (element) {
            const formCheckers = {
                'news-title': checkNewsForm, 'news-content-editor': checkNewsForm,
                'history-title': checkHistoryForm, 'history-content-editor': checkHistoryForm, 'history-priority': checkHistoryForm,
                'image-title': checkImageForm, 'image-year': checkImageForm, 'image-month': checkImageForm, 'image-upload': checkImageForm, 'image-url': checkImageForm,
                'sponsor-name': checkSponsorForm, 'sponsor-extra-text': checkSponsorForm, 'sponsor-priority': checkSponsorForm, 'sponsor-logo-upload': checkSponsorForm, 'sponsor-logo-url': checkSponsorForm, 'sponsor-size': checkSponsorForm,
                'event-title': checkEventForm, 'event-description-editor': checkEventForm, 'event-date': checkEventForm, 'is-recurring': checkEventForm, 'start-date': checkEventForm, 'end-date': checkEventForm, 'weekday-select': checkEventForm,
                'logo-url-input': () => {}, 'header-color-input': () => {}, 'show-sponsors-checkbox': () => {},
                'contact-address-input': () => {}, 'contact-location-input': () => {}, 'contact-phone-input': () => {}, 'contact-email-input': () => {}
            };
            const eventType = element.id.includes('editor') || element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'number' || element.type === 'url' || element.type === 'date') ? 'input' : 'change';
            
            element.addEventListener(eventType, formCheckers[element.id]);
        }
    });

    // New event listeners for like and share buttons
    document.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const docId = likeBtn.getAttribute('data-id');
            const docType = likeBtn.getAttribute('data-type');
            if (!auth.currentUser) {
                showModal('errorModal', "Du måste vara inloggad för att gilla ett inlägg.");
                return;
            }
            await toggleLike(docId, docType, auth.currentUser.uid);
        }

        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            const docId = shareBtn.getAttribute('data-id');
            const title = shareBtn.getAttribute('data-title');
            const url = `${window.location.href.split('#')[0]}#nyheter#news-${docId}`;
            showShareModal(title, url);
        }
    });

    if (clearImageUpload) clearImageUpload.addEventListener('click', () => {
        imageUploadInput.value = '';
        fileNameDisplay.textContent = 'Ingen fil vald';
        clearImageUpload.classList.add('hidden');
        checkImageForm();
    });
    
    if (clearSponsorLogoUpload) clearSponsorLogoUpload.addEventListener('click', () => {
        sponsorLogoUpload.value = '';
        sponsorFileNameDisplay.textContent = 'Ingen fil vald';
        clearSponsorLogoUpload.classList.add('hidden');
        checkSponsorForm();
    });

   document.addEventListener('click', (e) => {
        const editorToolbarBtn = e.target.closest('.editor-toolbar button');
        if (editorToolbarBtn) {
            e.preventDefault();
            const command = editorToolbarBtn.dataset.command;
            const editorTargetId = editorToolbarBtn.closest('.editor-toolbar').dataset.editorTarget;
            const editorElement = document.getElementById(editorTargetId);
            
            if (!editorElement) return;

            if (command === 'createLink') {
                const url = prompt("Ange länkens URL (t.ex. https://...):");
                if (url) {
                    const selection = window.getSelection();
                    // Om användaren redan har markerat text, gör om den till länk
                    if (selection.toString().length > 0) {
                        applyEditorCommand(editorElement, command, url);
                    } else {
                        // Ingen text markerad -> Fråga efter visningstext
                        const text = prompt("Ange text som ska visas för länken:", "Läs mer här");
                        if (text) {
                            // Vi använder 'insertHTML' för att skapa en snygg länk som öppnas i ny flik
                            const html = `<a href="${url}" target="_blank">${text}</a>`;
                            applyEditorCommand(editorElement, 'insertHTML', html);
                        }
                    }
                }
            } else if (command === 'insertImage') {
                const imageUrl = prompt("Ange bildens URL:");
                if (imageUrl) {
                    applyEditorCommand(editorElement, command, imageUrl);
                }
            } else if (command === 'insertGold') {
                applyEditorCommand(editorElement, 'insertHTML', '🥇 ');
            } else if (command === 'insertSilver') {
                applyEditorCommand(editorElement, 'insertHTML', '🥈 ');
            } else if (command === 'insertBronze') {
                applyEditorCommand(editorElement, 'insertHTML', '🥉 ');
            } else {
                applyEditorCommand(editorElement, command);
            }
        }
    });

    if (editUserModal) {
        document.getElementById('close-edit-user-modal').addEventListener('click', () => hideModal('editUserModal'));
        editUserModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hideModal('editUserModal');
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('edit-user-id').value;
            const name = document.getElementById('edit-user-name').value;
            const address = document.getElementById('edit-user-address').value;
            const phone = document.getElementById('edit-user-phone').value;
            const birthyear = document.getElementById('edit-user-birthyear').value;
            const mailingList = document.getElementById('edit-user-mailing-list').checked;
            
            const updatedData = {
                name,
                address,
                phone,
                birthyear: birthyear ? Number(birthyear) : null,
                mailingList
            };

            await updateProfileByAdmin(userId, updatedData);
            hideModal('editUserModal');
        });
    }
    
    if (imageUploadInput && fileNameDisplay) {
        imageUploadInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileNameDisplay.textContent = e.target.files[0].name;
                clearImageUpload.classList.remove('hidden');
            } else {
                fileNameDisplay.textContent = 'Ingen fil vald';
                clearImageUpload.classList.add('hidden');
            }
        });
    }
    
    window.addEventListener('hashchange', () => {
        const currentHash = window.location.hash;
        if (currentHash === '#bilder') {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1; // getMonth() är 0-baserad
            if (imageYearInput) imageYearInput.value = year;
            if (imageMonthInput) imageMonthInput.value = month;
        }
    });
async function loadResultsHistory(shooterId) {
        const container = document.getElementById('results-history-container');
        if (!container) return;
        
        container.innerHTML = '<p class="text-gray-500">Laddar...</p>';
        
        // Hämta resultat
        const results = await getShooterResults(shooterId);
        
        container.innerHTML = '';
        if (results.length === 0) {
            container.innerHTML = '<p class="text-gray-500 italic">Inga resultat registrerade än.</p>';
            return;
        }

        results.slice(0, 10).forEach(res => { 
            const date = new Date(res.date).toLocaleDateString();
            const shareIcon = res.sharedWithClub ? '🌐' : '🔒';
            const shareTitle = res.sharedWithClub ? 'Delad med klubben' : 'Privat';

            // Vi sparar datan i data-attribut för att enkelt kunna ladda edit-fönstret
            const dataString = encodeURIComponent(JSON.stringify({
                id: res.id,
                date: res.date,
                type: res.type,
                discipline: res.discipline,
                shared: res.sharedWithClub
            }));

            container.innerHTML += `
                <div class="card p-3 flex justify-between items-center bg-white border-l-4 ${res.sharedWithClub ? 'border-blue-500' : 'border-gray-300'}">
                    <div class="flex-grow">
                        <div class="flex items-center space-x-2">
                            <p class="font-bold text-gray-800 text-lg">${res.total} p</p>
                            <span class="text-xs" title="${shareTitle}">${shareIcon}</span>
                        </div>
                        <p class="text-xs text-gray-500">${date} | ${res.discipline} | ${res.type}</p>
                        <p class="text-xs text-gray-400">Serier: ${res.series.join(', ')}</p>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold bg-gray-100 px-2 py-1 rounded mr-2 hidden sm:inline">Bästa: ${res.bestSeries}</span>
                        
                        <button class="edit-result-btn p-2 text-gray-500 hover:text-blue-600 transition" 
                                data-obj="${dataString}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>

                        <button class="delete-result-btn p-2 text-gray-500 hover:text-red-600 transition" 
                                data-id="${res.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });
    }
}