// admin-documents.js
import { getFolderContents, createFolder, uploadAdminDocument, deleteAdminDocument, moveAdminDocument, deleteAdminFolder } from "./data-service.js";
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { isAdminLoggedIn } from "./ui-handler.js"; 

let currentFolderId = null;
let breadcrumbPath = [{ id: null, name: 'Hem' }];
let isFileManagerInitialized = false;

// NYTT: Håller koll på valda filer
let selectedFileIds = new Set();
let currentFilesList = []; // För att kunna slå upp fil-objekt baserat på ID

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function initFileManager() {
    if (!isAdminLoggedIn) return;

    const container = document.getElementById('file-manager-container');
    if (!container) return;

    // --- NYTT: INJECTA BULK-VERKTYGSRAD OM DEN SAKNAS ---
    if (!document.getElementById('bulk-toolbar')) {
        const toolbarHTML = `
            <div id="bulk-toolbar" class="hidden flex items-center gap-4 bg-blue-50 p-3 mb-4 rounded border border-blue-200 sticky top-0 z-10">
                <span id="selected-count" class="font-bold text-blue-800">0 valda</span>
                <div class="flex gap-2">
                    <button id="bulk-download-btn" class="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 text-sm">⬇️ Ladda ner</button>
                    <button id="bulk-move-btn" class="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 text-sm">↪ Flytta</button>
                    <button id="bulk-delete-btn" class="px-3 py-1 bg-red-100 border border-red-300 text-red-700 rounded hover:bg-red-200 text-sm">🗑️ Ta bort</button>
                </div>
                <button id="bulk-cancel-btn" class="ml-auto text-gray-500 hover:text-gray-800 text-sm underline">Avbryt</button>
            </div>
        `;
        // Lägg in toolbaren precis innan fil-listan
        const fileListEl = document.getElementById('file-list');
        if (fileListEl) {
            fileListEl.insertAdjacentHTML('beforebegin', toolbarHTML);
        }
    }

    if (isFileManagerInitialized) {
        await loadFolder(null);
        return;
    }
    
    isFileManagerInitialized = true;
    await loadFolder(null);

    // --- EVENT LISTENERS ---

    // 1. Skapa mapp
    const createBtn = document.getElementById('create-folder-btn');
    if(createBtn) createBtn.addEventListener('click', async () => {
        const name = prompt("Ange namn på ny mapp:");
        if (name) {
            await createFolder(name, currentFolderId);
            await loadFolder(currentFolderId);
        }
    });

    // 2. Ladda upp filer (Multiple)
    const uploadInput = document.getElementById('upload-doc-input');
    if(uploadInput) {
        uploadInput.setAttribute('multiple', 'multiple');
        uploadInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                const listContainer = document.getElementById('file-list');
                if(listContainer) listContainer.innerHTML = `<p class="text-blue-600 p-4 font-bold">Laddar upp ${files.length} filer...</p>`;
                
                try {
                    const uploadPromises = files.map(file => uploadAdminDocument(file, currentFolderId));
                    await Promise.all(uploadPromises);
                } catch (error) {
                    console.error("Fel vid uppladdning:", error);
                    alert("Ett fel uppstod vid uppladdning.");
                }
                await loadFolder(currentFolderId);
                e.target.value = ''; 
            }
        });
    }

    // 3. Hantera klick i fil-listan (Delegering)
    const fileList = document.getElementById('file-list');
    if(fileList) fileList.addEventListener('click', async (e) => {
        // Om man klickar på en checkbox - hantera markering
        if (e.target.type === 'checkbox' && e.target.dataset.type === 'file-select') {
            handleFileSelection(e.target.dataset.id, e.target.checked);
            e.stopPropagation();
            return;
        }

        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;
        
        if (action === 'open-folder') {
            const name = target.dataset.name;
            await openFolder(id === 'null' ? null : id, name);
        } 
        else if (action === 'toggle-menu') {
            toggleFileMenu(id);
            e.stopPropagation();
        }
        else if (action === 'delete-file') {
            const storagePath = target.dataset.storagePath;
            if (confirm("Är du säker på att du vill ta bort filen?")) {
                await deleteAdminDocument(id, storagePath);
                await loadFolder(currentFolderId);
            }
        }
        else if (action === 'move-file') {
            await moveSingleFile(id);
        }
        else if (action === 'delete-folder') {
            if(confirm("Vill du ta bort mappen?")) {
                const success = await deleteAdminFolder(id);
                if (success) await loadFolder(currentFolderId);
            }
        }
    });

    // 4. Brödsmulor
    const breadcrumbs = document.getElementById('breadcrumbs');
    if(breadcrumbs) breadcrumbs.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action="open-folder"]');
        if (target) {
            await openFolder(target.dataset.id === 'null' ? null : target.dataset.id, target.dataset.name);
        }
    });

    // 5. Stäng menyer
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action="toggle-menu"]')) {
            document.querySelectorAll('[id^="file-menu-"]').forEach(el => el.classList.add('hidden'));
        }
    });

    // --- NYTT: BULK ACTION LISTENERS ---
    
    document.getElementById('bulk-cancel-btn')?.addEventListener('click', () => {
        clearSelection();
    });

    document.getElementById('bulk-delete-btn')?.addEventListener('click', async () => {
        if (!confirm(`Är du säker på att du vill ta bort ${selectedFileIds.size} filer?`)) return;
        
        const filesToDelete = currentFilesList.filter(f => selectedFileIds.has(f.id));
        
        // Visa laddar-text
        document.getElementById('file-list').innerHTML = `<p class="text-red-600 p-4 font-bold">Raderar ${filesToDelete.length} filer...</p>`;

        try {
            const promises = filesToDelete.map(file => deleteAdminDocument(file.id, file.storagePath));
            await Promise.all(promises);
            clearSelection();
            await loadFolder(currentFolderId);
        } catch (err) {
            alert("Ett fel uppstod vid radering.");
            await loadFolder(currentFolderId);
        }
    });

    document.getElementById('bulk-move-btn')?.addEventListener('click', async () => {
        const targetFolderId = await promptForDestinationFolder();
        if (targetFolderId === undefined) return; // Avbrutet

        document.getElementById('file-list').innerHTML = `<p class="text-blue-600 p-4 font-bold">Flyttar ${selectedFileIds.size} filer...</p>`;
        
        try {
            const promises = Array.from(selectedFileIds).map(docId => moveAdminDocument(docId, targetFolderId));
            await Promise.all(promises);
            clearSelection();
            await loadFolder(currentFolderId);
        } catch (err) {
            alert("Ett fel uppstod vid flytt.");
            await loadFolder(currentFolderId);
        }
    });

    document.getElementById('bulk-download-btn')?.addEventListener('click', () => {
        const filesToDownload = currentFilesList.filter(f => selectedFileIds.has(f.id));
        
        if (filesToDownload.length > 5 && !confirm(`Du är på väg att ladda ner ${filesToDownload.length} filer. Detta öppnar många flikar. Vill du fortsätta?`)) {
            return;
        }

        filesToDownload.forEach(file => {
            // Öppna i ny flik. Webbläsare kan blockera om det är för många.
            window.open(file.url, '_blank');
        });
        clearSelection();
    });
}

