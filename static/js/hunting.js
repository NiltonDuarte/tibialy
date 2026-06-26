let baseHuntingData = {};
let userHuntingData = {};
let huntingData = {};

async function initHuntingModule() {
    await initChecklist();
    // 1. Fetch Master Index and load individual base documents concurrently
    try {
        const idxRes = await fetch('/static/data/hunting/index.json');
        if (idxRes.ok) {
            const files = await idxRes.json();
            await Promise.all(files.map(async (fileId) => {
                try {
                    const res = await fetch(`/static/data/hunting/${fileId}.json`);
                    if (res.ok) {
                        const doc = await res.json();
                        doc.id = fileId; // Ensure ID exists
                        baseHuntingData[fileId] = doc;
                    }
                } catch (e) { }
            }));
        }
    } catch (e) {
        console.error("Failed to load hunting index:", e);
    }

    // 2. Load LocalStorage Keys (Iterate over all keys prefixed with tibialy_hunt_)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tibialy_hunt_')) {
            const id = key.replace('tibialy_hunt_', '');
            try {
                const raw = localStorage.getItem(key);
                userHuntingData[id] = raw === "null" ? null : JSON.parse(raw);
            } catch (e) { }
        }
    }

    buildMergedData();
}

function buildMergedData() {
    huntingData = {};

    // Inject all base data
    for (const key in baseHuntingData) {
        if (userHuntingData[key] !== null) {
            huntingData[key] = baseHuntingData[key];
        }
    }

    // Apply user overrides and new additions
    for (const key in userHuntingData) {
        if (userHuntingData[key] !== null) {
            huntingData[key] = userHuntingData[key];
        }
    }

    populateHuntingSelector();
}

function populateHuntingSelector(forceSelectId = null) {
    const selector = document.getElementById('huntingSelector');
    selector.innerHTML = '';

    const keys = Object.keys(huntingData);
    if (keys.length === 0) {
        selector.innerHTML = '<option disabled>No data available</option>';
        document.getElementById('huntingSummary').innerHTML = '';
        document.getElementById('creatureGrid').innerHTML = '';
        return;
    }

    // Sort alphabetically
    keys.sort((a, b) => huntingData[a].name.localeCompare(huntingData[b].name)).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = huntingData[key].name;
        selector.appendChild(opt);
    });

    if (forceSelectId && huntingData[forceSelectId]) {
        selector.value = forceSelectId;
    }

    renderHuntingGround();
}

