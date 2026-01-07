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

async function updateStats() {
    try {
        const [currentRes, peaksRes] = await Promise.all([
            fetch('/api/stats/current'),
            fetch('/api/stats/peaks')
        ]);

        const current = await currentRes.json();
        const peaks = await peaksRes.json();

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
        const formatPeakTime = (ts) => {
            if (!ts) return '';
            return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        };

        if (peaks.cpu_peak) {
            const time = formatPeakTime(peaks.cpu_peak.timestamp);
            document.getElementById('cpu-peak').innerText = `${peaks.cpu_peak.value.toFixed(1)}% @${time} `;
        }
        if (peaks.ram_peak) {
            const time = formatPeakTime(peaks.ram_peak.timestamp);
            document.getElementById('ram-peak').innerText = `${peaks.ram_peak.value.toFixed(1)}% @${time} `;
        }
        if (peaks.temp_peak) {
            const time = formatPeakTime(peaks.temp_peak.timestamp);
            document.getElementById('temp-peak').innerText = `${peaks.temp_peak.value.toFixed(1)}°C @${time} `;
        }
        if (peaks.net_down_peak) {
            const time = formatPeakTime(peaks.net_down_peak.timestamp);
            document.getElementById('peak-down').innerText = `${(peaks.net_down_peak.value / 1024).toFixed(2)} MB / s @${time} `;
        }
        if (peaks.net_up_peak) {
            const time = formatPeakTime(peaks.net_up_peak.timestamp);
            document.getElementById('peak-up').innerText = `${(peaks.net_up_peak.value / 1024).toFixed(2)} MB / s @${time} `;
        }

        // Uptime
        document.getElementById('uptime-display').innerText = formatTime(current.uptime);

    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

async function updateHistory() {
    try {
        const res = await fetch('/api/stats/history');
        const data = await res.json();

        // Downsample for performance if needed
        const displayedData = data.length > 500 ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0) : data;

        const labels = displayedData.map(d => {
            // Append 'Z' to indicate UTC time if not present
            const ts = d.timestamp.endsWith('Z') ? d.timestamp : d.timestamp + 'Z';
            const date = new Date(ts);
            return date.toLocaleString('tr-TR', {
                hour: '2-digit', minute: '2-digit'
            });
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
                return label.split(' ').slice(-1)[0].substring(0, 5);
            }
            return label;
        };

        historyChart.update('none');
    } catch (e) {
        console.error("History fetch error", e);
    }
}

// Update network traffic history
async function updateNetworkHistory() {
    try {
        const res = await fetch('/api/stats/history');
        const data = await res.json();

        const displayedData = data.length > 500 ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0) : data;

        const labels = displayedData.map(d => {
            // Append 'Z' to indicate UTC time if not present
            const ts = d.timestamp.endsWith('Z') ? d.timestamp : d.timestamp + 'Z';
            const date = new Date(ts);
            return date.toLocaleString('tr-TR', {
                hour: '2-digit', minute: '2-digit'
            });
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

async function updateContainers() {
    try {
        const res = await fetch('/api/containers');
        const data = await res.json();
        containerData = data;

        // Update count
        const activeCount = data.filter(c => c.state === 'running').length;
        document.getElementById('container-count').innerText = activeCount;

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
    initChart();
    initNetworkChart();
    updateStats();
    updateHistory();
    updateNetworkHistory();
    updateContainers();
    setInterval(updateStats, 5000);
    setInterval(updateContainers, 5000);
    setInterval(updateHistory, 60000);
    setInterval(updateNetworkHistory, 60000);
});
