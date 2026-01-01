// admin-documents.js
import { getFolderContents, createFolder, uploadAdminDocument, deleteAdminDocument, moveAdminDocument, getFolderName, allShootersData } from "./data-service.js";
import { showModal, isAdminLoggedIn } from "./ui-handler.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

let currentFolderId = null;
let breadcrumbPath = [{ id: null, name: 'Hem' }];

export async function initFileManager() {
    if (!document.getElementById('file-manager-container')) return;
    
    // Ladda rot-mappen vid start
    await loadFolder(null);

    // Event listeners för knappar
    document.getElementById('create-folder-btn').addEventListener('click', async () => {
        const name = prompt("Ange namn på ny mapp:");
        if (name) {
            await createFolder(name, currentFolderId);
            await loadFolder(currentFolderId);
        }
    });

    document.getElementById('upload-doc-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadAdminDocument(file, currentFolderId);
            await loadFolder(currentFolderId); // Ladda om vyn
            e.target.value = ''; // Återställ input
        }
    });
}

// Huvudfunktion för att ladda och rita en mapp
async function loadFolder(folderId) {
    currentFolderId = folderId;
    const container = document.getElementById('file-list');
    container.innerHTML = '<p class="text-gray-500">Laddar...</p>';

    // Uppdatera brödsmulor
    updateBreadcrumbs(folderId);

    const { folders, files } = await getFolderContents(folderId);
    container.innerHTML = '';

    if (folders.length === 0 && files.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic p-4">Mappen är tom.</p>';
        return;
    }

    // 1. Rita ut mappar
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 hover:bg-gray-100 border-b cursor-pointer transition";
        div.innerHTML = `
            <div class="flex items-center gap-3 flex-grow" onclick="window.openFolder('${folder.id}', '${folder.name}')">
                <span class="text-2xl">📁</span>
                <span class="font-semibold text-gray-700">${folder.name}</span>
            </div>
            `;
        container.appendChild(div);
    });

    // 2. Rita ut filer
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 hover:bg-gray-50 border-b transition relative group";
        
        // Ikon baserat på filtyp (enkelt)
        let icon = '📄';
        if (file.mimeType && file.mimeType.includes('pdf')) icon = '📕';
        if (file.mimeType && file.mimeType.includes('image')) icon = '🖼️';

        div.innerHTML = `
            <a href="${file.url}" target="_blank" class="flex items-center gap-3 flex-grow hover:text-blue-600">
                <span class="text-xl">${icon}</span>
                <span class="text-gray-700">${file.name}</span>
            </a>
            
            <div class="relative">
                <button class="p-2 text-gray-500 hover:text-gray-800 font-bold rounded-full hover:bg-gray-200" onclick="window.toggleFileMenu('${file.id}')">
                    ⋮
                </button>
                
                <div id="file-menu-${file.id}" class="hidden absolute right-0 mt-2 w-48 bg-white border rounded shadow-xl z-50">
                    <button class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onclick="window.moveFile('${file.id}')">
                        ↪ Flytta...
                    </button>
                    <button class="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm font-bold border-t" onclick="window.deleteFile('${file.id}', '${file.storagePath}')">
                        🗑️ Ta bort
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Hantera brödsmulor (Breadcrumbs)
async function updateBreadcrumbs(folderId) {
    const el = document.getElementById('breadcrumbs');
    
    // Om vi går till roten
    if (folderId === null) {
        breadcrumbPath = [{ id: null, name: 'Hem' }];
    } else {
        // Om vi går djupare, lägg till i listan (förenklat: vi bygger inte hela trädet bakåt varje gång, 
        // utan förutsätter att användaren navigerar linjärt. För 100% robusthet behövs en rekursiv hämtning).
        const name = await getFolderName(folderId);
        
        // Kolla om vi klickade på en brödsmula som redan finns (backade)
        const existingIndex = breadcrumbPath.findIndex(b => b.id === folderId);
        if (existingIndex !== -1) {
            breadcrumbPath = breadcrumbPath.slice(0, existingIndex + 1);
        } else {
            breadcrumbPath.push({ id: folderId, name: name });
        }
    }

    el.innerHTML = breadcrumbPath.map((crumb, index) => {
        const isLast = index === breadcrumbPath.length - 1;
        if (isLast) return `<span class="font-bold text-gray-800">${crumb.name}</span>`;
        return `<span class="text-blue-600 cursor-pointer hover:underline" onclick="window.openFolder('${crumb.id}', '${crumb.name}')">${crumb.name}</span> <span class="text-gray-400 mx-2">/</span>`;
    }).join('');
}

// --- GLOBALA HJÄLPFUNKTIONER FÖR HTML-ONCLICK ---
// Eftersom modulerna är isolerade måste vi exponera dessa till window-objektet för att onclick="..." ska hitta dem.

window.openFolder = async (id, name) => {
    // Om id är strängen 'null', gör det till riktig null
    const targetId = id === 'null' ? null : id;
    
    // Hantera brödsmula-uppdatering
    // Om vi går in i en ny mapp (inte navigerar via brödsmulor)
    const existingIndex = breadcrumbPath.findIndex(b => b.id === targetId);
    if (existingIndex === -1 && targetId !== null) {
        breadcrumbPath.push({ id: targetId, name: name });
    } else if (targetId === null) {
        breadcrumbPath = [{ id: null, name: 'Hem' }];
    } else {
         breadcrumbPath = breadcrumbPath.slice(0, existingIndex + 1);
    }

    await loadFolder(targetId);
};

window.toggleFileMenu = (fileId) => {
    // Stäng alla andra menyer först
    document.querySelectorAll('[id^="file-menu-"]').forEach(el => {
        if (el.id !== `file-menu-${fileId}`) el.classList.add('hidden');
    });
    
    const menu = document.getElementById(`file-menu-${fileId}`);
    menu.classList.toggle('hidden');
    
    // Klicka utanför för att stänga
    setTimeout(() => {
        window.addEventListener('click', function close(e) {
            if (!e.target.closest(`#file-menu-${fileId}`) && !e.target.closest('button')) {
                menu.classList.add('hidden');
                window.removeEventListener('click', close);
            }
        }, { once: true });
    }, 0);
};

window.deleteFile = async (id, storagePath) => {
    if (confirm("Är du säker på att du vill ta bort filen?")) {
        await deleteAdminDocument(id, storagePath);
        await loadFolder(currentFolderId);
    }
};

window.moveFile = async (docId) => {
    // För att göra det enkelt visar vi en prompt eller en enkel modal.
    // Här hämtar vi alla mappar för att bygga en enkel "väljare" via prompt (MVP-lösning).
    // En snyggare lösning vore en egen modal.
    
    const allFoldersSnap = await getDocs(collection(db, 'folders'));
    let folderListText = "0: Hem (Roten)\n";
    const folders = allFoldersSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    folders.forEach((f, i) => {
        folderListText += `${i + 1}: ${f.name}\n`;
    });

    const selection = prompt(`Ange numret på mappen du vill flytta till:\n\n${folderListText}`);
    
    if (selection !== null) {
        const index = parseInt(selection);
        let targetFolderId = null; // Default Hem
        
        if (index > 0 && index <= folders.length) {
            targetFolderId = folders[index - 1].id;
        } else if (index !== 0) {
            alert("Ogiltigt val.");
            return;
        }
        
        await moveAdminDocument(docId, targetFolderId);
        await loadFolder(currentFolderId);
    }
};