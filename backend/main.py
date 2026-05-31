import asyncio
import uuid
import random
import json
import base64
import time
import hashlib
import hmac
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import os

from models import (
    TriageInput, EnhancedTriageResult, QueueItem, Department, Insight,
    ActivityFeedItem, StatsData, PriorityScoreRequest, PriorityScoreResponse,
    WaitTimeRequest, WaitTimeResponse, DepartmentRouteRequest, DepartmentRouteResponse,
    QueueStatusResponse
)
from triage_engine import get_enhanced_triage, get_insights
from mock_data import QUEUE_DATA, DEPARTMENTS, FEED_DATA
from voice_agent import process_voice_triage, GREETINGS
from features.department_router import route_to_department, get_department_info
from features.priority_scorer import calculate_priority_score
from features.wait_time_predictor import predict_wait_time
from features.smart_queue import reorder_queue, should_fast_track, calculate_queue_score

app = FastAPI(title="Saarthi AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
queue_items = list(QUEUE_DATA)
departments_data = list(DEPARTMENTS)
feed_items = list(FEED_DATA)
QUEUE_COUNTER = 16

active_connections: List[WebSocket] = []

def sort_queue():
    """Smart queue sorting using composite scoring."""
    global queue_items
    queue_items = reorder_queue(queue_items)

async def update_statuses():
    while True:
        await asyncio.sleep(30)
        num_updates = random.randint(1, 2)
        for _ in range(num_updates):
            eligible = [p for p in queue_items if p["status"] in ["waiting", "called", "in-consultation"]]
            if not eligible:
                break
            p = random.choice(eligible)
            if p["status"] == "waiting": p["status"] = "called"
            elif p["status"] == "called": p["status"] = "in-consultation"
            elif p["status"] == "in-consultation": p["status"] = "done"

@app.on_event("startup")
async def startup_event():
    sort_queue()
    asyncio.create_task(update_statuses())


# =================== ENHANCED TRIAGE ENDPOINT ===================

@app.post("/api/triage", response_model=EnhancedTriageResult)
async def triage_patient(data: TriageInput):
    global QUEUE_COUNTER
    
    # 1. AI Triage
    triage_info = get_enhanced_triage(data.dict())
    
    triage_level = triage_info.get("triage_level", "mild")
    department = triage_info.get("department", "General OPD")
    ai_reasoning = triage_info.get("ai_reasoning", "Processed by AI triage engine.")
    
    # 2. Department routing (validate/enhance AI's department choice)
    route_result = route_to_department(data.chief_complaint, data.age, data.gender)
    if route_result["confidence"] > 0.8:
        department = route_result["department"]
    
    # 3. Priority scoring
    priority_data = data.dict()
    priority_data["triage_level"] = triage_level
    priority_result = calculate_priority_score(priority_data)
    
    # 4. Fast-track check
    fast_track = should_fast_track(data.dict())
    
    # 5. Wait time prediction
    wait_result = predict_wait_time(department, queue_items, triage_level)
    wait_time = wait_result["estimated_wait_minutes"]
    
    if triage_level == "critical" or fast_track["fast_track"]:
        wait_time = 0
    
    QUEUE_COUNTER += 1
    token = f"EMG-{random.randint(1000, 9999)}" if triage_level == "critical" else f"APL-{random.randint(1000, 9999)}"
    time_str = datetime.now().strftime("%I:%M %p")
    
    # Message
    if triage_level == "critical":
        msg = "🚨 EMERGENCY: Turant Emergency OPD counter par jaayein. Fast-track activated."
    elif triage_level == "moderate":
        msg = f"Kripya Token le lein aur {department} counter par jaayein. Wait time: ~{wait_time} mins."
    else:
        msg = f"Kripya Token le lein aur {department} counter par jaayein. Wait time: ~{wait_time} mins."
    
    # Urgency level mapping
    urgency_map = {"critical": "immediate", "moderate": "semi-urgent", "mild": "non-urgent"}
    urgency_level = triage_info.get("urgency_level", urgency_map.get(triage_level, "non-urgent"))
    
    # Add to queue
    new_patient = {
        "id": str(uuid.uuid4()),
        "token": token,
        "name": data.name,
        "age": data.age,
        "triageLevel": triage_level,
        "chiefComplaint": data.chief_complaint,
        "department": department,
        "waitTime": wait_time,
        "status": "waiting",
        "timestamp": time_str,
        "assignedDoctor": route_result.get("doctor"),
        "roomNumber": route_result.get("room"),
        "isEmergency": triage_level == "critical" or fast_track["fast_track"],
        "priorityScore": priority_result["priority_score"]
    }
    
    queue_items.insert(0, new_patient)
    sort_queue()
    
    feed_items.insert(0, {
        "time": time_str,
        "token": token,
        "name": data.name,
        "triageLevel": triage_level,
        "department": department
    })
    
    return EnhancedTriageResult(
        token=token,
        triageLevel=triage_level,
        urgencyLevel=urgency_level,
        severityScore=triage_info.get("severity_score", 3),
        department=department,
        waitTimeMinutes=wait_time,
        queuePosition=wait_result["queue_position"],
        message=msg,
        aiReasoning=ai_reasoning,
        confidenceScore=triage_info.get("confidence_score", 0.7),
        riskFactors=triage_info.get("risk_factors", []) + priority_result.get("risk_factors", []),
        recommendedAction=triage_info.get("recommended_action"),
        possibleConditions=triage_info.get("possible_conditions", []),
        priorityScore=priority_result["priority_score"],
        emergencyFlags=priority_result.get("emergency_flags", []),
        crowdStatus=wait_result["crowd_status"],
        patientsAhead=wait_result["patients_ahead"],
        departmentLoad=wait_result["department_load"],
        assignedDoctor=route_result.get("doctor"),
        roomNumber=route_result.get("room"),
        isEmergency=triage_level == "critical" or fast_track["fast_track"],
        fastTrack=fast_track["fast_track"],
        fastTrackReason=fast_track.get("reason"),
        followUpNeeded=triage_info.get("follow_up_needed", False),
        timestamp=time_str
    )


# =================== NEW API ENDPOINTS ===================

@app.post("/api/predict-wait", response_model=WaitTimeResponse)
async def api_predict_wait(data: WaitTimeRequest):
    """Predict wait time for a department."""
    result = predict_wait_time(data.department, queue_items, data.triage_level)
    return WaitTimeResponse(
        estimatedWaitMinutes=result["estimated_wait_minutes"],
        queuePosition=result["queue_position"],
        patientsAhead=result["patients_ahead"],
        crowdStatus=result["crowd_status"],
        departmentLoad=result["department_load"]
    )

@app.post("/api/priority-score", response_model=PriorityScoreResponse)
async def api_priority_score(data: PriorityScoreRequest):
    """Calculate priority score for symptoms."""
    patient_data = {
        "chief_complaint": data.symptoms,
        "age": data.age,
        "gender": data.gender,
        "has_critical_symptoms": data.has_critical_symptoms,
        "has_fever_chest_breathing": data.has_critical_symptoms,
        "duration": data.duration
    }
    result = calculate_priority_score(patient_data)
    return PriorityScoreResponse(
        priorityScore=result["priority_score"],
        priorityLevel=result["priority_level"],
        emergencyFlags=result["emergency_flags"],
        riskFactors=result["risk_factors"],
        confidenceScore=result["confidence_score"]
    )

@app.post("/api/department-route", response_model=DepartmentRouteResponse)
async def api_department_route(data: DepartmentRouteRequest):
    """Route symptoms to the best department."""
    result = route_to_department(data.symptoms, data.age, data.gender)
    return DepartmentRouteResponse(
        department=result["department"],
        confidence=result["confidence"],
        reasoning=result["reasoning"],
        alternativeDepartment=result.get("alternative_department"),
        isEmergency=result.get("is_emergency", False),
        doctor=result.get("doctor"),
        room=result.get("room")
    )

@app.get("/api/queue-status", response_model=QueueStatusResponse)
async def api_queue_status():
    """Get intelligent queue status dashboard."""
    active = [p for p in queue_items if p["status"] != "done"]
    
    by_dept = {}
    for p in active:
        dept = p.get("department", "Unknown")
        by_dept[dept] = by_dept.get(dept, 0) + 1
    
    by_severity = {"critical": 0, "moderate": 0, "mild": 0}
    for p in active:
        level = p.get("triageLevel", "mild")
        by_severity[level] = by_severity.get(level, 0) + 1
    
    wait_times = [p["waitTime"] for p in active if p["waitTime"] > 0]
    avg_wait = sum(wait_times) // len(wait_times) if wait_times else 0
    
    fast_track_count = len([p for p in active if p.get("isEmergency", False)])
    
    return QueueStatusResponse(
        totalInQueue=len(active),
        byDepartment=by_dept,
        bySeverity=by_severity,
        avgWaitTime=avg_wait,
        criticalCount=by_severity["critical"],
        fastTrackActive=fast_track_count
    )


# =================== EXISTING ENDPOINTS (PRESERVED) ===================

@app.get("/api/queue", response_model=List[QueueItem])
async def get_queue():
    sort_queue()
    return queue_items

@app.post("/api/queue/add", response_model=QueueItem)
async def add_simulated_patient():
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
        "timestamp": time_str,
        "priorityScore": random.randint(20, 90)
    }
    
    queue_items.insert(0, new_patient)
    sort_queue()
    
    feed_items.insert(0, {
        "time": time_str,
        "token": token,
        "name": new_patient["name"],
        "triageLevel": triage_level,
        "department": department
    })
    return new_patient

