from sqlalchemy import create_engine, Column, Integer, Float, DateTime, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Ensure data directory exists
if not os.path.exists("data"):
    os.makedirs("data")

DATABASE_URL = "sqlite:///./data/monitor.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    cpu_usage = Column(Float)  # Percentage
    ram_usage = Column(Float)  # Percentage
    cpu_temp = Column(Float, nullable=True)  # Celsius
    disk_usage = Column(Float) # Percentage
    net_sent_speed = Column(Float)  # KB/s
    net_recv_speed = Column(Float)  # KB/s

class ContainerTraffic(Base):
    __tablename__ = "container_traffic"
    
    name = Column(String, primary_key=True, index=True)
    total_rx = Column(Float, default=0.0) # Bytes
    total_tx = Column(Float, default=0.0) # Bytes
    last_docker_rx = Column(Float, default=0.0) # Raw Docker Bytes
    last_docker_tx = Column(Float, default=0.0) # Raw Docker Bytes
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String) # 'warning', 'critical'
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
