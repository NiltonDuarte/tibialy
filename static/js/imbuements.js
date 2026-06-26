// Base structural definitions for optimizer presets
const basePresets = {
    strike: { t1: ["Protective Hair", 25], t2: ["Sabretooth", 25], t3: ["Vexclaw Talon", 5] },
    vampirism: { t1: ["Vampire Teeth", 25], t2: ["Bloody Pincers", 25], t3: ["Piece of Dead Brain", 5] },
    void: { t1: ["Rope Belt", 25], t2: ["Silencer Claw", 25], t3: ["Some Grime Leech Wings", 5] }
};

// Complete matrix for all 12 tracked recipe systems in Tibia
const shopPresets = {
    punch: { name: "👊 Powerful Punch (Fist)", t1: ["Tarantula Egg", 25], t2: ["Mantassin Tail", 20], t3: ["Gold-Brocaded Cloth", 15] },
    epiphany: { name: "🔮 Powerful Epiphany (Magic Lvl)", t1: ["Elvish Talisman", 25], t2: ["Broken Shamanic Staff", 15], t3: ["Strand of Medusa Hair", 15] },
    precision: { name: "🎯 Powerful Precision (Distance)", t1: ["Elven Scouting Glass", 25], t2: ["Elven Hoof", 20], t3: ["Metal Spike", 10] },
    slash: { name: "⚔️ Powerful Slash (Sword)", t1: ["Lion's Mane", 25], t2: ["Mooh'tah Shell", 25], t3: ["War Crystal", 5] },
    chop: { name: "🪓 Powerful Chop (Axe)", t1: ["Orc Tooth", 20], t2: ["Battle Stone", 25], t3: ["Moohtant Horn", 20] },
    bash: { name: "🔨 Powerful Bash (Club)", t1: ["Cyclops Toe", 20], t2: ["Ogre Nose Ring", 15], t3: ["Warmaster's Wristguards", 10] },
    featherweight: { name: "🎒 Powerful Featherweight (Cap)", t1: ["Fairy Wings", 20], t2: ["Little Bowl of Myrrh", 20], t3: ["Goosebump Leather", 5] },
    dragonhide: { name: "🔥 Powerful Dragon Hide (Fire Res)", t1: ["Green Dragon Leather", 20], t2: ["Green Dragon Scale", 10], t3: ["Dragon Lord Apron", 5] },
    quarascale: { name: "❄️ Powerful Quara Scale (Ice Res)", t1: ["Winter Wolf Fur", 20], t2: ["Thick Fur", 15], t3: ["Quara Pincer", 5] },
    cloudfabric: { name: "⚡ Powerful Cloud Fabric (Energy Res)", t1: ["Shimmering Gland", 20], t2: ["Heavenly Blossom", 15], t3: ["Shock Head", 5] },
    snakeskin: { name: "🌿 Powerful Snake Skin (Earth Res)", t1: ["Piece of Swampling Wood", 25], t2: ["Snake Skin", 20], t3: ["Brimstone Fang", 5] },
    lichshroud: { name: "💀 Powerful Lich Shroud (Death Res)", t1: ["Flask of Embalming Fluid", 25], t2: ["Gloom Wolf Fur", 20], t3: ["Mystical Hourglass", 5] },
    demonpresence: { name: "☀️ Powerful Demon Presence (Holy Res)", t1: ["Cultish Signet Ring", 25], t2: ["Cultish Robe", 20], t3: ["Holy Orchid", 5] }
};

// Track data structures from storage
const savedData = localStorage.getItem('tibialy_imbuement_data');
let imbData = savedData ? JSON.parse(savedData) : {
    priceToken: 40000,
    lastPreset: "strike",
    prices: {
        strike: { p1: 1200, p2: 4500, p3: 12000 },
        vampirism: { p1: 2200, p2: 6800, p3: 17000 },
        void: { p1: 2500, p2: 4000, p3: 9000 }
    }
};

// Saved list of tracked imbuements, memory array for quantities
let trackedImbs = JSON.parse(localStorage.getItem('tibialy_tracked_imbs')) || [];
let liveQuantities = {};

function initImbuements() {
    const presetSelector = document.getElementById('imbPreset');
    const tokenInput = document.getElementById('priceToken');

    if (!presetSelector || !tokenInput) return;

    presetSelector.value = imbData.lastPreset || "strike";
    tokenInput.value = imbData.priceToken;

    applyImbPreset();
    renderTrackedList();
}

