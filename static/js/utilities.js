let staminaTickerInterval = null;
let currentSessionData = null;
let historicalRecords = [];
let sortConfig = { column: 'date', order: 'desc' };
let currentlyOpenRecordDate = null;

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


// Initial Boot
document.addEventListener("DOMContentLoaded", initStaminaTracker);

// ==========================================
// PARTY LOOT SPLITTER & RECORDS
// ==========================================

function analyzeLoot() {
    const rawData = document.getElementById('lootInput').value.trim();
    if (!rawData) return;

    const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);

    let sessionDuration = "00:00h";
    let totalBalance = 0;
    let totalDamage = 0;
    let totalHealing = 0;
    let totalLoot = 0;
    let players = [];
    let currentPlayer = null;

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
            if (currentPlayer) players.push(currentPlayer);
            currentPlayer = { name: line, loot: 0, supplies: 0, balance: 0, damage: 0, healing: 0 };
        } else if (currentPlayer) {
            const parts = cleanLine.split(':');
            const key = parts[0].trim();
            const val = parseInt(parts[1].trim()) || 0;

            if (key === "Loot") { currentPlayer.loot = val; totalLoot += val; }
            if (key === "Supplies") currentPlayer.supplies = val;
            if (key === "Balance") currentPlayer.balance = val;
            if (key === "Damage") { currentPlayer.damage = val; totalDamage += val; }
            if (key === "Healing") { currentPlayer.healing = val; totalHealing += val; }
        }
    }
    if (currentPlayer) players.push(currentPlayer);
    if (players.length === 0) return alert("Could not detect any players.");

    // Parse Duration
    let durationHours = 1;
    const match = sessionDuration.match(/(\d+):(\d+)h/);
    if (match) durationHours = parseInt(match[1]) + (parseInt(match[2]) / 60);
    if (durationHours <= 0) durationHours = 1;

    const perPlayerShare = Math.floor(totalBalance / players.length);
    const profitPerHour = Math.round(totalBalance / durationHours);

    currentSessionData = {
        date: new Date().toISOString(),
        duration: sessionDuration,
        duration_hours: durationHours,
        total_balance: totalBalance,
        total_damage: totalDamage,
        total_healing: totalHealing,
        total_loot: totalLoot,
        profit_per_hour: profitPerHour,
        damage_per_hour: Math.round(totalDamage / durationHours),
        healing_per_hour: Math.round(totalHealing / durationHours),
        loot_per_hour: Math.round(totalLoot / durationHours),
        players: players
    };

    document.getElementById('outDuration').innerText = sessionDuration;
    document.getElementById('outTotalBalance').innerText = totalBalance.toLocaleString() + ' gp';

    const pphEl = document.getElementById('outProfitPerHour');
    const ppEl = document.getElementById('outPerPlayer');
    pphEl.innerText = profitPerHour.toLocaleString() + ' gp/h';
    ppEl.innerText = perPlayerShare.toLocaleString() + ' gp';

    if (totalBalance > 0) {
        pphEl.className = "text-lg font-bold text-green-400 mt-1 font-mono";
        ppEl.className = "text-lg font-semibold text-green-400 mt-1 font-mono";
    } else {
        pphEl.className = "text-lg font-bold text-red-500 mt-1 font-mono";
        ppEl.className = "text-lg font-semibold text-red-500 mt-1 font-mono";
    }

    renderTransfers(players, perPlayerShare);
    renderPlayerCards(players, durationHours, 'playerStatsGrid');

    const btn = document.getElementById('saveRecordBtn');
    if (btn) {
        btn.innerHTML = "💾 Save Record";
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    document.getElementById('lootOutputBox').classList.remove('hidden');
}

