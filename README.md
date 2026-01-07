# LiquidMonitor

> **Durum:** Kararlı Sürüme Geri Döndürüldü (Rollback to v1.0 Stable) - 07.01.2026

A modern, lightweight system monitoring tool for Raspberry Pi (and other Linux systems).
Features a Glassmorphism UI ("Liquid Glass"), 24-hour history charts, and peak usage tracking.

## Features
- **Real-time Stats**: CPU, RAM, Temperature, Disk, Network I/O.
- **24h History**: Interactive charts showing usage trends.
- **Peak Tracking**: Highlights the highest resource usage in the last 24 hours.
- **Glassmorphism UI**: Modern, sleek interface with animated backgrounds.
- **Dockerized**: Easy to deploy with Docker Compose / Dockge.

## Installation (Docker / Dockge)

1.  **Create a folder** for the project (e.g., `monitor`).
2.  **Copy `docker-compose.yml`** into that folder.
    - *Note*: If using Dockge, just paste the compose content into the Dockge UI.
3.  **Run the container**:
    ```bash
    docker-compose up -d
    ```

## Configuration
- Port: `8000` (mapped to host).
- Data: Metrics are stored in `data/monitor.db`. This is persisted via Docker volume.
- Host Metrics: The container maps `/proc` and `/sys` to read host statistics.

## Manual Run (Dev)
```bash
pip install -r requirements.txt
python -m app.main
```
Check http://localhost:8000
