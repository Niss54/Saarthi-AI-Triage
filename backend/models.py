from pydantic import BaseModel
from typing import Optional, List

class TriageInput(BaseModel):
    name: str
    age: int
    gender: str
    chief_complaint: str
    duration: str
    has_fever_chest_breathing: bool
    on_medication: bool
    is_pregnant: Optional[bool] = None

class TriageResult(BaseModel):
    token: str
    triageLevel: str
    department: str
    waitTimeMinutes: int
    queuePosition: int
    message: str
    aiReasoning: Optional[str] = None
    timestamp: Optional[str] = None

class QueueItem(BaseModel):
    id: str
    token: str
    name: str
    age: int
    triageLevel: str
    chiefComplaint: str
    department: str
    waitTime: int
    status: str
    timestamp: str

class Department(BaseModel):
    name: str
    patientCount: int
    avgWaitMinutes: int
    capacity: int
    status: str

class Insight(BaseModel):
    icon: str
    message: str
    severity: str

class ActivityFeedItem(BaseModel):
    time: str
    token: str
    name: str
    triageLevel: str
    department: str

class StatsData(BaseModel):
    totalToday: int
    avgWaitTime: int
    criticalCount: int
    activeDepartments: int
    last_updated: Optional[str] = None
