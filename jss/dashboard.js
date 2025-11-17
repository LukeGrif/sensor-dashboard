// jss/dashboard.js
// Main script for the Sensor Dashboard page

(() => {
    "use strict";

    // ====== Configuration ======
    const USER = "LukeGrif";
    const GIST_ID = "188dc885b3eddb2941c08042185fbe61";

    const RAW_LATEST = `https://gist.githubusercontent.com/${USER}/${GIST_ID}/raw/latest.json`;
    const RAW_HISTORY = `https://gist.githubusercontent.com/${USER}/${GIST_ID}/raw/history.json`;

    // ====== DOM elements ======
    const connStatusEl = document.getElementById("connStatus");
    const curTempEl = document.getElementById("curTemp");
    const curTimeEl = document.getElementById("curTime");
    const chartCanvas = document.getElementById("tempChart");

    // ====== Chart setup ======
    const labels = [];
    const temps = [];

    const tempChart = new Chart(chartCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Temperature (°C)",
                    data: temps,
                    borderWidth: 2,
                    tension: 0.3,
                    borderColor: "rgb(75, 192, 192)",
                    pointBackgroundColor: "rgb(75, 192, 192)",
                    fill: false
                }
            ]
        },
        options: {
            animation: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "°C" }
                },
                x: {
                    title: { display: true, text: "Time" }
                }
            }
        }
    });

    // ====== Utilities ======
    async function fetchJSON(url) {
        const sep = url.includes("?") ? "&" : "?";
        const response = await fetch(`${url}${sep}t=${Date.now()}`, {
            cache: "no-store"
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return response.json();
    }

    function pushPoint(timestampISO, temperatureC) {
        const date = new Date(timestampISO);
        const label = date.toLocaleTimeString();

        labels.push(label);
        temps.push(Number(temperatureC));

        // Keep only last 10 points
        if (labels.length > 10) {
            labels.shift();
            temps.shift();
        }

        tempChart.update();

        curTempEl.textContent = Number(temperatureC).toFixed(1);
        curTimeEl.textContent = date.toLocaleString();
    }

    function setLiveStatus(isLive) {
        if (isLive) {
            connStatusEl.textContent = "Live";
            connStatusEl.className = "badge bg-success live-badge";
        } else {
            connStatusEl.textContent = "Reconnecting…";
            connStatusEl.className = "badge bg-warning text-dark live-badge";
        }
    }

    // ====== Data loading ======
    async function loadHistory() {
        try {
            const history = await fetchJSON(RAW_HISTORY);

            history.sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );

            const last10 = history.slice(-10);
            last10.forEach((point) =>
                pushPoint(point.timestamp, point.temperature)
            );

            setLiveStatus(true);
        } catch (error) {
            console.warn("No history yet, will start from latest.", error);
            setLiveStatus(false);
        }
    }

    let lastTimestamp = null;

    async function pollLatest() {
        try {
            const latest = await fetchJSON(RAW_LATEST);
            const { temperature, timestamp } = latest;

            if (!lastTimestamp || timestamp !== lastTimestamp) {
                lastTimestamp = timestamp;
                pushPoint(timestamp, temperature);
            }

            setLiveStatus(true);
        } catch (error) {
            console.error("Latest fetch error:", error);
            setLiveStatus(false);
        }
    }

    // ====== Map setup ======
    function initMap() {
        const UL_COORDS = [52.67379030817894, -8.571973008720438];

        const map = L.map("ul-map", { worldCopyJump: true });
        map.setView(UL_COORDS, 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const marker = L.marker(UL_COORDS).addTo(map);
        marker.bindPopup(
            "<strong>Simulated Live Location</strong><br/>Castletroy, Limerick, Ireland"
        );
    }

    // ====== Init ======
    async function init() {
        // Chart data
        await loadHistory();
        await pollLatest();
        setInterval(pollLatest, 10000);

        // Map
        initMap();
    }

    // Run once DOM is ready (script is at end of body, but this is safe)
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
