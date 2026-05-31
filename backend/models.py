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

class EnhancedTriageResult(BaseModel):
    token: str
    triageLevel: str
    urgencyLevel: Optional[str] = None
    severityScore: Optional[int] = None
    department: str
    waitTimeMinutes: int
    queuePosition: int
    message: str
    aiReasoning: Optional[str] = None
    confidenceScore: Optional[float] = None
    riskFactors: Optional[List[str]] = None
    recommendedAction: Optional[str] = None
    possibleConditions: Optional[List[str]] = None
    priorityScore: Optional[int] = None
    emergencyFlags: Optional[List[str]] = None
    crowdStatus: Optional[str] = None
    patientsAhead: Optional[int] = None
    departmentLoad: Optional[str] = None
    assignedDoctor: Optional[str] = None
    roomNumber: Optional[str] = None
    isEmergency: Optional[bool] = None
    fastTrack: Optional[bool] = None
    fastTrackReason: Optional[str] = None
    followUpNeeded: Optional[bool] = None
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
    assignedDoctor: Optional[str] = None
    roomNumber: Optional[str] = None
    isEmergency: Optional[bool] = None
    priorityScore: Optional[int] = None

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
    fastTrackCount: Optional[int] = None

class PriorityScoreRequest(BaseModel):
    symptoms: str
    age: int
    gender: str
    has_critical_symptoms: bool = False
    duration: str = ""

class PriorityScoreResponse(BaseModel):
    priorityScore: int
    priorityLevel: str
    emergencyFlags: List[str]
    riskFactors: List[str]
    confidenceScore: float

class WaitTimeRequest(BaseModel):
    department: str
    triage_level: str = "mild"

class WaitTimeResponse(BaseModel):
    estimatedWaitMinutes: int
    queuePosition: int
    patientsAhead: int
    crowdStatus: str
    departmentLoad: str

class DepartmentRouteRequest(BaseModel):
    symptoms: str
    age: int = 30
    gender: str = "Male"

class DepartmentRouteResponse(BaseModel):
    department: str
    confidence: float
    reasoning: str
    alternativeDepartment: Optional[str] = None
    isEmergency: bool = False
    doctor: Optional[str] = None
    room: Optional[str] = None

class QueueStatusResponse(BaseModel):
    totalInQueue: int
    byDepartment: dict
    bySeverity: dict
    avgWaitTime: int
    criticalCount: int
    fastTrackActive: int
