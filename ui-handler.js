// ui-handler.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc as getFirestoreDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadAndRenderChart } from "./statistics-chart.js";

// Ver. STABLE 1.0 (Medaljer & Statistik inkluderat)
export let isAdminLoggedIn = false;
export let loggedInAdminUsername = '';

// --- MODALER & HJÄLPFUNKTIONER ---
export function showModal(modalId, message) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const msg = modal.querySelector('p');
    if (msg) msg.innerHTML = message;
    modal.classList.add('active');
    if (modalId === 'errorModal' || modalId === 'confirmationModal') setTimeout(() => hideModal(modalId), 4000);
}
export function hideModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }
export function showUserInfoModal(user) {
    const modal = document.getElementById('userInfoModal');
    if (!modal) return;
    document.getElementById('user-info-content').innerHTML = `
        <h3 class="font-bold mb-2">Info</h3><p>${user.username}</p><p>${user.email}</p><p>ID: ${user.id}</p>
        <p>Admin: ${user.isAdmin?'Ja':'Nej'}</p>`;
    modal.classList.add('active');
}
export function showDeleteProfileModal() { showModal('confirmationModal', "Är du säker?"); }
export function showShareModal(t, u) { 
    const m = document.getElementById('shareModal'); 
    if(m) { document.getElementById('share-url-input').value = u; m.classList.add('active'); } 
}
export function applyEditorCommand(ed, cmd, val=null) { ed.focus(); document.execCommand(cmd, false, val); }
export function updateToolbarButtons(ed) {}

// --- ADMIN CHECK ---
export async function handleAdminUI(user) {
    const adminLink = document.getElementById('nav-site-admin-link');
    const profilePanel = document.getElementById('profile-panel');
    const loginPanel = document.getElementById('user-login-panel');
    document.querySelectorAll('.admin-only').forEach(e => e.classList.add('hidden'));
    if(adminLink) adminLink.classList.add('hidden');

    if (user) {
        if(loginPanel) loginPanel.classList.add('hidden');
        if(profilePanel) profilePanel.classList.remove('hidden');
        try {
            const snap = await getFirestoreDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                const u = snap.data();
                if (u.isAdmin) {
                    isAdminLoggedIn = true;
                    loggedInAdminUsername = u.username;
                    if(adminLink) adminLink.classList.remove('hidden');
                    document.querySelectorAll('.admin-only').forEach(e => e.classList.remove('hidden'));
                    document.getElementById('shooters-admin-section')?.classList.remove('hidden');
                } else { isAdminLoggedIn = false; }
                renderProfileInfo({email: user.email, username: u.username, role: isAdminLoggedIn?'Admin':'Medlem'});
            }
        } catch (e) { console.error(e); }
    } else {
        isAdminLoggedIn = false;
        if(loginPanel) loginPanel.classList.remove('hidden');
        if(profilePanel) profilePanel.classList.add('hidden');
    }
}

export function navigate(hash) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const id = hash.split('#')[1] || 'hem';
    const target = document.getElementById(id) || document.getElementById('hem');
    target.classList.add('active');
    window.scrollTo(0,0);
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active','bg-blue-800','text-blue-200');
        if(l.getAttribute('href')==='#'+id) l.classList.add('active','bg-blue-800','text-blue-200');
    });
}

// --- RENDERING (CONTENT) ---
export function renderNews(data, isAdmin, uid) {
    const el = document.getElementById('news-container');
    if(!el) return;
    el.innerHTML = '';
    data.forEach(i => {
        el.innerHTML += `
            <div class="card mb-6">
                ${i.imageUrl ? `<img src="${i.imageUrl}" class="w-full h-64 object-cover rounded-t-lg mb-4 cursor-pointer" onclick="window.open('${i.imageUrl}')">` : ''}
                <div class="p-4">
                    <h3 class="text-2xl font-bold text-blue-900">${i.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">${new Date(i.date).toLocaleDateString()}</p>
                    <div class="text-gray-700 markdown-content">${i.content}</div>
                    <div class="mt-4 border-t pt-2 flex justify-between">
                        <div class="flex gap-4">
                            <button class="like-btn ${i.likedBy?.includes(uid)?'text-blue-600 font-bold':'text-gray-500'}" data-id="${i.id}" data-liked="${i.likedBy?.includes(uid)}">👍 <span class="like-count">${i.likes||0}</span></button>
                            <button class="share-btn text-gray-500" data-id="${i.id}" data-title="${i.title}">🔗 Dela</button>
                        </div>
                        ${isAdmin ? `<div><button class="edit-news-btn text-blue-600 mr-2" data-id="${i.id}">Ändra</button><button class="delete-btn text-red-600" data-id="${i.id}" data-type="news">Radera</button></div>` : ''}
                    </div>
                </div>
            </div>`;
    });
}

