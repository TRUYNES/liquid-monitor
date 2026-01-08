# MonitorX

<div align="center">
  <img src="app/static/logo.svg" alt="MonitorX Logo" width="100" height="100">
  
  <h3>Modern, Real-Time System & Docker Monitor</h3>
  <p>
    Glassmorphism UI • Real-time Metrics • Process Detection • Historical Data
  </p>
</div>

---

**MonitorX** is a lightweight, high-fidelity monitoring dashboard designed for Docker environments (especially on Raspberry Pi / Linux). It provides deep insights into system health, container performance, and network traffic with a stunning "Liquid Glass" interface.

## ✨ Features

*   **📊 Real-Time Dashboard:** CPU, RAM, Disk, and Network usage with smooth animations.
*   **🐳 Docker Integration:** Live stats for all running containers (CPU, RAM, Net I/O).
*   **🧠 Intelligent Alerts:**
    *   Detects high resource usage (CPU/RAM/Temp).
    *   **Auto-Detection:** Identifies *which* process or container is causing the load (e.g., *"High CPU: 85% (Culprit: ffmpeg 42%)"*).
    *   **Interactive History:** Click on the status indicator to view past alerts.
*   **📉 Historical Data:** 24h, 1 Week, and 1 Month charts for system metrics.
*   **🔐 Secure:** Built-in authentication with "Remember Me" functionality and secure session cookies.
*   **🕷️ Spyware-Free Network Stats:** Accurate network calculation that filters out virtual interfaces (veth/docker0) to show real physical traffic.

## 🚀 Quick Start

### Using Docker Compose / Dockge

**1. `docker-compose.yml`**

```yaml
version: '3.8'
services:
  monitorx:
    # image: monitorx 
    # Must build from source as there is no public image yet:
    build: .
    # Or if using Dockge/Portainer with git:
    # build: https://github.com/TRUYNES/liquid-monitor.git#main
    container_name: monitorx
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    environment:
      - PROCFS_PATH=${PROCFS_PATH}
      - SYSFS_PATH=${SYSFS_PATH}
      - MONITOR_USER=${MONITOR_USER}
      - MONITOR_PASS=${MONITOR_PASS}
    network_mode: host
    pid: host
    privileged: true
```

**2. `.env`**

```ini
MONITOR_USER=admin
MONITOR_PASS=admin
PROCFS_PATH=/host/proc
SYSFS_PATH=/host/sys
```

## 🛠️ Tech Stack

*   **Backend:** Python (FastAPI, Psutil, SQLAlchemy)
*   **Frontend:** HTML5, Vanilla JS, TailwindCSS, Chart.js
*   **Database:** SQLite (Embedded, no setup required)

## 📸 Screenshots

*(Screenshots can be added here)*

## 📜 License

MIT License. Feel free to fork and modify!
