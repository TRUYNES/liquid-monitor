from sqlalchemy import create_engine, Column, Integer, Float, DateTime
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

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
