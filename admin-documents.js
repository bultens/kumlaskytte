// admin-documents.js
import { getFolderContents, createFolder, uploadAdminDocument, deleteAdminDocument, moveAdminDocument, deleteAdminFolder } from "./data-service.js";
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentFolderId = null;
let breadcrumbPath = [{ id: null, name: 'Hem' }];

// Hjälpfunktion: Formatera filstorlek
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Hjälpfunktion: Formatera datum
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function initFileManager() {
    const container = document.getElementById('file-manager-container');
    if (!container) return;
    
    // Ladda rot-mappen vid start
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

    // 2. Ladda upp fil
    const uploadInput = document.getElementById('upload-doc-input');
    if(uploadInput) uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadAdminDocument(file, currentFolderId);
            await loadFolder(currentFolderId);
            e.target.value = ''; 
        }
    });

    // 3. Hantera klick i fil-listan
    const fileList = document.getElementById('file-list');
    if(fileList) fileList.addEventListener('click', async (e) => {
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
            await deleteFile(id, storagePath);
        }
        else if (action === 'move-file') {
            await moveFile(id);
        }
        else if (action === 'delete-folder') {
            // NYTT: Radera mapp
            if(confirm("Vill du ta bort mappen? Den måste vara tom.")) {
                const success = await deleteAdminFolder(id);
                if (success) await loadFolder(currentFolderId);
            }
        }
    });

    // 4. Hantera klick i brödsmulorna
    const breadcrumbs = document.getElementById('breadcrumbs');
    if(breadcrumbs) breadcrumbs.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action="open-folder"]');
        if (target) {
            const id = target.dataset.id;
            const name = target.dataset.name;
            await openFolder(id === 'null' ? null : id, name);
        }
    });

    // 5. Stäng menyer om man klickar utanför
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action="toggle-menu"]')) {
            document.querySelectorAll('[id^="file-menu-"]').forEach(el => el.classList.add('hidden'));
        }
    });
}

// Logik för att öppna mapp och uppdatera brödsmulor
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

// Huvudfunktion för att rita UI
async function loadFolder(folderId) {
    currentFolderId = folderId;
    const container = document.getElementById('file-list');
    container.innerHTML = '<p class="text-gray-500 p-4">Laddar...</p>';

    updateBreadcrumbs();

    const { folders, files } = await getFolderContents(folderId);
    container.innerHTML = '';

    if (folders.length === 0 && files.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic p-4">Mappen är tom.</p>';
        return;
    }

    // 1. Rita mappar
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 hover:bg-gray-100 border-b transition group";
        
        // Vi lägger till en delete-knapp för mappar som syns vid hover (eller alltid på mobil)
        div.innerHTML = `
            <div class="flex items-center gap-3 flex-grow cursor-pointer" data-action="open-folder" data-id="${folder.id}" data-name="${folder.name}">
                <span class="text-2xl">📁</span>
                <span class="font-semibold text-gray-700">${folder.name}</span>
            </div>
            <button class="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Ta bort mapp" data-action="delete-folder" data-id="${folder.id}">
                🗑️
            </button>
        `;
        container.appendChild(div);
    });

    // 2. Rita filer (Nu med mer info)
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 hover:bg-gray-50 border-b transition relative";
        
        let icon = '📄';
        if (file.mimeType && file.mimeType.includes('pdf')) icon = '📕';
        if (file.mimeType && file.mimeType.includes('image')) icon = '🖼️';

        // Formatera data
        const dateStr = formatDate(file.createdAt);
        const sizeStr = formatBytes(file.size);

        div.innerHTML = `
            <div class="flex items-center gap-3 flex-grow min-w-0">
                <a href="${file.url}" target="_blank" class="flex items-center gap-3 hover:text-blue-600 truncate">
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
}

function updateBreadcrumbs() {
    const el = document.getElementById('breadcrumbs');
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

async function deleteFile(id, storagePath) {
    if (confirm("Är du säker på att du vill ta bort filen?")) {
        await deleteAdminDocument(id, storagePath);
        await loadFolder(currentFolderId);
    }
}

async function moveFile(docId) {
    const allFoldersSnap = await getDocs(collection(db, 'folders'));
    let folderListText = "0: Hem (Roten)\n";
    const folders = allFoldersSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // Sortera mappar för listan
    folders.sort((a,b) => a.name.localeCompare(b.name));
    
    folders.forEach((f, i) => {
        folderListText += `${i + 1}: ${f.name}\n`;
    });

    const selection = prompt(`Ange numret på mappen du vill flytta till:\n\n${folderListText}`);
    
    if (selection !== null) {
        const index = parseInt(selection);
        let targetFolderId = null;
        
        if (index > 0 && index <= folders.length) {
            targetFolderId = folders[index - 1].id;
        } else if (index !== 0) {
            alert("Ogiltigt val.");
            return;
        }
        
        await moveAdminDocument(docId, targetFolderId);
        await loadFolder(currentFolderId);
    }
}