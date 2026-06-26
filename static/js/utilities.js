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
        document.getElementById('targetOrangeTime').innerText = date39.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${date39.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
        document.getElementById('countdownOrange').innerText = `⏳ ${formatMinutesStr(remMinsTo39)} remaining`;
    }

    if (computedStaminaMins >= maxStaminaMins) {
        document.getElementById('targetGreenTime').innerText = "Fully Charged";
        document.getElementById('countdownGreen').innerText = "Ready to hunt!";
    } else {
        document.getElementById('targetGreenTime').innerText = date42.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${date42.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
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

// ==========================================
// PARTY LOOT SPLITTER
// ==========================================

function analyzeLoot() {
    const rawData = document.getElementById('lootInput').value.trim();
    if (!rawData) return;

    const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);

    let sessionDuration = "00:00h";
    let totalBalance = 0;
    let totalDamage = 0;
    let totalHealing = 0;
    let players = [];
    let currentPlayer = null;

    // Parse the Tibia log format dynamically
    for (let line of lines) {
        if (line.startsWith("Session data:") || line.startsWith("Loot Type:")) continue;

        if (line.startsWith("Session:")) {
            sessionDuration = line.replace("Session:", "").trim();
            continue;
        }

        const cleanLine = line.replace(/,/g, '');

        if (cleanLine.startsWith("Balance:") && currentPlayer === null) {
            totalBalance = parseInt(cleanLine.split(':')[1].trim());
        } else if (!cleanLine.includes(":")) {
            // No colon indicates a player name header
            if (currentPlayer) players.push(currentPlayer);
            currentPlayer = { name: line, loot: 0, supplies: 0, balance: 0, damage: 0, healing: 0 };
        } else if (currentPlayer) {
            const parts = cleanLine.split(':');
            const key = parts[0].trim();
            const val = parseInt(parts[1].trim()) || 0;

            if (key === "Loot") currentPlayer.loot = val;
            if (key === "Supplies") currentPlayer.supplies = val;
            if (key === "Balance") currentPlayer.balance = val;
            if (key === "Damage") { currentPlayer.damage = val; totalDamage += val; }
            if (key === "Healing") { currentPlayer.healing = val; totalHealing += val; }
        }
    }
    if (currentPlayer) players.push(currentPlayer);

    if (players.length === 0) {
        alert("Could not detect any players. Please ensure you copy the entire Party Hunt analyzer text.");
        return;
    }

    const perPlayerShare = Math.floor(totalBalance / players.length);

    // Output Core Metrics
    document.getElementById('outDuration').innerText = sessionDuration;
    document.getElementById('outTotalBalance').innerText = totalBalance.toLocaleString() + ' gp';
    document.getElementById('outPerPlayer').innerText = perPlayerShare.toLocaleString() + ' gp';

    const statusEl = document.getElementById('outStatus');
    if (totalBalance > 0) {
        statusEl.innerText = "Profit";
        statusEl.className = "text-lg font-bold text-green-400 mt-1 uppercase";
        document.getElementById('outPerPlayer').className = "text-lg font-semibold text-green-400 mt-1 font-mono";
    } else {
        statusEl.innerText = "Waste";
        statusEl.className = "text-lg font-bold text-red-500 mt-1 uppercase";
        document.getElementById('outPerPlayer').className = "text-lg font-semibold text-red-500 mt-1 font-mono";
    }

    // Calculate Debts and Receivables
    let payers = [];
    let receivers = [];

    players.forEach(p => {
        const diff = p.balance - perPlayerShare;
        if (diff > 0) {
            payers.push({ name: p.name, amount: diff });
        } else if (diff < 0) {
            receivers.push({ name: p.name, amount: Math.abs(diff) });
        }
    });

    // Generate Transfer Instructions
    const instructionBox = document.getElementById('transferInstructions');
    instructionBox.innerHTML = '';

    if (payers.length === 0 && receivers.length === 0) {
        instructionBox.innerHTML = '<div class="text-theme-text-muted italic bg-theme-bg-input/30 p-3 rounded border border-theme-border-light/50">Balance is perfectly even. No transfers needed!</div>';
    } else {
        let transfers = [];

        while (payers.length > 0 && receivers.length > 0) {
            let payer = payers[0];
            let receiver = receivers[0];
            let amountToTransfer = Math.min(payer.amount, receiver.amount);

            transfers.push(`
                <div class="flex items-center justify-between bg-theme-bg-input/50 p-3 rounded border border-theme-border-light/40">
                    <div class="flex items-center gap-2 font-mono">
                        <span class="font-semibold text-theme-text-white">${payer.name}</span>
                        <span class="text-theme-text-dim text-[11px] uppercase">pays</span>
                        <span class="text-theme-accent-text font-bold">${amountToTransfer.toLocaleString()} gp</span>
                        <span class="text-theme-text-dim text-[11px] uppercase">to</span>
                        <span class="font-semibold text-theme-text-white">${receiver.name}</span>
                    </div>
                    <button onclick="copyTransferCommand('transfer ${amountToTransfer} to ${receiver.name}', this)" class="px-3 py-1 bg-theme-bg-panel hover:bg-theme-border-base text-theme-text-white text-[11px] font-bold uppercase tracking-wider rounded border border-theme-border-light transition shadow-sm shrink-0">
                        📋 Copy
                    </button>
                </div>
            `);

            payer.amount -= amountToTransfer;
            receiver.amount -= amountToTransfer;

            if (payer.amount === 0) payers.shift();
            if (receiver.amount === 0) receivers.shift();
        }
        instructionBox.innerHTML = transfers.join('');
    }

    // Generate Player Detail Cards
    const statsGrid = document.getElementById('playerStatsGrid');
    statsGrid.innerHTML = '';

    players.forEach(p => {
        // Safe mathematical percentages
        const balShare = totalBalance !== 0 ? ((p.balance / totalBalance) * 100).toFixed(1) : 0;
        const dmgShare = totalDamage > 0 ? ((p.damage / totalDamage) * 100).toFixed(1) : 0;
        const healShare = totalHealing > 0 ? ((p.healing / totalHealing) * 100).toFixed(1) : 0;

        const balColor = p.balance >= 0 ? 'text-green-400' : 'text-red-400';

        statsGrid.innerHTML += `
            <div class="bg-theme-bg-input/20 p-4 rounded-lg border border-theme-border-light shadow-sm flex flex-col gap-3">
                <div class="font-bold text-theme-text-white border-b border-theme-border-light/50 pb-1">${p.name}</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-mono">
                    <div class="flex justify-between items-center">
                        <span class="text-theme-text-dim text-[10px] uppercase">Loot</span>
                        <span class="text-theme-text-main">${p.loot.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-theme-text-dim text-[10px] uppercase">Supplies</span>
                        <span class="text-theme-text-main">${p.supplies.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between items-center col-span-2 bg-theme-bg-panel/50 p-1 px-2 rounded">
                        <span class="text-theme-text-dim text-[10px] uppercase">Balance</span>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold ${balColor}">${p.balance.toLocaleString()}</span>
                            <span class="text-[10px] text-theme-text-muted">(${balShare}%)</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center col-span-2">
                        <span class="text-theme-text-dim text-[10px] uppercase">Damage</span>
                        <div class="flex items-center gap-2">
                            <span class="text-red-300">${p.damage.toLocaleString()}</span>
                            <span class="text-[10px] text-theme-text-muted">(${dmgShare}%)</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center col-span-2">
                        <span class="text-theme-text-dim text-[10px] uppercase">Healing</span>
                        <div class="flex items-center gap-2">
                            <span class="text-blue-300">${p.healing.toLocaleString()}</span>
                            <span class="text-[10px] text-theme-text-muted">(${healShare}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    document.getElementById('lootOutputBox').classList.remove('hidden');
}

// Global helper for the copy to clipboard action
function copyTransferCommand(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = "✅ Copied";
        btnElement.classList.add("border-green-500", "text-green-400");

        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.classList.remove("border-green-500", "text-green-400");
        }, 1500);
    });
}

// Initial Boot
document.addEventListener("DOMContentLoaded", initStaminaTracker);
