// Version 1.3 - Fixat inloggning och felhantering
import { 
    getFirestore, onSnapshot, collection, query, orderBy, where, getDocs, writeBatch, updateDoc, doc, deleteDoc, addDoc, setDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { 
    getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Modala funktioner
export function showMessage(message) {
    const msgElement = document.getElementById('modal-message');
    const modalElement = document.getElementById('messageModal');
    if (msgElement && modalElement) {
        msgElement.textContent = message;
        modalElement.classList.add('active');
    } else {
        alert(message);
    }
}

export function showConfirmation(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirmationModal').classList.add('active');
    
    const confirmBtn = document.getElementById('confirm-yes-btn');
    const cancelBtn = document.getElementById('confirm-no-btn');

    // Rensa tidigare event listeners genom att klona knapparna
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.onclick = () => {
        onConfirm();
        document.getElementById('confirmationModal').classList.remove('active');
    };
    newCancelBtn.onclick = () => {
        document.getElementById('confirmationModal').classList.remove('active');
    };
}

// Funktioner för att lägga till data
export async function addPriceGroup(globalState, name, prices) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad för att utföra denna åtgärd.');
    const priceGroupsCollection = collection(globalState.db, `artifacts/${globalState.appId}/public/data/priceGroups`);
    await addDoc(priceGroupsCollection, { name, prices, isDefault: false });
    showMessage('Prisgrupp tillagd!');
}

export async function addGroup(globalState, name, order) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad för att utföra denna åtgärd.');
    const groupsCollection = collection(globalState.db, `artifacts/${globalState.appId}/public/data/groups`);
    await addDoc(groupsCollection, { name, order: Number(order), isDefault: false });
    showMessage('Grupp tillagd!');
}

