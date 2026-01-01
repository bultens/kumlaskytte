// admin-documents.js
import { getFolderContents, createFolder, uploadAdminDocument, deleteAdminDocument, moveAdminDocument, getFolderName } from "./data-service.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

let currentFolderId = null;
let breadcrumbPath = [{ id: null, name: 'Hem' }];

export async function initFileManager() {
    const container = document.getElementById('file-manager-container');
    if (!container) return;
    
    // Ladda rot-mappen vid start
    await loadFolder(null);

    // --- EVENT LISTENERS (Istället för onclick) ---

    // 1. Skapa mapp
    document.getElementById('create-folder-btn').addEventListener('click', async () => {
        const name = prompt("Ange namn på ny mapp:");
        if (name) {
            await createFolder(name, currentFolderId);
            await loadFolder(currentFolderId);
        }
    });

    // 2. Ladda upp fil
    document.getElementById('upload-doc-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadAdminDocument(file, currentFolderId);
            await loadFolder(currentFolderId);
            e.target.value = ''; 
        }
    });

    // 3. Hantera klick i fil-listan (Öppna mapp, meny, ta bort etc)
    document.getElementById('file-list').addEventListener('click', async (e) => {
        // Hitta närmaste element med data-action attribut
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
            e.stopPropagation(); // Förhindra att klicket stänger menyn direkt
        }
        else if (action === 'delete-file') {
            const storagePath = target.dataset.storagePath;
            await deleteFile(id, storagePath);
        }
        else if (action === 'move-file') {
            await moveFile(id);
        }
    });

    // 4. Hantera klick i brödsmulorna
    document.getElementById('breadcrumbs').addEventListener('click', async (e) => {
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
    
    // Uppdatera path
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

    // Rita mappar (använd data-action istället för onclick)
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 hover:bg-gray-100 border-b cursor-pointer transition";
        // Notera data-action="open-folder"
        div.innerHTML = `
            <div class="flex items-center gap-3 flex-grow" data-action="open-folder" data-id="${folder.id}" data-name="${folder.name}">
                <span class="text-2xl">📁</span>
                <span class="font-semibold text-gray-700">${folder.name}</span>
            </div>
        `;
        container.appendChild(div);
    });

    // Rita filer
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 hover:bg-gray-50 border-b transition relative";
        
        let icon = '📄';
        if (file.mimeType && file.mimeType.includes('pdf')) icon = '📕';
        if (file.mimeType && file.mimeType.includes('image')) icon = '🖼️';

        div.innerHTML = `
            <a href="${file.url}" target="_blank" class="flex items-center gap-3 flex-grow hover:text-blue-600">
                <span class="text-xl">${icon}</span>
                <span class="text-gray-700">${file.name}</span>
            </a>
            
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
                        🗑️ Ta bort
                    </button>
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
    // Stäng alla andra menyer
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