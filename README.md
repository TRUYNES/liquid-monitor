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

### Using Docker Compose (Recommended)

1.  Clone the repository:
    ```bash
    git clone https://github.com/TRUYNES/liquid-monitor.git monitorx
    cd monitorx
    ```

2.  Start the service:
    ```bash
    docker-compose up -d --build
    ```

3.  Access the dashboard at `http://localhost:9876`
    *   **Default User:** `admin`
    *   **Default Pass:** `admin`

### Configuration

You can change credentials and other settings in `docker-compose.yml`:

```yaml
services:
  monitorx:
    image: monitorx
    environment:
      - MONITOR_USER=myuser
      - MONITOR_PASS=mypassword
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    network_mode: host # Recommended for accurate host metrics
```

## 🛠️ Tech Stack

*   **Backend:** Python (FastAPI, Psutil, SQLAlchemy)
*   **Frontend:** HTML5, Vanilla JS, TailwindCSS, Chart.js
*   **Database:** SQLite (Embedded, no setup required)

## 📸 Screenshots

*(Screenshots can be added here)*

## 📜 License

MIT License. Feel free to fork and modify!
