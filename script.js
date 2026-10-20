const nameEl = document.getElementById("launch-name");
const countdownEL = document.getElementById("countdown");
const companyEl = document.getElementById("launch-company");
const imageEl = document.getElementById("launch-image");
const retryButton = document.getElementById("retry-button");
const launchList = document.getElementById("launch-list");
let countdownTimer;

if (retryButton) {
    retryButton.addEventListener("click", loadNextLaunch);
}
if (imageEl) {
    imageEl.addEventListener("error", () => { imageEl.hidden = true; });
}

async function fetchLaunches() {
    const local = !location.hostname || ["localhost", "127.0.0.1"].includes(location.hostname);
    let res;
    try {
        res = await fetch("/api/launches");
    } catch (err) {
        if (!local) throw err;
    }

    if (local && (!res || !res.headers.get("content-type")?.includes("application/json"))) {
        try {
            const fallbackUrl = new URL("http://localhost:3000/api/launches");
            res = await fetch(fallbackUrl);
        } catch {
            throw new Error("Couldn't reach the launch API. Run `npm start` and open http://localhost:3000.");
        }
    }

    if (!res || !res.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The launch API returned a web page instead of data. Run `npm start` and open http://localhost:3000.");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Launch request failed (${res.status})`);
    return data;
}

async function loadNextLaunch() {
    try {
        const data = await fetchLaunches();
        const launches = data.results?.filter(launch => launch.net && Date.parse(launch.net) > Date.now())
            .sort((a, b) => Date.parse(a.net) - Date.parse(b.net)) || [];
        const next = launches[0];
        if (!next) throw new Error("No upcoming launches found");
        retryButton.hidden = true;
        nameEl.textContent = next.name; 
        companyEl.textContent = next.launch_service_provider?.name || "Company not listed";
        const image = next.image?.image_url || next.image?.thumbnail_url;
        if (image) {
            imageEl.src = image;
            imageEl.alt = next.image.name || `${next.name} rocket`;
            imageEl.hidden = false;
        }
        launchList.innerHTML = launches.slice(1, 7).map(launch => `
            <tr>
                <td>${escapeHtml(launch.name)}</td>
                <td>${escapeHtml(launch.launch_service_provider?.name || "Unknown")}</td>
                <td>${new Date(launch.net).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</td>
                <td class="board-countdown" data-launch-time="${Date.parse(launch.net)}"></td>
            </tr>`).join("") || '<tr><td colspan="4">No other launches scheduled.</td></tr>';
        startCountdown(new Date(next.net));
    }
    catch (err) {
        nameEl.textContent = "Launch information unavailable";
        countdownEL.textContent = err.message;
        launchList.innerHTML = `<tr><td colspan="4">${escapeHtml(err.message)}</td></tr>`;
        retryButton.hidden = false;
        console.error("Could not load launch data:", err);
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function startCountdown(target) {
    clearInterval(countdownTimer);
    function tick() {
        const diff = target - Date.now();
        countdownEL.textContent = formatCountdown(diff);
        document.querySelectorAll(".board-countdown").forEach(cell => {
            cell.innerHTML = formatBoardCountdown(Number(cell.dataset.launchTime) - Date.now());
        });
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
}

function formatCountdown(diff) {
    if (diff <= 0) return "Launch time!";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
}

function formatBoardCountdown(diff) {
    if (diff <= 0) return '<span class="board-launched">LAUNCH TIME</span>';
    const values = [
        [Math.floor(diff / 86400000), "D"],
        [Math.floor(diff / 3600000) % 24, "H"],
        [Math.floor(diff / 60000) % 60, "M"],
        [Math.floor(diff / 1000) % 60, "S"]
    ];
    return `<span class="board-clock">${values.map(([value, unit]) =>
        `<span class="board-time-unit"><span class="board-digits">${String(value).padStart(2, "0").split("").map(digit => `<span class="board-digit">${digit}</span>`).join("")}</span><span class="board-unit-label">${unit}</span></span>`
    ).join("")}</span>`;
}

loadNextLaunch()