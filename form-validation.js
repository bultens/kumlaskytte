// form-validation.js
// Ver. 1.0
export function checkNewsForm() {
    const newsTitleInput = document.getElementById('news-title');
    const newsContentEditor = document.getElementById('news-content-editor');
    const newsAddBtn = document.getElementById('add-news-btn');

    if (newsTitleInput.value && newsContentEditor.innerHTML.trim()) {
        newsAddBtn.disabled = false;
        newsAddBtn.classList.remove('bg-gray-400');
        newsAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        newsAddBtn.disabled = true;
        newsAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        newsAddBtn.classList.add('bg-gray-400');
    }
}

export function checkHistoryForm() {
    const historyTitleInput = document.getElementById('history-title');
    const historyContentEditor = document.getElementById('history-content-editor');
    const historyPriorityInput = document.getElementById('history-priority');
    const historyAddBtn = document.getElementById('add-history-btn');

    if (historyTitleInput.value && historyContentEditor.innerHTML.trim() && historyPriorityInput.value) {
        historyAddBtn.disabled = false;
        historyAddBtn.classList.remove('bg-gray-400');
        historyAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        historyAddBtn.disabled = true;
        historyAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        historyAddBtn.classList.add('bg-gray-400');
    }
}

export function checkImageForm() {
    const imageTitleInput = document.getElementById('image-title');
    const imageYearInput = document.getElementById('image-year');
    const imageMonthInput = document.getElementById('image-month');
    const imageUploadInput = document.getElementById('image-upload');
    const imageUrlInput = document.getElementById('image-url');
    const addImageBtn = document.getElementById('add-image-btn');

    const hasTitle = imageTitleInput.value.trim();
    const hasYear = imageYearInput.value.trim();
    const hasMonth = imageMonthInput.value.trim();
    const hasFile = imageUploadInput.files.length > 0;
    const hasUrl = imageUrlInput.value.trim();

    const isEditMode = false; // Denna logik hanteras i event-listeners

    if (isEditMode) {
        addImageBtn.disabled = false;
        addImageBtn.classList.remove('bg-gray-400');
        addImageBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        return;
    }

    if (hasTitle && hasYear && hasMonth && (hasFile || hasUrl)) {
        addImageBtn.disabled = false;
        addImageBtn.classList.remove('bg-gray-400');
        addImageBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        addImageBtn.disabled = true;
        addImageBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        addImageBtn.classList.add('bg-gray-400');
    }
}

export function checkSponsorForm() {
    const sponsorNameInput = document.getElementById('sponsor-name');
    const sponsorPriorityInput = document.getElementById('sponsor-priority');
    const sponsorLogoUpload = document.getElementById('sponsor-logo-upload');
    const sponsorLogoUrlInput = document.getElementById('sponsor-logo-url');
    const addSponsorBtn = document.getElementById('add-sponsor-btn');
    
    const hasName = sponsorNameInput.value.trim();
    const hasPriority = sponsorPriorityInput.value.trim() !== '' && !isNaN(parseInt(sponsorPriorityInput.value));
    const hasLogoFile = sponsorLogoUpload.files.length > 0;
    const hasLogoUrl = sponsorLogoUrlInput.value.trim();

    const isEditMode = false; // Denna logik hanteras i event-listeners

    if (isEditMode) {
        addSponsorBtn.disabled = false;
        addSponsorBtn.classList.remove('bg-gray-400');
        addSponsorBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        return;
    }

    if (hasName && hasPriority && (hasLogoFile || hasLogoUrl)) {
        addSponsorBtn.disabled = false;
        addSponsorBtn.classList.remove('bg-gray-400');
        addSponsorBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        addSponsorBtn.disabled = true;
        addSponsorBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        addSponsorBtn.classList.add('bg-gray-400');
    }
}

export function checkEventForm() {
    const isRecurringCheckbox = document.getElementById('is-recurring');
    const eventTitleInput = document.getElementById('event-title');
    const eventDescriptionEditor = document.getElementById('event-description-editor');
    const eventDateInput = document.getElementById('event-date');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const weekdaySelect = document.getElementById('weekday-select');
    const eventAddBtn = document.getElementById('add-event-btn');

    const isRecurring = isRecurringCheckbox.checked;
    const eventTitle = eventTitleInput.value.trim();
    const eventDescription = eventDescriptionEditor.innerHTML.trim();
    let isFormValid = false;

    if (eventTitle && eventDescription) {
        if (isRecurring) {
            if (startDateInput.value && endDateInput.value && weekdaySelect.value) {
                isFormValid = true;
            }
        } else {
            if (eventDateInput.value) {
                isFormValid = true;
            }
        }
    }

    if (isFormValid) {
        eventAddBtn.disabled = false;
        eventAddBtn.classList.remove('bg-gray-400');
        eventAddBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        eventAddBtn.disabled = true;
        eventAddBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        eventAddBtn.classList.add('bg-gray-400');
    }
}