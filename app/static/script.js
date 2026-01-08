// Auth Wrapper
async function fetchWithAuth(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    return res;
}


// Alert Modal Functions
function openAlertModal() {
    document.getElementById('alert-modal').classList.remove('hidden');
    // Fetch immediately when opened
    fetchAlerts(true);
}

function closeAlertModal() {
    document.getElementById('alert-modal').classList.add('hidden');
}

async function clearAlerts() {
    try {
        const res = await fetchWithAuth('/api/alerts/clear', { method: 'POST' });
        if (res.ok) {
            fetchAlerts(true);
        }
    } catch (e) {
        console.error("Clear alerts error", e);
    }
}

// Chart instances
let historyChart;
let networkChart;

// Initialize history chart (CPU, RAM, Temp)
function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU',
                    data: [],
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96, 165, 250, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#60a5fa',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'RAM',
                    data: [],
                    borderColor: '#c084fc',
                    backgroundColor: 'rgba(192, 132, 252, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#c084fc',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Sıcaklık',
                    data: [],
                    borderColor: '#f87171',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#f87171',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#d1d5db',
                        font: { size: 11, weight: '500' },
                        padding: 12,
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#f3f4f6',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    callbacks: {
                        title: function (context) {
                            return context[0].label;
                        },
                        label: function (context) {
                            let val = context.parsed.y.toFixed(1);
                            let unit = context.dataset.label === 'Sıcaklık' ? '°C' : '%';
                            return context.dataset.label + ': ' + val + unit;
                        }
                    },
                    itemSort: function (a, b) {
                        return b.raw - a.raw;
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 10 },
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    id: 'y',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 10 },
                        callback: function (value) {
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// Initialize network traffic chart
function initNetworkChart() {
    const ctx = document.getElementById('networkChart').getContext('2d');

    networkChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'İndirme',
                    data: [],
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#4ade80',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'Gönderme',
                    data: [],
                    borderColor: '#22d3ee',
                    backgroundColor: 'rgba(34, 211, 238, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#22d3ee',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#d1d5db',
                        font: { size: 11, weight: '500' },
                        padding: 12,
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#f3f4f6',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    callbacks: {
                        title: function (context) {
                            return context[0].label;
                        },
                        label: function (context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' MB/s';
                        }
                    },
                    itemSort: function (a, b) {
                        return b.raw - a.raw;
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 10 },
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 10 },
                        callback: function (value) {
                            return value.toFixed(1) + ' MB/s';
                        }
                    }
                }
            }
        }
    });
}