@app.get("/api/departments", response_model=List[Department])
async def get_departments():
    for dept in departments_data:
        dept["patientCount"] = len([p for p in queue_items if p["department"] == dept["name"] and p["status"] != "done"])
    return departments_data

@app.get("/api/stats", response_model=StatsData)
async def get_stats():
    total_today = len(queue_items) + 1200
    critical = len([p for p in queue_items if p["triageLevel"] == "critical"])
    active_depts = len(set(p["department"] for p in queue_items if p["status"] != "done"))
    fast_track = len([p for p in queue_items if p.get("isEmergency", False)])
    
    wait_times = [p["waitTime"] for p in queue_items if p["status"] != "done" and p["waitTime"] > 0]
    avg_wait = sum(wait_times) // len(wait_times) if wait_times else 0
    
    return StatsData(
        totalToday=total_today,
        avgWaitTime=avg_wait,
        criticalCount=critical,
        activeDepartments=active_depts,
        last_updated=datetime.now().strftime("%I:%M:%S %p"),
        fastTrackCount=fast_track
    )

@app.get("/api/insights", response_model=List[Insight])
async def api_get_insights():
    insights_json = get_insights(queue_items)
    return [Insight(**i) for i in insights_json]

@app.get("/api/feed", response_model=List[ActivityFeedItem])
async def get_feed():
    return feed_items[:10]