// --- LOGIK FÖR VAL AV FILER ---

function handleFileSelection(id, isSelected) {
    if (isSelected) {
        selectedFileIds.add(id);
    } else {
        selectedFileIds.delete(id);
    }
    updateBulkToolbar();
}

function clearSelection() {
    selectedFileIds.clear();
    updateBulkToolbar();
    // Avmarkera alla checkboxar visuellt
    document.querySelectorAll('input[data-type="file-select"]').forEach(cb => cb.checked = false);
}

function updateBulkToolbar() {
    const toolbar = document.getElementById('bulk-toolbar');
    const countSpan = document.getElementById('selected-count');
    
    if (selectedFileIds.size > 0) {
        toolbar.classList.remove('hidden');
        countSpan.textContent = `${selectedFileIds.size} vald${selectedFileIds.size === 1 ? '' : 'a'}`;
    } else {
        toolbar.classList.add('hidden');
    }
}

// --- STANDARD LOGIK ---

async function openFolder(id, name) {
    const targetId = id === 'null' ? null : id;
    const existingIndex = breadcrumbPath.findIndex(b => b.id === targetId);
    if (existingIndex === -1 && targetId !== null) {
        breadcrumbPath.push({ id: targetId, name: name });
    } else if (targetId === null) {
        breadcrumbPath = [{ id: null, name: 'Hem' }];
    } else {
         breadcrumbPath = breadcrumbPath.slice(0, existingIndex + 1);
    }
    await loadFolder(targetId);
}