function applyImbPreset() {
    const selected = document.getElementById('imbPreset').value;
    const metadata = basePresets[selected];

    imbData.lastPreset = selected;

    document.getElementById('nameT1').innerText = metadata.t1[0];
    document.getElementById('countT1').innerText = metadata.t1[1];
    document.getElementById('nameT2').innerText = metadata.t2[0];
    document.getElementById('countT2').innerText = metadata.t2[1];
    document.getElementById('nameT3').innerText = metadata.t3[0];
    document.getElementById('countT3').innerText = metadata.t3[1];

    document.getElementById('priceT1').value = imbData.prices[selected].p1;
    document.getElementById('priceT2').value = imbData.prices[selected].p2;
    document.getElementById('priceT3').value = imbData.prices[selected].p3;

    calculateImbuement();
}

function calculateImbuement() {
    const selected = document.getElementById('imbPreset').value;

    const pToken = parseFloat(document.getElementById('priceToken').value) || 0;
    const p1 = parseFloat(document.getElementById('priceT1').value) || 0;
    const p2 = parseFloat(document.getElementById('priceT2').value) || 0;
    const p3 = parseFloat(document.getElementById('priceT3').value) || 0;

    const c1 = parseFloat(document.getElementById('countT1').innerText) || 0;
    const c2 = parseFloat(document.getElementById('countT2').innerText) || 0;
    const c3 = parseFloat(document.getElementById('countT3').innerText) || 0;

    imbData.priceToken = pToken;
    imbData.prices[selected].p1 = p1;
    imbData.prices[selected].p2 = p2;
    imbData.prices[selected].p3 = p3;
    localStorage.setItem('tibialy_imbuement_data', JSON.stringify(imbData));

    const costT1Market = p1 * c1;
    const costT2Market = p2 * c2;
    const costT3Market = p3 * c3;

    const path1_PureMarket = costT1Market + costT2Market + costT3Market;
    const path2_2TokensMix = (2 * pToken) + costT2Market + costT3Market;
    const path3_4TokensMix = (4 * pToken) + costT3Market;
    const path4_6TokensPure = (6 * pToken);

    const options = [
        { name: "Buy everything on the Market", cost: path1_PureMarket, details: "Pure creature products strategy" },
        { name: "Use 2 Gold Tokens for T1", cost: path2_2TokensMix, details: "Redeem T1 items, buy T2 and T3 on the Market" },
        { name: "Use 4 Gold Tokens for T1 + T2", cost: path3_4TokensMix, details: "Redeem T1 & T2 items, buy T3 on the Market" },
        { name: "Use 6 Gold Tokens for everything", cost: path4_6TokensPure, details: "Pure Gold Token strategy" }
    ];

    options.sort((a, b) => a.cost - b.cost);
    const optimalChoice = options[0];

    const shrineFee = 150000;
    const finalAbsoluteTotal = optimalChoice.cost + shrineFee;
    const perHourCost = finalAbsoluteTotal / 20;

    document.getElementById('outMarketTotal').innerText = path1_PureMarket.toLocaleString() + " gp";
    document.getElementById('outTokenTotal').innerText = path4_6TokensPure.toLocaleString() + " gp";
    document.getElementById('outAbsoluteTotal').innerText = finalAbsoluteTotal.toLocaleString() + " gp";
    document.getElementById('outPerHour').innerText = Math.round(perHourCost).toLocaleString() + " gp / h";

    document.getElementById('outRecommendation').innerText =
        `${optimalChoice.name} (${optimalChoice.details}). Total item cost: ${optimalChoice.cost.toLocaleString()} gp.`;
}

function addTrackedImbuement() {
    const selector = document.getElementById('trackSelector');
    const selectedKey = selector.value;

    // Guard break if placeholder or null triggers
    if (!selectedKey) return;

    if (!trackedImbs.includes(selectedKey)) {
        trackedImbs.push(selectedKey);
        localStorage.setItem('tibialy_tracked_imbs', JSON.stringify(trackedImbs));
        renderTrackedList();
    }

    // Reset the selector back to the hidden default placeholder
    selector.value = "";
}

