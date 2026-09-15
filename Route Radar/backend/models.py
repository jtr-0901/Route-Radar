from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from database import Base
import datetime

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, index=True) # e.g. P-001
    event_type = Column(String, index=True) # e.g., Pothole, Rash Driving
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    lat = Column(Float, index=True)
    lon = Column(Float, index=True)
    
    severity_level = Column(Integer) # 1-4
    severity_label = Column(String) # LOW, MODERATE, HIGH, CRITICAL
    
    risk_score = Column(Integer) # 0-100
    
    action_priority = Column(String) # MONITOR, SCHEDULE, PRIORITIZE, IMMEDIATE
    recommended_action = Column(String)
    
    reason_breakdown = Column(String) # JSON text
    road_type = Column(String)
    matched_rules = Column(String) # JSON text
    
    image_data = Column(String) # Base64 encoded thumbnail string
