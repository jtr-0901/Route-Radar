from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    lat = Column(Float, index=True)
    lon = Column(Float, index=True)
    severity = Column(String, index=True) # e.g., low, medium, high
    event_type = Column(String, index=True) # e.g., pothole, rash_driving
    image_data = Column(String) # Base64 encoded thumbnail string