export async function addOrUpdatePostcard(globalState) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad för att utföra denna åtgärd.');
    
    const title = document.getElementById('postcard-title').value;
    const group = document.getElementById('postcard-group').value;
    const priceGroup = document.getElementById('postcard-price-group').value;
    
    const fileInput = document.getElementById('postcard-image-file');
    const existingUrlInput = document.getElementById('existing-image-url');
    const uploadStatus = document.getElementById('upload-status');
    const submitBtn = document.getElementById('add-postcard-btn');

    let imageURL = existingUrlInput.value; 

    // Kontrollera om en NY fil har valts
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        uploadStatus.classList.remove('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = "Laddar upp...";

        try {
            // Använd globalState.storage som ska vara initierat i admin.html
            const storage = globalState.storage;
            if (!storage) throw new Error("Storage är inte initierat korrekt.");

            const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const storageRef = ref(storage, `postcards/${Date.now()}_${safeName}`);
            
            const snapshot = await uploadBytes(storageRef, file);
            imageURL = await getDownloadURL(snapshot.ref);
            
        } catch (error) {
            console.error("Uppladdningsfel:", error);
            let errMsg = error.message;
            if (error.code === 'storage/unauthorized') errMsg = 'Du har inte behörighet (är du inloggad?).';
            showMessage("Kunde inte ladda upp bilden: " + errMsg);
            
            uploadStatus.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = globalState.currentEditingPostcardId ? 'Spara ändringar' : 'Lägg till vykort';
            return; 
        }
    } else if (!imageURL) {
        return showMessage("Du måste välja en bild.");
    }

    const postcardData = { title, imageURL, group, priceGroup };

    try {
        if (globalState.currentEditingPostcardId) {
            await updateDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/postcards`, globalState.currentEditingPostcardId), postcardData);
            showMessage('Vykort uppdaterat!');
            globalState.currentEditingPostcardId = null;
            document.getElementById('add-postcard-btn').textContent = 'Lägg till vykort';
        } else {
            await addDoc(collection(globalState.db, `artifacts/${globalState.appId}/public/data/postcards`), postcardData);
            showMessage('Vykort tillagt!');
        }
        
        document.getElementById('add-postcard-form').reset();
        document.getElementById('existing-image-url').value = "";
        document.getElementById('image-preview-container').classList.add('hidden');
        document.getElementById('image-preview').src = "";
        uploadStatus.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lägg till vykort';
        
    } catch (e) {
        console.error("Databasfel:", e);
        showMessage("Ett fel uppstod när datan skulle sparas.");
        submitBtn.disabled = false;
        uploadStatus.classList.add('hidden');
    }
}

export async function addSale(globalState, name, value, type, targetType, targetId, noTimeLimit, startDate, endDate, timezone) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const saleData = { name, value: Number(value), type, targetType, targetId, noTimeLimit, startDate, endDate, timezone };
    await addDoc(collection(globalState.db, `artifacts/${globalState.appId}/public/data/sales`), saleData);
    showMessage('Rea tillagd!');
}

export async function addNews(globalState, title, text, order, noTimeLimit, startDate, endDate) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const newsData = { title, text, order: Number(order), noTimeLimit, startDate: noTimeLimit ? null : startDate, endDate: noTimeLimit ? null : endDate };
    await addDoc(collection(globalState.db, `artifacts/${globalState.appId}/public/data/news`), newsData);
    showMessage('Nyhet tillagd!');
}

// UI Rendering
export function renderGroupsAndPrices(globalState) {
    const priceGroupSelect = document.getElementById('postcard-price-group');
    const groupSelect = document.getElementById('postcard-group');
    const saleTargetSelect = document.getElementById('sale-target-id');

    if (priceGroupSelect) {
        priceGroupSelect.innerHTML = '<option value="">Välj prisgrupp...</option>';
        globalState.priceGroupsData.forEach(pg => {
            const option = document.createElement('option');
            option.value = pg.id;
            option.textContent = pg.name;
            priceGroupSelect.appendChild(option);
            if (pg.isDefault) {
                globalState.defaultPriceGroupId = pg.id;
                option.selected = true;
            }
        });
    }

    if (groupSelect && saleTargetSelect) {
        groupSelect.innerHTML = '<option value="">Välj grupp...</option>';
        saleTargetSelect.innerHTML = '<option value="">Välj...</option>';
        
        globalState.groupsData.forEach(g => {
            const option = document.createElement('option');
            option.value = g.id;
            option.textContent = `Grupp: ${g.name}`;
            groupSelect.appendChild(option);
            saleTargetSelect.appendChild(option.cloneNode(true));
        });
        
        globalState.postcardsData.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `Produkt: ${p.title}`;
            saleTargetSelect.appendChild(option);
        });
    }
}

export async function updateSettings(globalState, swishNumber, swishName) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const { db, appId } = globalState;
    const settingsRef = doc(db, `artifacts/${appId}/public/data/settings`, 'swish');
    
    await setDoc(settingsRef, { number: swishNumber, name: swishName }, { merge: true });
    showMessage('Inställningar sparade!');
}

export function renderAdminLists(globalState) {
    const priceGroupsList = document.getElementById('price-groups-list');
    const groupsList = document.getElementById('groups-list');
    const postcardsList = document.getElementById('postcards-list');
    const adminsList = document.getElementById('admin-list');
    const salesList = document.getElementById('sales-list');
    const newsList = document.getElementById('news-list');
    
    // Prisgrupper
    if (priceGroupsList) {
        priceGroupsList.innerHTML = '';
        globalState.priceGroupsData.forEach(pg => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-2 bg-gray-100 rounded-md";
            const p = pg.prices || { liten: 0, mellan: 0, stor: 0 }; 
            div.innerHTML = `
                <span>${pg.name} ${pg.isDefault ? '(Std)' : ''} (L:${p.liten}, M:${p.mellan}, S:${p.stor})</span>
                <div class="space-x-2">
                    <button onclick="window.editPriceGroup('${pg.id}')" class="text-blue-500 hover:text-blue-700">Ändra</button>
                    ${globalState.priceGroupsData.length > 1 ? `<button onclick="window.deletePriceGroup('${pg.id}')" class="text-red-500 hover:text-red-700">Ta bort</button>` : ''}
                </div>`;
            priceGroupsList.appendChild(div);
        });
    }

    // Grupper
    if (groupsList) {
        groupsList.innerHTML = '';
        globalState.groupsData.forEach(g => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-2 bg-gray-100 rounded-md";
            div.innerHTML = `
                <span>${g.name} (Ordning: ${g.order})</span>
                <div class="space-x-2">
                    <button onclick="window.editGroup('${g.id}')" class="text-blue-500 hover:text-blue-700">Ändra</button>
                    ${globalState.groupsData.length > 1 ? `<button onclick="window.deleteGroup('${g.id}')" class="text-red-500 hover:text-red-700">Ta bort</button>` : ''}
                </div>`;
            groupsList.appendChild(div);
        });
    }

    // Vykort
    if (postcardsList) {
        postcardsList.innerHTML = '';
        globalState.postcardsData.forEach(p => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between p-4 bg-gray-100 rounded-md";
            const groupName = globalState.groupsData.find(g => g.id === p.group)?.name || 'Okänd';
            div.innerHTML = `
                <div class="flex items-center flex-1">
                    <img src="${p.imageURL}" alt="${p.title}" class="postcard-thumbnail">
                    <div class="flex-1 space-y-1 ml-3">
                        <h3 class="font-bold">${p.title}</h3>
                        <p class="text-sm text-gray-600">Grupp: ${groupName}</p>
                    </div>
                </div>
                <div class="space-x-2">
                    <button onclick="window.editPostcard('${p.id}')" class="text-blue-500 hover:text-blue-700">Ändra</button>
                    <button onclick="window.deletePostcard('${p.id}')" class="text-red-500 hover:text-red-700">Ta bort</button>
                </div>`;
            postcardsList.appendChild(div);
        });
    }

    // Admins
    if (adminsList) {
        adminsList.innerHTML = '';
        globalState.adminsData.forEach(a => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-2 bg-gray-100 rounded-md";
            div.innerHTML = `<span>${a.username}</span>
                ${globalState.adminsData.length > 1 ? `<button onclick="window.deleteAdmin('${a.id}')" class="text-red-500 hover:text-red-700">Ta bort</button>` : ''}`;
            adminsList.appendChild(div);
        });
    }

    // Rea
    if (salesList) {
        salesList.innerHTML = '';
        globalState.salesData.forEach(s => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-2 bg-gray-100 rounded-md";
            const val = s.type === 'percent' ? `${s.value}%` : `${s.value} kr`;
            div.innerHTML = `<span>${s.name} (${val})</span><button onclick="window.deleteSale('${s.id}')" class="text-red-500 hover:text-red-700">Ta bort</button>`;
            salesList.appendChild(div);
        });
    }

    // Nyheter
    if (newsList) {
        newsList.innerHTML = '';
        globalState.newsData.forEach(n => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-2 bg-gray-100 rounded-md";
            div.innerHTML = `<span>${n.title}</span>
                <div class="space-x-2">
                    <button onclick="window.editNews('${n.id}')" class="text-blue-500 text-sm">Ändra</button>
                    <button onclick="window.deleteNews('${n.id}')" class="text-red-500 text-sm">Ta bort</button>
                </div>`;
            newsList.appendChild(div);
        });
    }
}

export function updateAdminStatusBar(orders) {
    if(!document.getElementById('status-Ny')) return;
    const statusCounts = { 'Ny': 0, 'Väntar': 0, 'Avakta Betalning': 0, 'Betald': 0, 'Skickad': 0, 'Klar': 0 };
    orders.forEach(order => {
        const status = order.status || 'Ny';
        if (statusCounts[status] !== undefined) statusCounts[status]++;
    });

    for (const [key, value] of Object.entries(statusCounts)) {
        const el = document.getElementById(`status-${key.replace(' ', '-')}`); // Hantera "Avakta Betalning"
        if (el) el.textContent = `${key}: ${value}`;
    }
}

export async function addAdmin(globalState, username, password) {
    // OBS: Detta lägger bara till i databas-listan för visning, skapar INTE en Auth-user.
    // Auth-users måste skapas i Firebase Console eller via separat Admin SDK (som inte körs i webbläsaren).
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    await addDoc(collection(globalState.db, `artifacts/${globalState.appId}/public/data/admins`), { username, password: '***' });
    showMessage('Admin tillagd i listan (OBS: Skapa även kontot i Firebase Console!)');
}

export function startAdminListeners() {
    if (!window.globalState.db) return;
    const { db, appId } = window.globalState;

    // Prisgrupper
    window.globalState.unsubscribePriceGroups = onSnapshot(collection(db, `artifacts/${appId}/public/data/priceGroups`), (s) => {
        window.globalState.priceGroupsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGroupsAndPrices(window.globalState);
        renderAdminLists(window.globalState);
    });

    // Grupper
    window.globalState.unsubscribeGroups = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/groups`), orderBy('order')), (s) => {
        window.globalState.groupsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGroupsAndPrices(window.globalState);
        renderAdminLists(window.globalState);
    });

    // Vykort
    window.globalState.unsubscribePostcards = onSnapshot(collection(db, `artifacts/${appId}/public/data/postcards`), (s) => {
        window.globalState.postcardsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminLists(window.globalState);
        renderGroupsAndPrices(window.globalState);
    });
    
    // Admins
    window.globalState.unsubscribeAdmins = onSnapshot(collection(db, `artifacts/${appId}/public/data/admins`), (s) => {
        window.globalState.adminsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminLists(window.globalState);
    });
    
    // Sales
    window.globalState.unsubscribeSales = onSnapshot(collection(db, `artifacts/${appId}/public/data/sales`), (s) => {
        window.globalState.salesData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminLists(window.globalState);
    });
    
    // News
    window.globalState.unsubscribeNews = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/news`), orderBy('order')), (s) => {
        window.globalState.newsData = s.docs.map(d => {
            const data = d.data();
            if (data.startDate && data.startDate.toDate) data.startDate = data.startDate.toDate().toISOString().substring(0, 16);
            if (data.endDate && data.endDate.toDate) data.endDate = data.endDate.toDate().toISOString().substring(0, 16);
            return { id: d.id, ...data };
        });
        renderAdminLists(window.globalState);
    });
    
    // Orders
    window.globalState.unsubscribeOrders = onSnapshot(collection(db, `artifacts/${appId}/public/data/orders`), (s) => {
        const orders = s.docs.map(d => ({ id: d.id, ...d.data() }));
        updateAdminStatusBar(orders);
    });
    
    // Settings
    onSnapshot(doc(db, `artifacts/${appId}/public/data/settings`, 'swish'), (d) => {
        if (d.exists()) {
            const data = d.data();
            const numEl = document.getElementById('setting-swish-number');
            const nameEl = document.getElementById('setting-swish-name');
            if(numEl) numEl.value = data.number || '';
            if(nameEl) nameEl.value = data.name || '';
        }
    });
}

export function stopAdminListeners() {
    if (window.globalState.unsubscribePriceGroups) window.globalState.unsubscribePriceGroups();
    if (window.globalState.unsubscribeGroups) window.globalState.unsubscribeGroups();
    if (window.globalState.unsubscribePostcards) window.globalState.unsubscribePostcards();
    if (window.globalState.unsubscribeAdmins) window.globalState.unsubscribeAdmins();
    if (window.globalState.unsubscribeSales) window.globalState.unsubscribeSales();
    if (window.globalState.unsubscribeNews) window.globalState.unsubscribeNews();
    if (window.globalState.unsubscribeOrders) window.globalState.unsubscribeOrders();
}

// INLOGGNING - Uppdaterad för säkerhet
export async function handleLogin(globalState) {
    const email = document.getElementById('admin-email').value.trim(); // Trimma bort mellanslag
    const password = document.getElementById('admin-password').value;

    if (!email || !password) return showMessage("Fyll i både e-post och lösenord.");

    try {
        const auth = getAuth(); // Använd importerad funktion
        await signInWithEmailAndPassword(auth, email, password); // Använd importerad funktion
        
        globalState.isAdminLoggedIn = true;
        // UI uppdateras av onAuthStateChanged i admin.html
        
    } catch (e) {
        console.error("Inloggningsfel:", e);
        let msg = 'Ett fel uppstod vid inloggning.';
        
        // Hantera Firebase felkoder
        if (e.code === 'auth/invalid-email') msg = 'Ogiltig e-postadress.';
        if (e.code === 'auth/user-not-found') msg = 'Användaren finns inte.';
        if (e.code === 'auth/wrong-password') msg = 'Fel lösenord.';
        if (e.code === 'auth/invalid-credential') msg = 'Fel e-post eller lösenord.'; // NY KOD
        
        showMessage(msg);
    }
}

export async function handleLogout(globalState) {
    try {
        const auth = getAuth();
        await signOut(auth);
        
        globalState.isAdminLoggedIn = false;
        // UI återställs av onAuthStateChanged i admin.html
        
        // Rensa fält
        const emailField = document.getElementById('admin-email');
        const passField = document.getElementById('admin-password');
        if(emailField) emailField.value = '';
        if(passField) passField.value = '';
        
        stopAdminListeners();
    } catch (e) {
        console.error("Utloggningsfel:", e);
    }
}

// Redigering och radering (förenklade för korthet, men funktionella)
export async function editPriceGroup(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const pg = globalState.priceGroupsData.find(p => p.id === id);
    if (!pg) return;
    
    const name = prompt("Ändra namn:", pg.name);
    const liten = prompt("Pris Liten:", pg.prices.liten);
    const mellan = prompt("Pris Mellan:", pg.prices.mellan);
    const stor = prompt("Pris Stor:", pg.prices.stor);
    
    if (name && liten && mellan && stor) {
        await updateDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/priceGroups`, id), {
            name, prices: { liten: Number(liten), mellan: Number(mellan), stor: Number(stor) }
        });
    }
}