function renderTransfers(players, perPlayerShare) {
    let payers = [], receivers = [];
    players.forEach(p => {
        const diff = p.balance - perPlayerShare;
        if (diff > 0) payers.push({ name: p.name, amount: diff });
        else if (diff < 0) receivers.push({ name: p.name, amount: Math.abs(diff) });
    });

    const box = document.getElementById('transferInstructions');
    box.innerHTML = '';

    if (payers.length === 0 && receivers.length === 0) {
        box.innerHTML = '<div class="text-theme-text-muted italic bg-theme-bg-input/30 p-3 rounded border border-theme-border-light/50">Balance is perfectly even. No transfers needed!</div>';
        return;
    }

    let html = [];
    while (payers.length > 0 && receivers.length > 0) {
        let payer = payers[0], receiver = receivers[0];
        let amount = Math.min(payer.amount, receiver.amount);

        html.push(`
            <div class="flex items-center justify-between bg-theme-bg-input/50 p-3 rounded border border-theme-border-light/40">
                <div class="flex items-center gap-2 font-mono">
                    <span class="font-semibold text-theme-text-white">${payer.name}</span>
                    <span class="text-theme-text-dim text-[11px] uppercase">pays</span>
                    <span class="text-theme-accent-text font-bold">${amount.toLocaleString()} gp</span>
                    <span class="text-theme-text-dim text-[11px] uppercase">to</span>
                    <span class="font-semibold text-theme-text-white">${receiver.name}</span>
                </div>
                <button onclick="copyTransferCommand('transfer ${amount} to ${receiver.name}', this)" class="px-3 py-1 bg-theme-bg-panel hover:bg-theme-border-base text-theme-text-white text-[11px] font-bold uppercase tracking-wider rounded border border-theme-border-light transition shadow-sm shrink-0">📋 Copy</button>
            </div>
        `);
        payer.amount -= amount;
        receiver.amount -= amount;
        if (payer.amount === 0) payers.shift();
        if (receiver.amount === 0) receivers.shift();
    }
    box.innerHTML = html.join('');
}

