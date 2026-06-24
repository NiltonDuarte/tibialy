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

function scheduleDiscord() {
    const msg = document.getElementById('discordMsg').value;
    const time = document.getElementById('discordTime').value;
    if (!msg || !time) {
        logAction("Error: Message and time are required.");
        return;
    }

    const scheduledDate = new Date(time);
    const now = new Date();

    if (scheduledDate <= now) {
        logAction("Error: Scheduled time must be in the future.");
        return;
    }

    triggerEndpoint(`/discord/schedule?message=${encodeURIComponent(msg)}&trigger_time=${time}`);
}

// --- LOCAL STORAGE PERSISTENCE ---

// --- LOCAL STORAGE PERSISTENCE ---

document.addEventListener('DOMContentLoaded', () => {
    const msgInput = document.getElementById('discordMsg');
    const timeInput = document.getElementById('discordTime');

    // Restore message
    const savedMsg = localStorage.getItem('tibialy_discordMsg');
    if (savedMsg) msgInput.value = savedMsg;

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

    // Auto-save values whenever the user types or changes the date
    msgInput.addEventListener('input', (e) => {
        localStorage.setItem('tibialy_discordMsg', e.target.value);
    });

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
            <div class="bg-gray-900 p-3 rounded border border-gray-700 shadow-inner flex flex-col justify-center items-center text-center">
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

// We need to modify triggerEndpoint to call fetchJobs() when it finishes successfully
// Find your existing triggerEndpoint function and add fetchJobs() to the success block:
async function triggerEndpoint(url) {
    connectWebSocket();

    try {
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Server responded with HTTP ${response.status}`);
        }

        // INSTANT UI UPDATE
        fetchJobs();

    } catch (error) {
        if (error.message.includes("Failed to fetch")) {
            logAction("Error: Failed to reach the server. Hey there! Please make sure the Tibialy backend is running so the tool can work properly.");
        } else {
            logAction(`Error: ${error.message}`);
        }
    }
}
