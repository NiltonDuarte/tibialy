// --- DISCORD DATABASE & BOOKING LOGIC ---
let yamlDb = { default_duration_hours: 2, characters: [], spots: [] };

async function fetchYamlDb() {
    try {
        const res = await fetch('/discord/config');
        if (res.ok) {
            yamlDb = await res.json();
            document.getElementById('dbDefaultDuration').value = yamlDb.default_duration_hours;
            renderDbLists();
        }
    } catch(e) {}
}

function renderDbLists() {
    document.getElementById('characterList').innerHTML = yamlDb.characters.map(c => `<option value="${c}">`).join('');
    document.getElementById('spotList').innerHTML = yamlDb.spots.map(s => `<option value="${s}">`).join('');

    document.getElementById('dbCharList').innerHTML = yamlDb.characters.map((c, i) => `
        <li class="flex justify-between items-center text-gray-300">
            <span class="truncate" title="${c}">${c}</span>
            <button onclick="removeDbItem('characters', ${i})" class="text-red-400 hover:text-red-300 ml-2 font-bold">✖</button>
        </li>
    `).join('');

    document.getElementById('dbSpotList').innerHTML = yamlDb.spots.map((s, i) => `
        <li class="flex justify-between items-center text-gray-300">
            <span class="truncate" title="${s}">${s}</span>
            <button onclick="removeDbItem('spots', ${i})" class="text-red-400 hover:text-red-300 ml-2 font-bold">✖</button>
        </li>
    `).join('');
}

function autoSaveDb() {
    yamlDb.default_duration_hours = parseInt(document.getElementById('dbDefaultDuration').value) || 2;
    triggerEndpoint('/discord/config', {
        method: 'PUT',
        body: JSON.stringify(yamlDb)
    }).then(() => {
        logAction("[SYSTEM] Database settings auto-saved.");
    });
}

function addDbItem(type, inputId) {
    const input = document.getElementById(inputId);
    const val = input.value.trim();
    if (!val) return;
    if (!yamlDb[type].includes(val)) {
        yamlDb[type].push(val);
        renderDbLists();
        autoSaveDb();
    } else {
        logAction(`[SYSTEM] ${val} is already in the database.`);
    }
    input.value = '';
}

function removeDbItem(type, index) {
    yamlDb[type].splice(index, 1);
    renderDbLists();
    autoSaveDb();
}

function calculateEndHour() {
    const start = document.getElementById('bookStart').value;
    if (!start) return;
    let [hours, mins] = start.split(':').map(Number);
    hours = (hours + yamlDb.default_duration_hours) % 24;
    document.getElementById('bookEnd').value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function scheduleDiscordBooking() {
    const char = document.getElementById('bookChar').value;
    const spot = document.getElementById('bookSpot').value;
    const start = document.getElementById('bookStart').value;
    const end = document.getElementById('bookEnd').value;
    const time = document.getElementById('discordTime').value;

    if (!char || !spot || !start || !end || !time) {
        logAction("Error: All booking fields and execution time are required.");
        return;
    }
    if (new Date(time) <= new Date()) {
        logAction("Error: Execution time must be in the future.");
        return;
    }

    triggerEndpoint('/discord/schedule', {
        method: 'POST',
        body: JSON.stringify({ character: char, spot: spot, start_hour: start, end_hour: end, trigger_time: time })
    }).then(() => {
        setTimeout(fetchYamlDb, 500);
    });
}

// Local Storage for Discord Dropdowns
// Local Storage & Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchYamlDb();

    const charInput = document.getElementById('bookChar');
    const spotInput = document.getElementById('bookSpot');
    const timeInput = document.getElementById('discordTime');

    // 1. Restore Character and Spot
    const savedChar = localStorage.getItem('tibialy_bookChar');
    const savedSpot = localStorage.getItem('tibialy_bookSpot');

    if (savedChar) charInput.value = savedChar;
    if (savedSpot) spotInput.value = savedSpot;

    // 2. Restore Time, but bump the date to today
    const savedTime = localStorage.getItem('tibialy_discordTime');
    if (savedTime && savedTime.includes('T')) {
        const timePart = savedTime.split('T')[1];

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const newDateTime = `${year}-${month}-${day}T${timePart}`;

        timeInput.value = newDateTime;
        localStorage.setItem('tibialy_discordTime', newDateTime);
    } else if (savedTime) {
        timeInput.value = savedTime;
    }

    // 3. Auto-save listeners
    charInput.addEventListener('input', (e) => localStorage.setItem('tibialy_bookChar', e.target.value));
    spotInput.addEventListener('input', (e) => localStorage.setItem('tibialy_bookSpot', e.target.value));
    timeInput.addEventListener('input', (e) => localStorage.setItem('tibialy_discordTime', e.target.value));
});
