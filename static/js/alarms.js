// --- ALARMS LOGIC ---
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
        const num = parseFloat(durationStr);
        if (!isNaN(num)) totalMs = num * 60000;
        else return null;
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
        const intervalSeconds = Math.floor(msOffset / 1000);
        if (intervalSeconds < 1) {
            logAction("Error: Recurring interval must be at least 1 second.");
            return;
        }
        logAction(`[SYSTEM] Parsing successful: Custom recurring alarm '${name}' will fire every ${intervalSeconds} seconds.`);
        triggerEndpoint(`/alarms/custom/recurring?name=${encodeURIComponent(name)}&interval_seconds=${intervalSeconds}`);
    } else {
        const triggerDate = new Date(Date.now() + msOffset);
        const tzOffset = triggerDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(triggerDate - tzOffset)).toISOString().slice(0, -1);

        logAction(`[SYSTEM] Parsing successful: Custom alarm '${name}' will fire at ${triggerDate.toLocaleTimeString()}`);
        triggerEndpoint(`/alarms/custom/once?name=${encodeURIComponent(name)}&trigger_time=${encodeURIComponent(localISOTime)}`);
    }
}
