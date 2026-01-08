from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.security import APIKeyCookie
from sqlalchemy.orm import Session
from sqlalchemy import func
import asyncio
from datetime import datetime, timedelta
import logging
import os
from pydantic import BaseModel
from typing import Optional

from .database import engine, Base, get_db, SystemMetric, SessionLocal, Alert
from .monitor import SystemMonitor

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MonitorX")
monitor = SystemMonitor()
logger = logging.getLogger("uvicorn")

# --- Security Config ---
ADMIN_USER = os.getenv("MONITOR_USER", "admin")
ADMIN_PASS = os.getenv("MONITOR_PASS", "admin")
SECRET_COOKIE_NAME = "monitorx_session"

class LoginRequest(BaseModel):
    username: str
    password: str
    remember: bool = False

# Cookie dependency
cookie_scheme = APIKeyCookie(name=SECRET_COOKIE_NAME, auto_error=False)

async def get_current_user(cookie: str = Depends(cookie_scheme)):
    if not cookie or cookie != "authenticated":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return cookie

# --- Routes ---

# 1. Login Page
@app.get("/login")
async def login_page():
    return FileResponse("app/static/login.html")

# 2. Login Action
@app.post("/api/login")
async def login_action(data: LoginRequest, response: Response):
    if data.username == ADMIN_USER and data.password == ADMIN_PASS:
        # Create session
        max_age = 60 * 60 * 24 * 30 if data.remember else 60 * 60 * 24 # 30 days vs 1 day
        
        response.set_cookie(
            key=SECRET_COOKIE_NAME,
            value="authenticated",
            httponly=True, # Prevent JS access controls
            max_age=max_age,
            samesite="lax",
            secure=False # Set to True if using HTTPS
        )
        return {"status": "success"}
    
    raise HTTPException(status_code=401, detail="Hatalı kullanıcı adı veya şifre")

# 3. Logout
@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(key=SECRET_COOKIE_NAME)
    return {"status": "logged_out"}

# 4. Protected Home Page
@app.get("/")
async def root(request: Request):
    cookie = request.cookies.get(SECRET_COOKIE_NAME)
    if not cookie or cookie != "authenticated":
        return RedirectResponse(url="/login")
    return FileResponse("app/static/index.html")

# 5. Protected API Endpoints (Dependency Injection)
@app.get("/api/stats/current")
def get_current_stats(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... logic ...
    data = monitor.collect(db=db)
    return data

@app.get("/api/stats/peaks")
def get_peaks(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Last 24 hours
    since = datetime.utcnow() - timedelta(hours=24)
    
    # Helper to find peak
    def get_peak(model_field):
        return db.query(SystemMetric).filter(SystemMetric.timestamp >= since).order_by(model_field.desc()).first()

    cpu_peak = get_peak(SystemMetric.cpu_usage)
    ram_peak = get_peak(SystemMetric.ram_usage)
    temp_peak = get_peak(SystemMetric.cpu_temp)
    
    net_down_peak = get_peak(SystemMetric.net_recv_speed)
    net_up_peak = get_peak(SystemMetric.net_sent_speed)
    
    # Calculate Totals
    # Note: Accuracy depends on sampling frequency (here assuming 5s roughly)
    total_rx = db.query(func.sum(SystemMetric.net_recv_speed)).filter(SystemMetric.timestamp >= since).scalar() or 0
    total_tx = db.query(func.sum(SystemMetric.net_sent_speed)).filter(SystemMetric.timestamp >= since).scalar() or 0
    
    return {
        "cpu_peak": {"value": cpu_peak.cpu_usage, "timestamp": cpu_peak.timestamp} if cpu_peak else None,
        "ram_peak": {"value": ram_peak.ram_usage, "timestamp": ram_peak.timestamp} if ram_peak else None,
        "temp_peak": {"value": cpu_peak.cpu_temp, "timestamp": cpu_peak.timestamp} if cpu_peak and cpu_peak.cpu_temp else None,
        "net_down_peak": {"value": net_down_peak.net_recv_speed, "timestamp": net_down_peak.timestamp} if net_down_peak else None,
        "net_up_peak": {"value": net_up_peak.net_sent_speed, "timestamp": net_up_peak.timestamp} if net_up_peak else None,
        "net_total_down": total_rx,
        "net_total_up": total_tx
    }

@app.get("/api/history")
def get_history(period: str = "24h", user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    delta = timedelta(hours=24)
    if period == "1w": delta = timedelta(days=7)
    elif period == "1m": delta = timedelta(days=30)
    
    since = datetime.utcnow() - delta
    
    metrics = db.query(SystemMetric).filter(SystemMetric.timestamp >= since).order_by(SystemMetric.timestamp.asc()).all()
    
    if period == "7d" or period == "1w": # Handle '7d' or '1w'
        downsampled = metrics[::60]
        if metrics and (not downsampled or downsampled[-1].id != metrics[-1].id):
            downsampled.append(metrics[-1])
        return downsampled
    elif period == "30d" or period == "1m":
        downsampled = metrics[::240]
        if metrics and (not downsampled or downsampled[-1].id != metrics[-1].id):
            downsampled.append(metrics[-1])
        return downsampled
        
    return metrics[::5]

@app.get("/api/containers")
def get_containers(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return monitor.get_containers(db=db)

# Alert Endpoints
@app.get("/api/alerts")
def get_alerts(limit: int = 50, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()
    return alerts

@app.post("/api/alerts/clear")
def clear_alerts(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        db.query(Alert).delete()
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# Data Collection Background Task
async def collect_metrics_loop():
    while True:
        try:
            db = SessionLocal()
            try:
                data = monitor.collect(db=db)
                
                metric = SystemMetric(
                    cpu_usage=data['cpu_usage'],
                    ram_usage=data['ram_usage'],
                    disk_usage=data['disk_usage'],
                    net_sent_speed=data['net_sent_speed'],
                    net_recv_speed=data['net_recv_speed'],
                    cpu_temp=data.get('cpu_temp')
                )
                db.add(metric)
                
                # Cleanup old data
                if datetime.now().minute == 0 and datetime.now().second < 10:
                     cutoff = datetime.utcnow() - timedelta(days=30)
                     db.query(SystemMetric).filter(SystemMetric.timestamp < cutoff).delete()
                     
                     alert_cutoff = datetime.utcnow() - timedelta(days=7)
                     db.query(Alert).filter(Alert.timestamp < alert_cutoff).delete()
                     
                     db.commit()
                else:
                    db.commit()
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Error in metric collection: {e}")
        
        await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(collect_metrics_loop())

# Mount Static Files (AFTER specific routes to prevent overriding)
# We remove html=True so it doesn't serve index.html automatically at /
app.mount("/", StaticFiles(directory="app/static", html=False), name="static")
