import asyncio
import uuid
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from models import TriageInput, TriageResult, QueueItem, Department, Insight, ActivityFeedItem, StatsData
from triage_engine import get_triage, get_insights
from mock_data import QUEUE_DATA, DEPARTMENTS, FEED_DATA

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
    global queue_items
    level_map = {"critical": 0, "moderate": 1, "mild": 2}
    queue_items.sort(key=lambda x: (level_map.get(x["triageLevel"], 3), x.get("timestamp", "")))

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

@app.post("/api/triage", response_model=TriageResult)
async def triage_patient(data: TriageInput):
    global QUEUE_COUNTER
    triage_info = get_triage(data.dict())
    
    triage_level = triage_info.get("triage_level", "mild")
    department = triage_info.get("department", "General OPD")
    wait_time = triage_info.get("wait_time_minutes", 30)
    ai_reasoning = triage_info.get("ai_reasoning", "Processed by rule-based fallback.")
    
    QUEUE_COUNTER += 1
    token = f"APL-{random.randint(1000, 9999)}"
    time_str = datetime.now().strftime("%I:%M %p")
    
    msg = f"Kripya Token le lein aur {department} counter par jaayein. Wait time: {wait_time} mins."
    if triage_level == "critical":
        msg = "Kripya Token le lein aur Emergency OPD counter par turant jaayein."
        
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
        "timestamp": time_str
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
    
    return TriageResult(
        token=token,
        triageLevel=triage_level,
        department=department,
        waitTimeMinutes=wait_time,
        queuePosition=QUEUE_COUNTER,
        message=msg,
        aiReasoning=ai_reasoning,
        timestamp=time_str
    )

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
        "timestamp": time_str
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
    
    wait_times = [p["waitTime"] for p in queue_items if p["status"] != "done" and p["waitTime"] > 0]
    avg_wait = sum(wait_times) // len(wait_times) if wait_times else 0
    
    return StatsData(
        totalToday=total_today,
        avgWaitTime=avg_wait,
        criticalCount=critical,
        activeDepartments=active_depts,
        last_updated=datetime.now().strftime("%I:%M:%S %p")
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
