from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EventBase(BaseModel):
    lat: float
    lon: float
    severity: str
    event_type: str
    image_data: Optional[str] = None

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True # for Pydantic v2 support
        orm_mode = True # for Pydantic v1 support
