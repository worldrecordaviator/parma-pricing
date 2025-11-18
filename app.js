//--------------------------------------------
//  LOAD NDJSON (one JSON object per line)
//--------------------------------------------
async function loadNDJSON(path) {
    const res = await fetch(path);
    const txt = await res.text();

    return txt
        .trim()
        .split("\n")
        .map(line => JSON.parse(line));
}

//--------------------------------------------
//  GLOBAL STATE
//--------------------------------------------
let shamrockItems = [];
let usfoodsItems  = [];
let matches       = {};
let filterState   = "all";

//--------------------------------------------
//  SAVE / LOAD PROGRESS
//--------------------------------------------
function loadProgress() {
    const saved = localStorage.getItem("matches");
    if (saved) matches = JSON.parse(saved);
}

function saveProgress() {
    localStorage.setItem("matches", JSON.stringify(matches));
}

//--------------------------------------------
//  LOAD DATA (FIXED ABSOLUTE PATHS FOR GITHUB PAGES)
//--------------------------------------------
async function loadData() {
    shamrockItems = await loadNDJSON("/parma-food-matcher/data/shamrock.json");
    usfoodsItems  = await loadNDJSON("/parma-food-matcher/data/usfoods.json");

    loadProgress();
    updateCounts();
    renderList();
}

//--------------------------------------------
//  FUZZY SCORE
//--------------------------------------------
function scoreMatch(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    let score = 0;

    a.split(/[\s,-]+/).forEach(w => {
        if (b.includes(w)) score++;
    });

    return score;
}

//--------------------------------------------
//  FIND BEST MATCHES
//--------------------------------------------
function findBestMatches(desc) {
    let scored = usfoodsItems.map(u => ({
        item: u,
        score: scoreMatch(desc, u.description)
    }));

    scored = scored.filter(s => s.score > 0);
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5);
}

//--------------------------------------------
//  UPDATE COUNTS (header boxes)
//--------------------------------------------
function updateCounts() {
    const total   = shamrockItems.length;
    const matched = Object.keys(matches).filter(id => matches[id] && matches[id] !== null).length;
    const noMatch = Object.keys(matches).filter(id => matches[id] === null).length;
    const pending = total - matched - noMatch;

    document.getElementById("count-shamrock").innerText = total;
    document.getElementById("count-matched").innerText  = matched;
    document.getElementById("count-no-match").innerText = noMatch;
    document.getElementById("count-pending").innerText  = pending;
}

//--------------------------------------------
//  RENDER LIST
//--------------------------------------------
function renderList() {
    const list = document.getElementById("list");
    list.innerHTML = "";

    shamrockItems.forEach(item => {
        const sid = item.id;
        const current = matches[sid];

        if (filterState === "matched" && !current) return;
        if (filterState === "pending" && current !== undefined) return;
        if (filterState === "nomatch" && current !== null) return;

        const row = document.createElement("div");
        row.className = "item-row";

        let html = `<div class="left"><strong>${item.description}</strong></div>`;
        html += `<div class="right">`;

        if (current === undefined) {
            const best = findBestMatches(item.description);

            if (best.length === 0) {
                html += `<button onclick="markNoMatch(${sid})" class="nomatch">No Match</button>`;
            } else {
                html += best.map(b =>
                    `<button onclick="selectMatch(${sid}, ${b.item.id})">${b.item.description}</button>`
                ).join("");

                html += `<button onclick="markNoMatch(${sid})" class="nomatch">No Match</button>`;
            }
        } else if (current === null) {
            html += `<span class="tag nomatch">No Match</span>`;
        } else {
            const u = usfoodsItems.find(x => x.id === current);
            html += `<span class="tag matched">${u.description}</span>`;
        }

        html += `</div>`;
        row.innerHTML = html;
        list.appendChild(row);
    });
}

//--------------------------------------------
//  ACTIONS
//--------------------------------------------
function selectMatch(sid, uid) {
    matches[sid] = uid;
    saveProgress();
    updateCounts();
    renderList();
}

function markNoMatch(sid) {
    matches[sid] = null;
    saveProgress();
    updateCounts();
    renderList();
}

function clearSavedProgress() {
    if (confirm("Clear ALL saved matches?")) {
        matches = {};
        localStorage.removeItem("matches");
        updateCounts();
        renderList();
    }
}

//--------------------------------------------
//  FILTER
//--------------------------------------------
function setFilter(f) {
    filterState = f;
    renderList();
}

//--------------------------------------------
//  EXPORT JSON
//--------------------------------------------
function exportJSON() {
    const blob = new Blob(
        [JSON.stringify(matches, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "matches.json";
    a.click();
}

//--------------------------------------------
//  EXPORT CSV
//--------------------------------------------
function exportCSV() {
    let rows = [["shamrock_id", "usfoods_id"]];

    shamrockItems.forEach(item => {
        rows.push([item.id, matches[item.id] ?? ""]);
    });

    let csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "matches.csv";
    a.click();
}

//--------------------------------------------
//  IMPORT JSON
//--------------------------------------------
function importJSONFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            matches = JSON.parse(reader.result);
            saveProgress();
            updateCounts();
            renderList();
        };
        reader.readAsText(file);
    };

    input.click();
}

//--------------------------------------------
//  INIT
//--------------------------------------------
document.addEventListener("DOMContentLoaded", loadData);