export async function deletePriceGroup(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const pg = globalState.priceGroupsData.find(pg => pg.id === id);
    if (pg?.isDefault) return showMessage('Kan inte ta bort standardgruppen.');
    
    showConfirmation("Ta bort denna prisgrupp? Vykort flyttas till standard.", async () => {
        const batch = writeBatch(globalState.db);
        // Flytta vykort logic här (samma som förut)...
        const q = query(collection(globalState.db, `artifacts/${globalState.appId}/public/data/postcards`), where('priceGroup', '==', id));
        const s = await getDocs(q);
        s.forEach(d => batch.update(d.ref, { priceGroup: globalState.defaultPriceGroupId }));
        batch.delete(doc(globalState.db, `artifacts/${globalState.appId}/public/data/priceGroups`, id));
        await batch.commit();
        showMessage('Borttagen.');
    });
}

export async function editGroup(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const g = globalState.groupsData.find(g => g.id === id);
    const name = prompt("Namn:", g.name);
    const order = prompt("Ordning:", g.order);
    if (name) await updateDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/groups`, id), { name, order: Number(order) });
}

export async function deleteGroup(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const g = globalState.groupsData.find(g => g.id === id);
    if (g?.isDefault) return showMessage('Kan inte ta bort standardgruppen.');
    
    showConfirmation("Ta bort grupp? Vykort flyttas till standard.", async () => {
        const batch = writeBatch(globalState.db);
        const q = query(collection(globalState.db, `artifacts/${globalState.appId}/public/data/postcards`), where('group', '==', id));
        const s = await getDocs(q);
        s.forEach(d => batch.update(d.ref, { group: globalState.defaultGroupId }));
        batch.delete(doc(globalState.db, `artifacts/${globalState.appId}/public/data/groups`, id));
        await batch.commit();
        showMessage('Borttagen.');
    });
}

export async function editPostcard(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const postcard = globalState.postcardsData.find(p => p.id === id);
    if (postcard) {
        document.getElementById('postcard-title').value = postcard.title;
        document.getElementById('postcard-group').value = postcard.group;
        document.getElementById('postcard-price-group').value = postcard.priceGroup;
        document.getElementById('existing-image-url').value = postcard.imageURL;
        document.getElementById('image-preview').src = postcard.imageURL;
        document.getElementById('image-preview-container').classList.remove('hidden');
        document.getElementById('postcard-image-file').value = ""; 
        
        globalState.currentEditingPostcardId = id;
        document.getElementById('add-postcard-btn').textContent = 'Spara ändringar';
        document.getElementById('add-postcard-form').scrollIntoView({ behavior: 'smooth' });
    }
}

export async function deletePostcard(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    showConfirmation("Ta bort vykort?", async () => {
        await deleteDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/postcards`, id));
        showMessage('Borttaget.');
    });
}