function removeTrackedImbuement(key) {
    trackedImbs = trackedImbs.filter(item => item !== key);
    localStorage.setItem('tibialy_tracked_imbs', JSON.stringify(trackedImbs));

    // Clear dead key caches inside temporary memory
    delete liveQuantities[key + '_t1'];
    delete liveQuantities[key + '_t2'];
    delete liveQuantities[key + '_t3'];

    renderTrackedList();
}

function handleQuantityChange(key, tier, value) {
    liveQuantities[`${key}_${tier}`] = Math.max(0, parseInt(value) || 0);
}

function renderTrackedList() {
    const container = document.getElementById('trackedListContainer');
    if (!container) return;

    if (trackedImbs.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 text-center text-sm text-theme-text-dim border border-dashed border-theme-border-base rounded-lg bg-theme-bg-input/10">
                No imbuements currently selected for monitoring. Choose an entry above to start tracking shopping goals.
            </div>
        `;
        return;
    }

    let html = "";
    trackedImbs.forEach(key => {
        const data = shopPresets[key];
        if (!data) return;

        // Fetch values from memory to keep text nodes stateful during renders
        const val1 = liveQuantities[`${key}_t1`] || 0;
        const val2 = liveQuantities[`${key}_t2`] || 0;
        const val3 = liveQuantities[`${key}_t3`] || 0;

        html += `
        <div class="bg-theme-bg-input/20 p-4 rounded-lg border border-theme-border-light flex flex-col justify-between shadow-sm relative">
            <div>
                <div class="flex justify-between items-start mb-4 pr-6">
                    <h3 class="text-sm font-bold text-theme-text-white">${data.name}</h3>
                    <button onclick="removeTrackedImbuement('${key}')" class="absolute top-3 right-3 text-theme-text-dim hover:text-red-400 transition text-sm font-bold" title="Remove tracking text">✕</button>
                </div>

                <div class="space-y-3">
                    <div class="flex flex-col gap-1 bg-theme-bg-panel/40 p-2 rounded border border-theme-border-base/50">
                        <div class="flex justify-between text-xs text-theme-text-main">
                            <span class="truncate pr-1">${data.t1[0]}</span>
                            <span class="text-theme-text-dim shrink-0">Recipe: ${data.t1[1]}x</span>
                        </div>
                        <div class="flex items-center justify-between mt-1 border-t border-theme-border-base/30 pt-1">
                            <span class="text-[11px] text-theme-text-dim uppercase tracking-wider">To Buy:</span>
                            <input type="number" min="0" value="${val1}" oninput="handleQuantityChange('${key}', 't1', this.value)" class="w-20 p-0.5 px-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-right focus:outline-none focus:border-theme-accent-focus text-xs font-mono">
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 bg-theme-bg-panel/40 p-2 rounded border border-theme-border-base/50">
                        <div class="flex justify-between text-xs text-theme-text-main">
                            <span class="truncate pr-1">${data.t2[0]}</span>
                            <span class="text-theme-text-dim shrink-0">Recipe: ${data.t2[1]}x</span>
                        </div>
                        <div class="flex items-center justify-between mt-1 border-t border-theme-border-base/30 pt-1">
                            <span class="text-[11px] text-theme-text-dim uppercase tracking-wider">To Buy:</span>
                            <input type="number" min="0" value="${val2}" oninput="handleQuantityChange('${key}', 't2', this.value)" class="w-20 p-0.5 px-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-right focus:outline-none focus:border-theme-accent-focus text-xs font-mono">
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 bg-theme-bg-panel/40 p-2 rounded border border-theme-border-base/50">
                        <div class="flex justify-between text-xs text-theme-text-main">
                            <span class="truncate pr-1">${data.t3[0]}</span>
                            <span class="text-theme-text-dim shrink-0">Recipe: ${data.t3[1]}x</span>
                        </div>
                        <div class="flex items-center justify-between mt-1 border-t border-theme-border-base/30 pt-1">
                            <span class="text-[11px] text-theme-text-dim uppercase tracking-wider">To Buy:</span>
                            <input type="number" min="0" value="${val3}" oninput="handleQuantityChange('${key}', 't3', this.value)" class="w-20 p-0.5 px-1.5 bg-theme-bg-input rounded border border-theme-border-light text-theme-text-white text-right focus:outline-none focus:border-theme-accent-focus text-xs font-mono">
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", initImbuements);
