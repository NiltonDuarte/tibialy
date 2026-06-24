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

    websocket.onmessage = function(event) {
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

async function triggerEndpoint(url) {
    connectWebSocket();

    try {
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Server responded with HTTP ${response.status}`);
        }
    } catch (error) {
        if (error.message.includes("Failed to fetch")) {
            logAction("Error: Failed to reach the server. Hey there! Please make sure the Tibialy backend is running so the tool can work properly.");
        } else {
            logAction(`Error: ${error.message}`);
        }
    }
}

function setCustomAlarm() {
    const name = document.getElementById('alarmName').value;
    const minutes = document.getElementById('alarmMinutes').value;
    if (!name || !minutes) {
        logAction("Error: Name and minutes are required.");
        return;
    }
    triggerEndpoint(`/alarms/custom?name=${encodeURIComponent(name)}&minutes=${minutes}`);
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
