from pydantic import BaseModel, Field
from typing import Optional, List, Literal

TriageLevel = Literal['critical', 'moderate', 'mild']
PatientStatus = Literal['waiting', 'called', 'in-consultation', 'done']

class ApiModel(BaseModel):
    class Config:
        populate_by_name = True
        extra = "ignore"

class Patient(ApiModel):
    id: str
    token: str
    name: str
    age: int
    gender: Literal['Male', 'Female', 'Other']
    chiefComplaint: str = Field(alias='chief_complaint')
    duration: str
    hasCriticalSymptoms: bool = Field(alias='has_fever_chest_breathing', default=False)
    onMedication: bool = Field(alias='on_medication', default=False)
    isPregnant: Optional[bool] = Field(alias='is_pregnant', default=None)
    timestamp: str

class TriageInput(ApiModel):
    name: str = Field(min_length=1)
    age: int = Field(ge=0, le=120)
    gender: str
    chiefComplaint: str = Field(alias='chief_complaint')
    duration: str
    hasCriticalSymptoms: bool = Field(alias='has_fever_chest_breathing', default=False)
    onMedication: bool = Field(alias='on_medication', default=False)
    isPregnant: Optional[bool] = Field(alias='is_pregnant', default=None)

class TriageResult(ApiModel):
    token: str
    triageLevel: TriageLevel
    department: str
    waitTimeMinutes: int
    queuePosition: int
    message: str
    aiReasoning: Optional[str] = None
    timestamp: str
    assignedDoctor: Optional[str] = None
    roomNumber: Optional[str] = None
    isEmergency: Optional[bool] = False
    urgencyReason: Optional[str] = None
    recommendedAction: Optional[str] = None

class TriageResponse(ApiModel):
    token: str
    triageLevel: TriageLevel
    department: str
    waitTimeMinutes: int
    queuePosition: int
    aiReasoning: Optional[str] = None
    timestamp: str
    message: str # included in frontend response
    assignedDoctor: Optional[str] = None
    roomNumber: Optional[str] = None
    isEmergency: Optional[bool] = False
    urgencyReason: Optional[str] = None
    recommendedAction: Optional[str] = None

class QueueItem(ApiModel):
    id: str
    token: str
    name: str
    age: int
    triageLevel: TriageLevel
    chiefComplaint: str = Field(alias='chief_complaint')
    department: str
    waitTime: int
    status: PatientStatus
    timestamp: str
    assignedDoctor: Optional[str] = None
    roomNumber: Optional[str] = None
    isEmergency: Optional[bool] = False

class Department(ApiModel):
    name: str
    patientCount: int
    avgWaitMinutes: int
    capacity: int
    status: Literal['normal', 'busy', 'critical']

class Insight(ApiModel):
    icon: str
    message: str
    severity: Literal['high', 'medium', 'low']

class ActivityFeedItem(ApiModel):
    time: str
    token: str
    name: str
    triageLevel: TriageLevel
    department: str

class ChatMessage(ApiModel):
    id: str
    text: str
    sender: Literal['bot', 'user']
    timestamp: str
    isTriageResult: Optional[bool] = False
    triageResult: Optional[TriageResult] = None

class StatsData(ApiModel):
    totalToday: int
    avgWaitTime: int = Field(alias='avg_wait_minutes')
    criticalCount: int
    activeDepartments: int
    doctorsOnDuty: int = 24
    lastUpdated: Optional[str] = Field(alias='last_updated', default=None)

class QueueAddRequest(ApiModel):
    name: Optional[str] = None
    age: Optional[int] = None
    triageLevel: Optional[TriageLevel] = None
    chiefComplaint: Optional[str] = Field(alias='chief_complaint', default=None)
    department: Optional[str] = None
    waitTime: Optional[int] = None
    status: Optional[PatientStatus] = None