async function loadFolder(folderId) {
    currentFolderId = folderId;
    clearSelection(); // Nollställ val när man byter mapp eller laddar om

    const container = document.getElementById('file-list');
    if (!container) return;

    container.innerHTML = '<p class="text-gray-500 p-4">Laddar...</p>';
    updateBreadcrumbs();

    try {
        const { folders, files } = await getFolderContents(folderId);
        currentFilesList = files; // Spara referens till filerna i nuvarande mapp
        container.innerHTML = '';

        if (folders.length === 0 && files.length === 0) {
            container.innerHTML = '<p class="text-gray-400 italic p-4">Mappen är tom.</p>';
            return;
        }

        // 1. Rita mappar (Ingen checkbox för mappar just nu för enkelhetens skull)
        folders.forEach(folder => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-3 hover:bg-gray-100 border-b transition group pl-2";
            div.innerHTML = `
                <div class="flex items-center gap-3 flex-grow cursor-pointer" data-action="open-folder" data-id="${folder.id}" data-name="${folder.name}">
                    <span class="text-2xl ml-8">📁</span> <span class="font-semibold text-gray-700">${folder.name}</span>
                </div>
                <button class="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Ta bort mapp" data-action="delete-folder" data-id="${folder.id}">
                    🗑️
                </button>
            `;
            container.appendChild(div);
        });

        // 2. Rita filer (MED CHECKBOX)
        files.forEach(file => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-3 hover:bg-gray-50 border-b transition relative";
            
            let icon = '📄';
            if (file.mimeType && file.mimeType.includes('pdf')) icon = '📕';
            if (file.mimeType && file.mimeType.includes('image')) icon = '🖼️';

            const dateStr = formatDate(file.createdAt);
            const sizeStr = formatBytes(file.size);

            div.innerHTML = `
                <div class="flex items-center gap-3 flex-grow min-w-0">
                    <input type="checkbox" data-type="file-select" data-id="${file.id}" class="w-5 h-5 cursor-pointer accent-blue-600">
                    
                    <a href="${file.url}" target="_blank" class="flex items-center gap-3 hover:text-blue-600 truncate ml-2">
                        <span class="text-xl flex-shrink-0">${icon}</span>
                        <span class="text-gray-700 font-medium truncate">${file.name}</span>
                    </a>
                </div>
                
                <div class="flex items-center gap-4 flex-shrink-0">
                    <div class="hidden sm:flex flex-col items-end text-xs text-gray-400">
                        <span>${dateStr}</span>
                        <span>${sizeStr}</span>
                    </div>

                    <div class="relative">
                        <button class="p-2 text-gray-500 hover:text-gray-800 font-bold rounded-full hover:bg-gray-200" 
                            data-action="toggle-menu" data-id="${file.id}">
                            ⋮
                        </button>
                        
                        <div id="file-menu-${file.id}" class="hidden absolute right-0 mt-2 w-48 bg-white border rounded shadow-xl z-50">
                            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" 
                                data-action="move-file" data-id="${file.id}">
                                ↪ Flytta...
                            </button>
                            <button class="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm font-bold border-t" 
                                data-action="delete-file" data-id="${file.id}" data-storage-path="${file.storagePath}">
                                🗑️ Ta bort fil
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Fel vid laddning av mapp:", error);
    }
}

function updateBreadcrumbs() {
    const el = document.getElementById('breadcrumbs');
    if(!el) return;
    el.innerHTML = breadcrumbPath.map((crumb, index) => {
        const isLast = index === breadcrumbPath.length - 1;
        if (isLast) return `<span class="font-bold text-gray-800">${crumb.name}</span>`;
        return `<span class="text-blue-600 cursor-pointer hover:underline" 
            data-action="open-folder" data-id="${crumb.id !== null ? crumb.id : 'null'}" data-name="${crumb.name}">
            ${crumb.name}
        </span> <span class="text-gray-400 mx-2">/</span>`;
    }).join('');
}

function toggleFileMenu(fileId) {
    document.querySelectorAll('[id^="file-menu-"]').forEach(el => {
        if (el.id !== `file-menu-${fileId}`) el.classList.add('hidden');
    });
    const menu = document.getElementById(`file-menu-${fileId}`);
    if(menu) menu.classList.toggle('hidden');
}

// Återanvändbar prompt för att välja mapp (används av både singel och bulk)
async function promptForDestinationFolder() {
    const allFoldersSnap = await getDocs(collection(db, 'folders'));
    let folderListText = "0: Hem (Roten)\n";
    const folders = allFoldersSnap.docs.map(d => ({id: d.id, ...d.data()}));
    folders.sort((a,b) => a.name.localeCompare(b.name));
    
    folders.forEach((f, i) => {
        folderListText += `${i + 1}: ${f.name}\n`;
    });

    const selection = prompt(`Ange numret på mappen du vill flytta till:\n\n${folderListText}`);
    
    if (selection !== null) {
        const index = parseInt(selection);
        if (index > 0 && index <= folders.length) {
            return folders[index - 1].id;
        } else if (index === 0) {
            return null; // Roten
        } else {
            alert("Ogiltigt val.");
            return undefined;
        }
    }
    return undefined;
}

// Flytta EN fil (från menyn)
async function moveSingleFile(docId) {
    const targetFolderId = await promptForDestinationFolder();
    if (targetFolderId !== undefined) {
        await moveAdminDocument(docId, targetFolderId);
        await loadFolder(currentFolderId);
    }
}