function formatTime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    let str = "";
    if (d > 0) str += `${d}g `;
    str += `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return str;
}

// Alert System State
const lastAlertTime = {
    cpu: 0,
    ram: 0,
    temp: 0,
    disk: 0
};
const ALERT_COOLDOWN = 300000; // 5 minutes in ms

function showToast(title, message, type = 'warning') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const id = 'toast-' + Date.now();
    const colors = type === 'critical'
        ? 'bg-red-500/10 border-red-500 text-red-100'
        : 'bg-yellow-500/10 border-yellow-500 text-yellow-100';

    // Critical: Red, Warning: Yellow
    const icon = type === 'critical'
        ? '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
        : '<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';

    const html = `
        <div id="${id}" class="pointer-events-auto transform transition-all duration-300 translate-x-full opacity-0 flex items-start gap-3 p-4 rounded-xl border ${colors} backdrop-blur-md shadow-lg min-w-[300px]">
            <div class="flex-shrink-0">
                ${icon}
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-sm mb-1">${title}</h4>
                <p class="text-xs opacity-90">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Animate in
    requestAnimationFrame(() => {
        const toast = document.getElementById(id);
        if (toast) {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }
    });

    // Auto dismiss
    setTimeout(() => {
        const toast = document.getElementById(id);
        if (toast) {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

function checkAlerts(data) {
    const now = Date.now();
    let highestStatus = 'normal'; // normal, warning, critical
    let statusMessage = 'Sistem Normal';

    const checkMetric = (key, value, name, unit) => {
        // Toast Checks (with cooldown)
        if (now - lastAlertTime[key] >= ALERT_COOLDOWN) {
            if (value >= 90) {
                showToast(`${name} Kritik Seviyede!`, `%${value.toFixed(1)} kullanımı ile kritik seviyeye ulaştı.`, 'critical');
                lastAlertTime[key] = now;
            } else if (value >= 80) {
                showToast(`${name} Uyarısı`, `%${value.toFixed(1)} kullanımı ile dikkat çekiyor.`, 'warning');
                lastAlertTime[key] = now;
            }
        }

        // Header Status Logic (Real-time, no cooldown)
        if (value >= 90) {
            if (highestStatus !== 'critical') { // Critical overrides everything
                highestStatus = 'critical';
                statusMessage = `KRİTİK: ${name} %${value.toFixed(1)}`;
            }
        } else if (value >= 80) {
            if (highestStatus === 'normal') { // Warning overrides normal
                highestStatus = 'warning';
                statusMessage = `Uyarı: ${name} %${value.toFixed(1)}`;
            }
        }
    };

    checkMetric('cpu', data.cpu_usage, 'CPU', '%');
    checkMetric('ram', data.ram_usage, 'RAM', '%');

    if (data.cpu_temp) {
        // Temperature logic: >85 Critical, >75 Warning
        const temp = data.cpu_temp;

        // Toast
        if (now - lastAlertTime.temp >= ALERT_COOLDOWN) {
            if (temp >= 85) {
                showToast(`Yüksek Sıcaklık!`, `${temp.toFixed(1)}°C ile işlemci çok ısındı.`, 'critical');
                lastAlertTime.temp = now;
            } else if (temp >= 75) {
                showToast(`Sıcaklık Artışı`, `${temp.toFixed(1)}°C sıcaklık seviyesi.`, 'warning');
                lastAlertTime.temp = now;
            }
        }

        // Header Status
        if (temp >= 85) {
            if (highestStatus !== 'critical') {
                highestStatus = 'critical';
                statusMessage = `KRİTİK: Sıcaklık ${temp.toFixed(1)}°C`;
            }
        } else if (temp >= 75) {
            if (highestStatus === 'normal') {
                highestStatus = 'warning';
                statusMessage = `Uyarı: Sıcaklık ${temp.toFixed(1)}°C`;
            }
        }
    }

    checkMetric('disk', data.disk_usage, 'Disk', '%');

    // Update Header UI
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');

    // Reset classes
    if (dot && text) {
        dot.className = 'w-2 h-2 rounded-full animate-pulse transition-colors duration-300';
        text.className = 'text-xs font-medium tracking-wide transition-colors duration-300';

        if (highestStatus === 'critical') {
            dot.classList.add('bg-red-500');
            text.classList.add('text-red-400', 'font-bold');
            text.innerText = statusMessage;
        } else if (highestStatus === 'warning') {
            dot.classList.add('bg-yellow-500');
            text.classList.add('text-yellow-400', 'font-bold');
            text.innerText = statusMessage;
        } else {
            dot.classList.add('bg-green-400');
            text.classList.add('text-gray-400');
            text.innerText = 'Sistem Normal';
        }
    }
}

async function updateStats() {
    try {
        const [currentRes, peaksRes] = await Promise.all([
            fetchWithAuth('/api/stats/current'),
            fetchWithAuth('/api/stats/peaks')
        ]);

        const current = await currentRes.json();
        const peaks = await peaksRes.json();

        // Check Alerts
        checkAlerts(current);

        // Update last update time
        const now = new Date();
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            lastUpdateEl.innerText = now.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        // Update Cards
        document.getElementById('cpu-val').innerText = `${current.cpu_usage.toFixed(1)}% `;
        document.getElementById('cpu-bar').style.width = `${current.cpu_usage}% `;

        document.getElementById('ram-val').innerText = `${current.ram_usage.toFixed(1)}% `;
        document.getElementById('ram-bar').style.width = `${current.ram_usage}% `;

        if (current.cpu_temp) {
            document.getElementById('temp-val').innerText = `${current.cpu_temp.toFixed(1)}°C`;
            const tempPercent = Math.min((current.cpu_temp / 85) * 100, 100);
            document.getElementById('temp-bar').style.width = `${tempPercent}% `;
        } else {
            document.getElementById('temp-val').innerText = "N/A";
        }

        document.getElementById('disk-val').innerText = `${current.disk_usage.toFixed(0)}%`;
        document.getElementById('disk-bar').style.width = `${current.disk_usage}%`;
        document.getElementById('disk-used').innerText = `${current.disk_used_gb} GB`;
        document.getElementById('disk-free').innerText = `${current.disk_free_gb} GB`;
        document.getElementById('disk-total').innerText = `${current.disk_total_gb} GB`;

        // Network (Convert KB/s to MB/s)
        const downMB = current.net_recv_speed / 1024;
        const upMB = current.net_sent_speed / 1024;

        document.getElementById('net-down').innerText = `${downMB.toFixed(2)} MB / s`;
        if (document.getElementById('net-down-val')) document.getElementById('net-down-val').innerText = `${downMB.toFixed(2)} MB / s`;

        document.getElementById('net-up').innerText = `${upMB.toFixed(2)} MB / s`;
        if (document.getElementById('net-up-val')) document.getElementById('net-up-val').innerText = `${upMB.toFixed(2)} MB / s`;

        // Peaks (Also convert to MB/s)
        // Peaks (Also convert to MB/s)
        const formatPeakTime = (ts) => {
            if (!ts) return '';
            return new Date(ts + 'Z').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        };

        if (peaks.cpu_peak) {
            const time = formatPeakTime(peaks.cpu_peak.timestamp);
            document.getElementById('cpu-peak').innerHTML = `${peaks.cpu_peak.value.toFixed(1)}% <span class="font-bold ml-1">${time}</span>`;
        }
        if (peaks.ram_peak) {
            const time = formatPeakTime(peaks.ram_peak.timestamp);
            document.getElementById('ram-peak').innerHTML = `${peaks.ram_peak.value.toFixed(1)}% <span class="font-bold ml-1">${time}</span>`;
        }
        if (peaks.temp_peak) {
            const time = formatPeakTime(peaks.temp_peak.timestamp);
            document.getElementById('temp-peak').innerHTML = `${peaks.temp_peak.value.toFixed(1)}°C <span class="font-bold ml-1">${time}</span>`;
        }
        if (peaks.net_down_peak) {
            const time = formatPeakTime(peaks.net_down_peak.timestamp);
            document.getElementById('peak-down').innerHTML = `${(peaks.net_down_peak.value / 1024).toFixed(2)} MB/s <span class="font-bold ml-1">${time}</span>`;
        }
        if (peaks.net_up_peak) {
            const time = formatPeakTime(peaks.net_up_peak.timestamp);
            document.getElementById('peak-up').innerHTML = `${(peaks.net_up_peak.value / 1024).toFixed(2)} MB/s <span class="font-bold ml-1">${time}</span>`;
        }

        // Totals (sum of speeds KB/s * 5s interval = Total KB)
        // Then KB -> GB ( / 1024 / 1024 )
        if (peaks.net_total_down !== undefined) {
            const totalDownGB = (peaks.net_total_down * 5) / (1024 * 1024); // speed(KB/s) * 5s -> KB -> MB -> GB
            document.getElementById('total-down-24h').innerText = `${totalDownGB.toFixed(2)} GB`;
        }
        if (peaks.net_total_up !== undefined) {
            const totalUpGB = (peaks.net_total_up * 5) / (1024 * 1024);
            document.getElementById('total-up-24h').innerText = `${totalUpGB.toFixed(2)} GB`;
        }

        // Uptime
        document.getElementById('uptime-display').innerText = formatTime(current.uptime);

    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

// Reliable Scheduling Pattern (prevents overlap and allows recovery from errors)
// Using .then/finally to ensure loop continues even if async function hangs or errors weirdly
async function scheduleUpdateStats() {
    try {
        await updateStats();
    } catch (e) {
        console.error("Scheduler error", e);
    } finally {
        setTimeout(scheduleUpdateStats, 5000);
    }
}

async function scheduleUpdateContainers() {
    try {
        await updateContainers();
    } finally {
        setTimeout(scheduleUpdateContainers, 5000);
    }
}

async function scheduleUpdateHistory() {
    try {
        await updateHistory();
    } finally {
        setTimeout(scheduleUpdateHistory, 60000);
    }
}

async function scheduleUpdateNetworkHistory() {
    try {
        await updateNetworkHistory();
    } finally {
        setTimeout(scheduleUpdateNetworkHistory, 60000);
    }
}

async function scheduleFetchAlerts() {
    try {
        await fetchAlerts(false);
    } finally {
        setTimeout(scheduleFetchAlerts, 10000);
    }
}

let historyPeriod = '24h';
let networkPeriod = '24h';

function setChartPeriod(type, period) {
    if (type === 'history') {
        if (historyPeriod === period) return;
        historyPeriod = period;
        updateHistory();
    } else if (type === 'network') {
        if (networkPeriod === period) return;
        networkPeriod = period;
        updateNetworkHistory();
    }

    // Update UI buttons specifically for this chart type
    // We assume buttons have data-type="history" or "network" and data-period="..."
    const buttons = document.querySelectorAll(`.period-btn[data-type="${type}"]`);
    buttons.forEach(btn => {
        if (btn.dataset.period === period) {
            btn.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
            btn.classList.remove('text-gray-400', 'hover:text-white', 'bg-transparent');
        } else {
            btn.classList.remove('bg-blue-500', 'text-white', 'shadow-sm');
            btn.classList.add('text-gray-400', 'hover:text-white', 'bg-transparent');
        }
    });
}

async function updateHistory() {
    try {
        const res = await fetchWithAuth(`/api/history?period=${historyPeriod}`);
        const data = await res.json();
        console.log(`History Data (${historyPeriod}):`, data.length, "records");

        // Downsample for performance if needed (Backend handles main downsampling now, but extra safety)
        const displayedData = data.length > 500 ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0) : data;

        const labels = displayedData.map(d => {
            // Append 'Z' to indicate UTC time if not present
            const ts = d.timestamp.endsWith('Z') ? d.timestamp : d.timestamp + 'Z';
            const date = new Date(ts);

            if (historyPeriod === '24h') {
                return date.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            } else {
                return date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            }
        });

        const cpuData = displayedData.map(d => d.cpu_usage);
        const ramData = displayedData.map(d => d.ram_usage);
        const tempData = displayedData.map(d => d.cpu_temp || 0);

        historyChart.data.labels = labels;
        historyChart.data.datasets[0].data = cpuData;
        historyChart.data.datasets[1].data = ramData;
        historyChart.data.datasets[2].data = tempData;

        historyChart.options.scales.x.ticks.callback = function (val, index) {
            const label = this.getLabelForValue(val);
            if (typeof label === 'string') {
                // Return only time for 24h, or Day+Time for long periods
                // But label is already formatted above.
                // Just prevent too long labels overlapping
                return label;
            }
            return label;
        };

        historyChart.update('none');
    } catch (e) {
        console.error("Update stats error", e);
    }
}

// Update network traffic history
async function updateNetworkHistory() {
    try {
        const res = await fetchWithAuth(`/api/history?period=${networkPeriod}`);
        const data = await res.json();

        const displayedData = data.length > 500 ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0) : data;

        const labels = displayedData.map(d => {
            const ts = d.timestamp.endsWith('Z') ? d.timestamp : d.timestamp + 'Z';
            const date = new Date(ts);

            if (networkPeriod === '24h') {
                return date.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            } else {
                return date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            }
        });

        const downData = displayedData.map(d => (d.net_recv_speed || 0) / 1024); // KB to MB
        const upData = displayedData.map(d => (d.net_sent_speed || 0) / 1024);   // KB to MB

        networkChart.data.labels = labels;
        networkChart.data.datasets[0].data = downData;
        networkChart.data.datasets[1].data = upData;

        networkChart.update('none');
    } catch (e) {
        console.error("Network history fetch error", e);
    }
}

// Container Logic
let containerData = [];
let sortCol = 'cpu';
let sortAsc = false;

async function fetchAlerts(isOpen = false) {
    try {
        const res = await fetchWithAuth('/api/alerts?limit=50');
        const alerts = await res.json();

        // Render to Modal if open or requested
        const alertList = document.getElementById('alert-list');
        if (alertList && (isOpen || !document.getElementById('alert-modal').classList.contains('hidden'))) {
            if (alerts.length === 0) {
                alertList.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">Hiç bildirim yok</div>';
                return;
            }

            let html = '';
            alerts.forEach(alert => {
                const date = new Date(alert.timestamp + 'Z'); // Ensure UTC parsing
                const timeStr = date.toLocaleString('tr-TR');

                let iconColor = 'text-blue-400';
                let iconBg = 'bg-blue-500/10';
                let icon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';

                if (alert.level === 'critical') {
                    iconColor = 'text-red-400';
                    iconBg = 'bg-red-500/10';
                    icon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>';
                } else if (alert.level === 'warning') {
                    iconColor = 'text-yellow-400';
                    iconBg = 'bg-yellow-500/10';
                    icon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>';
                }

                html += `
                    <div class="flex items-start gap-4 p-4 border-b border-gray-700/30 last:border-0 hover:bg-white/5 transition-colors">
                        <div class="shrink-0 w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center">
                            <svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${icon}
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start">
                                <p class="text-sm font-medium text-white break-words">${alert.message}</p>
                                <span class="text-xs text-gray-500 whitespace-nowrap ml-2">${timeStr}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            alertList.innerHTML = html;
        }

    } catch (e) {
        console.error("Alerts fetch error", e);
    }
}

async function updateContainers() {
    try {
        const res = await fetchWithAuth('/api/containers');
        const data = await res.json();
        containerData = data;

        // Cache data for instant load on refresh
        localStorage.setItem('cachedContainers', JSON.stringify(data));

        // Update count
        const activeCount = data.filter(c => c.state === 'running').length;
        document.getElementById('container-count').innerText = activeCount;

        // Check for top network users (> 100 KB/s)
        const THRESHOLD_BPS = 20480; // 20 KB/s - lowered to ensure visibility during testing

        let maxDown = 0;
        let topDownContainer = null;
        let maxUp = 0;
        let topUpContainer = null;

        // Client-side speed calculation for better reliability
        if (!window.lastContainerData) window.lastContainerData = {};
        const now = Date.now();

        data.forEach(c => {
            const cid = c.id;
            let derivedRxSpeed = 0;
            let derivedTxSpeed = 0;

            if (window.lastContainerData[cid]) {
                const last = window.lastContainerData[cid];
                const timeDelta = (now - last.timestamp) / 1000; // seconds

                if (timeDelta > 0 && timeDelta < 10) { // Avoid huge jumps if tab was sleeping
                    const rxDiff = c.net_rx - last.net_rx;
                    const txDiff = c.net_tx - last.net_tx;

                    if (rxDiff >= 0) derivedRxSpeed = rxDiff / timeDelta;
                    if (txDiff >= 0) derivedTxSpeed = txDiff / timeDelta;
                }
            }

            // Store current state
            window.lastContainerData[cid] = {
                timestamp: now,
                net_rx: c.net_rx,
                net_tx: c.net_tx
            };

            // Use derived speed if available (client-side), otherwise fallback to backend speed (server-side)
            // This ensures instant visibility on load/refresh while maintaining live updates
            const dlSpeed = derivedRxSpeed > 0 ? derivedRxSpeed : (Number(c.net_rx_speed) || 0);
            const ulSpeed = derivedTxSpeed > 0 ? derivedTxSpeed : (Number(c.net_tx_speed) || 0);

            // Debug
            // if (derivedTxSpeed > 0) console.log(c.name, "TX Speed:", derivedTxSpeed);

            if (dlSpeed > maxDown) {
                maxDown = dlSpeed;
                topDownContainer = c;
            }
            if (ulSpeed > maxUp) {
                maxUp = ulSpeed;
                topUpContainer = c;
            }
        });

        // Debug: Check if we are finding anything
        // console.log("MaxDL:", maxDown, "Container:", topDownContainer?.name);
        // console.log("MaxUL:", maxUp, "Container:", topUpContainer?.name);

        // Update UI for Top Downloader
        const downEl = document.getElementById('top-dl-container');
        if (downEl) {
            if (topDownContainer && maxDown > THRESHOLD_BPS) {
                const speedMB = (maxDown / 1024 / 1024).toFixed(2);
                downEl.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> ${topDownContainer.name} (${speedMB} MB/s)`;
                downEl.classList.remove('hidden');
            } else {
                downEl.classList.add('hidden');
            }
        }

        // Update UI for Top Uploader
        const upEl = document.getElementById('top-ul-container');
        if (upEl) {
            if (topUpContainer && maxUp > THRESHOLD_BPS) {
                const speedMB = (maxUp / 1024 / 1024).toFixed(2);
                upEl.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> ${topUpContainer.name} (${speedMB} MB/s)`;
                upEl.classList.remove('hidden');
            } else {
                upEl.classList.add('hidden');
            }
        }

        renderContainers();
    } catch (e) {
        console.error("Container fetch error", e);
    }
}

function sortContainers(col) {
    if (sortCol === col) {
        sortAsc = !sortAsc;
    } else {
        sortCol = col;
        sortAsc = false; // Default desc for metrics (cpu, ram), asc for name? usually desc is better for metrics
        if (col === 'name' || col === 'state') sortAsc = true;
    }
    renderContainers();
}

function renderContainers() {
    const tbody = document.getElementById('container-list');
    if (!tbody) return;

    // Check if we have data
    if (containerData.length === 0) {
        // Keep loading state if really no data
        return;
    }

    // Sort
    const sorted = [...containerData].sort((a, b) => {
        let valA, valB;
        switch (sortCol) {
            case 'name': valA = a.name; valB = b.name; break;
            case 'state': valA = a.state; valB = b.state; break;
            case 'cpu': valA = a.cpu_percent; valB = b.cpu_percent; break;
            case 'mem': valA = a.memory_percent; valB = b.memory_percent; break;
            case 'net_down': valA = a.net_rx || 0; valB = b.net_rx || 0; break;
            case 'net_up': valA = a.net_tx || 0; valB = b.net_tx || 0; break;
            case 'ram_usage': valA = a.memory_usage || 0; valB = b.memory_usage || 0; break;
            default: valA = a.cpu_percent; valB = b.cpu_percent;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    let html = '';
    sorted.forEach(c => {
        const statusColor = c.state === 'running' ? 'text-green-400' : 'text-gray-400';
        const cpuColor = c.cpu_percent > 50 ? 'text-red-400' : (c.cpu_percent > 20 ? 'text-yellow-400' : 'text-gray-300');

        html += `
            <tr class="hover:bg-gray-700/30 transition-colors border-b border-gray-800 last:border-0">
                <td class="px-4 py-3 font-medium text-white">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${c.state === 'running' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}"></div>
                        ${c.name}
                    </div>
                     <div class="text-xs text-gray-500 pl-4">${c.id}</div>
                </td>
                <td class="px-4 py-3 ${statusColor}">${c.state}</td>
                <td class="px-4 py-3 font-mono ${cpuColor}">
                    ${c.cpu_percent.toFixed(2)}%
                    <div class="w-16 h-1 bg-gray-700 rounded-full mt-1">
                        <div class="h-full rounded-full ${c.cpu_percent > 50 ? 'bg-red-500' : 'bg-blue-500'}" style="width: ${Math.min(c.cpu_percent, 100)}%"></div>
                    </div>
                </td>
                <td class="px-4 py-3 font-mono">
                    ${c.memory_percent.toFixed(1)}%
                    <div class="w-16 h-1 bg-gray-700 rounded-full mt-1">
                        <div class="h-full rounded-full bg-purple-500" style="width: ${Math.min(c.memory_percent, 100)}%"></div>
                    </div>
                </td>
                <td class="px-4 py-3 text-right font-mono text-xs text-gray-400">
                    <div>↓ ${(c.net_rx / 1024 / 1024).toFixed(1)} MB</div>
                </td>
                <td class="px-4 py-3 text-right font-mono text-xs text-gray-400">
                    <div>↑ ${(c.net_tx / 1024 / 1024).toFixed(1)} MB</div>
                </td>
                <td class="px-4 py-3 text-right font-mono text-xs text-gray-400">
                    <div>${(c.memory_usage / 1024 / 1024).toFixed(0)} MB</div>
                    <div class="text-gray-600">/ ${(c.memory_limit / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    // Try to load cached data for instant render
    const cached = localStorage.getItem('cachedContainers');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (Array.isArray(data) && data.length > 0) {
                containerData = data;
                // Update count immediately
                const activeCount = data.filter(c => c.state === 'running').length;
                const countEl = document.getElementById('container-count');
                if (countEl) countEl.innerText = activeCount;

                renderContainers();
            }
        } catch (e) {
            console.error("Cache load error", e);
        }
    }

    initChart();
    initNetworkChart();

    // Start live clock
    function updateClock() {
        const now = new Date();
        const clockEl = document.getElementById('system-clock');
        if (clockEl) {
            clockEl.innerText = now.toLocaleString('tr-TR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Reliable Scheduling Pattern (prevents overlap and allows recovery from errors)
    async function scheduleUpdateStats() {
        await updateStats();
        setTimeout(scheduleUpdateStats, 5000);
    }

    async function scheduleUpdateContainers() {
        await updateContainers();
        setTimeout(scheduleUpdateContainers, 5000);
    }

    async function scheduleUpdateHistory() {
        await updateHistory();
        setTimeout(scheduleUpdateHistory, 60000);
    }

    async function scheduleUpdateNetworkHistory() {
        await updateNetworkHistory();
        setTimeout(scheduleUpdateNetworkHistory, 60000);
    }

    async function scheduleFetchAlerts() {
        await fetchAlerts(false);
        setTimeout(scheduleFetchAlerts, 10000);
    }

    // Start Loops
    scheduleUpdateStats();
    scheduleUpdateContainers();
    scheduleUpdateHistory();
    scheduleUpdateNetworkHistory();
    scheduleFetchAlerts();
});

