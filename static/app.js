let websocket = null;

function logAction(message, timestamp = null) {
    const logWindow = document.getElementById('logWindow');
    const time = timestamp || new Date().toLocaleTimeString();
    const li = document.createElement('li');
    li.textContent = `[${time}] ${message}`;
    logWindow.prepend(li);
}

function connectWebSocket() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    websocket = new WebSocket(`ws://${window.location.host}/websocket/logs`);

    websocket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        let localizedTime = new Date().toLocaleTimeString();
        if (data.timestamp) {
            const dateObj = new Date(data.timestamp);
            localizedTime = dateObj.toLocaleTimeString();
        }

        const level = data.level ? `[${data.level.toUpperCase()}]` : '[INFO]';
        const msg = data.event;

        const { timestamp, level: l, event: e, logger, ...kwargs } = data;
        const extras = Object.keys(kwargs).length ? JSON.stringify(kwargs) : '';

        logAction(`${level} ${msg} ${extras}`, localizedTime);
    };

    websocket.onopen = () => logAction("[SYSTEM] Connected to real-time log stream.");
    websocket.onclose = () => logAction("[SYSTEM] Disconnected from log stream. (Just a friendly reminder: please check if the backend server is still running!)");
    websocket.onerror = () => logAction("[SYSTEM] WebSocket connection error. Please verify your backend server is active.");
}

// Establish connection immediately on page load
connectWebSocket();


// Add this helper function anywhere above setCustomAlarm()
function parseDurationToMs(durationStr) {
    const regex = /(\d*\.?\d+)\s*(h|m|s)/gi;
    let totalMs = 0;
    let match;
    let found = false;

    while ((match = regex.exec(durationStr)) !== null) {
        found = true;
        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === 'h') totalMs += val * 3600000;
        else if (unit === 'm') totalMs += val * 60000;
        else if (unit === 's') totalMs += val * 1000;
    }

    if (!found) {
        // Fallback: If they just type a number like "15", assume minutes
        const num = parseFloat(durationStr);
        if (!isNaN(num)) {
            totalMs = num * 60000;
        } else {
            return null;
        }
    }

    return totalMs;
}

function setCustomAlarm() {
    const name = document.getElementById('alarmName').value;
    const durationInput = document.getElementById('alarmDuration').value;
    const isRecurring = document.getElementById('alarmRecurring').checked;

    if (!name || !durationInput) {
        logAction("Error: Name and duration are required.");
        return;
    }

    const msOffset = parseDurationToMs(durationInput);
    if (msOffset === null) {
        logAction("Error: Invalid duration format. Try '1h 15m' or '90s'.");
        return;
    }

    if (isRecurring) {
        // Recurring loop logic -> Hits the new /recurring endpoint
        const intervalSeconds = Math.floor(msOffset / 1000);
        if (intervalSeconds < 1) {
            logAction("Error: Recurring interval must be at least 1 second.");
            return;
        }
        logAction(`[SYSTEM] Parsing successful: Custom recurring alarm '${name}' will fire every ${intervalSeconds} seconds.`);
        triggerEndpoint(`/alarms/custom/recurring?name=${encodeURIComponent(name)}&interval_seconds=${intervalSeconds}`);
    } else {
        // One-off specific time logic -> Hits the new /once endpoint
        const triggerDate = new Date(Date.now() + msOffset);
        const tzOffset = triggerDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(triggerDate - tzOffset)).toISOString().slice(0, -1);

        logAction(`[SYSTEM] Parsing successful: Custom alarm '${name}' will fire at ${triggerDate.toLocaleTimeString()}`);
        triggerEndpoint(`/alarms/custom/once?name=${encodeURIComponent(name)}&trigger_time=${encodeURIComponent(localISOTime)}`);
    }
}

let yamlDb = { default_duration_hours: 2, characters: [], spots: [] };

async function fetchYamlDb() {
    try {
        const res = await fetch('/discord/config');
        if (res.ok) {
            yamlDb = await res.json();
            document.getElementById('dbDefaultDuration').value = yamlDb.default_duration_hours;
            renderDbLists();
        }
    } catch (e) { }
}

// Helper function to re-draw the UI lists from the current yamlDb object
function renderDbLists() {
    // 1. Update Booking Form Dropdowns
    document.getElementById('characterList').innerHTML = yamlDb.characters.map(c => `<option value="${c}">`).join('');
    document.getElementById('spotList').innerHTML = yamlDb.spots.map(s => `<option value="${s}">`).join('');

    // 2. Update Database Tab UI Lists
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
        logAction("[SYSTEM] Database settings auto-saved."); // Log added back here
    });
}

function addDbItem(type, inputId) {
    const input = document.getElementById(inputId);
    const val = input.value.trim();

    if (!val) return;

    // Only add if it doesn't already exist
    if (!yamlDb[type].includes(val)) {
        yamlDb[type].push(val);
        renderDbLists(); // Instantly update the UI
        autoSaveDb();    // Instantly save to the backend
    } else {
        logAction(`[SYSTEM] ${val} is already in the database.`);
    }

    // Clear the input box
    input.value = '';
}

function removeDbItem(type, index) {
    yamlDb[type].splice(index, 1);
    renderDbLists(); // Instantly update the UI
    autoSaveDb();    // Instantly save to the backend
}

