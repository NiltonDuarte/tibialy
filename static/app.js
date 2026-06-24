let websocket = null;

function logAction(message, timestamp = null) {
    const logWindow = document.getElementById('logWindow');
    const time = timestamp || new Date().toLocaleTimeString();
    const li = document.createElement('li');
    li.textContent = `[${time}] ${message}`;
    logWindow.prepend(li);
}

function connectWebSocket() {
    // Do not reconnect if already open or connecting
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

    // Friendly backend reminders on disconnects/errors
    websocket.onclose = () => logAction("[SYSTEM] Disconnected from log stream. (Just a friendly reminder: please check if the backend server is still running!)");
    websocket.onerror = () => logAction("[SYSTEM] WebSocket connection error. Please verify your backend server is active.");
}

// Establish connection immediately on page load
connectWebSocket();

async function triggerEndpoint(url) {
    // Re-evaluate and re-establish connection if dropped before taking action
    connectWebSocket();

    try {
        await fetch(url, { method: 'POST' });
    } catch (error) {
        // Intercept standard fetch failures (like server being down)
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
    triggerEndpoint(`/discord/schedule?message=${encodeURIComponent(msg)}&trigger_time=${time}:00`);
}