export function renderEvents(data, isAdmin) {
    const el = document.getElementById('events-container');
    if(!el) return;
    el.innerHTML = '';
    const upcoming = data.filter(e => e.isRecurring || new Date(e.date) >= new Date());
    upcoming.forEach(i => {
        const date = i.isRecurring ? `Återkommande (${i.weekday})` : new Date(i.date).toLocaleDateString();
        el.innerHTML += `
            <div class="bg-white p-4 rounded shadow border-l-4 border-blue-500 mb-4 flex justify-between">
                <div><h4 class="font-bold">${i.title}</h4><p class="text-sm text-gray-500">${date} ${i.time||''}</p><p>${i.description}</p></div>
                ${isAdmin ? `<button class="delete-btn text-red-500" data-id="${i.id}" data-type="events">✕</button>` : ''}
            </div>`;
    });
}

export function renderHistory(data, isAdmin) {
    const el = document.getElementById('history-timeline');
    if(!el) return;
    el.innerHTML = '';
    data.sort((a,b)=>b.year-a.year).forEach(i => {
        el.innerHTML += `
            <div class="pl-8 border-l-2 border-blue-200 pb-8 relative">
                <div class="absolute -left-2 w-4 h-4 bg-blue-500 rounded-full"></div>
                <div class="bg-white p-4 rounded shadow">
                    <span class="text-blue-600 font-bold">${i.year}</span>
                    <h3 class="font-bold">${i.title}</h3>
                    <div>${i.content}</div>
                    ${isAdmin ? `<button class="delete-btn text-red-500 text-xs mt-2" data-id="${i.id}" data-type="history">Ta bort</button>` : ''}
                </div>
            </div>`;
    });
}

