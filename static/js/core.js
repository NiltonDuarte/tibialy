// --- SYSTEM GLOBALS & NAVIGATION ---
let websocket = null;
let activeJobs = [];
function switchPage(pageId) {
    // Hide ALL page viewports
    document.getElementById('page-alarms').classList.add('hidden');
    document.getElementById('page-discord').classList.add('hidden');
    document.getElementById('page-imbuements').classList.add('hidden');
    document.getElementById('page-stamina').classList.add('hidden');
    document.getElementById('page-settings').classList.add('hidden');

    const inactiveClass = "pb-2 text-lg font-semibold border-b-2 border-transparent text-theme-text-dim transition hover:text-theme-accent-text hover:border-theme-border-light";
    const activeClass = "pb-2 text-lg font-semibold border-b-2 border-theme-accent-text text-theme-accent-text transition hover:opacity-80";

    // Reset styles on buttons
    document.getElementById('nav-alarms').className = inactiveClass;
    document.getElementById('nav-discord').className = inactiveClass;
    document.getElementById('nav-imbuements').className = inactiveClass;
    document.getElementById('nav-stamina').className = inactiveClass;
    document.getElementById('nav-settings').className = inactiveClass;

    // Set target elements visible
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    document.getElementById(`nav-${pageId}`).className = activeClass;

    localStorage.setItem('tibialy_lastPage', pageId);
}

// --- LOGGING & WEBSOCKETS ---
function logAction(message, timestamp = null) {
    const logWindow = document.getElementById('logWindow');
    const time = timestamp || new Date().toLocaleTimeString();
    const li = document.createElement('li');
    li.textContent = `[${time}] ${message}`;
    logWindow.prepend(li);
}

function connectWebSocket() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) return;

    websocket = new WebSocket(`ws://${window.location.host}/websocket/logs`);
    websocket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        let localizedTime = new Date().toLocaleTimeString();
        if (data.timestamp) localizedTime = new Date(data.timestamp).toLocaleTimeString();
        const level = data.level ? `[${data.level.toUpperCase()}]` : '[INFO]';

        const { timestamp, level: l, event: e, logger, ...kwargs } = data;
        const extras = Object.keys(kwargs).length ? JSON.stringify(kwargs) : '';
        logAction(`${level} ${data.event} ${extras}`, localizedTime);
    };

    websocket.onopen = () => logAction("[SYSTEM] Connected to real-time log stream.");
    websocket.onclose = () => logAction("[SYSTEM] Disconnected from log stream. (Verify backend is running!)");
    websocket.onerror = () => logAction("[SYSTEM] WebSocket connection error.");
}

// --- API HELPER ---
async function triggerEndpoint(url, options = {}) {
    connectWebSocket();
    try {
        const fetchOptions = { method: 'POST', ...options };
        if (options.body) fetchOptions.headers = { 'Content-Type': 'application/json' };

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

// --- TIMERS LOGIC ---
async function fetchJobs() {
    try {
        const response = await fetch('/api/jobs');
        if (response.ok) activeJobs = (await response.json()).jobs;
    } catch (error) { }
}

function cancelJob(jobId) {
    triggerEndpoint(`/api/jobs/${jobId}`, { method: 'DELETE' }).then(() => {
        logAction("[SYSTEM] Timer cancelled successfully.");
        fetchJobs();
    });
}

setInterval(fetchJobs, 3000);

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
        let displayTime = "00:00:00";

        if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
            const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            displayTime = h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`;
        }

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

// --- INITIALIZATION & SLEEP MODE RECOVERY ---
function wakeUpSync() {
    fetchJobs();
    connectWebSocket();
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeUpSync(); });
window.addEventListener('focus', wakeUpSync);

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    fetchJobs();
    const lastPage = localStorage.getItem('tibialy_lastPage') || 'alarms';
    switchPage(lastPage);
});
