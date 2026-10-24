const nameEl = document.getElementById("launch-name");
const countdownElement = document.getElementById("countdown");
const companyEl = document.getElementById("launch-company");
const imageEl = document.getElementById("launch-image");
const retryButton = document.getElementById("retry-button");
const launchList = document.getElementById("launch-list");
let countdownTimer;

if (retryButton) {
    retryButton.addEventListener("click", loadNextLaunch);
}

if (imageEl) {
    imageEl.addEventListener("error", () => {
        imageEl.hidden = true;
    });
}

async function fetchLaunches() {
    const isLocalHost =
        !location.hostname ||
        ["localhost", "127.0.0.1"].includes(location.hostname);
    let response;

    try {
        response = await fetch("/api/launches");
    } catch (err) {
        if (!isLocalHost) {
            throw err;
        }
    }

    const isJsonResponse = response?.headers
        .get("content-type")
        ?.includes("application/json");

    if (isLocalHost && (!response || !isJsonResponse)) {
        try {
            const fallbackUrl = new URL("http://localhost:3000/api/launches");
            response = await fetch(fallbackUrl);
        } catch {
            throw new Error(
                "Couldn't reach the launch API. Run `npm start` and open http://localhost:3000."
            );
        }
    }

    const hasJsonContentType = response?.headers
        .get("content-type")
        ?.includes("application/json");

    if (!response || !hasJsonContentType) {
        throw new Error(
            "The launch API returned a web page instead of data. Run `npm start` and open http://localhost:3000."
        );
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(
            data.error || `Launch request failed (${response.status})`
        );
    }

    return data;
}

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
        const data = await fetchLaunches();
        const launches =
            data.results
                ?.filter(
                    (launch) =>
                        launch.net && Date.parse(launch.net) > Date.now()
                )
                .sort(
                    (first, second) =>
                        Date.parse(first.net) - Date.parse(second.net)
                ) || [];
        const next = launches[0];

        if (!next) {
            throw new Error("No upcoming launches found");
        }

        retryButton.hidden = true;
        nameEl.textContent = next.name;
        companyEl.textContent =
            next.launch_service_provider?.name || "Company not listed";

        const image = next.image?.image_url || next.image?.thumbnail_url;
        if (image) {
            imageEl.src = image;
            imageEl.alt = next.image.name || `${next.name} rocket`;
            imageEl.hidden = false;
        }

        launchList.innerHTML =
            launches
                .slice(1, 7)
                .map((launch) => {
                    const launchTime = Date.parse(launch.net);
                    const operatorName =
                        launch.launch_service_provider?.name || "Unknown";
                    const formattedTime = new Date(launch.net).toLocaleString(
                        undefined,
                        {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "UTC",
                        }
                    );

                    return `
                        <tr>
                            <td>${escapeHtml(launch.name)}</td>
                            <td>${escapeHtml(operatorName)}</td>
                            <td>${formattedTime} UTC</td>
                            <td
                                class="board-countdown"
                                data-launch-time="${launchTime}"
                            ></td>
                        </tr>`;
                })
                .join("") ||
            '<tr><td colspan="4">No other launches scheduled.</td></tr>';

        startCountdown(new Date(next.net));
    } catch (err) {
        nameEl.textContent = "Launch information unavailable";
        countdownElement.textContent = err.message;
        launchList.innerHTML = `
            <tr>
                <td colspan="4">${escapeHtml(err.message)}</td>
            </tr>`;
        retryButton.hidden = false;
        console.error("Could not load launch data:", err);
    }
}

function escapeHtml(value) {
    const htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    return String(value).replace(
        /[&<>"']/g,
        (character) => htmlEscapes[character]
    );
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
        countdownElement.textContent = formatCountdown(diff);

        document.querySelectorAll(".board-countdown").forEach((cell) => {
            const launchTime = Number(cell.dataset.launchTime);
            cell.innerHTML = formatBoardCountdown(launchTime - Date.now());
        });
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
}

function formatCountdown(diff) {
    if (diff <= 0) {
        return "Launch time!";
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
}

function formatBoardCountdown(diff) {
    if (diff <= 0) {
        return '<span class="board-launched">LAUNCH TIME</span>';
    }

    const values = [
        [Math.floor(diff / 86400000), "D"],
        [Math.floor(diff / 3600000) % 24, "H"],
        [Math.floor(diff / 60000) % 60, "M"],
        [Math.floor(diff / 1000) % 60, "S"],
    ];

    const timeUnits = values
        .map(([value, unit]) => {
            const digits = String(value)
                .padStart(2, "0")
                .split("")
                .map((digit) => `<span class="board-digit">${digit}</span>`)
                .join("");

            return `
                <span class="board-time-unit">
                    <span class="board-digits">${digits}</span>
                    <span class="board-unit-label">${unit}</span>
                </span>`;
        })
        .join("");

    return `<span class="board-clock">${timeUnits}</span>`;
}

loadNextLaunch();