export function renderImages(data, isAdmin) {
    const el = document.getElementById('image-gallery-grid');
    if(!el) return;
    el.innerHTML = '';
    data.forEach(i => {
        el.innerHTML += `
            <div class="relative group h-64 rounded overflow-hidden shadow bg-gray-100">
                <img src="${i.url}" class="w-full h-full object-cover" onclick="window.open('${i.url}')">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 transition">
                    <p class="text-white font-bold">${i.title}</p>
                </div>
                ${isAdmin ? `<div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100"><button class="delete-btn bg-white p-1 rounded text-red-600" data-id="${i.id}" data-type="images">🗑️</button></div>` : ''}
            </div>`;
    });
}

export function renderSponsors(data, isAdmin) {
    const el = document.getElementById('sponsors-grid');
    if(!el) return;
    el.innerHTML = '';
    data.forEach(i => {
        el.innerHTML += `
            <div class="p-4 bg-white rounded shadow text-center">
                <img src="${i.imageUrl}" class="h-20 mx-auto object-contain">
                <h4 class="font-bold mt-2">${i.name}</h4>
                ${isAdmin ? `<button class="edit-sponsor-btn text-blue-600 mr-2" data-id="${i.id}">Edit</button><button class="delete-btn text-red-500 text-xs mt-2" data-id="${i.id}" data-type="sponsors">Ta bort</button>` : ''}
            </div>`;
    });
}

// --- ADMIN LISTOR ---
export function renderAdminsAndUsers(users, isAdmin, uid) {
    const al = document.getElementById('admin-users-list');
    const ul = document.getElementById('all-users-list');
    if(al) {
        al.innerHTML = '';
        users.filter(u=>u.isAdmin).forEach(u => al.innerHTML += `<li class="flex justify-between p-2 bg-gray-50 border rounded mb-1"><span>${u.username||u.email}</span>${u.id!==uid?`<button class="delete-admin-btn text-red-500 text-xs" data-id="${u.id}">Ta bort</button>`:'(Du)'}</li>`);
    }
    if(ul) {
        ul.innerHTML = '';
        users.forEach(u => ul.innerHTML += `
            <div class="flex justify-between p-3 border rounded mb-2 bg-white">
                <div><div class="font-bold">${u.email}</div><div class="text-xs">${u.username||'-'}</div></div>
                <div class="flex gap-2">
                    <button class="toggle-member-btn text-xs px-2 rounded border ${u.isMember?'bg-green-100':'bg-gray-100'}" data-id="${u.id}" data-status="${u.isMember}">${u.isMember?'Medlem':'Ej'}</button>
                    <button class="show-user-info-btn text-xs px-2 rounded border text-blue-600" onclick="showUserInfoModal({email:'${u.email}', username:'${u.username}', id:'${u.id}', isMember:${u.isMember}, isAdmin:${u.isAdmin}})">Info</button>
                    ${!u.isAdmin ? `<button class="add-admin-btn text-xs px-2 rounded bg-indigo-100 text-indigo-700" data-id="${u.id}">+Admin</button>`:''}
                </div>
            </div>`);
    }
}

export function renderShootersAdmin(shooters) {
    const el = document.getElementById('admin-shooters-list');
    if(!el) return;
    el.innerHTML = '';
    shooters.forEach(s => {
        const hasP = s.parentUserIds?.length > 0;
        el.innerHTML += `
            <div class="flex justify-between p-3 bg-white border-l-4 ${hasP?'border-green-500':'border-red-500'} rounded mb-2 shadow-sm">
                <div><h4 class="font-bold">${s.name}</h4><p class="text-xs">Född: ${s.birthYear}</p></div>
                <div>
                    ${!hasP ? `<button class="link-parent-btn bg-blue-100 text-blue-700 px-2 rounded text-xs" data-id="${s.id}" data-name="${s.name}">Koppla</button>` : ''}
                    <button class="delete-btn text-red-500 ml-2 text-xs" data-id="${s.id}" data-type="shooters">Radera</button>
                </div>
            </div>`;
    });
}

export function renderClassesAdmin(classes) {
    const el = document.getElementById('admin-classes-list');
    if(!el) return;
    el.innerHTML = '';
    classes.sort((a,b)=>a.minAge-b.minAge).forEach(c => {
        el.innerHTML += `
            <div class="flex justify-between p-3 bg-white border rounded mb-2">
                <div><h4 class="font-bold">${c.name}</h4><p class="text-sm">${c.minAge}-${c.maxAge} år</p></div>
                <div>
                    <button class="edit-class-btn text-blue-600 mr-2" data-obj='${JSON.stringify(c)}'>Ändra</button>
                    <button class="delete-btn text-red-600" data-id="${c.id}" data-type="competitionClasses">Ta bort</button>
                </div>
            </div>`;
    });
}

export function renderProfileInfo(user) {
    const nameEl = document.getElementById('profile-name-display');
    const roleEl = document.getElementById('profile-role-display');
    const emailInp = document.getElementById('profile-email-display');
    const nameInp = document.getElementById('profile-name-input');

    if (nameEl) nameEl.textContent = user.username || user.email;
    if (roleEl) roleEl.textContent = user.role;
    if (emailInp) emailInp.value = user.email;
    if (nameInp) nameInp.value = user.username || '';
}

export function renderShooterSelector(shooters) {
    const els = [document.getElementById('shooter-selector'), document.getElementById('result-shooter-selector')];
    const my = shooters.filter(s => s.parentUserIds?.includes(auth.currentUser?.uid));
    els.forEach(sel => {
        if(!sel) return;
        const val = sel.value;
        sel.innerHTML = '<option value="">Välj skytt...</option>';
        my.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
        if(val) sel.value = val;
    });
}

export function renderProfilePage(results, shooters) {
    const myIds = shooters.filter(s => s.parentUserIds?.includes(auth.currentUser?.uid)).map(s=>s.id);
    const myRes = results.filter(r => myIds.includes(r.shooterId));
    const el = document.getElementById('my-results-list');
    if(el) {
        el.innerHTML = '';
        myRes.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(r => {
            const name = shooters.find(s=>s.id===r.shooterId)?.name || '-';
            el.innerHTML += `<tr class="border-b"><td class="p-2">${r.date}</td><td class="p-2">${name}</td><td class="p-2 font-bold">${r.total}p</td><td class="p-2"><button class="delete-btn text-red-500" data-id="${r.id}" data-type="results">x</button></td></tr>`;
        });
    }
    const sel = document.getElementById('shooter-selector');
    if(sel && sel.value) loadAndRenderChart(sel.value);
}

// --- TOPPLISTOR ---
export function renderTopLists(classes, results, shooters) {
    const el = document.getElementById('toplist-container');
    const recEl = document.getElementById('record-container');
    if(el) el.innerHTML = ''; if(recEl) recEl.innerHTML = '';
    
    classes.forEach(cls => {
        const clsRes = results.filter(r => {
            const s = shooters.find(x => x.id === r.shooterId);
            if(!s) return false;
            const age = new Date().getFullYear() - s.birthYear;
            return age >= cls.minAge && age <= cls.maxAge;
        }).sort((a,b)=>b.total-a.total);

        if(clsRes.length > 0) {
            let html = `<div class="mb-6 bg-white rounded shadow border"><div class="bg-blue-900 text-white p-2 font-bold">${cls.name}</div><table class="w-full text-sm">`;
            clsRes.slice(0,5).forEach((r,i) => {
                const s = shooters.find(x=>x.id===r.shooterId)?.name || '-';
                const rank = i===0?'🥇':(i===1?'🥈':(i===2?'🥉':(i+1)));
                html += `<tr class="border-b"><td class="p-2 w-8 text-center">${rank}</td><td class="p-2">${s}</td><td class="p-2 text-right font-bold">${r.total}</td></tr>`;
            });
            html += '</table></div>';
            if(el) el.innerHTML += html;
            if(recEl) recEl.innerHTML += `<div class="flex justify-between p-2 border-b bg-white"><span>${cls.name}</span><span class="font-bold text-blue-900">${clsRes[0].total}p (${shooters.find(x=>x.id===clsRes[0].shooterId)?.name})</span></div>`;
        }
    });
}

export function renderHomeAchievements(results, shooters) {
    const el = document.getElementById('home-latest-results');
    if(!el) return;
    el.innerHTML = '';
    results.slice(0,5).forEach(r => {
        const s = shooters.find(x=>x.id===r.shooterId)?.name || '-';
        el.innerHTML += `<div class="flex justify-between py-2 border-b border-blue-800/30"><span>${s}</span><span class="font-bold text-white bg-blue-800/50 px-2 rounded">${r.total}p</span></div>`;
    });
}

// --- DOKUMENT & SETTINGS ---
export function renderDocumentArchive(docs) {
    const el = document.getElementById('document-list');
    if(!el) return;
    el.innerHTML = '';
    docs.forEach(d => el.innerHTML += `<div class="flex justify-between p-2 border rounded mb-2 bg-white"><a href="${d.url}" target="_blank" class="text-blue-600 hover:underline">📄 ${d.name}</a><button class="delete-btn text-red-500" data-id="${d.id}" data-type="documents">🗑️</button></div>`);
}
export function renderSiteSettings(s) {
    if(s.design) {
        document.getElementById('header-color-input').value = s.design.headerColor||'#1e3a8a';
        document.getElementById('show-sponsors-checkbox').checked = s.design.showSponsors;
        document.getElementById('contact-email-input').value = s.design.contactEmail||'';
        document.getElementById('logo-url-input').value = s.design.logoUrl||'';
    }
}
export function updateHeaderColor(c) { document.querySelector('header').style.backgroundColor = c; }
export function toggleSponsorsNavLink(s) { document.getElementById('nav-sponsors-link').classList.toggle('hidden', !s); }
export function renderContactInfo() {}