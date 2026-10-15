const nameEl = document.getElementById("launch-name");
const countdownEL = document.getElementById("countdown");

async function loadNextLaunch() {
    try {
        const res = await fetch("/api/launches");
        if (!res.ok) throw new Error ("Request failed");
        const data = await res.json();

        const next = data.results[0];
        nameEl.textContent = next.name; 
        startCountdown(new Date(next.net));
    }
    catch (err) {
        nameEl.textContent = "Could not load launch data";
        console.error(err)
    }
}

function startCountdown(target) {
    function tick () {
        const diff = target - Date.now();
        if (diff <= 0){
            countdownEL.textContent = "Launch time!"
            return ;
        }
        const d = Math.floor( diff / 86400000 );
        const h = Math.floor( diff / 3600000 ) % 24;
        const m = Math.floor( diff / 60000 ) % 60
        co
    }
}