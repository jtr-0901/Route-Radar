from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
from database import SessionLocal, engine

# Create the database tables (SQLite creates the file if it doesn't exist)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart India Hackathon PS124 Backend", version="1.0")

# Allow CORS for the frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/events/", response_model=schemas.Event)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    # Ingest detection event and store in DB
    db_event = models.Event(**event.model_dump() if hasattr(event, "model_dump") else event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.get("/api/events/", response_model=List[schemas.Event])
def read_events(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    # Retrieve events for the dashboard
    events = db.query(models.Event).order_by(models.Event.timestamp.desc()).offset(skip).limit(limit).all()
    return events
