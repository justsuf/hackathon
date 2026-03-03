// Simple card pool – add whatever you want here.
const CARD_POOL = [
    { id: 1, name: "De kus",      baseRarity: "common", image: "../Assets/de-kus.jpg" },
    { id: 2, name: "Stadshuis",   baseRarity: "common", image: "../Assets/stadshuis.jpg" },
    { id: 3, name: "Man en hert", baseRarity: "common", image: "../Assets/hertenjager.jpg" },
    { id: 4, name: "tun tun tun sahur", baseRarity: "rare", image: "../Assets/tuntun.jpg" },
    { id: 5, name: "67", baseRarity: "common", image: "../Assets/67.jpg" },
    { id: 6, name: "Eikenboom", baseRarity: "common", image: "../Assets/eikenboom.jpg" },
    { id: 7, name: "Koolmees", baseRarity: "common", image: "../Assets/koolmees.jpg" },
    { id: 8, name: "Paddenstoel", baseRarity: "common", image: "../Assets/paddenstoel.jpg" },
];

// make sure any backslashes are converted and
// paths are relative to the HTML file (not the JS file)
CARD_POOL.forEach(c => {
    if (c.image) {
        c.image = c.image.replace(/\\/g, '/');
        // if you keep your images alongside the Html folder, the ../ prefix
        // above is required; adjust as needed.
    }
});

const CARD_COST = 10;
const UPGRADE_THRESHOLDS = { common: 3, epic: 5 };
const NEXT_RARITY = { common: "epic", epic: "legendary" };

const MAX_DUPLICATES = 10;      // maximum copies kept in inventory
const SELL_PRICE    = 5;        // coins per extra copy


let coins = 0;                       // earned by walking routes etc.
const inventory = {};                // cardId -> { count, rarity }

// persist/load ------------------------------------------------
function saveState() {
    localStorage.setItem("coins", coins);
    localStorage.setItem("inventory", JSON.stringify(inventory));
}

function loadState() {
    const savedCoins = parseInt(localStorage.getItem("coins"), 10);
    if (!isNaN(savedCoins)) coins = savedCoins;
    const savedInv = localStorage.getItem("inventory");
    if (savedInv) {
        try {
            const obj = JSON.parse(savedInv);
            for (const k in obj) inventory[k] = obj[k];
        } catch (e) { console.warn("could not parse saved inventory", e); }
    }
}

// cap / selling -------------------------------------------------
function enforceCap(entry) {
    if (entry.count > MAX_DUPLICATES) {
        const extras = entry.count - MAX_DUPLICATES;
        entry.count = MAX_DUPLICATES;
        const gained = extras * SELL_PRICE;
        coins += gained;
        alert(`Sold ${extras} duplicate(s) for ${gained} coins.`);
        saveState();
        renderCoins();
    }
}

function sellAllExtras() {
    let total = 0;
    for (const id in inventory) {
        const entry = inventory[id];
        if (entry.count > MAX_DUPLICATES) {
            total += entry.count - MAX_DUPLICATES;
            entry.count = MAX_DUPLICATES;
        }
    }
    if (total) {
        const gained = total * SELL_PRICE;
        coins += gained;
        alert(`Sold ${total} duplicate(s) for ${gained} coins.`);
        saveState();
        renderCoins();
        renderInventory();
    }
}

// call this from whatever code awards coins
function earnCoins(amount) {
    coins += amount;
    saveState();
    renderCoins();
}

function renderCoins() {
    document.getElementById("coin-count").textContent = coins;
}

function buyRandomCard() {
    if (coins < CARD_COST) {
        alert("Not enough coins");
        return;
    }
    coins -= CARD_COST;
    saveState();
    renderCoins();

    // pick a random card from the pool
    const card = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    addCard(card);
    renderInventory();
}

function addCard(card) {
    const entry = inventory[card.id] || { count: 0, rarity: card.baseRarity };
    entry.count += 1;
    inventory[card.id] = entry;
    checkUpgrade(card.id);
    enforceCap(entry);                      // auto‑sell extras over the cap
    if (entry.count === 0) delete inventory[card.id];
    saveState();
}

function checkUpgrade(cardId) {
    const entry = inventory[cardId];
    if (!entry) return;

    // only one step per call; avoids skipping epic when count starts ≥5
    if (entry.rarity in UPGRADE_THRESHOLDS &&
        entry.count >= UPGRADE_THRESHOLDS[entry.rarity]) {
        entry.rarity = NEXT_RARITY[entry.rarity];
    }
}

function getEntry(cardId) {
    // return a canonical object even if the user doesn’t own the card yet
    return inventory[cardId] || { count: 0, rarity: CARD_POOL.find(c=>c.id===cardId).baseRarity, missing: true };
}

// override renderInventory to build card‑style elements
function renderInventory() {
    const list = document.getElementById("inventory-list");
    list.innerHTML = "";
    for (const card of CARD_POOL) {
        const entry = getEntry(card.id);
        if (!entry) continue;
        const cardDiv = document.createElement("div");
        cardDiv.className = `card rarity-${entry.rarity}` + (entry.count === 0 ? " card-missing" : "");

        const img = document.createElement("img");
        img.className = "card-img-top";
        img.src = card.image || "";
        img.onerror = () => {
            img.style.background = "#333";
            img.style.display = "block";
        };
        if (!entry.missing) {           // only clickable if owned
            img.addEventListener("click", () => openModal(card.image || ""));
        }
        cardDiv.appendChild(img);

        const body = document.createElement("div");
        body.className = "card-body";

        const title = document.createElement("h6");
        title.className = "card-title";
        title.textContent = card.name;
        body.appendChild(title);

        const rarity = document.createElement("p");
        rarity.className = "card-text";
        rarity.textContent = entry.rarity;
        body.appendChild(rarity);

        const badge = document.createElement("span");
        badge.className = "badge bg-secondary rounded-pill";
        badge.textContent = entry.count;
        body.appendChild(badge);

        cardDiv.appendChild(body);
        list.appendChild(cardDiv);
    }
}

// modal functions
function openModal(imageSrc) {
    const modal = document.getElementById("card-modal");
    const img = document.getElementById("modal-image");
    img.src = imageSrc || "";
    modal.classList.add("open");
}

function closeModal() {
    const modal = document.getElementById("card-modal");
    modal.classList.remove("open");
}

document.addEventListener("DOMContentLoaded", () => {
    loadState();

    if (coins === 0) earnCoins(20);
    sellAllExtras();

    renderCoins();
    renderInventory();
    document.getElementById("buy-button")
            .addEventListener("click", buyRandomCard);
    const earnBtn = document.getElementById("earn-button");
    if (earnBtn) earnBtn.addEventListener("click", () => earnCoins(10));
    const sellBtn = document.getElementById("sell-button");
    if (sellBtn) sellBtn.addEventListener("click", sellAllExtras);

    // modal close handlers
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    const modal = document.getElementById("card-modal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }
});