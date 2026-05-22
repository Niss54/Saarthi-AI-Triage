import os
import uuid
import random
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))

app = FastAPI(title="Saarthi AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class TriageInput(BaseModel):
    name: str
    age: int
    gender: str
    chiefComplaint: str
    duration: str
    hasCriticalSymptoms: bool
    onMedication: bool
    isPregnant: Optional[bool] = None

class TriageResult(BaseModel):
    token: str
    triageLevel: str
    department: str
    waitTimeMinutes: int
    queuePosition: int
    message: str
    aiReasoning: Optional[str] = None

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

# --- Mock Database ---
QUEUE_COUNTER = 16

DEPARTMENTS_DATA = [
  { "name": 'Emergency', "patientCount": 8, "avgWaitMinutes": 2, "capacity": 15, "status": 'critical' },
  { "name": 'Medicine', "patientCount": 34, "avgWaitMinutes": 28, "capacity": 50, "status": 'busy' },
  { "name": 'Orthopaedics', "patientCount": 19, "avgWaitMinutes": 25, "capacity": 30, "status": 'normal' },
  { "name": 'Gynaecology', "patientCount": 12, "avgWaitMinutes": 18, "capacity": 20, "status": 'normal' },
  { "name": 'Paediatrics', "patientCount": 22, "avgWaitMinutes": 15, "capacity": 30, "status": 'normal' },
  { "name": 'ENT', "patientCount": 9, "avgWaitMinutes": 30, "capacity": 15, "status": 'normal' },
  { "name": 'Eye OPD', "patientCount": 14, "avgWaitMinutes": 35, "capacity": 20, "status": 'normal' },
  { "name": 'Dermatology', "patientCount": 7, "avgWaitMinutes": 22, "capacity": 15, "status": 'normal' },
]

QUEUE_DATA = [
  { "id": '1', "token": 'APL-4821', "name": 'Ramesh Kumar', "age": 55, "triageLevel": 'critical', "chiefComplaint": 'Seene mein tej dard, saans mein takleef', "department": 'Emergency', "waitTime": 0, "status": 'called', "timestamp": '09:12 AM' },
  { "id": '2', "token": 'APL-4822', "name": 'Sunita Devi', "age": 62, "triageLevel": 'critical', "chiefComplaint": 'Bukhar, chest pain, breathlessness', "department": 'Emergency', "waitTime": 0, "status": 'in-consultation', "timestamp": '09:15 AM' },
  { "id": '3', "token": 'APL-4823', "name": 'Arun Mishra', "age": 45, "triageLevel": 'critical', "chiefComplaint": 'Severe breathing difficulty, high fever', "department": 'Emergency', "waitTime": 0, "status": 'waiting', "timestamp": '09:22 AM' },
  { "id": '4', "token": 'APL-4824', "name": 'Priya Sharma', "age": 28, "triageLevel": 'moderate', "chiefComplaint": 'Bukhar 5 din se, weakness', "department": 'Medicine', "waitTime": 18, "status": 'waiting', "timestamp": '09:30 AM' },
]

STATS_DATA = {
  "totalToday": 1247,
  "avgWaitTime": 23,
  "criticalCount": 14,
  "activeDepartments": 8,
}

INSIGHTS_DATA = [
  { "icon": '🚨', "message": '3 patients flagged with potential cardiac symptoms — auto-routed to Emergency', "severity": 'high' },
  { "icon": '⏱️', "message": 'Medicine OPD wait time predicted to exceed 45 min in next 30 minutes. Recommend opening Counter 2.', "severity": 'medium' },
  { "icon": '📊', "message": 'Peak hour predicted: 11:00 AM – 1:00 PM. Recommend 2 extra floor staff.', "severity": 'low' },
]

FEED_DATA = [
  { "time": '10:02 AM', "token": 'APL-4835', "name": 'Amit Saxena', "triageLevel": 'mild', "department": 'ENT' },
  { "time": '09:58 AM', "token": 'APL-4834', "name": 'Lakshmi Agarwal', "triageLevel": 'mild', "department": 'Eye OPD' },
]

# --- Endpoints ---
@app.post("/api/triage", response_model=TriageResult)
async def perform_triage(data: TriageInput):
    global QUEUE_COUNTER
    triage_level = "mild"
    department = "General OPD"
    ai_reasoning = ""
    
    # Rule-based fallback
    complaint = data.chiefComplaint.lower()
    danger_words = ['chest pain', 'seene', 'dard', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh']
    has_danger = any(w in complaint for w in danger_words)
    
    if data.hasCriticalSymptoms and has_danger:
        triage_level = "critical"
        department = "Emergency"
        wait_time = 0
        msg = "Kripya Token le lein aur Emergency OPD counter par turant jaayein. Aapka case critical hai."
        ai_reasoning = "Critical symptoms and danger words detected by local rules."
    elif data.duration == '1 mahine se zyada' or data.onMedication:
        triage_level = "moderate"
        depts = ['Medicine', 'Orthopaedics']
        if data.gender.lower() == 'female' and data.isPregnant:
            depts.insert(0, 'Gynaecology')
        department = depts[0]
        wait_time = random.randint(15, 30)
        msg = f"Kripya Token le lein aur {department} OPD counter par jaayein. Aapka estimated wait time {wait_time} minute hai."
        ai_reasoning = "Chronic duration or on medication."
    else:
        wait_time = random.randint(30, 60)
        msg = f"Kripya Token le lein aur General OPD counter par jaayein. Aapka estimated wait time {wait_time} minute hai."
        ai_reasoning = "Mild symptoms, routine checkup."

    # Gemini Integration
    if os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY") != "dummy_key":
        try:
            model = genai.GenerativeModel('gemini-2.5-pro')
            prompt = f"""
            You are an expert medical triage AI for KGMU Hospital.
            Patient Info:
            Name: {data.name}, Age: {data.age}, Gender: {data.gender}
            Complaint: {data.chiefComplaint}
            Duration: {data.duration}
            Critical Symptoms: {data.hasCriticalSymptoms}
            On Medication: {data.onMedication}
            Pregnant: {data.isPregnant}
            
            Based on this, classify into:
            Level: critical / moderate / mild
            Department: Emergency / Medicine / Orthopaedics / Gynaecology / Paediatrics / ENT / Eye OPD / Dermatology / General OPD
            
            Return format EXACTLY as: LEVEL|DEPARTMENT|REASONING
            """
            response = model.generate_content(prompt)
            parts = response.text.strip().split("|")
            if len(parts) >= 3:
                triage_level = parts[0].strip().lower()
                department = parts[1].strip()
                ai_reasoning = parts[2].strip()
                
                if triage_level == "critical":
                    wait_time = 0
                    msg = "Kripya Token le lein aur Emergency OPD counter par turant jaayein. AI flags this as critical."
                elif triage_level == "moderate":
                    wait_time = random.randint(15, 30)
                    msg = f"Kripya Token le lein aur {department} OPD counter par jaayein. Wait time: {wait_time} mins."
                else:
                    triage_level = "mild"
                    wait_time = random.randint(30, 60)
                    msg = f"Kripya Token le lein aur {department} counter par jaayein. Wait time: {wait_time} mins."
        except Exception as e:
            print(f"Gemini error: {e}")

    QUEUE_COUNTER += 1
    token = f"APL-{random.randint(1000, 9999)}"
    time_str = datetime.now().strftime("%I:%M %p")
    
    new_patient = {
        "id": str(uuid.uuid4()),
        "token": token,
        "name": data.name,
        "age": data.age,
        "triageLevel": triage_level,
        "chiefComplaint": data.chiefComplaint,
        "department": department,
        "waitTime": wait_time,
        "status": "waiting",
        "timestamp": time_str
    }
    QUEUE_DATA.insert(0, new_patient)
    
    FEED_DATA.insert(0, {
        "time": time_str,
        "token": token,
        "name": data.name,
        "triageLevel": triage_level,
        "department": department
    })
    
    return TriageResult(
        token=token,
        triageLevel=triage_level,
        department=department,
        waitTimeMinutes=wait_time,
        queuePosition=QUEUE_COUNTER,
        message=msg,
        aiReasoning=ai_reasoning
    )

@app.get("/api/queue", response_model=List[QueueItem])
async def get_queue():
    return QUEUE_DATA

@app.post("/api/queue/add", response_model=QueueItem)
async def add_simulated_patient():
    global QUEUE_COUNTER
    names = ['Rohit Chauhan', 'Sneha Tripathi', 'Manish Srivastava', 'Pooja Rawat', 'Dinesh Awasthi']
    complaints = ['Tez bukhar', 'Pet mein dard', 'Sar mein dard', 'Khujli aur rash']
    
    levels = ['mild', 'moderate', 'critical']
    triage_level = random.choice(levels)
    
    dept_map = {
        "critical": ["Emergency"],
        "moderate": ["Medicine", "Orthopaedics", "Gynaecology"],
        "mild": ["General OPD", "ENT", "Eye OPD"]
    }
    department = random.choice(dept_map[triage_level])
    
    wait_time = 0 if triage_level == 'critical' else random.randint(15, 60)
    token = f"APL-{random.randint(1000, 9999)}"
    time_str = datetime.now().strftime("%I:%M %p")
    
    new_patient = {
        "id": str(uuid.uuid4()),
        "token": token,
        "name": random.choice(names),
        "age": random.randint(5, 65),
        "triageLevel": triage_level,
        "chiefComplaint": random.choice(complaints),
        "department": department,
        "waitTime": wait_time,
        "status": 'waiting',
        "timestamp": time_str
    }
    
    QUEUE_DATA.insert(0, new_patient)
    FEED_DATA.insert(0, {
        "time": time_str,
        "token": token,
        "name": new_patient["name"],
        "triageLevel": triage_level,
        "department": department
    })
    
    return new_patient

@app.get("/api/departments", response_model=List[Department])
async def get_departments():
    return DEPARTMENTS_DATA

@app.get("/api/stats", response_model=StatsData)
async def get_stats():
    return STATS_DATA

@app.get("/api/insights", response_model=List[Insight])
async def get_insights():
    return INSIGHTS_DATA

@app.get("/api/feed", response_model=List[ActivityFeedItem])
async def get_feed():
    return FEED_DATA
