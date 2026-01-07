from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import asyncio
from datetime import datetime, timedelta
import logging

from .database import engine, Base, get_db, SystemMetric
from .monitor import SystemMonitor

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LiquidMonitor")
monitor = SystemMonitor()
logger = logging.getLogger("uvicorn")

# Serve Static Files
# app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("app/static/index.html")

@app.get("/api/containers")
def get_containers(db: Session = Depends(get_db)):
    return monitor.get_containers(db)

# Data Collection Background Task
async def collect_metrics_loop():
    while True:
        try:
            # Create a new session for this cycle
            db = SessionLocal()
            try:
                # Pass db to collect for alert checking
                data = monitor.collect(db=db) 
                
                # ... existing persistence logic ...
                metric = SystemMetric(
                    cpu_usage=data['cpu_usage'],
                    ram_usage=data['ram_usage'],
                    disk_usage=data['disk_percent'],
                    net_sent_speed=data['net_sent_speed'],
                    net_recv_speed=data['net_recv_speed'],
                    cpu_temp=data.get('cpu_temp')
                )
                db.add(metric)
                db.commit()
                
                # Cleanup old data (older than 30 days) - Run every 1 hour approximately
                if datetime.now().minute == 0 and datetime.now().second < 10:
                     cutoff = datetime.utcnow() - timedelta(days=30)
                     db.query(SystemMetric).filter(SystemMetric.timestamp < cutoff).delete()
                     
                     # Also cleanup old alerts (older than 7 days)
                     from .database import Alert
                     alert_cutoff = datetime.utcnow() - timedelta(days=7)
                     db.query(Alert).filter(Alert.timestamp < alert_cutoff).delete()
                     
                     db.commit()
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Error in metric collection: {e}")
        
        await asyncio.sleep(5)  # Collect every 5 seconds

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(collect_metrics_loop())

# API Endpoints

@app.get("/api/stats/current")
def get_current_stats():
    # Return live data directly from monitor to be snappy
    data = monitor.collect()
    return data

@app.get("/api/stats/history")
def get_history(period: str = "24h", db: Session = Depends(get_db)):
    # Determine cutoff based on period
    if period == "7d":
        cutoff = datetime.utcnow() - timedelta(days=7)
    elif period == "30d":
        cutoff = datetime.utcnow() - timedelta(days=30)
    else: # Default 24h
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
    metrics = db.query(SystemMetric).filter(SystemMetric.timestamp > cutoff).order_by(SystemMetric.timestamp.asc()).all()
    
    # Simple downsampling for long periods to avoid huge payloads
    # 24h = ~17k records (5s interval) -> return all or 1/5
    # 7d = ~120k records -> return 1/60 (every 5 mins)
    # 30d = ~500k records -> return 1/240 (every 20 mins)
    
    if period == "7d":
        return metrics[::60] 
    elif period == "30d":
        return metrics[::240]
        
    return metrics[::5] # Return 1 minute resolution for 24h
    # Actually current frontend behavior: 
    # Frontend handled 'downsampling' by taking modulus. 
    # Better to send less data from backend.
    # Let's verify existing logic: 5s interval.
    # 24h = 17280 points. Sending all is heavy.
    # ::12 = every 60s. 1440 points for 24h. Reasonable.

@app.get("/api/alerts")
def get_alerts(limit: int = 50, db: Session = Depends(get_db)):
    from .database import Alert
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()
    return alerts

@app.post("/api/alerts/clear")
def clear_alerts(db: Session = Depends(get_db)):
    from .database import Alert
    try:
        db.query(Alert).delete()
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.get("/api/stats/peaks")
def get_peaks(db: Session = Depends(get_db)):
    # Find max values in last 24h
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    def get_max(field):
        record = db.query(SystemMetric).filter(SystemMetric.timestamp > cutoff).order_by(field.desc()).first()
        # Append 'Z' to indicate UTC time so frontend can convert to local
        return {"value": getattr(record, field.name), "timestamp": record.timestamp.isoformat() + "Z"} if record else None

    return {
        "cpu_peak": get_max(SystemMetric.cpu_usage),
        "ram_peak": get_max(SystemMetric.ram_usage),
        "temp_peak": get_max(SystemMetric.cpu_temp),
        "net_down_peak": get_max(SystemMetric.net_recv_speed),
        "net_up_peak": get_max(SystemMetric.net_sent_speed),
        "net_total_down": db.query(func.sum(SystemMetric.net_recv_speed)).filter(SystemMetric.timestamp > cutoff).scalar() or 0.0,
        "net_total_up": db.query(func.sum(SystemMetric.net_sent_speed)).filter(SystemMetric.timestamp > cutoff).scalar() or 0.0,
        # Note: net_recv_speed/sent_speed are in KB/s. Each record is 5 seconds approx.
        # But wait, monitor.collect() returns KB/s which is "average speed over the last check interval".
        # If we query every 5 seconds, speed * 5 = total KB in that interval.
        # So sum(speed) * 5 is roughly the total KB.
    }

# Mount static files *after* defining API to avoid conflicts if root was mounted
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
