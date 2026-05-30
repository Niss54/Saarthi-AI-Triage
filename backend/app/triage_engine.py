import google.generativeai as genai
import os
import json
import re
import random
from typing import Dict, Any, List
from dotenv import load_dotenv
from .models import TriageInput
from .mock_data import DEPARTMENTS

load_dotenv()

# Check if Gemini is enabled and configured
api_key = os.getenv("GEMINI_API_KEY", "")
use_gemini = os.getenv("USE_GEMINI", "true").lower() == "true" and api_key and api_key != "dummy_key"

if use_gemini:
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    model = genai.GenerativeModel(model_name)
    print(f"Gemini Triage Engine Initialized (Model: {model_name})")
else:
    print("Gemini Triage Engine Disabled or Invalid Key. Using rule-based fallback.")

DOCTOR_POOL = {
    "Emergency": [{"name": "Dr. A. Singh", "room": "Emergency Bay C-204"}],
    "Cardiology": [{"name": "Dr. Arvind Singh", "room": "C-201"}, {"name": "Dr. Priya Verma", "room": "C-202"}],
    "Neurology": [{"name": "Dr. Rakesh Gupta", "room": "N-101"}, {"name": "Dr. Sunita Rao", "room": "N-103"}],
    "General Medicine": [{"name": "Dr. Meera Sharma", "room": "G-102"}, {"name": "Dr. Anil Kumar", "room": "G-104"}, {"name": "Dr. Kavya Mishra", "room": "G-106"}],
    "Medicine": [{"name": "Dr. Meera Sharma", "room": "G-102"}, {"name": "Dr. Anil Kumar", "room": "G-104"}, {"name": "Dr. Kavya Mishra", "room": "G-106"}],
    "Orthopaedics": [{"name": "Dr. Suresh Pandey", "room": "O-201"}, {"name": "Dr. Amit Srivastava", "room": "O-203"}],
    "Pediatrics": [{"name": "Dr. Neha Singh", "room": "P-101"}, {"name": "Dr. Rajiv Tiwari", "room": "P-102"}],
    "Paediatrics": [{"name": "Dr. Neha Singh", "room": "P-101"}, {"name": "Dr. Rajiv Tiwari", "room": "P-102"}],
    "Gynecology": [{"name": "Dr. Anita Joshi", "room": "GY-201"}, {"name": "Dr. Pooja Dubey", "room": "GY-202"}],
    "Gynaecology": [{"name": "Dr. Anita Joshi", "room": "GY-201"}, {"name": "Dr. Pooja Dubey", "room": "GY-202"}],
    "Dermatology": [{"name": "Dr. Vikram Nair", "room": "D-101"}],
    "ENT": [{"name": "Dr. Sanjay Kapoor", "room": "E-101"}],
    "Eye OPD": [{"name": "Dr. Ritu Saxena", "room": "EY-101"}],
    "General OPD": [{"name": "Dr. Meera Sharma", "room": "G-102"}, {"name": "Dr. Anil Kumar", "room": "G-104"}],
    "Pulmonology": [{"name": "Dr. Anil Kumar", "room": "G-104"}],
    "Surgery": [{"name": "Dr. Suresh Pandey", "room": "O-201"}],
}

def assign_doctor(department: str) -> dict:
    doctors = DOCTOR_POOL.get(department, DOCTOR_POOL.get("General OPD", [{"name": "Dr. Meera Sharma", "room": "G-102"}]))
    doctor = random.choice(doctors)
    return {"name": doctor["name"], "room": doctor["room"]}

TRIAGE_PROMPT = """You are a medical triage AI for KGMU (King George's Medical University) hospital in Lucknow, India.
Given patient information, determine triage classification.

CLASSIFICATION RULES:
- Chest pain + breathing issue -> Critical -> Emergency/Cardiology
- Unconscious/stroke/laqwa/behoshi -> Critical -> Emergency/Neurology
- Heavy bleeding/bahut khoon -> Critical -> Emergency/Surgery
- Severe head injury -> Critical -> Emergency
- High fever 4+ days -> Moderate -> General Medicine
- Persistent cough -> Moderate -> General Medicine/Pulmonology
- Abdominal pain/pet dard -> Moderate -> General Medicine/Surgery
- Fracture/bone pain/haddi/pair toda -> Moderate -> Orthopaedics
- Joint pain/swelling/ghutna -> Low-Moderate -> Orthopaedics
- Skin rash/itching/khujli -> Low -> Dermatology
- Hair/skin issue -> Low -> Dermatology
- Pregnancy issue/pain -> Moderate -> Gynecology
- Menstrual problems -> Low-Moderate -> Gynecology
- Child fever/issue (age <12) -> Varies -> Pediatrics
- Migraine/dizziness/chakkar -> Moderate -> Neurology
- Seizure history -> Moderate-High -> Neurology
- Ear pain/kaan dard -> Low -> ENT
- Eye issue/aankh -> Low -> Eye OPD

Patient Info:
{patient_data}

Return ONLY valid JSON with this exact structure:
{{
  "severity": "critical|moderate|mild",
  "department": "Department Name",
  "wait_time_minutes": N,
  "ai_reasoning": "Brief Hindi-English mixed explanation (2 sentences)",
  "urgency_reason": "Brief medical reason",
  "recommended_action": "What patient should do next"
}}
"""

