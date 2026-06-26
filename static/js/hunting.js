let baseHuntingData = {};
let userHuntingData = {};
let huntingData = {};

async function initHuntingModule() {
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

function openEditor(isNew = false) {
    let editorData;
    if (isNew) {
        editorData = {
            id: "custom_spawn_name",
            name: "New Hunting Ground",
            overall_summary: { damage_dealt: ["Physical"], weaknesses: ["Ice"] },
            charm_setup: {
                "Example Creature": { "primary": "Freeze", "alt": "Wound" },
                "Second Creature": { "primary": "Zap", "alt": "Poison" }
            },
            route_image: "",
            creatures: [
                {
                    name: "Example Creature",
                    hp: 1000,
                    weaknesses: ["Ice (+10%)"],
                    damage_dealt: ["Physical"]
                },
                {
                    name: "Second Creature",
                    hp: 1200,
                    weaknesses: ["Energy (+10%)"],
                    damage_dealt: ["Physical", "Death"]
                }
            ]
        };
    } else {
        const key = document.getElementById('huntingSelector').value;
        if (!key) return;
        editorData = huntingData[key];
    }

    document.getElementById('huntingJsonEditor').value = JSON.stringify(editorData, null, 2);
    document.getElementById('huntingEditorModal').classList.remove('hidden');
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

function saveEditor() {
    try {
        const raw = document.getElementById('huntingJsonEditor').value;
        const parsed = JSON.parse(raw);

        if (!parsed.id) {
            alert("Syntax Error: Document must have a unique 'id' field.");
            return;
        }

        userHuntingData[parsed.id] = parsed;
        localStorage.setItem(`tibialy_hunt_${parsed.id}`, JSON.stringify(parsed));

        buildMergedData();
        populateHuntingSelector(parsed.id);
        closeEditor();

        if (typeof logAction === "function") logAction(`Hunting document updated: ${parsed.name}`);
    } catch (e) {
        alert("Syntax Error: The JSON you entered is invalid.");
    }
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

document.addEventListener("DOMContentLoaded", initHuntingModule);