@app.websocket("/ws/queue")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        sort_queue()
        await websocket.send_json(queue_items)
        
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
                if data.get("action") == "add_patient":
                    await add_simulated_patient()
                    sort_queue()
                    for conn in active_connections:
                        await conn.send_json(queue_items)
            except asyncio.TimeoutError:
                sort_queue()
                await websocket.send_json(queue_items)
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# =================== VOICE AGENT ENDPOINTS ===================

def _generate_livekit_token(identity: str, room_name: str, metadata: str = "") -> str:
    api_key = os.getenv("LIVEKIT_API_KEY", "")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "")
    
    if not api_key or not api_secret:
        return ""
    
    now = int(time.time())
    claims = {
        "iss": api_key,
        "sub": identity,
        "iat": now,
        "nbf": now,
        "exp": now + 3600,
        "jti": identity,
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
        "metadata": metadata,
    }
    
    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode()
    
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64url(json.dumps(claims).encode())
    signature = b64url(hmac.new(api_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    
    return f"{header}.{payload}.{signature}"


@app.get("/api/livekit/token")
async def get_livekit_token(language: str = "hi-IN"):
    room_id = str(uuid.uuid4())[:8]
    room_name = f"saarthi-voice-{room_id}"
    patient_id = f"patient-{room_id}"
    
    metadata = json.dumps({"language": language})
    token = _generate_livekit_token(patient_id, room_name, metadata)
    
    if not token:
        return JSONResponse(
            status_code=500,
            content={"error": "LiveKit API keys not configured"}
        )
    
    return {
        "token": token,
        "room_name": room_name,
        "ws_url": os.getenv("LIVEKIT_URL", ""),
        "language": language,
        "identity": patient_id,
        "greeting": GREETINGS.get(language, GREETINGS["hi-IN"]),
    }


@app.post("/api/voice/triage")
async def voice_triage(
    audio: UploadFile = File(...),
    language: str = Form("hi-IN"),
):
    audio_bytes = await audio.read()
    
    if len(audio_bytes) == 0:
        return JSONResponse(
            status_code=400,
            content={"error": "Empty audio file"}
        )
    
    result = await process_voice_triage(audio_bytes, language)
    
    if result.get("triage_data"):
        td = result["triage_data"]
        token = td.get("token", f"APL-{random.randint(1000,9999)}")
        time_str = datetime.now().strftime("%I:%M %p")
        
        new_patient = {
            "id": str(uuid.uuid4()),
            "token": token,
            "name": "Voice Patient",
            "age": 30,
            "triageLevel": td.get("triage_level", "mild"),
            "chiefComplaint": result.get("transcript", "Voice triage"),
            "department": td.get("department", "General OPD"),
            "waitTime": td.get("wait_time_minutes", 30),
            "status": "waiting",
            "timestamp": time_str,
            "isEmergency": td.get("isEmergency", False),
        }
        queue_items.insert(0, new_patient)
        sort_queue()
        
        feed_items.insert(0, {
            "time": time_str,
            "token": token,
            "name": "Voice Patient",
            "triageLevel": td.get("triage_level", "mild"),
            "department": td.get("department", "General OPD"),
        })
        
        for conn in active_connections:
            try:
                await conn.send_json(queue_items)
            except:
                pass
    
    return result


@app.get("/api/voice/greeting")
async def get_greeting(language: str = "hi-IN"):
    from sarvam_tts import text_to_speech
    greeting_text = GREETINGS.get(language, GREETINGS["hi-IN"])
    tts_result = await text_to_speech(greeting_text, language_code=language)
    
    return {
        "text": greeting_text,
        "audio_base64": tts_result.get("audio_base64", ""),
        "language": language,
    }


# =================== OCR TRIAGE ENDPOINT ===================

import google.generativeai as genai_ocr
genai_ocr.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
ocr_model = genai_ocr.GenerativeModel("gemini-1.5-flash")

OCR_TRIAGE_PROMPT = """You are a medical assistant at KGMU Lucknow hospital.
Analyze this image carefully. It may be:
- A handwritten or printed prescription
- A medical report or lab result
- A photo of visible symptoms (rash, swelling, injury)
- A patient writing their symptoms

Extract the following information:
1. Patient symptoms (if visible)
2. Medicines mentioned (if any)
3. Doctor name (if any)
4. Any diagnosis written
5. Visible physical symptoms from photo

Then based on extracted information, provide triage.

Departments available: Emergency, Cardiology, Medicine, Orthopaedics, Gynaecology, Paediatrics, ENT, Eye OPD, Dermatology, General OPD, Neurology, Pulmonology, Surgery

Return ONLY valid JSON (no extra text):
{
  "extracted_text": "raw text from image",
  "symptoms_found": ["symptom1", "symptom2"],
  "medicines_found": ["med1", "med2"],
  "severity": "critical|moderate|mild",
  "department": "Department Name",
  "doctor_name": "Dr. Name or unknown",
  "urgency_reason": "brief reason",
  "recommended_action": "what patient should do",
  "ocr_confidence": "high|medium|low"
}

If image is unclear or unrelated to medical, return ocr_confidence: "low" with a message in extracted_text.
"""


@app.post("/api/ocr-triage")
async def ocr_triage(
    image: UploadFile = File(...),
    language: str = Form("hi"),
):
    image_bytes = await image.read()

    if len(image_bytes) > 5 * 1024 * 1024:
        return JSONResponse(
            status_code=400,
            content={"error": "Image too large. Maximum 5MB allowed.", "ocr_confidence": "low"}
        )

    if len(image_bytes) == 0:
        return JSONResponse(
            status_code=400,
            content={"error": "Empty image file.", "ocr_confidence": "low"}
        )

    content_type = image.content_type or "image/jpeg"
    if content_type not in ["image/jpeg", "image/png", "image/webp", "application/pdf"]:
        content_type = "image/jpeg"

    try:
        image_part = {
            "mime_type": content_type,
            "data": image_bytes,
        }
        response = ocr_model.generate_content([OCR_TRIAGE_PROMPT, image_part])
        raw_text = response.text.strip()

        import re as ocr_re
        match = ocr_re.search(r'\{.*\}', raw_text, ocr_re.DOTALL)
        if match:
            ocr_result = json.loads(match.group(0))
        else:
            ocr_result = json.loads(raw_text)

    except Exception as e:
        print(f"Gemini OCR error: {e}")
        return {
            "extracted_text": "Image analysis failed. Please try again or type your symptoms.",
            "symptoms_found": [],
            "medicines_found": [],
            "severity": "mild",
            "department": "General OPD",
            "doctor_name": "unknown",
            "urgency_reason": f"OCR error: {str(e)[:100]}",
            "recommended_action": "Kripya apne symptoms manually type karein.",
            "ocr_confidence": "low",
            "token": "",
            "triage_result": None,
        }

    severity = ocr_result.get("severity", "mild")
    department = ocr_result.get("department", "General OPD")

    if severity == "critical":
        token = f"EMG-{random.randint(1000, 9999)}"
        wait_time = 0
    elif severity == "moderate":
        token = f"OPD-{random.randint(1000, 9999)}"
        wait_time = random.randint(15, 30)
    else:
        token = f"OPD-{random.randint(1000, 9999)}"
        wait_time = random.randint(30, 60)

    symptoms_text = ", ".join(ocr_result.get("symptoms_found", ["Image-based triage"]))
    time_str = datetime.now().strftime("%I:%M %p")

    triage_result = {
        "token": token,
        "triageLevel": severity,
        "department": department,
        "waitTimeMinutes": wait_time,
        "queuePosition": len(queue_items) + 1,
        "message": ocr_result.get("recommended_action", f"Kripya {department} mein jaayein."),
        "aiReasoning": ocr_result.get("urgency_reason", "Image-based analysis"),
        "assignedDoctor": ocr_result.get("doctor_name", "On-Duty Physician"),
        "roomNumber": None,
        "isEmergency": severity == "critical",
        "timestamp": time_str,
    }

    if ocr_result.get("ocr_confidence", "low") != "low":
        new_patient = {
            "id": str(uuid.uuid4()),
            "token": token,
            "name": "Prescription Patient",
            "age": 30,
            "triageLevel": severity,
            "chiefComplaint": symptoms_text[:100],
            "department": department,
            "waitTime": wait_time,
            "status": "waiting",
            "timestamp": time_str,
            "isEmergency": severity == "critical",
        }
        queue_items.insert(0, new_patient)
        sort_queue()

        feed_items.insert(0, {
            "time": time_str,
            "token": token,
            "name": "Prescription Patient",
            "triageLevel": severity,
            "department": department,
        })

        for conn in active_connections:
            try:
                await conn.send_json(queue_items)
            except:
                pass

    return {
        **ocr_result,
        "token": token,
        "triage_result": triage_result,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