function saveDbSettings() {
    yamlDb.default_duration_hours = parseInt(document.getElementById('dbDefaultDuration').value) || 2;
    triggerEndpoint('/discord/config', {
        method: 'PUT',
        body: JSON.stringify(yamlDb)
    }).then(() => {
        logAction("[SYSTEM] Database settings saved successfully.");
        fetchYamlDb(); // Confirm sync with backend
    });
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
        body: JSON.stringify({
            character: char,
            spot: spot,
            start_hour: start,
            end_hour: end,
            trigger_time: time
        })
    }).then(() => {
        setTimeout(fetchYamlDb, 500); // Reload DB to catch auto-added chars/spots
    });
}

// Fetch DB data instantly on page load
document.addEventListener('DOMContentLoaded', fetchYamlDb);

document.addEventListener('DOMContentLoaded', () => {
    const timeInput = document.getElementById('discordTime');

    const charInput = document.getElementById('bookChar');
    const spotInput = document.getElementById('bookSpot');

    const savedChar = localStorage.getItem('tibialy_bookChar');
    const savedSpot = localStorage.getItem('tibialy_bookSpot');

    if (savedChar) charInput.value = savedChar;
    if (savedSpot) spotInput.value = savedSpot;



    // Restore time, but bump the date to today
    const savedTime = localStorage.getItem('tibialy_discordTime');
    if (savedTime && savedTime.includes('T')) {
        const timePart = savedTime.split('T')[1]; // Extract everything after the 'T' (HH:mm:ss.sss)

        // Get today's local date formatted as YYYY-MM-DD
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const newDateTime = `${year}-${month}-${day}T${timePart}`;

        // Set the input and update storage with the fresh date
        timeInput.value = newDateTime;
        localStorage.setItem('tibialy_discordTime', newDateTime);
    } else if (savedTime) {
        // Fallback just in case the format is unexpected
        timeInput.value = savedTime;
    }
    charInput.addEventListener('input', (e) => localStorage.setItem('tibialy_bookChar', e.target.value));
    spotInput.addEventListener('input', (e) => localStorage.setItem('tibialy_bookSpot', e.target.value));
    timeInput.addEventListener('input', (e) => {
        localStorage.setItem('tibialy_discordTime', e.target.value);
    });
});

// --- RUNNING CLOCKS / TIMERS LOGIC ---

let activeJobs = [];

// Fetch jobs from the backend
async function fetchJobs() {
    try {
        const response = await fetch('/api/jobs');
        if (response.ok) {
            const data = await response.json();
            activeJobs = data.jobs;
        }
    } catch (error) {
        // Silently fail if backend is unreachable so we don't spam the UI
    }
}

// Poll backend every 3 seconds to stay synced with APScheduler (catches recurring alarms automatically)
setInterval(fetchJobs, 3000);

// Update the DOM every second for the running countdown effect
setInterval(() => {
    const container = document.getElementById('timersContainer');

    if (activeJobs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full">No active timers.</p>';
        return;
    }

    const now = new Date();
    let html = '';

    activeJobs.forEach(job => {
        const runTime = new Date(job.next_run_time);
        const diff = runTime - now;

        // Prevent negative time display while waiting for backend to clear the job
        let displayTime = "00:00:00";

        if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
            const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            displayTime = h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`;
        }

        // Color coding based on type
        const typeColor = job.type === 'Discord' ? 'text-indigo-400' : 'text-green-400';

        html += `
            <div class="relative bg-gray-900 p-3 rounded border border-gray-700 shadow-inner flex flex-col justify-center items-center text-center group">
                <button onclick="cancelJob('${job.id}')" class="absolute top-1 right-2 text-gray-600 hover:text-red-500 font-bold transition" title="Cancel Timer">✖</button>

                <div class="text-xs uppercase tracking-wide font-bold ${typeColor} mb-1">${job.type}</div>
                <div class="text-sm text-gray-200 truncate w-full mb-1" title="${job.name}">${job.name}</div>
                <div class="text-cyan-300 font-mono text-2xl">${displayTime}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}, 1000);

// Instantly fetch jobs on load, and hook it to triggerEndpoint to feel instantaneous
document.addEventListener('DOMContentLoaded', fetchJobs);

// Force a sync the moment the laptop wakes up or the tab becomes active
function wakeUpSync() {
    fetchJobs();
    connectWebSocket(); // Ensure log stream didn't silently drop during sleep
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wakeUpSync();
});

window.addEventListener('focus', wakeUpSync);

async function triggerEndpoint(url, options = {}) {
    connectWebSocket();
    try {
        const fetchOptions = { method: 'POST', ...options };
        if (options.body) {
            fetchOptions.headers = { 'Content-Type': 'application/json' };
        }
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Server responded with HTTP ${response.status}`);
        }
        fetchJobs();
    } catch (error) {
        if (error.message.includes("Failed to fetch")) {
            logAction("Error: Failed to reach the server. Please make sure the Tibialy backend is running.");
        } else {
            logAction(`Error: ${error.message}`);
        }
    }
}

function cancelJob(jobId) {
    triggerEndpoint(`/api/jobs/${jobId}`, { method: 'DELETE' }).then(() => {
        logAction("[SYSTEM] Timer cancelled successfully.");
        fetchJobs(); // Instantly refresh the UI to remove the timer
    });
}
