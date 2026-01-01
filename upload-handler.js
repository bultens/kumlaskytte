// upload-handler.js
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";
import { addOrUpdateDocument } from "./data-service.js";
// ÄNDRING: Hämta auth från config istället för main.js för att bryta cirkeln
import { auth } from "./firebase-config.js"; 
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ver. 1.07 (Fixad cirkulär dependency)
export let editingImageId = null;
export let editingSponsorId = null;

export function setEditingImageId(id) {
    editingImageId = id;
}

export function setEditingSponsorId(id) {
    editingSponsorId = id;
}

export async function handleImageUpload(e) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    
    const imageTitle = document.getElementById('image-title').value;
    const imageUrl = document.getElementById('image-url').value;
    const imageYear = parseInt(document.getElementById('image-year').value);
    const imageMonth = parseInt(document.getElementById('image-month').value);
    const imagePriority = parseInt(document.getElementById('image-priority').value);
    const file = document.getElementById('image-upload').files[0];

    if (!editingImageId && (!imageTitle || (!file && !imageUrl) || !imageYear || !imageMonth)) {
        showModal('errorModal', "Titel, år, månad och antingen en fil eller en URL krävs.");
        return;
    }
    
    let finalImageUrl = imageUrl;
    let storagePath = null;
    
    const imageObject = {
        title: imageTitle,
        url: finalImageUrl,
        year: imageYear,
        month: imageMonth,
        priority: imagePriority || 10,
        createdAt: editingImageId ? null : serverTimestamp(),
        updatedAt: editingImageId ? serverTimestamp() : null
    };

    if (file) {
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_IMAGE_SIZE) {
            showModal('errorModal', "Bilden är för stor. Max tillåten storlek är 5 MB.");
            return;
        }

        const uploadProgressContainer = document.getElementById('upload-progress-container');
        const addImageBtn = document.getElementById('add-image-btn');
        const uploadProgress = document.getElementById('upload-progress');
        const uploadStatus = document.getElementById('upload-status');
        
        const storage = getStorage();
        storagePath = `images/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadProgressContainer.classList.remove('hidden');
        addImageBtn.disabled = true;

        try {
            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        uploadProgress.value = progress;
                        uploadStatus.textContent = `Laddar upp: ${progress.toFixed(0)}%`;
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            finalImageUrl = downloadURL;
                            resolve();
                        }).catch(reject);
                    }
                );
            });
            imageObject.url = finalImageUrl;
            imageObject.storagePath = storagePath;
        } catch (error) {
            console.error("Upload failed:", error);
            showModal('errorModal', "Uppladdning misslyckades. Vänligen försök igen.");
            uploadProgressContainer.classList.add('hidden');
            addImageBtn.disabled = false;
            return;
        }
    }
    
    const successMessage = editingImageId ? "Bilden har uppdaterats!" : "Bilden har lagts till!";
    await addOrUpdateDocument('images', editingImageId, imageObject, successMessage, "Ett fel uppstod när bilden skulle hanteras.");
    
    const addImageForm = document.getElementById('add-image-form');
    if (addImageForm) {
        addImageForm.reset();
        document.getElementById('upload-progress-container').classList.add('hidden');
        document.getElementById('image-form-title').textContent = 'Lägg till Bild';
        document.getElementById('add-image-btn').textContent = 'Lägg till Bild';
        document.getElementById('add-image-btn').disabled = true;
        document.getElementById('add-image-btn').classList.remove('bg-blue-600', 'hover:bg-blue-700');
        document.getElementById('add-image-btn').classList.add('bg-gray-400');
        document.getElementById('file-name-display').textContent = 'Ingen fil vald';
        document.getElementById('clear-image-upload').classList.add('hidden');
    }

    editingImageId = null;
}

export async function handleSponsorUpload(e) {
    if (!isAdminLoggedIn) {
        showModal('errorModal', "Du har inte behörighet att utföra denna åtgärd.");
        return;
    }
    
    const sponsorName = document.getElementById('sponsor-name').value;
    const sponsorExtraText = document.getElementById('sponsor-extra-text').value;
    const sponsorUrl = document.getElementById('sponsor-url').value;
    const sponsorLogoUrl = document.getElementById('sponsor-logo-url').value;
    const sponsorPriority = parseInt(document.getElementById('sponsor-priority').value);
    const sponsorSize = document.getElementById('sponsor-size').value;
    const file = document.getElementById('sponsor-logo-upload').files[0];
    
    if (!editingSponsorId && (!sponsorName || isNaN(sponsorPriority) || (sponsorLogoUrl === "" && !file))) {
        showModal('errorModal', "Sponsornamn, prioritet och logotyp krävs.");
        return;
    }

    let finalLogoUrl = sponsorLogoUrl;
    let storagePath = null;
    
    const sponsorObject = {
        name: sponsorName,
        extraText: sponsorExtraText,
        url: sponsorUrl,
        logoUrl: finalLogoUrl,
        priority: sponsorPriority,
        size: sponsorSize,
        storagePath: storagePath,
        createdAt: editingSponsorId ? null : serverTimestamp(),
        updatedAt: editingSponsorId ? serverTimestamp() : null
    };
    
    if (file) {
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_IMAGE_SIZE) {
            showModal('errorModal', "Logotypen är för stor. Max tillåten storlek är 5 MB.");
            return;
        }

        const uploadProgressContainer = document.getElementById('sponsor-upload-progress-container');
        const addSponsorBtn = document.getElementById('add-sponsor-btn');
        const uploadProgress = document.getElementById('sponsor-upload-progress');
        const uploadStatus = document.getElementById('sponsor-upload-status');

        const storage = getStorage();
        storagePath = `sponsors/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadProgressContainer.classList.remove('hidden');
        addSponsorBtn.disabled = true;

        try {
            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        uploadProgress.value = progress;
                        uploadStatus.textContent = `Laddar upp: ${progress.toFixed(0)}%`;
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            finalLogoUrl = downloadURL;
                            resolve();
                        }).catch(reject);
                    }
                );
            });
            sponsorObject.logoUrl = finalLogoUrl;
            sponsorObject.storagePath = storagePath;
        } catch (error) {
            console.error("Upload failed:", error);
            showModal('errorModal', "Uppladdning misslyckades. Vänligen försök igen.");
            document.getElementById('sponsor-upload-progress-container').classList.add('hidden');
            addSponsorBtn.disabled = false;
            return;
        }
    }
    
    await addOrUpdateDocument('sponsors', editingSponsorId, sponsorObject, "Sponsorn har lagts till!", "Ett fel uppstod när sponsorn skulle hanteras.");

    const addSponsorForm = document.getElementById('add-sponsor-form');
    if (addSponsorForm) {
        addSponsorForm.reset();
        document.getElementById('sponsor-upload-progress-container').classList.add('hidden');
        document.getElementById('sponsor-form-title').textContent = 'Lägg till Sponsor';
        document.getElementById('add-sponsor-btn').textContent = 'Lägg till Sponsor';
        document.getElementById('add-sponsor-btn').disabled = true;
        document.getElementById('add-sponsor-btn').classList.remove('bg-blue-600', 'hover:bg-blue-700');
        document.getElementById('add-sponsor-btn').classList.add('bg-gray-400');
        document.getElementById('sponsor-logo-name-display').textContent = 'Ingen fil vald';
        document.getElementById('clear-sponsor-logo-upload').classList.add('hidden');
    }

    editingSponsorId = null;
}