export async function deleteAdmin(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    showConfirmation("Ta bort admin från listan?", async () => {
        await deleteDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/admins`, id));
        showMessage('Borttagen.');
    });
}

export async function deleteSale(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    showConfirmation("Ta bort rea?", async () => {
        await deleteDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/sales`, id));
        showMessage('Borttagen.');
    });
}

export async function editNews(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    const newsItem = globalState.newsData.find(n => n.id === id);
    if (!newsItem) return;

    document.getElementById('edit-news-id').value = newsItem.id;
    document.getElementById('edit-news-title').value = newsItem.title;
    document.getElementById('edit-news-text').value = newsItem.text;
    document.getElementById('edit-news-order').value = newsItem.order;
    
    const noTime = document.getElementById('edit-news-no-time-limit');
    noTime.checked = newsItem.noTimeLimit;
    document.getElementById('edit-news-date-fields').classList.toggle('hidden', newsItem.noTimeLimit);
    
    if (!newsItem.noTimeLimit) {
        document.getElementById('edit-news-start-date').value = newsItem.startDate || '';
        document.getElementById('edit-news-end-date').value = newsItem.endDate || '';
    }
    document.getElementById('editNewsModal').classList.add('active');
}

export async function deleteNews(globalState, id) {
    if (!globalState.isAdminLoggedIn) return showMessage('Du måste vara inloggad.');
    showConfirmation("Ta bort nyhet?", async () => {
        await deleteDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/news`, id));
        showMessage('Borttagen.');
    });
}

export async function updateNews(globalState) {
    const id = document.getElementById('edit-news-id').value;
    const title = document.getElementById('edit-news-title').value;
    const text = document.getElementById('edit-news-text').value;
    const order = Number(document.getElementById('edit-news-order').value);
    const noTimeLimit = document.getElementById('edit-news-no-time-limit').checked;
    
    const data = { title, text, order, noTimeLimit };
    if (!noTimeLimit) {
        data.startDate = document.getElementById('edit-news-start-date').value;
        data.endDate = document.getElementById('edit-news-end-date').value;
    } else {
        data.startDate = null; data.endDate = null;
    }

    await updateDoc(doc(globalState.db, `artifacts/${globalState.appId}/public/data/news`, id), data);
    showMessage('Uppdaterad!');
    document.getElementById('editNewsModal').classList.remove('active');
}