INSIGHTS_PROMPT = """You are an AI hospital operations advisor for KGMU Lucknow. 
Given these current stats:
{queue_snapshot}

Generate exactly 3 specific, actionable operational insights for the hospital admin.
Be concise and medically realistic. Use Hindi-English mixed language.
Return ONLY valid JSON array:
[
  {{"icon": "emoji", "message": "insight text", "severity": "high|medium|low"}}
]
"""

def _payload_to_input(payload: Dict[str, Any]) -> TriageInput:
    """Convert raw payload to validated model"""
    if isinstance(payload, TriageInput):
        return payload
    return TriageInput(**payload)

def get_triage(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Get triage result from Gemini with fallback to rules"""
    patient_data = _payload_to_input(payload).model_dump(by_alias=True)
    
    if not use_gemini:
        from .triage import rule_based_triage
        result = rule_based_triage(payload)
        # Adapt old output format to new
        if 'triage_level' in result and 'severity' not in result:
            result['severity'] = result['triage_level']
        return _normalize_triage(result)

    try:
        response = model.generate_content(TRIAGE_PROMPT.format(patient_data=json.dumps(patient_data)))
        result_json = _extract_json(response.text)
        return _normalize_triage(result_json)
    except Exception as e:
        print(f"Gemini triage error: {str(e)}")
        from .triage import rule_based_triage
        result = rule_based_triage(payload)
        if 'triage_level' in result and 'severity' not in result:
            result['severity'] = result['triage_level']
        return _normalize_triage(result)

def get_insights(queue_snapshot: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Get hospital insights from Gemini"""
    default_insights = [
        {"icon": "🚨", "message": "Emergency queue has multiple critical cases; prioritize rapid routing.", "severity": "high"},
        {"icon": "⏱️", "message": "Medicine OPD wait time is trending higher; consider opening Counter 2.", "severity": "medium"},
        {"icon": "📊", "message": "Peak hour likely 11:00 AM - 1:00 PM; schedule extra floor staff.", "severity": "low"},
    ]
    
    if not use_gemini or not queue_snapshot:
        return default_insights

    try:
        # Send only a subset of data to avoid exceeding context limits
        subset = queue_snapshot[:20]
        stats_str = json.dumps(subset)
        response = model.generate_content(INSIGHTS_PROMPT.format(queue_snapshot=stats_str))
        insights = _extract_json(response.text)
        if isinstance(insights, list) and len(insights) > 0:
            return insights[:3]
        return default_insights
    except Exception as e:
        print(f"Gemini insights error: {str(e)}")
        return default_insights

def _extract_json(text: str) -> Any:
    """Extract JSON object or array from markdown text"""
    text = text.strip()
    
    # Try to find JSON block
    match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
        
    # Try to find array or object
    match = re.search(r'(\[.*\]|\{.*\})', text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
        
    return json.loads(text)

def _normalize_triage(raw_result: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure raw AI result conforms to required schema and types"""
    normalized = {
        "triageLevel": "mild",
        "department": "General OPD",
        "waitTimeMinutes": 30,
        "aiReasoning": raw_result.get("ai_reasoning", "Processed by AI triage system."),
        "urgencyReason": raw_result.get("urgency_reason", ""),
        "recommendedAction": raw_result.get("recommended_action", "")
    }
    
    # Map severity to triageLevel
    severity = raw_result.get("severity", raw_result.get("triage_level", "")).lower()
    if severity in ['critical', 'moderate', 'mild']:
        normalized["triageLevel"] = severity
    elif "high" in severity or "severe" in severity:
        normalized["triageLevel"] = "critical"
    elif "low" in severity:
        normalized["triageLevel"] = "mild"
        
    # Ensure department is valid
    dept = str(raw_result.get("department", "General OPD")).strip()
    if any(d.lower() == dept.lower() for d in DEPARTMENTS):
        normalized["department"] = next(d for d in DEPARTMENTS if d.lower() == dept.lower())
    else:
        # Fallback mappings for common Gemini variations
        if "cardio" in dept.lower(): normalized["department"] = "Medicine" # fallback if Cardiology not in standard DEPARTMENTS
        elif "neuro" in dept.lower(): normalized["department"] = "Medicine"
        elif "pedia" in dept.lower(): normalized["department"] = "Paediatrics"
        elif "gyn" in dept.lower(): normalized["department"] = "Gynaecology"
        elif "ortho" in dept.lower(): normalized["department"] = "Orthopaedics"
        elif "derma" in dept.lower(): normalized["department"] = "Dermatology"
        elif "surg" in dept.lower(): normalized["department"] = "Emergency" # default to Emergency for critical surgery
        elif "ent" in dept.lower(): normalized["department"] = "ENT"
        elif "eye" in dept.lower(): normalized["department"] = "Eye OPD"
        elif "emergen" in dept.lower(): normalized["department"] = "Emergency"
        else: normalized["department"] = dept # Just use what was returned, we'll assign doctor from dict

    # Enforce wait time rules
    try:
        wt = int(raw_result.get("wait_time_minutes", 30))
        if normalized["triageLevel"] == "critical":
            normalized["waitTimeMinutes"] = 0
        elif normalized["triageLevel"] == "moderate":
            normalized["waitTimeMinutes"] = max(10, min(wt, 30))
        else:
            normalized["waitTimeMinutes"] = max(30, min(wt, 60))
    except (ValueError, TypeError):
        normalized["waitTimeMinutes"] = 0 if normalized["triageLevel"] == "critical" else (20 if normalized["triageLevel"] == "moderate" else 45)

    return normalized
