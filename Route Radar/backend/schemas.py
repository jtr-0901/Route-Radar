from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EventBase(BaseModel):
    event_id: Optional[str] = None
    event_type: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    
    severity_level: Optional[int] = None
    severity_label: Optional[str] = None
    risk_score: Optional[int] = None
    
    action_priority: Optional[str] = None
    recommended_action: Optional[str] = None
    
    reason_breakdown: Optional[str] = None
    road_type: Optional[str] = None
    matched_rules: Optional[str] = None
    
    image_data: Optional[str] = None

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True # for Pydantic v2 support
        orm_mode = True # for Pydantic v1 support
