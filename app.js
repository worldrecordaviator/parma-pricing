// ============================
//  LOAD JSON DATA
// ============================
async function loadData() {
    const shamrock = await fetch('./data/shamrock.json').then(r => r.json());
    const usfoods = await fetch('./data/usfoods.json').then(r => r.json());
    return { shamrock, usfoods };
}

// ============================
//  STATE
// ============================
let shamrockItems = [];
let usfoodsItems = [];
let matches = {}; // key = shamrockID → usfoodsID OR null

// ============================
//  LOAD SAVED PROGRESS
// ============================
function loadSavedProgress() {
    const saved = localStorage.getItem("matcher-progress");
    if (saved) {
        matches = JSON.parse(saved);
    }
}

// ============================
//  SAVE PROGRESS
// ============================
function saveProgress() {
    localStorage.setItem("matcher-progress", JSON.stringify(matches));
    updateStats();
    renderList();
}

// ============================
//  CLEAR SAVED PROGRESS
// ============================
function clearProgress() {
    if (confirm("Clear all saved matches?")) {
        localStorage.removeItem("matcher-progress");
        matches = {};
        renderList();
        updateStats();
    }
}

// ============================
//  INITIAL AUTO-MATCH LOGIC
// (simple fuzzy / contains matching)
// ============================
function autoMatch() {
    shamrockItems.forEach(s => {
        let sdesc = s.description.toLowerCase();

        // already manually matched? skip
        if (matches[s.id]) return;

        // best possible match (very basic)
        let best = usfoodsItems.find(u =>
            u.description.toLowerCase() === sdesc
        );

        if (!best) {
            best = usfoodsItems.find(u =>
                u.description.toLowerCase().includes(sdesc.substring(0, 10))
            );
        }

        matches[s.id] = best ? best.id : null;
    });
}

// ============================
//   UPDATE HEADER COUNTS
// ============================
function updateStats() {
    const total = shamrockItems.length;
    const matched = Object.values(matches).filter(v => v !== null && v !== "").length;
    const noMatch = Object.values(matches).filter(v => v === null).length;
    const pending = total - matched - noMatch;

    document.getElementById("stat-shamrock").textContent = total;
    document.getElementById("stat-matched").textContent = matched;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-no-match").textContent = noMatch;
}

// ============================
//   RENDER LIST
// ============================
function renderList(filter = "all") {
    const container = document.getElementById("item-list");
    container.innerHTML = "";

    shamrockItems.forEach(item => {
        const matchId = matches[item.id];
        const matchObj = usfoodsItems.find(u => u.id == matchId);

        let status =
            matchId === null ? "no-match" :
            matchId ? "matched" : "pending";

        if (filter !== "all" && filter !== status) return;

        let div = document.createElement("div");
        div.className = "item-row";

        div.innerHTML = `
            <div class="left">${item.description}</div>
            <div class="right">
                <select data-id="${item.id}">
                    <option value="">-- Select --</option>
                    ${usfoodsItems.map(u =>
                        `<option value="${u.id}" ${matchId == u.id ? "selected" : ""}>
                            ${u.description}
                        </option>`
                    ).join("")}
                    <option value="__nomatch__" ${matchId === null ? "selected" : ""}>
                        ❌ No Match
                    </option>
                </select>
            </div>
        `;

        container.appendChild(div);
    });

    // handle select change
    document.querySelectorAll('select').forEach(sel => {
        sel.addEventListener("change", event => {
            const sid = event.target.dataset.id;
            const val = event.target.value;

            if (val === "__nomatch__") {
                matches[sid] = null;
            } else if (val === "") {
                matches[sid] = "";
            } else {
                matches[sid] = parseInt(val);
            }

            saveProgress();
        });
    });
}

// ============================
//   EXPORT JSON
// ============================
function exportJSON() {
    const blob = new Blob([JSON.stringify(matches, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "matches.json";
    a.click();
}

// ============================
//   EXPORT CSV
// ============================
function exportCSV() {
    let csv = "ShamrockID,ShamrockDescription,USFoodsID,USFoodsDescription\n";

    shamrockItems.forEach(s => {
        const usID = matches[s.id];
        const usDesc = usfoodsItems.find(u => u.id == usID)?.description || "";

        csv += `"${s.id}","${s.description}","${usID || ""}","${usDesc}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "matches.csv";
    a.click();
}

// ============================
//   FILTER BUTTONS
// ============================
function setupFilters() {
    document.getElementById("btn-all").onclick = () => renderList("all");
    document.getElementById("btn-pending").onclick = () => renderList("pending");
    document.getElementById("btn-matched").onclick = () => renderList("matched");
    document.getElementById("btn-nomatch").onclick = () => renderList("no-match");
}

// ============================
//   INIT
// ============================
async function init() {
    loadSavedProgress();

    const data = await loadData();
    shamrockItems = data.shamrock;
    usfoodsItems = data.usfoods;

    // initial automatch for items not seen before
    autoMatch();

    updateStats();
    setupFilters();
    renderList("all");
}

init();