function renderPlayerCards(players, durationHours, targetElementId) {
    const grid = document.getElementById(targetElementId);
    grid.innerHTML = '';

    const totalBalance = players.reduce((sum, p) => sum + p.balance, 0);
    const totalDamage = players.reduce((sum, p) => sum + p.damage, 0);
    const totalHealing = players.reduce((sum, p) => sum + p.healing, 0);

    players.forEach(p => {
        const balShare = totalBalance !== 0 ? ((p.balance / totalBalance) * 100).toFixed(1) : 0;
        const dmgShare = totalDamage > 0 ? ((p.damage / totalDamage) * 100).toFixed(1) : 0;
        const healShare = totalHealing > 0 ? ((p.healing / totalHealing) * 100).toFixed(1) : 0;
        const balColor = p.balance >= 0 ? 'text-green-400' : 'text-red-400';

        const dmgPerHour = durationHours > 0 ? Math.round(p.damage / durationHours) : 0;
        const healPerHour = durationHours > 0 ? Math.round(p.healing / durationHours) : 0;

        grid.innerHTML += `
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
                            <span class="text-[10px] text-theme-text-dim">${dmgPerHour.toLocaleString()}/h (${dmgShare}%)</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center col-span-2">
                        <span class="text-theme-text-dim text-[10px] uppercase">Healing</span>
                        <div class="flex items-center gap-2">
                            <span class="text-blue-300">${p.healing.toLocaleString()}</span>
                            <span class="text-[10px] text-theme-text-dim">${healPerHour.toLocaleString()}/h (${healShare}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

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

async function saveSessionRecord() {
    if (!currentSessionData) return;
    currentSessionData.annotations = document.getElementById('sessionAnnotations').value.trim();
    currentSessionData.tags = document.getElementById('sessionTags').value.split(',').map(t => t.trim()).filter(t => t);

    try {
        await triggerEndpoint('/api/utilities/records', { method: 'POST', body: JSON.stringify(currentSessionData) });
        if (typeof logAction === "function") logAction("Hunting session record saved.");

        const btn = document.getElementById('saveRecordBtn');
        if (btn) {
            btn.innerHTML = "✅ Saved";
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        fetchRecords();
    } catch (e) { console.error(e); }
}

async function fetchRecords() {
    try {
        const res = await fetch('/api/utilities/records');
        if (res.ok) {
            const data = await res.json();
            historicalRecords = data.sessions || [];
            renderRecordsTable();
        }
    } catch (e) { console.error(e); }
}

function sortRecords(column) {
    if (sortConfig.column === column) {
        sortConfig.order = sortConfig.order === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.column = column;
        sortConfig.order = 'desc';
    }
    renderRecordsTable();
}

function renderRecordsTable() {
    const tbody = document.getElementById('recordsTableBody');
    const filterPlayer = document.getElementById('filterPlayer').value.toLowerCase();
    const filterTag = document.getElementById('filterTag').value.toLowerCase();

    let filtered = historicalRecords.filter(r => {
        const matchPlayer = r.players.some(p => p.name.toLowerCase().includes(filterPlayer));
        const matchTag = r.tags && r.tags.some(t => t.toLowerCase().includes(filterTag));
        return (!filterPlayer || matchPlayer) && (!filterTag || matchTag);
    });

    filtered.sort((a, b) => {
        let valA, valB;
        if (sortConfig.column === 'date') { valA = new Date(a.date); valB = new Date(b.date); }
        else if (sortConfig.column === 'damage') { valA = a.damage_per_hour; valB = b.damage_per_hour; }
        else if (sortConfig.column === 'healing') { valA = a.healing_per_hour; valB = b.healing_per_hour; }
        else if (sortConfig.column === 'loot') { valA = a.loot_per_hour; valB = b.loot_per_hour; }
        else if (sortConfig.column === 'profit') { valA = a.profit_per_hour; valB = b.profit_per_hour; }

        if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-theme-text-dim text-xs">No matching records found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((r, i) => `
        <tr class="border-b border-theme-border-light/30 hover:bg-theme-bg-input/50 cursor-pointer transition" onclick='showRecordDetails(${JSON.stringify(r).replace(/'/g, "&#39;")})'>
            <td class="p-2 whitespace-nowrap">${new Date(r.date).toLocaleDateString()}</td>
            <td class="p-2 truncate max-w-[120px]" title="${r.players.map(p => p.name).join(', ')}">${r.players.map(p => p.name).join(', ')}</td>
            <td class="p-2 truncate max-w-[100px] text-theme-accent-text font-mono text-[10px]">${(r.tags || []).join(', ')}</td>
            <td class="p-2 font-mono text-red-300">${(r.damage_per_hour || 0).toLocaleString()}</td>
            <td class="p-2 font-mono text-blue-300">${(r.healing_per_hour || 0).toLocaleString()}</td>
            <td class="p-2 font-mono text-theme-text-muted">${(r.loot_per_hour || 0).toLocaleString()}</td>
            <td class="p-2 font-mono ${r.profit_per_hour >= 0 ? 'text-green-400' : 'text-red-400'}">${(r.profit_per_hour || 0).toLocaleString()}</td>
        </tr>
    `).join('');
}

function showRecordDetails(record) {
    const detailsBox = document.getElementById('recordDetailsBox');

    // Toggle closure if clicking the same row
    if (currentlyOpenRecordDate === record.date && !detailsBox.classList.contains('hidden')) {
        detailsBox.classList.add('hidden');
        currentlyOpenRecordDate = null;
        return;
    }

    currentlyOpenRecordDate = record.date;
    detailsBox.classList.remove('hidden');

    const annBox = document.getElementById('recordAnnotationsDisplay');
    if (record.annotations) {
        annBox.innerText = `📝 Notes: ${record.annotations}`;
        annBox.classList.remove('hidden');
    } else {
        annBox.classList.add('hidden');
    }

    renderPlayerCards(record.players, record.duration_hours, 'recordPlayerCards');

    const deleteBtn = document.getElementById('deleteRecordBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => deleteSingleRecord(record.date);
    }

    detailsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deleteSingleRecord(date) {
    if (!confirm("Are you sure you want to delete this hunting record?")) return;

    try {
        await triggerEndpoint(`/api/utilities/records/${encodeURIComponent(date)}`, { method: 'DELETE' });
        if (typeof logAction === "function") logAction("Hunting session record deleted.");

        document.getElementById('recordDetailsBox').classList.add('hidden');
        currentlyOpenRecordDate = null;
        fetchRecords();
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initStaminaTracker();
    fetchRecords();
});
