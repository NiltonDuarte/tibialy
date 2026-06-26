let staminaTickerInterval = null;

// Helper to calculate total real-world minutes required to reach thresholds from initial logout
function getRegenMinutes(startHours, startMins, applyPenalty) {
    const startTotalStaminaMins = (startHours * 60) + startMins;
    const orangeCapMins = 39 * 60; // 2340 mins
    const maxStaminaMins = 42 * 60;  // 2520 mins

    let realMinutesTo39 = 0;
    let remTo39 = orangeCapMins - startTotalStaminaMins;
    if (remTo39 > 0) {
        realMinutesTo39 = remTo39 * 3;
    }

    let realMinutesTo42 = 0;
    if (startTotalStaminaMins < orangeCapMins) {
        realMinutesTo42 = realMinutesTo39 + (3 * 60 * 6);
    } else {
        realMinutesTo42 = Math.max(0, maxStaminaMins - startTotalStaminaMins) * 6;
    }

    // Add 10 minute logout safety margin if option is active
    if (applyPenalty) {
        if (realMinutesTo39 > 0) realMinutesTo39 += 10;
        if (realMinutesTo42 > 0) realMinutesTo42 += 10;
    }

    return { to39: realMinutesTo39, to42: realMinutesTo42 };
}

// Helper to format minutes into a scannable string (e.g., 14h 23m)
function formatMinutesStr(totalMins) {
    if (totalMins <= 0) return "0h 00m";
    const h = Math.floor(totalMins / 60);
    const m = Math.floor(totalMins % 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function initStaminaTracker() {
    const saved = localStorage.getItem('tibialy_stamina_tracker');
    if (saved) {
        const data = JSON.parse(saved);
        document.getElementById('staminaHours').value = data.hours;
        document.getElementById('staminaMins').value = data.mins;
        document.getElementById('staminaPenalty').checked = data.penalty;

        startLiveTrackingTicker();
    }
}

function saveAndTrackStamina() {
    const hours = Math.min(42, Math.max(0, parseInt(document.getElementById('staminaHours').value) || 0));
    const mins = Math.min(59, Math.max(0, parseInt(document.getElementById('staminaMins').value) || 0));
    const penalty = document.getElementById('staminaPenalty').checked;

    const trueMins = hours === 42 ? 0 : mins;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(trueMins).padStart(2, '0')}`;
    document.getElementById('staminaHours').value = hours;
    document.getElementById('staminaMins').value = trueMins;

    const logoutTime = Date.now();
    const trackConfig = {
        hours: hours,
        mins: trueMins,
        penalty: penalty,
        logoutTimestamp: logoutTime
    };

    localStorage.setItem('tibialy_stamina_tracker', JSON.stringify(trackConfig));

    // Activity Log Generation
    if (typeof logAction === "function") {
        if (hours === 42) {
            logAction("Stamina Tracker activated: Stamina is already fully charged at 42:00.");
        } else {
            const timing = getRegenMinutes(hours, trueMins, penalty);
            const targetDate = new Date(logoutTime + (timing.to42 * 60 * 1000));

            const durationStr = formatMinutesStr(timing.to42);
            const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

            const delayNotice = penalty ? " (with 10m logout delay)" : "";
            logAction(`Stamina Tracker activated at ${formattedTime}${delayNotice}. Fully recharged in ${durationStr} on ${dateStr} at ${timeStr}.`);
        }
    }

    startLiveTrackingTicker();
}

function startLiveTrackingTicker() {
    if (staminaTickerInterval) clearInterval(staminaTickerInterval);
    updateLiveStaminaCalculation();
    staminaTickerInterval = setInterval(updateLiveStaminaCalculation, 1000);
    document.getElementById('activeTrackerBox').classList.remove('hidden');
}

function updateLiveStaminaCalculation() {
    const saved = localStorage.getItem('tibialy_stamina_tracker');
    if (!saved) return;

    const data = JSON.parse(saved);
    const now = Date.now();
    let realElapsedMins = (now - data.logoutTimestamp) / (1000 * 60);

    if (data.penalty) {
        realElapsedMins = Math.max(0, realElapsedMins - 10);
    }

    const startTotalStaminaMins = (data.hours * 60) + data.mins;
    const orangeCapMins = 39 * 60;
    const maxStaminaMins = 42 * 60;

    let computedStaminaMins = startTotalStaminaMins;
    let tempElapsed = realElapsedMins;

    if (computedStaminaMins < orangeCapMins) {
        const minsNeededToOrangeCap = orangeCapMins - computedStaminaMins;
        const realMinsNeededForOrangeCap = minsNeededToOrangeCap * 3;

        if (tempElapsed <= realMinsNeededForOrangeCap) {
            computedStaminaMins += (tempElapsed / 3);
            tempElapsed = 0;
        } else {
            computedStaminaMins = orangeCapMins;
            tempElapsed -= realMinsNeededForOrangeCap;
        }
    }

    if (tempElapsed > 0 && computedStaminaMins >= orangeCapMins) {
        const minsNeededToMax = maxStaminaMins - computedStaminaMins;
        const realMinsNeededForMax = minsNeededToMax * 6;

        if (tempElapsed <= realMinsNeededForMax) {
            computedStaminaMins += (tempElapsed / 6);
        } else {
            computedStaminaMins = maxStaminaMins;
        }
    }

    computedStaminaMins = Math.min(maxStaminaMins, computedStaminaMins);
    const outHours = Math.floor(computedStaminaMins / 60);
    const outMins = Math.floor(computedStaminaMins % 60);

    document.getElementById('liveStaminaClock').innerText =
        `${String(outHours).padStart(2, '0')}:${String(outMins).padStart(2, '0')}`;

    const clockEl = document.getElementById('liveStaminaClock');
    if (outHours >= 39) {
        clockEl.className = "text-5xl font-mono font-bold text-green-400 tracking-tight";
    } else if (outHours >= 14) {
        clockEl.className = "text-5xl font-mono font-bold text-orange-400 tracking-tight";
    } else {
        clockEl.className = "text-5xl font-mono font-bold text-red-500 tracking-tight";
    }

    // Process absolute targets and remaining countdowns
    const timing = getRegenMinutes(data.hours, data.mins, data.penalty);
    const date39 = new Date(data.logoutTimestamp + (timing.to39 * 60 * 1000));
    const date42 = new Date(data.logoutTimestamp + (timing.to42 * 60 * 1000));

    // Calculate real-time minutes remaining from *now*
    const remMinsTo39 = Math.max(0, Math.ceil((date39.getTime() - now) / (1000 * 60)));
    const remMinsTo42 = Math.max(0, Math.ceil((date42.getTime() - now) / (1000 * 60)));

    if (startTotalStaminaMins >= orangeCapMins) {
        document.getElementById('targetOrangeTime').innerText = "Completed";
        document.getElementById('countdownOrange').innerText = "Already in green stamina zone";
    } else if (remMinsTo39 <= 0) {
        document.getElementById('targetOrangeTime').innerText = "Completed";
        document.getElementById('countdownOrange').innerText = "Reached just now";
    } else {
        document.getElementById('targetOrangeTime').innerText = date39.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ` (${date39.toLocaleDateString([], {month:'short', day:'numeric'})})`;
        document.getElementById('countdownOrange').innerText = `⏳ ${formatMinutesStr(remMinsTo39)} remaining`;
    }

    if (computedStaminaMins >= maxStaminaMins) {
        document.getElementById('targetGreenTime').innerText = "Fully Charged";
        document.getElementById('countdownGreen').innerText = "Ready to hunt!";
    } else {
        document.getElementById('targetGreenTime').innerText = date42.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ` (${date42.toLocaleDateString([], {month:'short', day:'numeric'})})`;
        document.getElementById('countdownGreen').innerText = `⏳ ${formatMinutesStr(remMinsTo42)} remaining`;
    }
}

function clearStaminaTracker() {
    if (staminaTickerInterval) clearInterval(staminaTickerInterval);
    localStorage.removeItem('tibialy_stamina_tracker');

    document.getElementById('staminaHours').value = "42";
    document.getElementById('staminaMins').value = "00";
    document.getElementById('activeTrackerBox').classList.add('hidden');

    if (typeof logAction === "function") {
        logAction("Stamina Tracker deactivated and cleared.");
    }
}

document.addEventListener("DOMContentLoaded", initStaminaTracker);
