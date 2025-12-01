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
    const chartTitleEl = document.getElementById("chartTitle");
    const btnLast10 = document.getElementById("btnLast10");
    const btnAll = document.getElementById("btnAll");


    // ====== Chart setup ======
    const labels = [];
    const temps = [];
    const fullHistory = []; // { timestamp, temperature, label }
    let showAllHistory = false; // false = last 10, true = all


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

    function updateChart() {
        // Clear existing chart data
        labels.length = 0;
        temps.length = 0;

        // Decide which data to show
        const dataToUse = showAllHistory
            ? fullHistory
            : fullHistory.slice(-10);

        dataToUse.forEach((point) => {
            labels.push(point.label);
            temps.push(point.temperature);
        });

        tempChart.update();

        // Update title text
        chartTitleEl.textContent = showAllHistory
            ? "Temperature (all readings)"
            : "Temperature (last 10 readings)";
    }

    function addPoint(timestampISO, temperatureC) {
        const date = new Date(timestampISO);
        const tempNum = Number(temperatureC);

        fullHistory.push({
            timestamp: timestampISO,
            temperature: tempNum,
            label: date.toLocaleTimeString()
        });

        // Refresh chart according to current mode
        updateChart();

        // Update "Now" and time display
        curTempEl.textContent = tempNum.toFixed(1);
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

    function setHistoryMode(showAll) {
        showAllHistory = showAll;

        // Button styling
        if (showAllHistory) {
            btnAll.classList.add("btn-primary");
            btnAll.classList.remove("btn-outline-primary");
            btnLast10.classList.add("btn-outline-primary");
            btnLast10.classList.remove("btn-primary");
        } else {
            btnLast10.classList.add("btn-primary");
            btnLast10.classList.remove("btn-outline-primary");
            btnAll.classList.add("btn-outline-primary");
            btnAll.classList.remove("btn-primary");
        }

        updateChart();
    }


    // ====== Data loading ======
    async function loadHistory() {
        try {
            const history = await fetchJSON(RAW_HISTORY);

            history.sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );

            history.forEach((point) =>
                addPoint(point.timestamp, point.temperature)
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
                addPoint(timestamp, temperature);
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

    async function init() {
        // Button click handlers
        btnLast10.addEventListener("click", () => setHistoryMode(false));
        btnAll.addEventListener("click", () => setHistoryMode(true));

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
