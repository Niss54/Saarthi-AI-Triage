from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

TriageLevel = Literal['critical', 'moderate', 'mild']
PatientStatus = Literal['waiting', 'called', 'in-consultation', 'done']
DepartmentStatus = Literal['normal', 'busy', 'critical']
InsightSeverity = Literal['high', 'medium', 'low']


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra='ignore')


class Patient(ApiModel):
    id: str
    token: str
    name: str
    age: int
    gender: Literal['Male', 'Female', 'Other']
    chiefComplaint: str = Field(..., alias='chief_complaint')
    duration: str
    hasCriticalSymptoms: bool = Field(..., alias='has_fever_chest_breathing')
    onMedication: bool = Field(..., alias='on_medication')
    isPregnant: Optional[bool] = Field(default=None, alias='is_pregnant')
    timestamp: str


class TriageInput(ApiModel):
    name: str = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=120)
    gender: str
    chiefComplaint: str = Field(..., alias='chief_complaint')
    duration: str
    hasCriticalSymptoms: bool = Field(..., alias='has_fever_chest_breathing')
    onMedication: bool = Field(..., alias='on_medication')
    isPregnant: Optional[bool] = Field(default=None, alias='is_pregnant')


class TriageResult(ApiModel):
    token: str
    triageLevel: TriageLevel = Field(..., alias='triage_level')
    department: str
    waitTimeMinutes: int = Field(..., alias='wait_time_minutes')
    queuePosition: int = Field(..., alias='queue_position')
    message: str
    aiReasoning: Optional[str] = Field(default=None, alias='ai_reasoning')
    timestamp: str


class TriageResponse(ApiModel):
    token: str
    triageLevel: TriageLevel = Field(..., alias='triage_level')
    department: str
    waitTimeMinutes: int = Field(..., alias='wait_time_minutes')
    queuePosition: int = Field(..., alias='queue_position')
    aiReasoning: Optional[str] = Field(default=None, alias='ai_reasoning')
    timestamp: str


class QueueItem(ApiModel):
    id: str
    token: str
    name: str
    age: int
    triageLevel: TriageLevel = Field(..., alias='triage_level')
    chiefComplaint: str = Field(..., alias='chief_complaint')
    department: str
    waitTime: int = Field(..., alias='wait_time')
    status: PatientStatus
    timestamp: str


class Department(ApiModel):
    name: str
    patientCount: int = Field(..., alias='patient_count')
    avgWaitMinutes: int = Field(..., alias='avg_wait_minutes')
    capacity: int
    status: DepartmentStatus


class Insight(ApiModel):
    icon: str
    message: str
    severity: InsightSeverity


class ActivityFeedItem(ApiModel):
    time: str
    token: str
    name: str
    triageLevel: TriageLevel = Field(..., alias='triage_level')
    department: str


class ChatMessage(ApiModel):
    id: str
    text: str
    sender: Literal['bot', 'user']
    timestamp: str
    isTriageResult: Optional[bool] = Field(default=None, alias='is_triage_result')
    triageResult: Optional[TriageResult] = Field(default=None, alias='triage_result')


class StatsData(ApiModel):
    totalToday: int = Field(..., alias='total_today')
    avgWaitTime: int = Field(..., alias='avg_wait_minutes')
    criticalCount: int = Field(..., alias='critical_count')
    activeDepartments: int = Field(..., alias='active_departments')
    lastUpdated: Optional[str] = Field(default=None, alias='last_updated')


class QueueAddRequest(ApiModel):
    name: Optional[str] = None
    age: Optional[int] = None
    triageLevel: Optional[TriageLevel] = Field(default=None, alias='triage_level')
    chiefComplaint: Optional[str] = Field(default=None, alias='chief_complaint')
    department: Optional[str] = None
    waitTime: Optional[int] = Field(default=None, alias='wait_time')
    status: Optional[PatientStatus] = None
