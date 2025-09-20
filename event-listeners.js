// event-listeners.js
import { auth, signOut, db, doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "./main.js";
import { addOrUpdateDocument, deleteDocument, updateProfile, updateSiteSettings, addAdminFromUser, deleteAdmin, updateProfileByAdmin, newsData, eventsData, historyData, imageData, usersData, sponsorsData } from "./data-service.js";
import { navigate, showModal, hideModal, showUserInfoModal, showEditUserModal, applyEditorCommand, isAdminLoggedIn } from "./ui-handler.js";
import { handleImageUpload, handleSponsorUpload } from "./upload-handler.js";
import { checkNewsForm, checkHistoryForm, checkImageForm, checkSponsorForm, checkEventForm } from './form-validation.js';

// Ver. 1.14
let editingNewsId = null;
let editingHistoryId = null;
let editingImageId = null;
let editingEventId = null;
let editingSponsorId = null;

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
            // Efter utloggning kommer onAuthStateChanged att köras och uppdatera UI.
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
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settingsData = {
                siteName: document.getElementById('site-name-input').value,
                logoUrl: document.getElementById('logo-url-input').value,
                contactAddress: document.getElementById('contact-address-input').value,
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
                // Logic for recurring events
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
                // Logic for single event
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

    document.addEventListener('click', (e) => {
        // Shared click handlers
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
    });

    // Delegated click listeners
    document.addEventListener('click', (e) => {
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
                editingImageId = imageId;
                document.getElementById('image-title').value = imageItem.title;
                document.getElementById('image-url').value = imageItem.url;
                document.getElementById('image-year').value = imageItem.year;
                document.getElementById('image-month').value = imageItem.month;
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
    });

    // Input listeners
    const inputElements = [
        newsTitleInput, newsContentEditor,
        historyTitleInput, historyContentEditor, historyPriorityInput,
        imageTitleInput, imageYearInput, imageMonthInput, imageUploadInput, imageUrlInput,
        sponsorNameInput, sponsorExtraText, sponsorPriorityInput, sponsorLogoUpload, sponsorLogoUrlInput, sponsorSizeInput,
        eventTitleInput, eventDescriptionEditor, eventDateInput, isRecurringCheckbox, startDateInput, endDateInput, weekdaySelect
    ];

    inputElements.forEach(element => {
        if (element) {
            const formCheckers = {
                'news-title': checkNewsForm, 'news-content-editor': checkNewsForm,
                'history-title': checkHistoryForm, 'history-content-editor': checkHistoryForm, 'history-priority': checkHistoryForm,
                'image-title': checkImageForm, 'image-year': checkImageForm, 'image-month': checkImageForm, 'image-upload': checkImageForm, 'image-url': checkImageForm,
                'sponsor-name': checkSponsorForm, 'sponsor-extra-text': checkSponsorForm, 'sponsor-priority': checkSponsorForm, 'sponsor-logo-upload': checkSponsorForm, 'sponsor-logo-url': checkSponsorForm, 'sponsor-size': checkSponsorForm,
                'event-title': checkEventForm, 'event-description-editor': checkEventForm, 'event-date': checkEventForm, 'is-recurring': checkEventForm, 'start-date': checkEventForm, 'end-date': checkEventForm, 'weekday-select': checkEventForm
            };
            const eventType = element.id.includes('editor') || element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'number' || element.type === 'url' || element.type === 'date') ? 'input' : 'change';
            
            element.addEventListener(eventType, formCheckers[element.id]);
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
                const url = prompt("Ange länkens URL:");
                if (url) {
                    applyEditorCommand(editorElement, command, url);
                }
            } else if (command === 'insertImage') {
                const imageUrl = prompt("Ange bildens URL:");
                if (imageUrl) {
                    applyEditorCommand(editorElement, command, imageUrl);
                }
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
            } else {
                fileNameDisplay.textContent = 'Ingen fil vald';
            }
        });
    }
}