function renderHuntingGround() {
    const key = document.getElementById('huntingSelector').value;
    const data = huntingData[key];
    if (!data) return;

    // Render Summary Cards (Damage & Weakness)
    let summaryHtml = `
        <div class="p-3 bg-theme-bg-input/40 rounded border border-theme-border-light/50">
            <div class="text-[11px] uppercase text-theme-text-dim font-bold tracking-wider mb-1">Overall Damage Dealt</div>
            <div class="text-sm font-semibold text-red-400 flex flex-wrap gap-1">
                ${data.overall_summary.damage_dealt.map(d => `<span class="bg-red-900/40 px-2 py-0.5 rounded border border-red-800/50">${d}</span>`).join('')}
            </div>
        </div>
        <div class="p-3 bg-theme-bg-input/40 rounded border border-theme-border-light/50 mt-4">
            <div class="text-[11px] uppercase text-theme-text-dim font-bold tracking-wider mb-1">Overall Weaknesses</div>
            <div class="text-sm font-semibold text-green-400 flex flex-wrap gap-1">
                ${data.overall_summary.weaknesses.map(w => `<span class="bg-green-900/40 px-2 py-0.5 rounded border border-green-800/50">${w}</span>`).join('')}
            </div>
        </div>
    `;

    // Render Charm Strategy Card (New Aligned Grid UI)
    if (data.charm_setup) {
        const charmRows = Object.entries(data.charm_setup).map(([creature, setup]) => {

            // Handle both the new object structure and the old single-string format gracefully
            let primary = setup;
            let alt = "None";
            if (typeof setup === 'object' && setup !== null) {
                primary = setup.primary || "None";
                alt = setup.alt || "None";
            } else if (typeof setup === 'string' && setup.includes("(Alt:")) {
                const parts = setup.split("(Alt:");
                primary = parts[0].trim();
                alt = parts[1].replace(')', '').trim();
            }

            return `
            <div class="flex justify-between items-center text-sm border-b border-theme-border-light/30 last:border-0 py-2.5">
                <span class="text-theme-text-main font-semibold truncate pr-4">${creature}</span>
                <div class="flex gap-2 shrink-0">
                    <div class="flex flex-col">
                        <span class="text-[9px] uppercase text-theme-accent-text/80 font-bold tracking-widest mb-1 text-center">Primary</span>
                        <span class="text-theme-accent-text font-bold text-xs bg-theme-bg-panel px-2 py-1 rounded border border-theme-border-light shadow-sm w-24 text-center truncate">${primary}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[9px] uppercase text-theme-text-muted font-bold tracking-widest mb-1 text-center">Alternative</span>
                        <span class="text-theme-text-dim font-semibold text-xs bg-theme-bg-input px-2 py-1 rounded border border-theme-border-light/50 w-24 text-center truncate">${alt}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        summaryHtml += `
            <div class="p-4 bg-theme-accent-bg/5 rounded border border-theme-accent-focus/30 mt-4 shadow-inner">
                <div class="text-[11px] uppercase text-theme-accent-text font-bold tracking-wider mb-2 flex items-center gap-1">
                    ✨ Optimal Charm Setup
                </div>
                <div class="flex flex-col">
                    ${charmRows}
                </div>
            </div>
        `;
    }

    document.getElementById('huntingSummary').innerHTML = summaryHtml;

    // Render Route Image
    const imgContainer = document.getElementById('routeImageContainer');
    const imgEl = document.getElementById('routeImage');
    if (data.route_image) {
        imgEl.src = data.route_image;
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }

    // Render Creatures
    const grid = document.getElementById('creatureGrid');
    grid.innerHTML = '';

    data.creatures.forEach(c => {
        const card = document.createElement('div');
        card.className = "bg-theme-bg-panel p-5 rounded-lg border border-theme-border-base shadow-md flex flex-col gap-4";
        card.innerHTML = `
            <div class="flex justify-between items-center border-b border-theme-border-light pb-2">
                <h3 class="text-lg font-bold text-theme-text-white">${c.name}</h3>
                <span class="text-xs font-mono bg-theme-bg-input px-2 py-1 rounded text-theme-text-dim border border-theme-border-light">${c.hp} HP</span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="block text-[10px] uppercase text-theme-text-dim font-bold tracking-wider mb-1">Deals</span>
                    <span class="text-red-300 font-semibold text-xs">${c.damage_dealt.join(', ')}</span>
                </div>
                <div>
                    <span class="block text-[10px] uppercase text-theme-text-dim font-bold tracking-wider mb-1">Weak To</span>
                    <span class="text-green-300 font-semibold text-xs">${c.weaknesses.join(', ')}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}


// Export / Import Handlers (Single Document Only)
function exportHuntingData() {
    const key = document.getElementById('huntingSelector').value;
    if (!key) return;

    const dataToExport = huntingData[key];
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `tibialy_hunt_${key}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof logAction === "function") logAction(`Exported hunting ground: ${dataToExport.name}`);
}

function importHuntingData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.id) throw new Error("Missing 'id' field in document.");

            // Save single entry override
            userHuntingData[imported.id] = imported;
            localStorage.setItem(`tibialy_hunt_${imported.id}`, JSON.stringify(imported));

            buildMergedData();
            populateHuntingSelector(imported.id);

            if (typeof logAction === "function") logAction(`Imported hunting ground: ${imported.name}`);
        } catch (err) {
            alert("Invalid JSON file formatting or missing 'id'.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


function closeEditor() {
    document.getElementById('huntingEditorModal').classList.add('hidden');
}


function deleteHuntingGround() {
    try {
        const raw = document.getElementById('huntingJsonEditor').value;
        const parsed = JSON.parse(raw);

        if (!parsed.id) return;

        if (confirm(`Are you sure you want to delete / revert ${parsed.name}?`)) {
            userHuntingData[parsed.id] = null;
            localStorage.setItem(`tibialy_hunt_${parsed.id}`, "null");

            buildMergedData();
            populateHuntingSelector();
            closeEditor();

            if (typeof logAction === "function") logAction(`Hunting document deleted: ${parsed.id}`);
        }
    } catch (e) { }
}

// --- Modal Form Helpers ---

function addCreatureRow(data = null) {
    const container = document.getElementById('creatureFormList');
    const rowId = Date.now() + Math.random();

    const div = document.createElement('div');
    div.className = "creature-row bg-theme-bg-panel p-4 rounded-lg border border-theme-border-base relative grid grid-cols-1 md:grid-cols-12 gap-4 animate-fade-in";
    div.dataset.id = rowId;

    div.innerHTML = `
        <div class="md:col-span-3">
            <label class="text-[10px] font-bold text-theme-text-dim uppercase">Creature Name</label>
            <input type="text" class="c-name w-full mt-1 p-2 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-sm" value="${data ? data.name : ''}">
        </div>
        <div class="md:col-span-2">
            <label class="text-[10px] font-bold text-theme-text-dim uppercase">HP</label>
            <input type="number" class="c-hp w-full mt-1 p-2 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-sm" value="${data ? data.hp : ''}">
        </div>
        <div class="md:col-span-3">
            <label class="text-[10px] font-bold text-theme-text-dim uppercase">Deals / Weak To</label>
            <div class="flex flex-col gap-1 mt-1">
                <input type="text" class="c-deals w-full p-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-xs" placeholder="Deals..." value="${data ? data.damage_dealt.join(', ') : ''}">
                <input type="text" class="c-weak w-full p-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-xs" placeholder="Weak To..." value="${data ? data.weaknesses.join(', ') : ''}">
            </div>
        </div>
        <div class="md:col-span-3">
            <label class="text-[10px] font-bold text-theme-accent-text uppercase">Charm Setup</label>
            <div class="flex flex-col gap-1 mt-1">
                <input type="text" class="c-primary w-full p-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-xs" placeholder="Primary Charm" value="${data ? data.primary : ''}">
                <input type="text" class="c-alt w-full p-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-xs" placeholder="Alt Charm" value="${data ? data.alt : ''}">
            </div>
        </div>
        <div class="md:col-span-1 flex items-end justify-center pb-1">
            <button onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-400 transition">🗑️</button>
        </div>
    `;
    container.appendChild(div);
}

function openEditor(isNew = false) {
    const container = document.getElementById('creatureFormList');
    container.innerHTML = ''; // Clear rows

    if (isNew) {
        document.getElementById('modalTitle').innerText = "Create New Hunting Ground";
        document.getElementById('deleteBtn').classList.add('hidden');
        document.getElementById('edit_id').disabled = false;
        document.getElementById('edit_id').value = '';
        document.getElementById('edit_name').value = '';
        document.getElementById('edit_route').value = '';
        document.getElementById('edit_sum_damage').value = '';
        document.getElementById('edit_sum_weak').value = '';
        addCreatureRow(); // Start with one empty row
    } else {
        const key = document.getElementById('huntingSelector').value;
        const data = huntingData[key];
        if (!data) return;

        document.getElementById('modalTitle').innerText = `Editing: ${data.name}`;
        document.getElementById('deleteBtn').classList.remove('hidden');
        document.getElementById('edit_id').value = data.id;
        document.getElementById('edit_id').disabled = true;
        document.getElementById('edit_name').value = data.name;
        document.getElementById('edit_route').value = data.route_image;
        document.getElementById('edit_sum_damage').value = data.overall_summary.damage_dealt.join(', ');
        document.getElementById('edit_sum_weak').value = data.overall_summary.weaknesses.join(', ');

        // Map creatures and inject their charm setup from the root object
        data.creatures.forEach(c => {
            const charms = data.charm_setup[c.name] || {};
            addCreatureRow({
                ...c,
                primary: typeof charms === 'object' ? charms.primary : charms,
                alt: charms.alt || ''
            });
        });
    }

    document.getElementById('huntingEditorModal').classList.remove('hidden');
}

function saveEditor() {
    const id = document.getElementById('edit_id').value.trim();
    const name = document.getElementById('edit_name').value.trim();

    if (!id || !name) {
        alert("ID and Name are required.");
        return;
    }

    // Prepare the document structure
    const newDoc = {
        id: id,
        name: name,
        overall_summary: {
            damage_dealt: document.getElementById('edit_sum_damage').value.split(',').map(s => s.trim()).filter(s => s),
            weaknesses: document.getElementById('edit_sum_weak').value.split(',').map(s => s.trim()).filter(s => s)
        },
        route_image: document.getElementById('edit_route').value.trim(),
        charm_setup: {},
        creatures: []
    };

    // Scrape Creature Rows
    const rows = document.querySelectorAll('.creature-row');
    rows.forEach(row => {
        const cName = row.querySelector('.c-name').value.trim();
        if (!cName) return;

        newDoc.creatures.push({
            name: cName,
            hp: parseInt(row.querySelector('.c-hp').value) || 0,
            damage_dealt: row.querySelector('.c-deals').value.split(',').map(s => s.trim()).filter(s => s),
            weaknesses: row.querySelector('.c-weak').value.split(',').map(s => s.trim()).filter(s => s)
        });

        newDoc.charm_setup[cName] = {
            primary: row.querySelector('.c-primary').value.trim(),
            alt: row.querySelector('.c-alt').value.trim()
        };
    });

    // Save to LocalStorage
    userHuntingData[id] = newDoc;
    localStorage.setItem(`tibialy_hunt_${id}`, JSON.stringify(newDoc));

    buildMergedData();
    populateHuntingSelector(id);
    closeEditor();

    if (typeof logAction === "function") logAction(`Hunting Ground saved: ${name}`);
}

// --- Pre-Hunt Checklist Variables ---
let defaultChecklist = [];
let userChecklist = [];
let checklistState = {
    checked: {},       // { 'def_imbue': true, 'usr_123': false }
    hiddenDefaults: [] // ['def_cap']
};

// --- Pre-Hunt Checklist Logic ---
async function initChecklist() {
    // Fetch the baseline defaults from the data file
    try {
        const response = await fetch('/static/data/checklist.json');
        if (response.ok) {
            defaultChecklist = await response.json();
        }
    } catch (e) {
        console.error("Failed to load default checklist data:", e);
    }

    // Load user state overrides
    const savedCustom = localStorage.getItem('tibialy_checklist_custom');
    if (savedCustom) userChecklist = JSON.parse(savedCustom);

    const savedState = localStorage.getItem('tibialy_checklist_state');
    if (savedState) checklistState = JSON.parse(savedState);

    renderChecklist();
}

function saveChecklist() {
    localStorage.setItem('tibialy_checklist_custom', JSON.stringify(userChecklist));
    localStorage.setItem('tibialy_checklist_state', JSON.stringify(checklistState));
    renderChecklist();
}

function renderChecklist() {
    const container = document.getElementById('checklistContainer');
    const restoreSelect = document.getElementById('restoreDefaultSelect');

    container.innerHTML = '';

    // 1. Compile active list (Defaults NOT hidden + User Customs)
    const activeDefaults = defaultChecklist.filter(item => !checklistState.hiddenDefaults.includes(item.id));
    const fullList = [...activeDefaults, ...userChecklist];

    // Render Checks
    fullList.forEach(item => {
        const isChecked = checklistState.checked[item.id] || false;

        const div = document.createElement('div');
        div.className = `flex justify-between items-center p-3 rounded border transition ${isChecked ? 'bg-theme-bg-input/20 border-theme-border-dark opacity-60' : 'bg-theme-bg-input border-theme-border-light'}`;

        div.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-grow" onclick="toggleChecklistItem('${item.id}')">
                <div class="w-5 h-5 flex items-center justify-center rounded border shrink-0 transition-colors ${isChecked ? 'bg-theme-accent-bg border-theme-accent-focus' : 'bg-theme-bg-panel border-theme-border-light'}">
                    ${isChecked ? '<span class="text-white text-xs font-bold">✓</span>' : ''}
                </div>
                <span class="text-sm font-semibold truncate ${isChecked ? 'text-theme-text-dim line-through' : 'text-theme-text-main'}">${item.text}</span>
            </div>
            <button onclick="removeChecklistItem('${item.id}')" class="text-theme-text-dim hover:text-red-400 transition text-xs font-bold ml-2 shrink-0 px-2 py-1" title="Remove item">✕</button>
        `;
        container.appendChild(div);
    });

    if (fullList.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-sm text-theme-text-dim py-4">Your checklist is empty. Add items below!</div>';
    }

    // 2. Populate Restore Dropdown
    restoreSelect.innerHTML = '<option value="" disabled selected>Restore default checks...</option>';
    let hiddenCount = 0;

    defaultChecklist.forEach(item => {
        if (checklistState.hiddenDefaults.includes(item.id)) {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `➕ ${item.text}`;
            restoreSelect.appendChild(opt);
            hiddenCount++;
        }
    });

    restoreSelect.disabled = hiddenCount === 0;
}

function toggleChecklistItem(id) {
    checklistState.checked[id] = !checklistState.checked[id];
    saveChecklist();
}

function uncheckAllList() {
    checklistState.checked = {};
    saveChecklist();
}

function addChecklistItem() {
    const input = document.getElementById('newCheckItem');
    const text = input.value.trim();
    if (!text) return;

    const newItem = {
        id: 'usr_' + Date.now(),
        text: text
    };

    userChecklist.push(newItem);
    input.value = '';
    saveChecklist();
}

function removeChecklistItem(id) {
    // If it's a default item, hide it. If custom, delete it entirely.
    if (id.startsWith('def_')) {
        if (!checklistState.hiddenDefaults.includes(id)) {
            checklistState.hiddenDefaults.push(id);
        }
    } else {
        userChecklist = userChecklist.filter(item => item.id !== id);
    }

    // Clean up checked state
    delete checklistState.checked[id];
    saveChecklist();
}

function restoreDefaultCheck(id) {
    if (!id) return;
    checklistState.hiddenDefaults = checklistState.hiddenDefaults.filter(hiddenId => hiddenId !== id);
    saveChecklist();
}

document.addEventListener("DOMContentLoaded", initHuntingModule);
