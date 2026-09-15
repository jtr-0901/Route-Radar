from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import os

import models
import schemas
from database import SessionLocal, engine

# Ensure DB is created
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Route Radar v2 Backend", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/events/", response_model=schemas.Event)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    db_event = models.Event(**event.model_dump() if hasattr(event, "model_dump") else event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.get("/api/events/", response_model=List[schemas.Event])
def read_events(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    events = db.query(models.Event).order_by(models.Event.timestamp.desc()).offset(skip).limit(limit).all()
    return events

@app.delete("/api/events/")
def clear_events(db: Session = Depends(get_db)):
    """Admin endpoint to clear events during testing"""
    db.query(models.Event).delete()
    db.commit()
    return {"message": "All events cleared"}
